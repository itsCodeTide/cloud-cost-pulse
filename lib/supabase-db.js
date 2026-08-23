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

  const promise = client.from('app_data').select('doc_id,data').eq('collection', name).then(({ data, error }) => {
    if (error) {
      if (error.code === 'PGRST205' || /app_data/i.test(error.message || '')) {
        useMemoryFallback = true
        console.warn('Supabase app_data table is unavailable; using temporary demo storage. Apply migrations/002_supabase_app_data.sql for persistence.')
        return fallbackRows(name).map(clone)
      }
      throw error
    }
    return (data || []).map((row) => ({ ...row.data, _id: row.data?._id || row.doc_id }))
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
  const { error } = await client.from('app_data').upsert({
    collection: name,
    doc_id: docId,
    tenant_id: normalized.tenantId || null,
    data: normalized,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' })
  if (error) {
    if (error.code === 'PGRST205' || /app_data/i.test(error.message || '')) {
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
    async deleteOne(query = {}) { if (useMemoryFallback) return fallbackDb.collection(name).deleteOne(query); const row = (await readCollection(name)).find((item) => matches(item, query)); if (!row) return { deletedCount: 0 }; const { error } = await client.from('app_data').delete().eq('collection', name).eq('doc_id', String(row._id)); if (error) throw error; invalidateCollection(name); return { deletedCount: 1 } },
    async deleteMany(query = {}) { if (useMemoryFallback) return fallbackDb.collection(name).deleteMany(query); const rows = (await readCollection(name)).filter((row) => matches(row, query)); for (const row of rows) { const { error } = await client.from('app_data').delete().eq('collection', name).eq('doc_id', String(row._id)); if (error) throw error } if (rows.length) invalidateCollection(name); return { deletedCount: rows.length } },
    async updateOne(filter, update, options = {}) { const current = (await readCollection(name)).find((row) => matches(row, filter)); if (current) { await writeDocument(name, applyUpdate(current, update)); return { matchedCount: 1, modifiedCount: 1 } } if (!options.upsert) return { matchedCount: 0, modifiedCount: 0 }; const created = applyUpdate({ ...filter }, update); await writeDocument(name, created); return { matchedCount: 0, modifiedCount: 1, upsertedId: created._id || created.id } },
    async updateMany(filter, update) { const rows = (await readCollection(name)).filter((row) => matches(row, filter)); for (const row of rows) await writeDocument(name, applyUpdate(row, update)); return { matchedCount: rows.length, modifiedCount: rows.length } },
    async createIndex() { return true },
    find(query = {}) { let rows = readCollection(name).then((items) => items.filter((row) => matches(row, query))); const cursor = { sort(spec = {}) { rows = rows.then((items) => items.sort(makeSort(spec))); return this }, skip(count = 0) { rows = rows.then((items) => items.slice(Math.max(0, Number(count) || 0))); return this }, limit(count = 0) { if (count) rows = rows.then((items) => items.slice(0, Math.max(0, Number(count) || 0))); return this }, async toArray() { return clone(await rows) } }; return cursor },
  }
}

function makeSort(spec) { return (a, b) => { for (const [key, direction] of Object.entries(spec)) { const result = compare(a[key], b[key]) * (direction === -1 ? -1 : 1); if (result) return result } return 0 } }

export function createSupabaseDb() { return { collection } }
