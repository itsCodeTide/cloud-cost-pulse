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

async function readCollection(name) {
  const cached = collectionCache.get(name)
  if (cached && cached.expiresAt > Date.now()) return clone(await cached.promise)

  const promise = client.from('app_data').select('doc_id,data').eq('collection', name).then(({ data, error }) => {
    if (error) throw error
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
  normalized._id = normalized._id || docId
  const { error } = await client.from('app_data').upsert({
    collection: name,
    doc_id: docId,
    tenant_id: normalized.tenantId || null,
    data: normalized,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'collection,doc_id' })
  if (error) throw error
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
    async deleteOne(query = {}) { const row = (await readCollection(name)).find((item) => matches(item, query)); if (!row) return { deletedCount: 0 }; const { error } = await client.from('app_data').delete().eq('collection', name).eq('doc_id', String(row._id)); if (error) throw error; invalidateCollection(name); return { deletedCount: 1 } },
    async deleteMany(query = {}) { const rows = (await readCollection(name)).filter((row) => matches(row, query)); for (const row of rows) { const { error } = await client.from('app_data').delete().eq('collection', name).eq('doc_id', String(row._id)); if (error) throw error } if (rows.length) invalidateCollection(name); return { deletedCount: rows.length } },
    async updateOne(filter, update, options = {}) { const current = (await readCollection(name)).find((row) => matches(row, filter)); if (current) { await writeDocument(name, applyUpdate(current, update)); return { matchedCount: 1, modifiedCount: 1 } } if (!options.upsert) return { matchedCount: 0, modifiedCount: 0 }; const created = applyUpdate({ ...filter }, update); await writeDocument(name, created); return { matchedCount: 0, modifiedCount: 1, upsertedId: created._id || created.id } },
    async updateMany(filter, update) { const rows = (await readCollection(name)).filter((row) => matches(row, filter)); for (const row of rows) await writeDocument(name, applyUpdate(row, update)); return { matchedCount: rows.length, modifiedCount: rows.length } },
    async createIndex() { return true },
    find(query = {}) { let rows = readCollection(name).then((items) => items.filter((row) => matches(row, query))); const cursor = { sort(spec = {}) { rows = rows.then((items) => items.sort(makeSort(spec))); return this }, skip(count = 0) { rows = rows.then((items) => items.slice(Math.max(0, Number(count) || 0))); return this }, limit(count = 0) { if (count) rows = rows.then((items) => items.slice(0, Math.max(0, Number(count) || 0))); return this }, async toArray() { return clone(await rows) } }; return cursor },
  }
}

function makeSort(spec) { return (a, b) => { for (const [key, direction] of Object.entries(spec)) { const result = compare(a[key], b[key]) * (direction === -1 ? -1 : 1); if (result) return result } return 0 } }

export function createSupabaseDb() { return { collection } }
