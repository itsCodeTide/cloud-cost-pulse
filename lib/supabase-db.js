import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY

if (!url || !secretKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required for the Supabase database adapter')
}

// This client is server-only. Never expose the secret key through NEXT_PUBLIC_*.
const client = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Dashboard requests read the same collections concurrently (dashboard,
// notifications, analytics). Reuse an in-flight/read result briefly and
// invalidate it immediately after writes. This removes a large amount of
// redundant Supabase round-trips without making saved data stale.
const collectionCache = globalThis.__ccp_supabase_collection_cache || (globalThis.__ccp_supabase_collection_cache = new Map())
const fallbackState = globalThis.__ccp_supabase_fallback || (globalThis.__ccp_supabase_fallback = { collections: {} })
let useMemoryFallback = false

const STORAGE_TABLES = {
  users: 'user_identities', tenants: 'workspaces', resources: 'cloud_resources',
  cost_data: 'cloud_cost_data', cost_history: 'cloud_cost_history', budgets: 'budgets',
  azure_connections: 'azure_connections', reports: 'reports', notifications: 'notifications',
  settings: 'workspace_settings', recommendations: 'recommendations', audit_logs: 'audit_logs',
  meta: 'workspace_meta',
}
const AUXILIARY_TABLE = 'workspace_auxiliary_data'
function storageTable(name) { return STORAGE_TABLES[name] || AUXILIARY_TABLE }

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function compare(a, b) {
  if (a instanceof Date || b instanceof Date) return new Date(a).getTime() - new Date(b).getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a ?? '').localeCompare(String(b ?? ''))
}

function matchesValue(actual, expected) {
  if (expected === undefined || expected === null) return actual === expected
  if (Array.isArray(expected)) return expected.includes(actual)
  if (expected instanceof RegExp) return expected.test(String(actual ?? ''))
  if (typeof expected === 'object') {
    if ('$in' in expected) return expected.$in.includes(actual)
    if ('$ne' in expected) return actual !== expected.$ne
    if ('$gt' in expected) return actual > expected.$gt
    if ('$gte' in expected) return actual >= expected.$gte
    if ('$lt' in expected) return actual < expected.$lt
    if ('$lte' in expected) return actual <= expected.$lte
    if ('$exists' in expected) return expected.$exists ? actual != null : actual == null
  }
  return actual === expected
}

function matches(row, query = {}) {
  if (query.$or) return query.$or.some((part) => matches(row, part))
  if (query.$and) return query.$and.every((part) => matches(row, part))
  return Object.entries(query).every(([key, expected]) => matchesValue(row[key], expected))
}

function applyUpdate(row, update) {
  const next = clone(row)
  if (update.$set) Object.assign(next, clone(update.$set))
  if (update.$setOnInsert) Object.assign(next, clone(update.$setOnInsert))
  if (update.$inc) for (const [key, amount] of Object.entries(update.$inc)) next[key] = (Number(next[key]) || 0) + Number(amount)
  if (update.$unset) for (const key of Object.keys(update.$unset)) delete next[key]
  return next
}

function fallbackRows(name) { return fallbackState.collections[name] || (fallbackState.collections[name] = []) }
function fallbackCollection(name) {
  const rows = fallbackRows(name)
  const write = (doc) => { const next = clone(doc); next._id = next._id || next.id || `${name}:${crypto.randomUUID()}`; const i = rows.findIndex((r) => r._id === next._id || (next.id && r.id === next.id)); if (i >= 0) rows[i] = next; else rows.push(next); return next }
  const findRows = (query = {}) => rows.filter((row) => matches(row, query))
  return {
    async findOne(query = {}, options = {}) { let found = findRows(query); if (options.sort) found.sort(makeSort(options.sort)); return clone(found[0] || null) },
    async countDocuments(query = {}) { return findRows(query).length },
    async distinct(field, query = {}) { return [...new Set(findRows(query).map((r) => r[field]).filter((v) => v != null))] },
    async insertOne(doc) { const saved = write(doc); return { insertedId: saved._id } },
    async insertMany(docs) { for (const doc of docs || []) write(doc); return { insertedCount: docs?.length || 0 } },
    async deleteOne(query = {}) { const i = rows.findIndex((r) => matches(r, query)); if (i < 0) return { deletedCount: 0 }; rows.splice(i, 1); return { deletedCount: 1 } },
    async deleteMany(query = {}) { const before = rows.length; const keep = rows.filter((r) => !matches(r, query)); rows.length = 0; rows.push(...keep); return { deletedCount: before - rows.length } },
    async updateOne(filter, update, options = {}) { const current = findRows(filter)[0]; if (current) { write(applyUpdate(current, update)); return { matchedCount: 1, modifiedCount: 1 } } if (!options.upsert) return { matchedCount: 0, modifiedCount: 0 }; const created = applyUpdate({ ...filter }, update); const saved = write(created); return { matchedCount: 0, modifiedCount: 1, upsertedId: saved._id } },
    async updateMany(filter, update) { const found = findRows(filter); found.forEach((row) => write(applyUpdate(row, update))); return { matchedCount: found.length, modifiedCount: found.length } },
    async createIndex() { return true },
    find(query = {}) { let found = findRows(query); const cursor = { sort(spec = {}) { found.sort(makeSort(spec)); return this }, skip(n = 0) { found = found.slice(Math.max(0, Number(n) || 0)); return this }, limit(n = 0) { if (n) found = found.slice(0, Number(n)); return this }, async toArray() { return clone(found) } }; return cursor },
  }
}
const fallbackDb = { collection: fallbackCollection }

async function readCollection(name) {
  if (useMemoryFallback) return fallbackRows(name).map(clone)
  const cached = collectionCache.get(name)
  if (cached && cached.expiresAt > Date.now()) return clone(await cached.promise)

  const table = storageTable(name)
  let query = client.from(table).select('*')
  if (table === AUXILIARY_TABLE) query = query.eq('collection', name)
  const promise = query.then(({ data, error }) => {
    if (error) {
      if (error.code === 'PGRST205' || /app_data/i.test(error.message || '')) {
        // Keep older installations working until migration 003 is applied.
        return client.from('app_data').select('doc_id,data').eq('collection', name).then((legacy) => {
          if (legacy.error) {
            useMemoryFallback = true
            console.warn('Dedicated Supabase table is unavailable; using temporary demo storage. Apply migrations/003_dedicated_supabase_tables.sql for persistence.')
            return fallbackRows(name).map(clone)
          }
          return (legacy.data || []).map((row) => ({ ...row.data, _id: row.data?._id || row.doc_id }))
        })
      }
      throw error
    }
    return (data || []).map((row) => ({ ...(row.payload || {}), _id: row.payload?._id || row.record_id }))
  })
  collectionCache.set(name, { promise, expiresAt: Date.now() + 2000 })
  try {
    return clone(await promise)
  } catch (error) {
    collectionCache.delete(name)
    throw error
  }
}

function invalidateCollection(name) { collectionCache.delete(name) }

async function writeDocument(name, doc) {
  const normalized = clone(doc)
  const docId = String(normalized._id || normalized.id || `${name}:${normalized.tenantId || crypto.randomUUID()}`)
  if (useMemoryFallback) {
    const saved = fallbackDb.collection(name)
    await saved.deleteOne({ _id: normalized._id || docId })
    await saved.insertOne({ ...normalized, _id: normalized._id || docId })
    return { ...normalized, _id: normalized._id || docId }
  }
  normalized._id = normalized._id || docId
  const table = storageTable(name)
  const row = { record_id: docId, tenant_id: normalized.tenantId || null, payload: normalized, created_at: normalized.created_at || new Date().toISOString(), updated_at: new Date().toISOString() }
  if (table === AUXILIARY_TABLE) row.collection = name
  if (name === 'users') Object.assign(row, { email: normalized.email || null, full_name: normalized.full_name || null, role: normalized.role || null, last_seen_at: normalized.last_seen_at || null })
  if (name === 'tenants') Object.assign(row, { name: normalized.name || null, plan: normalized.plan || null })
  if (name === 'resources') Object.assign(row, { resource_name: normalized.resource_name || null, service_type: normalized.service_type || null, region: normalized.region || null, status: normalized.status || null, monthly_cost: normalized.monthly_cost ?? null })
  if (name === 'cost_data') Object.assign(row, { source: normalized.source || null, month: normalized.month || null, service: normalized.service || null, month_index: normalized.month_index ?? null, cost: normalized.cost ?? null })
  if (name === 'cost_history') Object.assign(row, { month: normalized.month || null, service_type: normalized.service_type || null, service_key: normalized.service_key || null, month_index: normalized.month_index ?? null, cost: normalized.cost ?? null })
  if (name === 'budgets') Object.assign(row, { name: normalized.name || null, monthly_budget: normalized.monthly_budget ?? null, amount: normalized.amount ?? null, period: normalized.period || null })
  if (name === 'azure_connections') Object.assign(row, { azure_tenant_id: normalized.azureTenantId || null, azure_client_id: normalized.azureClientId || null, azure_subscription_id: normalized.azureSubscriptionId || null })
  if (name === 'reports') Object.assign(row, { title: normalized.title || null, report_type: normalized.report_type || normalized.type || null })
  if (name === 'notifications') Object.assign(row, { type: normalized.type || null, title: normalized.title || null, message: normalized.message || null, severity: normalized.severity || null, read: normalized.read ?? false })
  if (name === 'settings') Object.assign(row, { currency: normalized.currency || null, data_source: normalized.dataSource || null })
  if (name === 'recommendations') Object.assign(row, { title: normalized.title || null, category: normalized.category || null, priority: normalized.priority || null, status: normalized.status || null, estimated_savings: normalized.estimated_savings ?? null })
  if (name === 'audit_logs') Object.assign(row, { user_id: normalized.userId || null, action: normalized.action || null, entity: normalized.entity || null, entity_id: normalized.entity_id || null, prev_value: normalized.prev_value || null, new_value: normalized.new_value || null })
  const { error } = await client.from(table).upsert(row, { onConflict: table === AUXILIARY_TABLE ? 'collection,record_id' : 'record_id' })
  if (error) {
    if (error.code === 'PGRST205') {
      const legacy = await client.from('app_data').upsert({ collection: name, doc_id: docId, tenant_id: normalized.tenantId || null, data: normalized, updated_at: new Date().toISOString() }, { onConflict: 'collection,doc_id' })
      if (!legacy.error) return normalized
      useMemoryFallback = true
      const saved = fallbackDb.collection(name)
      await saved.insertOne({ ...normalized, _id: normalized._id || docId })
      return { ...normalized, _id: normalized._id || docId }
    }
    throw error
  }
  invalidateCollection(name)
  return normalized
}

function collection(name) {
  return {
    async findOne(query = {}, options = {}) {
      let rows = (await readCollection(name)).filter((row) => matches(row, query))
      if (options.sort) rows.sort(makeSort(options.sort))
      return rows[0] || null
    },
    async countDocuments(query = {}) { return (await readCollection(name)).filter((row) => matches(row, query)).length },
    async distinct(field, query = {}) { return [...new Set((await readCollection(name)).filter((row) => matches(row, query)).map((row) => row[field]).filter((v) => v != null))] },
    async insertOne(doc) { const saved = await writeDocument(name, doc); return { insertedId: saved._id } },
    async insertMany(docs) { for (const doc of docs || []) await writeDocument(name, doc); return { insertedCount: docs?.length || 0 } },
    async deleteOne(query = {}) { if (useMemoryFallback) return fallbackDb.collection(name).deleteOne(query); const row = (await readCollection(name)).find((item) => matches(item, query)); if (!row) return { deletedCount: 0 }; const table = storageTable(name); let request = client.from(table).delete().eq('record_id', String(row._id)); if (table === AUXILIARY_TABLE) request = request.eq('collection', name); const { error } = await request; if (error) throw error; invalidateCollection(name); return { deletedCount: 1 } },
    async deleteMany(query = {}) { if (useMemoryFallback) return fallbackDb.collection(name).deleteMany(query); const rows = (await readCollection(name)).filter((row) => matches(row, query)); const table = storageTable(name); for (const row of rows) { let request = client.from(table).delete().eq('record_id', String(row._id)); if (table === AUXILIARY_TABLE) request = request.eq('collection', name); const { error } = await request; if (error) throw error } if (rows.length) invalidateCollection(name); return { deletedCount: rows.length } },
    async updateOne(filter, update, options = {}) { const current = (await readCollection(name)).find((row) => matches(row, filter)); if (current) { await writeDocument(name, applyUpdate(current, update)); return { matchedCount: 1, modifiedCount: 1 } } if (!options.upsert) return { matchedCount: 0, modifiedCount: 0 }; const created = applyUpdate({ ...filter }, update); await writeDocument(name, created); return { matchedCount: 0, modifiedCount: 1, upsertedId: created._id || created.id } },
    async updateMany(filter, update) { const rows = (await readCollection(name)).filter((row) => matches(row, filter)); for (const row of rows) await writeDocument(name, applyUpdate(row, update)); return { matchedCount: rows.length, modifiedCount: rows.length } },
    async createIndex() { return true },
    find(query = {}) { let rows = readCollection(name).then((items) => items.filter((row) => matches(row, query))); const cursor = { sort(spec = {}) { rows = rows.then((items) => items.sort(makeSort(spec))); return this }, skip(count = 0) { rows = rows.then((items) => items.slice(Math.max(0, Number(count) || 0))); return this }, limit(count = 0) { if (count) rows = rows.then((items) => items.slice(0, Math.max(0, Number(count) || 0))); return this }, async toArray() { return clone(await rows) } }; return cursor },
  }
}

function makeSort(spec) { return (a, b) => { for (const [key, direction] of Object.entries(spec)) { const result = compare(a[key], b[key]) * (direction === -1 ? -1 : 1); if (result) return result } return 0 } }

export function createSupabaseDb() { return { collection } }
