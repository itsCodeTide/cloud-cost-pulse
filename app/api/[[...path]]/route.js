import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { auth } from '@clerk/nextjs/server'
import { encryptSecret, decryptSecret } from '@/lib/secret'
import { queryMonthlyCosts, validateAzureCredentials } from '@/lib/azure-cost'
import { sendResendEmail, ResendRequestError, escapeHtml } from '@/lib/resend'
import { askFinOpsCopilot } from '@/lib/ai-copilot'
import { calculateTagGovernance, detectCostAnomalies } from '@/lib/tag-governance'
import { discoverAzureResources, validateAzureServicePrincipal, fetchAzureAdvisorRecommendations, fetchAzureMonitorMetrics } from '@/lib/azure-client'
import { broadcastDashboardUpdateWS } from '../ws/route.js'
import { broadcastDashboardUpdate } from '../stream/route.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'cloud_cost_pulse'
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY

const memoryDbState = globalThis.__cloud_cost_pulse_memory_db || (globalThis.__cloud_cost_pulse_memory_db = { collections: {} })

// ---- Fast in-memory response cache (5s TTL) to eliminate redundant DB hits ----
const _cache = globalThis.__ccp_cache || (globalThis.__ccp_cache = new Map())
function cacheGet(key) {
  const entry = _cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > 5000) { _cache.delete(key); return null }
  return entry.data
}
function cacheSet(key, data) { _cache.set(key, { data, ts: Date.now() }) }
function cacheClear(tenantId) {
  for (const k of _cache.keys()) { if (k.startsWith(tenantId)) _cache.delete(k) }
}

// ---- Seed-check cache to avoid re-running seedIfEmpty on every request ----
const _seeded = globalThis.__ccp_seeded || (globalThis.__ccp_seeded = new Set())
const _identitySynced = globalThis.__ccp_identity_synced || (globalThis.__ccp_identity_synced = new Set())

function cloneValue(value) {
  if (value === undefined) return undefined
  return JSON.parse(JSON.stringify(value))
}

function compareValues(a, b) {
  if (a instanceof Date || b instanceof Date) return new Date(a).getTime() - new Date(b).getTime()
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b)
  return String(a ?? '').localeCompare(String(b ?? ''))
}

function valueMatchesQuery(rowValue, queryValue) {
  if (queryValue === undefined || queryValue === null) {
    return rowValue === queryValue
  }

  if (Array.isArray(queryValue)) {
    return queryValue.includes(rowValue)
  }

  if (queryValue instanceof RegExp) {
    return queryValue.test(String(rowValue ?? ''))
  }

  if (queryValue && typeof queryValue === 'object' && !Array.isArray(queryValue)) {
    if ('$in' in queryValue) return queryValue.$in.includes(rowValue)
    if ('$ne' in queryValue) return rowValue !== queryValue.$ne
    if ('$gt' in queryValue) return rowValue > queryValue.$gt
    if ('$gte' in queryValue) return rowValue >= queryValue.$gte
    if ('$lt' in queryValue) return rowValue < queryValue.$lt
    if ('$lte' in queryValue) return rowValue <= queryValue.$lte
    if ('$exists' in queryValue) {
      const exists = rowValue !== undefined && rowValue !== null
      return queryValue.$exists ? exists : !exists
    }
    return false
  }

  return rowValue === queryValue
}

function rowMatchesQuery(row, query) {
  if (!query || Object.keys(query).length === 0) return true

  if (query.$or) {
    return query.$or.some((part) => rowMatchesQuery(row, part))
  }

  if (query.$and) {
    return query.$and.every((part) => rowMatchesQuery(row, part))
  }

  for (const [key, expected] of Object.entries(query)) {
    if (key === '$or' || key === '$and') continue
    const rowValue = row[key]
    if (expected && typeof expected === 'object' && !Array.isArray(expected) && ('$in' in expected || '$ne' in expected || '$gt' in expected || '$gte' in expected || '$lt' in expected || '$lte' in expected || '$exists' in expected)) {
      if (!valueMatchesQuery(rowValue, expected)) return false
      continue
    }

    if (!valueMatchesQuery(rowValue, expected)) return false
  }

  return true
}

function applyMemoryUpdate(doc, update) {
  const next = cloneValue(doc)
  if (!update || typeof update !== 'object') return next

  if (update.$set) Object.assign(next, cloneValue(update.$set))
  if (update.$setOnInsert) Object.assign(next, cloneValue(update.$setOnInsert))
  if (update.$inc) {
    for (const [key, delta] of Object.entries(update.$inc)) {
      next[key] = (Number(next[key]) || 0) + Number(delta)
    }
  }
  if (update.$unset) {
    for (const key of Object.keys(update.$unset)) delete next[key]
  }
  return next
}

function createMemoryDb() {
  const db = {
    collection(name) {
      const rows = memoryDbState.collections[name] || (memoryDbState.collections[name] = [])

      const collection = {
        async findOne(query = {}) {
          const match = rows.find((row) => rowMatchesQuery(row, query))
          return match ? cloneValue(match) : null
        },
        async countDocuments(query = {}) {
          return rows.filter((row) => rowMatchesQuery(row, query)).length
        },
        async distinct(field, query = {}) {
          return [...new Set(rows.filter((row) => rowMatchesQuery(row, query)).map((row) => row[field]).filter((value) => value !== undefined && value !== null))]
        },
        async deleteMany(query = {}) {
          const before = rows.length
          const remaining = rows.filter((row) => !rowMatchesQuery(row, query))
          rows.length = 0
          rows.push(...remaining)
          return { deletedCount: before - rows.length }
        },
        async deleteOne(query = {}) {
          const idx = rows.findIndex((row) => rowMatchesQuery(row, query))
          if (idx === -1) return { deletedCount: 0 }
          rows.splice(idx, 1)
          return { deletedCount: 1 }
        },
        async insertOne(doc) {
          const next = cloneValue(doc)
          if (!next._id) next._id = next.id || `${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`
          rows.push(next)
          return { insertedId: next._id }
        },
        async insertMany(docs) {
          const inserted = []
          for (const doc of docs || []) {
            const next = cloneValue(doc)
            if (!next._id) next._id = next.id || `${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`
            rows.push(next)
            inserted.push(next)
          }
          return { insertedCount: inserted.length }
        },
        async updateOne(filter, update, options = {}) {
          const idx = rows.findIndex((row) => rowMatchesQuery(row, filter))
          if (idx === -1) {
            if (options.upsert) {
              const newDoc = applyMemoryUpdate({ ...(filter && typeof filter === 'object' && !Array.isArray(filter) ? filter : {}) }, update)
              if (!newDoc._id) newDoc._id = newDoc.id || `${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`
              rows.push(newDoc)
              return { matchedCount: 0, modifiedCount: 1, upsertedId: newDoc._id }
            }
            return { matchedCount: 0, modifiedCount: 0 }
          }
          const next = applyMemoryUpdate(rows[idx], update)
          rows[idx] = next
          return { matchedCount: 1, modifiedCount: 1 }
        },
        async updateMany(filter, update) {
          let matched = 0
          for (let i = 0; i < rows.length; i++) {
            if (rowMatchesQuery(rows[i], filter)) {
              rows[i] = applyMemoryUpdate(rows[i], update)
              matched++
            }
          }
          return { matchedCount: matched, modifiedCount: matched }
        },
        async createIndex() {
          return true
        },
        find(query = {}) {
          const matches = rows.filter((row) => rowMatchesQuery(row, query))
          const cursor = {
            rows: matches,
            sort(spec = {}) {
              this.rows.sort((a, b) => {
                for (const [key, direction] of Object.entries(spec)) {
                  const result = compareValues(a[key], b[key]) * (direction === -1 ? -1 : 1)
                  if (result !== 0) return result
                }
                return 0
              })
              return this
            },
            skip(count = 0) {
              this.rows = this.rows.slice(Math.max(0, Number(count) || 0))
              return this
            },
            limit(count = 0) {
              const cap = Math.max(0, Number(count) || 0)
              if (cap) this.rows = this.rows.slice(0, cap)
              return this
            },
            async toArray() {
              return cloneValue(this.rows)
            },
          }
          return cursor
        },
      }

      return collection
    },
  }

  return db
}

let cachedClient = null
let cachedMemoryDb = null
let cachedSupabaseDb = null
let indexesReady = false
async function getDb() {
  if (SUPABASE_URL && SUPABASE_SECRET_KEY) {
    if (!cachedSupabaseDb) {
      const { createSupabaseDb } = await import('@/lib/supabase-db')
      cachedSupabaseDb = createSupabaseDb()
    }
    return cachedSupabaseDb
  }

  if (!MONGO_URL) {
    if (!cachedMemoryDb) cachedMemoryDb = createMemoryDb()
    return cachedMemoryDb
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URL, { maxPoolSize: 10 })
    await cachedClient.connect()
  }
  const db = cachedClient.db(DB_NAME)
  if (!indexesReady) {
    indexesReady = true
    Promise.all([
      db.collection('resources').createIndex({ tenantId: 1, status: 1 }),
      db.collection('resources').createIndex({ tenantId: 1, created_at: -1 }),
      db.collection('cost_history').createIndex({ tenantId: 1, month_index: 1 }),
      db.collection('notifications').createIndex({ tenantId: 1, created_at: -1 }),
      db.collection('audit_logs').createIndex({ tenantId: 1, created_at: -1 }),
      db.collection('reports').createIndex({ tenantId: 1, created_at: -1 }),
    ]).catch((e) => console.error('index error', e.message))
  }
  return db
}

// ---------------------------------------------------------------- constants
const SERVICE_CATALOG = [
  { name: 'Azure Virtual Machine', key: 'azure_virtual_machine', color: '#3b82f6', base: 4200 },
  { name: 'Azure Storage', key: 'azure_storage', color: '#8b5cf6', base: 2600 },
  { name: 'Azure SQL Database', key: 'azure_sql_database', color: '#ec4899', base: 2200 },
  { name: 'Azure App Service', key: 'azure_app_service', color: '#f59e0b', base: 1800 },
  { name: 'Azure Functions', key: 'azure_functions', color: '#10b981', base: 700 },
  { name: 'Azure Kubernetes Service', key: 'azure_kubernetes_service', color: '#06b6d4', base: 3200 },
  { name: 'Azure AI Services', key: 'azure_ai_services', color: '#f43f5e', base: 1500 },
]
const SERVICE_NAMES = SERVICE_CATALOG.map((s) => s.name)
const PALETTE = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#a3e635', '#eab308', '#6366f1', '#14b8a6', '#fb923c']
const REGIONS = ['Central India', 'East US', 'West Europe', 'Southeast Asia', 'UK South', 'East US 2', 'North Europe']
const STATUSES = ['Active', 'Idle', 'Inactive']
const OWNERS = ['platform-team', 'data-team', 'web-team', 'ml-team', 'devops', 'finance-ops']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DEFAULT_RULES = { idleCostThreshold: 500, spikePct: 25, budgetWarnPct: 80 }
const SEED_VERSION = 'v3'

function rand(min, max) { return Math.random() * (max - min) + min }
function randi(min, max) { return Math.floor(rand(min, max + 1)) }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'other' }
function ok(data, status = 200) { return NextResponse.json(data, { status }) }
function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
function fmtMoney(n, currency = 'INR') {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0)
}

async function requireAuth() {
  try {
    const { userId, orgId, sessionClaims } = await auth()
    if (!userId) {
      return { userId: 'demo_user', tenantId: 'demo_tenant', isOrg: false }
    }
    return {
      userId,
      tenantId: orgId || userId,
      isOrg: !!orgId,
      profile: {
        email: sessionClaims?.email || sessionClaims?.primary_email_address || null,
        full_name: sessionClaims?.name || [sessionClaims?.first_name, sessionClaims?.last_name].filter(Boolean).join(' ') || null,
      },
    }
  } catch (e) {
    return { userId: 'demo_user', tenantId: 'demo_tenant', isOrg: false }
  }
}

// Keep a Supabase-editable copy of workspace and user identity alongside all
// cloud-cost records. The sync is once per process/workspace, not per request.
async function syncWorkspaceIdentity(db, { userId, tenantId, isOrg, profile = {} }) {
  if (!userId || userId === 'demo_user') return
  const key = `${tenantId}:${userId}`
  if (_identitySynced.has(key)) return
  await db.collection('tenants').updateOne(
    { id: tenantId },
    { $set: { id: tenantId, name: isOrg ? 'Organization workspace' : 'Personal workspace', plan: 'Enterprise', updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
    { upsert: true }
  )
  await db.collection('users').updateOne(
    { id: userId },
    { $set: { id: userId, tenantId, email: profile.email || null, full_name: profile.full_name || null, role: isOrg ? 'Member' : 'Owner', last_seen_at: new Date(), updated_at: new Date() }, $setOnInsert: { created_at: new Date() } },
    { upsert: true }
  )
  _identitySynced.add(key)
}

async function recordActivity(db, authRes, request, route) {
  try {
    await db.collection('user_activity').insertOne({
      id: uuidv4(), userId: authRes.userId, tenantId: authRes.tenantId,
      activity_type: 'api_request', route: `/api/${route || ''}`, method: request.method,
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      user_agent: request.headers.get('user-agent') || null,
      metadata: { isOrg: !!authRes.isOrg }, occurred_at: new Date(), created_at: new Date(),
    })
  } catch (error) {
    console.error('activity log error', error.message)
  }
}

// ---------------------------------------------------------------- audit + notify
async function audit(db, tenantId, userId, { action, entity, entity_id = null, prev_value = null, new_value = null }) {
  try {
    await db.collection('audit_logs').insertOne({
      id: uuidv4(), tenantId, userId, action, entity, entity_id,
      prev_value, new_value, created_at: new Date(),
    })
  } catch (e) { console.error('audit error', e.message) }
}

async function notify(db, tenantId, { type, title, message, severity = 'info', dedupeId = null }) {
  const base = { id: uuidv4(), tenantId, type, title, message, severity, read: false, created_at: new Date() }
  try {
    if (dedupeId) {
      await db.collection('notifications').insertOne({ _id: `${tenantId}:${dedupeId}`, ...base })
    } else {
      await db.collection('notifications').insertOne(base)
    }
    try { broadcastDashboardUpdateWS({ event: 'notification', tenantId, notification: base }) } catch {}
    try { broadcastDashboardUpdate({ event: 'notification', tenantId, notification: base }) } catch {}
    return true
  } catch (e) {
    if (e.code === 11000) return false // dedupe hit
    console.error('notify error', e.message); return false
  }
}

async function removeNotification(db, tenantId, userId, notificationId, action = 'dismiss_notification') {
  const existing = await db.collection('notifications').findOne({ tenantId, id: notificationId })
  if (!existing) return false
  await db.collection('notifications').deleteOne({ tenantId, id: notificationId })
  await audit(db, tenantId, userId, {
    action, entity: 'notification', entity_id: notificationId,
    prev_value: `${existing.title || 'Notification'}: ${existing.message || ''}`,
    new_value: action === 'accept_notification' ? 'Accepted and removed from active notifications' : 'Dismissed and removed from active notifications',
  })
  return true
}

// ---------------------------------------------------------------- seed
async function seedIfEmptyForTenant(db, tenantId, { demo = false } = {}) {
  // Skip DB round-trip if we already know this tenant is initialized
  if (!demo && _seeded.has(tenantId)) return

  const marker = await db.collection('meta').findOne({ _id: `seed:${SEED_VERSION}:${tenantId}` })
  if (marker?.done) { _seeded.add(tenantId); return }

  // Every authenticated workspace starts empty. Demo data is only created by
  // the explicit demo/reseed action, never as a side effect of first login.
  if (!demo) {
    await db.collection('settings').updateOne(
      { tenantId },
      { $setOnInsert: { tenantId, dataSource: 'empty', currency: 'INR', created_at: new Date() } },
      { upsert: true }
    )
    _seeded.add(tenantId)
    return
  }

  // Clean any legacy/partial data for a consistent starting point (dev demo data only)
  await Promise.all([
    db.collection('resources').deleteMany({ tenantId }),
    db.collection('cost_data').deleteMany({ tenantId, source: { $ne: 'azure' } }),
    db.collection('cost_history').deleteMany({ tenantId }),
  ])

  const now = new Date()
  const resources = []
  for (let i = 0; i < 50; i++) {
    const svc = SERVICE_CATALOG[i % SERVICE_CATALOG.length]
    // ~72% Active, ~18% Idle, ~10% Inactive
    const roll = Math.random()
    const status = roll < 0.72 ? 'Active' : roll < 0.9 ? 'Idle' : 'Inactive'
    resources.push({
      id: uuidv4(),
      tenantId,
      resource_name: `${svc.key.split('_')[1] || svc.key}-${String(i + 1).padStart(3, '0')}`,
      service_type: svc.name,
      region: REGIONS[i % REGIONS.length],
      status,
      monthly_cost: Math.round(svc.base * rand(0.4, 1.5)),
      owner: OWNERS[i % OWNERS.length],
      created_at: new Date(now.getFullYear(), now.getMonth(), 1 + (i % 25)),
      updated_at: new Date(),
    })
  }
  await db.collection('resources').insertMany(resources)

  // Current-month active totals per service — history trends up toward these
  const activeByService = {}
  for (const r of resources) {
    if (r.status !== 'Active') continue
    const k = slug(r.service_type)
    activeByService[k] = (activeByService[k] || 0) + r.monthly_cost
  }

  const history = []
  for (let m = 5; m >= 1; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const monthLabel = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    const trendFactor = 1 - m * 0.055 // older months a bit cheaper
    for (const svc of SERVICE_CATALOG) {
      const target = activeByService[svc.key] || svc.base
      history.push({
        id: uuidv4(),
        tenantId,
        month: monthLabel,
        month_index: d.getFullYear() * 12 + d.getMonth(),
        service_type: svc.name,
        service_key: svc.key,
        cost: Math.max(0, Math.round(target * trendFactor * rand(0.88, 1.08))),
        created_at: new Date(),
      })
    }
  }
  await db.collection('cost_history').insertMany(history)

  const existingBudget = await db.collection('budgets').findOne({ tenantId })
  if (!existingBudget) {
    await db.collection('budgets').insertOne({ id: uuidv4(), tenantId, monthly_budget: 60000, created_at: new Date() })
  }

  await notify(db, tenantId, {
    type: 'system', severity: 'info', title: 'Welcome to Cloud-Cost-Pulse',
    message: 'Sample Azure resources were loaded. Add, edit, or delete resources — every metric recalculates live.',
  })

  await db.collection('meta').updateOne(
    { _id: `seed:${SEED_VERSION}:${tenantId}` },
    { $set: { done: true, at: new Date() } },
    { upsert: true }
  )
}

// ---------------------------------------------------------------- settings
async function getTenantSettings(db, tenantId) {
  const doc = await db.collection('settings').findOne({ tenantId })
  return {
    dataSource: doc?.dataSource || 'empty',
    currency: doc?.currency || 'INR',
    lastSyncAt: doc?.lastSyncAt || null,
    email: doc?.email || null,
    rules: { ...DEFAULT_RULES, ...(doc?.rules || {}) },
  }
}

function budgetStatus(pct) {
  if (pct >= 100) return { label: 'Exceeded', tone: 'red' }
  if (pct >= 90) return { label: 'Critical', tone: 'red' }
  if (pct >= 80) return { label: 'Warning', tone: 'amber' }
  return { label: 'Healthy', tone: 'green' }
}

// ---------------------------------------------------------------- recommendations engine
function generateRecommendations({ resources, serviceTotals, trend, services, budgetUsage, rules, currency }) {
  const recs = []
  const F = (n) => fmtMoney(n, currency)

  // Rule 1 — VM cost > 5000 => Reserved Instances (save 20%)
  const vmCost = serviceTotals['azure_virtual_machine'] || 0
  if (vmCost > 5000) {
    const savings = Math.round(vmCost * 0.2)
    recs.push({ id: 'rec-vm-ri', title: 'Purchase Reserved Instances for VMs', description: `Active VM spend is ${F(vmCost)}/mo. A 1-year reservation typically saves ~20%.`, potential_savings: savings, category: 'compute', severity: 'high', priority: 'High', rule_based: false })
  }
  // Rule 2 — Storage cost > 3000 => Move cold data (save 15%)
  const storageCost = serviceTotals['azure_storage'] || 0
  if (storageCost > 3000) {
    const savings = Math.round(storageCost * 0.15)
    recs.push({ id: 'rec-storage-archive', title: 'Move cold data to Archive tier', description: `Active storage spend is ${F(storageCost)}/mo. Moving cold blobs to Archive can cut ~15%.`, potential_savings: savings, category: 'storage', severity: 'medium', priority: 'Medium', rule_based: false })
  }
  // SQL right-size (bonus rule) — SQL > 4000
  const sqlCost = serviceTotals['azure_sql_database'] || 0
  if (sqlCost > 4000) {
    const savings = Math.round(sqlCost * 0.12)
    recs.push({ id: 'rec-sql-rightsize', title: 'Right-size Azure SQL Databases', description: `Active SQL spend is ${F(sqlCost)}/mo. Scaling down under-utilised tiers can save ~12%.`, potential_savings: savings, category: 'database', severity: 'medium', priority: 'Medium', rule_based: false })
  }

  // Rule 3 — Idle / Inactive resources above the idle threshold => reclaim 100%
  const idle = (resources || [])
    .filter((r) => (r.status === 'Idle' || r.status === 'Inactive') && r.monthly_cost >= (rules.idleCostThreshold || 0))
    .sort((a, b) => b.monthly_cost - a.monthly_cost)
    .slice(0, 8)
  for (const r of idle) {
    const isInactive = r.status === 'Inactive'
    recs.push({
      id: `rec-idle-${r.id}`,
      title: `${isInactive ? 'Delete inactive' : 'Deallocate idle'} resource ${r.resource_name}`,
      description: `${r.service_type} in ${r.region} is ${r.status} but still costs ${F(r.monthly_cost)}/mo — above your ${F(rules.idleCostThreshold)} threshold.`,
      potential_savings: r.monthly_cost,
      category: isInactive ? 'inactive-resource' : 'idle-resource',
      severity: r.monthly_cost >= rules.idleCostThreshold * 3 ? 'high' : 'medium',
      priority: r.monthly_cost >= rules.idleCostThreshold * 3 ? 'High' : 'Medium',
      rule_based: true,
      rule: `${r.status} >= ${rules.idleCostThreshold}`,
    })
  }

  // Rule 4 — Budget usage > warn% => review allocation
  if (budgetUsage >= (rules.budgetWarnPct || 80)) {
    recs.push({ id: 'rec-budget-review', title: 'Review resource allocation', description: `Budget utilisation is ${Math.round(budgetUsage)}%. Review active resources and right-size or shut down non-essential workloads.`, potential_savings: 0, category: 'budget', severity: budgetUsage >= 100 ? 'high' : 'medium', priority: budgetUsage >= 100 ? 'High' : 'Medium', rule_based: true, rule: `budget >= ${rules.budgetWarnPct}%` })
  }

  // Rule 5 — Month-over-month spike per service above spike%
  if (trend.length >= 2) {
    const cur = trend[trend.length - 1]
    const prev = trend[trend.length - 2]
    for (const s of services) {
      const c = cur[s.key] || 0
      const p = prev[s.key] || 0
      if (p > 0 && c > p) {
        const growth = ((c - p) / p) * 100
        if (growth >= (rules.spikePct || 25)) {
          recs.push({ id: `rec-spike-${s.key}`, title: `Investigate ${Math.round(growth)}% spike in ${s.name}`, description: `${s.name} rose from ${F(p)} to ${F(c)} month-over-month (+${Math.round(growth)}%), above your ${rules.spikePct}% threshold.`, potential_savings: Math.round(c - p), category: 'cost-spike', severity: growth >= rules.spikePct * 2 ? 'high' : 'medium', priority: 'Medium', rule_based: true, rule: `spike >= ${rules.spikePct}%` })
        }
      }
    }
  }

  return recs.sort((a, b) => (b.potential_savings || 0) - (a.potential_savings || 0))
}

// ---------------------------------------------------------------- dashboard (live)
async function buildDashboard(db, tenantId) {
  const settings = await getTenantSettings(db, tenantId)
  const useAzure = settings.dataSource === 'azure'

  const [resources, budgetDoc, appliedDocs] = await Promise.all([
    db.collection('resources').find({ tenantId }).toArray(),
    db.collection('budgets').findOne({ tenantId }, { sort: { created_at: -1 } }),
    db.collection('applied_recommendations').find({ tenantId }).toArray(),
  ])

  const now = new Date()
  const curIndex = now.getFullYear() * 12 + now.getMonth()
  const curLabel = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`

  // Historical months (either demo cost_history or synced Azure cost_data)
  let historyRows = []
  if (useAzure) {
    const azRows = await db.collection('cost_data').find({ tenantId, source: 'azure' }).sort({ month_index: 1 }).toArray()
    historyRows = azRows.map((r) => ({ month: r.month, month_index: r.month_index, service_type: r.service, service_key: r.service_key, cost: r.cost }))
  } else {
    const rows = await db.collection('cost_history').find({ tenantId, month_index: { $lt: curIndex } }).sort({ month_index: 1 }).toArray()
    historyRows = rows.map((r) => ({ month: r.month, month_index: r.month_index, service_type: r.service_type, service_key: r.service_key, cost: r.cost }))
  }

  // Current month = live sum of ACTIVE resources grouped by service
  const serviceTotals = {}
  let currentTotal = 0
  for (const r of resources) {
    if (r.status !== 'Active') continue
    const k = slug(r.service_type)
    serviceTotals[k] = (serviceTotals[k] || 0) + (r.monthly_cost || 0)
    currentTotal += (r.monthly_cost || 0)
  }

  // Build service metadata (union of catalog / history / active resources)
  const serviceMeta = new Map()
  const registerService = (name) => {
    const key = slug(name)
    if (!serviceMeta.has(key)) {
      const cat = SERVICE_CATALOG.find((s) => s.key === key)
      serviceMeta.set(key, { key, name: cat?.name || name, color: cat?.color || PALETTE[serviceMeta.size % PALETTE.length] })
    }
  }
  historyRows.forEach((h) => registerService(h.service_type))
  resources.forEach((r) => registerService(r.service_type))
  const services = [...serviceMeta.values()]

  // Assemble the monthly trend
  const byMonth = {}
  for (const h of historyRows) {
    if (!byMonth[h.month_index]) byMonth[h.month_index] = { month: h.month, month_index: h.month_index, total: 0 }
    byMonth[h.month_index][h.service_key] = (byMonth[h.month_index][h.service_key] || 0) + h.cost
    byMonth[h.month_index].total += h.cost
  }
  // Overwrite/append current month with the live figure (demo mode). For Azure we keep synced current if present.
  if (!useAzure || !byMonth[curIndex]) {
    const cm = { month: curLabel, month_index: curIndex, total: currentTotal }
    for (const k of Object.keys(serviceTotals)) cm[k] = serviceTotals[k]
    byMonth[curIndex] = cm
  }
  const trend = Object.values(byMonth).sort((a, b) => a.month_index - b.month_index).map((t) => ({ ...t, total: Math.round(t.total) }))

  const currentMonth = trend[trend.length - 1] || { total: 0 }
  const prevMonth = trend[trend.length - 2]
  const displayCurrent = useAzure ? currentMonth.total : currentTotal

  // Service breakdown for current month
  let serviceBreakdown
  if (useAzure) {
    serviceBreakdown = services.map((s) => ({ name: s.name, key: s.key, color: s.color, value: Math.round(currentMonth[s.key] || 0) }))
  } else {
    serviceBreakdown = services.map((s) => ({ name: s.name, key: s.key, color: s.color, value: Math.round(serviceTotals[s.key] || 0) }))
  }
  serviceBreakdown = serviceBreakdown.filter((s) => s.value > 0).sort((a, b) => b.value - a.value)

  // Forecast = average of last 3 months
  const last3 = trend.slice(-3).map((t) => t.total)
  const forecast = last3.length ? Math.round(last3.reduce((a, b) => a + b, 0) / last3.length) : 0
  const growth = prevMonth?.total ? ((displayCurrent - prevMonth.total) / prevMonth.total) * 100 : 0
  const forecastGrowth = displayCurrent ? ((forecast - displayCurrent) / displayCurrent) * 100 : 0

  // Forecast series (past + 3 projected)
  const projRate = 1 + (forecastGrowth / 100)
  const forecastSeries = trend.map((t) => ({ month: t.month, actual: t.total, forecast: null }))
  let last = forecast
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    forecastSeries.push({ month: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, actual: null, forecast: Math.round(last) })
    last = last * projRate
  }
  if (forecastSeries.length) {
    const idx = trend.length - 1
    if (forecastSeries[idx]) forecastSeries[idx].forecast = trend[idx].total // connect the lines
  }

  // Budget
  const budget = budgetDoc?.monthly_budget || 60000
  const used = displayCurrent
  const remaining = budget - used
  const budgetUsage = budget ? (used / budget) * 100 : 0
  const status = budgetStatus(budgetUsage)

  // Recommendations + savings (filter out already applied)
  const appliedIds = new Set((appliedDocs || []).map((a) => a.recId))
  const allRecs = generateRecommendations({ resources, serviceTotals, trend, services, budgetUsage, rules: settings.rules, currency: settings.currency })
  const recs = allRecs.filter((r) => !appliedIds.has(r.id))
  const potentialSavings = recs.reduce((s, r) => s + (r.potential_savings || 0), 0)

  const activeResources = resources.filter((r) => r.status === 'Active')

  return {
    stats: {
      totalMonthlyCost: Math.round(used),
      totalResources: resources.length,
      activeResources: activeResources.length,
      activeServices: serviceBreakdown.length,
      totalServices: new Set(resources.map((r) => r.service_type)).size,
      potentialSavings: Math.round(potentialSavings),
      budgetUsage: Math.round(budgetUsage * 10) / 10,
      growth: Math.round(growth * 10) / 10,
    },
    services,
    trend,
    serviceBreakdown,
    forecast: { expectedCost: forecast, growth: Math.round(forecastGrowth * 10) / 10, basis: last3, series: forecastSeries },
    budget: {
      monthly_budget: budget,
      used: Math.round(used),
      remaining: Math.round(remaining),
      usage_pct: Math.round(budgetUsage * 10) / 10,
      status: status.label,
      statusTone: status.tone,
    },
    recommendations: recs.slice(0, 6),
    currency: settings.currency,
    dataSource: useAzure && historyRows.length ? 'azure' : settings.dataSource === 'empty' ? 'empty' : 'demo',
    meta: {
      azureConnected: settings.dataSource === 'azure',
      emailConfigured: !!(settings.email?.resendApiKey && settings.email?.recipient),
      lastSyncAt: settings.lastSyncAt,
      rules: settings.rules,
    },
    onboarding: resources.length === 0 && historyRows.length === 0 && !useAzure,
  }
}

// Create deduped budget notifications when thresholds are crossed
async function maybeBudgetNotifications(db, tenantId, dash, currency) {
  const now = new Date()
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const pct = dash.budget.usage_pct
  const rules = dash.meta.rules
  const F = (n) => fmtMoney(n, currency)
  const events = []
  if (pct >= 100) events.push(['exceeded', 'error', 'Budget exceeded', `Spending is at ${pct}% of your ${F(dash.budget.monthly_budget)} budget.`])
  else if (pct >= 90) events.push(['critical', 'error', 'Critical budget consumption', `You have used ${pct}% of your monthly budget.`])
  else if (pct >= (rules.budgetWarnPct || 80)) events.push(['warning', 'warning', 'Budget threshold reached', `You have used ${pct}% of your monthly budget.`])
  for (const [level, severity, title, message] of events) {
    await notify(db, tenantId, { type: 'budget', severity, title, message, dedupeId: `budget:${monthKey}:${level}:${dash.budget.monthly_budget}` })
  }
}

// ---------------------------------------------------------------- budget alert emails (Resend)
function alertHtml({ workspace, percent, spent, budget, currency }) {
  const F = (n) => fmtMoney(n, currency)
  const isFinal = percent >= 100
  return `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#172033;padding:24px">
  <h2 style="color:${isFinal ? '#dc2626' : '#d97706'}">${isFinal ? 'Budget exceeded' : 'Budget warning'} — Cloud-Cost-Pulse</h2>
  <p>Workspace <strong>${escapeHtml(workspace)}</strong> has reached <strong>${percent}%</strong> of its monthly cloud budget.</p>
  <table style="border-collapse:collapse">
    <tr><td style="padding:4px 12px 4px 0">Spent:</td><td><strong>${F(spent)}</strong></td></tr>
    <tr><td style="padding:4px 12px 4px 0">Budget:</td><td><strong>${F(budget)}</strong></td></tr>
  </table>
  <p>${isFinal ? 'Please review spending immediately and consider stopping idle resources.' : 'Consider reviewing current usage before you exceed the budget.'}</p>
  <p style="color:#64748b;font-size:12px">Sent automatically by Cloud-Cost-Pulse budget alerts.</p>
</body></html>`
}

async function maybeSendBudgetAlerts(db, tenantId, dash) {
  const settings = await getTenantSettings(db, tenantId)
  const email = settings.email
  if (!email?.resendApiKey || !email?.recipient) return null

  const pct = dash.budget.usage_pct
  const warn = settings.rules.budgetWarnPct || 80
  let threshold = null
  if (pct >= 100) threshold = 100
  else if (pct >= warn) threshold = warn
  if (!threshold) return null

  const now = new Date()
  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const alertId = `alert:${tenantId}:${monthKey}:${threshold}:${dash.budget.monthly_budget}`
  const existing = await db.collection('budget_alerts').findOne({ _id: alertId })
  if (existing?.sentAt) return { skipped: true, threshold }

  try {
    const res = await sendResendEmail({
      apiKey: decryptResendKey(email.resendApiKey),
      from: email.from || 'Cloud-Cost-Pulse <onboarding@resend.dev>',
      to: email.recipient,
      subject: `${threshold >= 100 ? 'Budget exceeded' : `${threshold}% budget alert`} — Cloud-Cost-Pulse`,
      html: alertHtml({ workspace: 'your workspace', percent: Math.min(Math.round(pct), 999), spent: dash.budget.used, budget: dash.budget.monthly_budget, currency: settings.currency }),
      idempotencyKey: alertId.slice(0, 256),
    })
    await db.collection('budget_alerts').updateOne({ _id: alertId }, { $set: { tenantId, threshold, pct, recipient: email.recipient, resendEmailId: res.id, sentAt: new Date() } }, { upsert: true })
    return { sent: true, threshold, recipient: email.recipient }
  } catch (e) {
    await db.collection('budget_alerts').updateOne({ _id: alertId }, { $set: { tenantId, threshold, pct, recipient: email.recipient, error: safeEmailError(e), failedAt: new Date() } }, { upsert: true })
    return { sent: false, threshold, error: safeEmailError(e) }
  }
}

function safeEmailError(e) {
  if (e instanceof ResendRequestError) {
    if (e.status === 401 || e.status === 403) return 'Resend API key is invalid, or the sandbox sender can only email your own Resend account address.'
    if (e.status === 429) return 'Resend rate/sending quota exceeded; retry later.'
    if (e.status === 422) return 'Resend rejected the sender or recipient data.'
  }
  return 'Email provider error'
}

function decryptResendKey(stored) {
  if (typeof stored === 'string') return stored
  return decryptSecret(stored)
}

// ---------------------------------------------------------------- Azure sync
async function syncAzureCosts(db, tenantId) {
  const conn = await db.collection('azure_connections').findOne({ tenantId })
  if (!conn) { const e = new Error('No Azure connection configured for this workspace'); e.status = 404; throw e }
  const config = { tenantId: conn.azureTenantId, clientId: conn.azureClientId, clientSecret: decryptSecret(conn.clientSecret), subscriptionId: conn.azureSubscriptionId }
  const rows = await queryMonthlyCosts(config)

  const docs = []
  let currency = 'USD'
  for (const row of rows) {
    const raw = row.UsageDate ?? row.BillingMonth ?? row.UsageDateTime
    let y, m
    if (typeof raw === 'number') { const s = String(raw); y = Number(s.slice(0, 4)); m = Number(s.slice(4, 6)) }
    else if (raw) { const d = new Date(raw); if (isNaN(d)) continue; y = d.getUTCFullYear(); m = d.getUTCMonth() + 1 }
    else continue
    if (!y || !m || m < 1 || m > 12) continue
    if (row.Currency) currency = row.Currency
    const name = row.ServiceName || 'Other services'
    docs.push({ id: uuidv4(), tenantId, source: 'azure', month: `${MONTHS[m - 1]} ${y}`, month_index: y * 12 + (m - 1), service: name, service_key: slug(name), cost: Math.round(Number(row.PreTaxCost ?? row.Cost ?? 0) * 100) / 100, created_at: new Date() })
  }

  if (docs.length > 0) {
    await db.collection('cost_data').deleteMany({ tenantId, source: 'azure' })
    await db.collection('cost_data').insertMany(docs)
    await db.collection('settings').updateOne({ tenantId }, { $set: { dataSource: 'azure', currency, lastSyncAt: new Date() } }, { upsert: true })
  } else {
    await db.collection('settings').updateOne({ tenantId }, { $set: { lastSyncAt: new Date() } }, { upsert: true })
  }
  return { rows: docs.length, currency: docs.length ? currency : null }
}

function mask(v) {
  if (!v) return ''
  const s = String(v)
  return s.length <= 8 ? `${s.slice(0, 2)}••••` : `${s.slice(0, 8)}••••${s.slice(-4)}`
}

function azureErrorResponse(e) {
  console.error('Azure error', { kind: e.kind, status: e.status, message: e.message?.slice(0, 200) })
  if (e.kind === 'VALIDATION') return ok({ error: e.message }, 400)
  if (e.status === 400 || e.status === 401 || e.status === 403) return ok({ error: 'Credentials could not be validated. Check tenant ID, client ID, client secret, subscription ID, and that the app has the Cost Management Reader role on the subscription.' }, 422)
  if (e.status === 404) return ok({ error: e.message || 'Not found' }, 404)
  if (e.status === 429 || e.status === 503) return ok({ error: 'Azure is temporarily throttling or unavailable; retry shortly.' }, 503)
  return ok({ error: 'Unable to reach Azure Cost Management. Verify the credentials and try again.' }, 502)
}

// ---------------------------------------------------------------- resource validation
function validateResource(body, { partial = false } = {}) {
  const out = {}
  const errors = []
  const has = (k) => body[k] !== undefined && body[k] !== null && String(body[k]).trim() !== ''

  if (!partial || has('resource_name')) {
    const name = String(body.resource_name || '').trim()
    if (!name) errors.push('Resource name is required')
    else if (name.length > 120) errors.push('Resource name is too long')
    else out.resource_name = name
  }
  if (!partial || has('service_type')) {
    const svc = String(body.service_type || '').trim()
    if (!svc) errors.push('Service type is required')
    else out.service_type = svc
  }
  if (!partial || has('region')) {
    const region = String(body.region || '').trim()
    if (!region) errors.push('Region is required')
    else out.region = region
  }
  if (!partial || has('monthly_cost')) {
    const cost = Number(body.monthly_cost)
    if (!Number.isFinite(cost) || cost <= 0) errors.push('Monthly cost must be greater than 0')
    else if (cost > 100000000) errors.push('Monthly cost is unrealistically high')
    else out.monthly_cost = Math.round(cost * 100) / 100
  }
  if (!partial || has('status')) {
    const status = String(body.status || '').trim()
    if (!STATUSES.includes(status)) errors.push(`Status must be one of: ${STATUSES.join(', ')}`)
    else out.status = status
  }
  if (has('owner')) out.owner = String(body.owner).trim().slice(0, 80)
  else if (!partial) out.owner = 'unassigned'
  if (has('description')) out.description = String(body.description).trim().slice(0, 500)
  else if (!partial) out.description = ''
  if (body.tags !== undefined) {
    const tags = Array.isArray(body.tags) ? body.tags : String(body.tags).split(',')
    out.tags = tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 20)
  } else if (!partial) out.tags = []

  return { value: out, errors }
}

// =============================== GET ===============================
export async function GET(request, ctx) {
  try {
    const params = await ctx.params
    const path = (params?.path || []).join('/')

    if (path === '' || path === 'health') return ok({ status: 'ok', service: 'cloud-cost-pulse' })

    const authRes = await requireAuth()
    if (authRes.error) return authRes.error
    const { tenantId, userId, isOrg } = authRes

    const db = await getDb()
    await syncWorkspaceIdentity(db, authRes)
    await recordActivity(db, authRes, request, path)
    if (path === 'analytics') {
      const cacheKey = `${tenantId}:analytics`
      const cached = cacheGet(cacheKey)
      if (cached) return ok(cached)

      await seedIfEmptyForTenant(db, tenantId)

      const dash = await buildDashboard(db, tenantId)
      const resources = await db.collection('resources').find({ tenantId }).toArray()
      
      // Region Analysis
      const regionMap = {}
      resources.forEach(r => {
        if (r.status === 'Active') {
          regionMap[r.region] = (regionMap[r.region] || 0) + (r.monthly_cost || 0)
        }
      })
      const regionBreakdown = Object.entries(regionMap)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value)

      // Owner/Team Analysis
      const ownerMap = {}
      resources.forEach(r => {
        if (r.status === 'Active') {
          ownerMap[r.owner] = (ownerMap[r.owner] || 0) + (r.monthly_cost || 0)
        }
      })
      const ownerBreakdown = Object.entries(ownerMap)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value)

      // Department Analysis
      const deptMap = {}
      resources.forEach(r => {
        if (r.status === 'Active') {
          const dept = r.department || 'Engineering'
          deptMap[dept] = (deptMap[dept] || 0) + (r.monthly_cost || 0)
        }
      })
      const departmentBreakdown = Object.entries(deptMap)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value)

      const resData = {
        stats: dash.stats,
        serviceBreakdown: dash.serviceBreakdown,
        regionBreakdown,
        ownerBreakdown,
        departmentBreakdown,
        trend: dash.trend,
        forecast: dash.forecast,
        recommendations: dash.recommendations,
        currency: dash.currency
      }
      cacheSet(cacheKey, resData)
      return ok(resData)
    }

    if (path === 'dashboard') {
      const cacheKey = `${tenantId}:dashboard`
      const cached = cacheGet(cacheKey)
      if (cached) return ok(cached)

      await seedIfEmptyForTenant(db, tenantId)

      const dash = await buildDashboard(db, tenantId)
      // Notifications/email are side effects; do not hold the dashboard
      // response open while Supabase or Resend processes them.
      void maybeBudgetNotifications(db, tenantId, dash, dash.currency).catch((e) => console.error('budget notif', e.message))
      void maybeSendBudgetAlerts(db, tenantId, dash).catch((e) => console.error('alert check failed', e.message))
      const resData = { ...dash, workspace: { isOrg, tenantId: isOrg ? tenantId : 'personal' }, emailAlert: null }
      cacheSet(cacheKey, resData)
      return ok(resData)
    }

    // Other data endpoints still need first-use initialization, while the
    // dashboard/analytics paths above can return from cache without it.
    await seedIfEmptyForTenant(db, tenantId)

    if (path === 'resources') {
      const url = new URL(request.url)
      const qp = url.searchParams
      const search = (qp.get('search') || '').trim()
      const service = (qp.get('service') || '').trim()
      const region = (qp.get('region') || '').trim()
      const status = (qp.get('status') || '').trim()
      const minCost = qp.get('minCost') ? Number(qp.get('minCost')) : null
      const maxCost = qp.get('maxCost') ? Number(qp.get('maxCost')) : null
      const page = Math.max(1, Number(qp.get('page')) || 1)
      const pageSize = Math.min(100, Math.max(1, Number(qp.get('pageSize')) || 10))

      const filter = { tenantId }
      if (search) {
        const rx = new RegExp(escapeRegex(search), 'i')
        filter.$or = [{ resource_name: rx }, { service_type: rx }, { region: rx }, { owner: rx }]
      }
      if (service) filter.service_type = service
      if (region) filter.region = region
      if (status) filter.status = status
      const costFilter = {}
      if (minCost !== null && Number.isFinite(minCost)) costFilter.$gte = minCost
      if (maxCost !== null && Number.isFinite(maxCost)) costFilter.$lte = maxCost
      if (Object.keys(costFilter).length) filter.monthly_cost = costFilter

      const [items, total, services, regions] = await Promise.all([
        db.collection('resources').find(filter).sort({ created_at: -1 }).skip((page - 1) * pageSize).limit(pageSize).toArray(),
        db.collection('resources').countDocuments(filter),
        db.collection('resources').distinct('service_type', { tenantId }),
        db.collection('resources').distinct('region', { tenantId }),
      ])
      return ok({ items: items.map(({ _id, ...r }) => r), total, page, pageSize, pages: Math.ceil(total / pageSize) || 1, facets: { services: services.sort(), regions: regions.sort(), statuses: STATUSES }, catalog: SERVICE_NAMES, allRegions: REGIONS })
    }

    if (path === 'recommendations') {
      const dash = await buildDashboard(db, tenantId)
      return ok(dash.recommendations.concat(await extraRecs(db, tenantId, dash)))
    }

    if (path === 'budget') {
      const b = await db.collection('budgets').findOne({ tenantId }, { sort: { created_at: -1 } })
      if (!b) return ok({ monthly_budget: 60000 })
      const { _id, ...rest } = b
      return ok(rest)
    }

    if (path === 'notifications') {
      const url = new URL(request.url)
      const unreadOnly = url.searchParams.get('unread') === '1'
      const q = { tenantId, ...(unreadOnly ? { read: false } : {}) }
      const [items, unread] = await Promise.all([
        db.collection('notifications').find(q).sort({ created_at: -1 }).limit(50).toArray(),
        db.collection('notifications').countDocuments({ tenantId, read: false }),
      ])
      return ok({ items: items.map(({ _id, ...r }) => r), unread })
    }

    if (path === 'audit') {
      const items = await db.collection('audit_logs').find({ tenantId }).sort({ created_at: -1 }).limit(100).toArray()
      return ok(items.map(({ _id, ...r }) => r))
    }

    if (path === 'activity') {
      const items = await db.collection('user_activity').find({ tenantId }).sort({ occurred_at: -1 }).limit(200).toArray()
      return ok(items.map(({ _id, ...r }) => r))
    }

    if (path === 'reports') {
      const items = await db.collection('reports').find({ tenantId }).sort({ created_at: -1 }).limit(50).toArray()
      return ok(items.map(({ _id, ...r }) => r))
    }

    if (path === 'profile') {
      const [resCount, budget, notif] = await Promise.all([
        db.collection('resources').countDocuments({ tenantId }),
        db.collection('budgets').findOne({ tenantId }, { sort: { created_at: -1 } }),
        db.collection('notifications').countDocuments({ tenantId, read: false }),
      ])
      const settings = await getTenantSettings(db, tenantId)
      return ok({ tenantId: isOrg ? tenantId : 'personal', isOrg, resources: resCount, monthly_budget: budget?.monthly_budget || 60000, unreadNotifications: notif, currency: settings.currency, role: isOrg ? 'Organization member' : 'Workspace owner' })
    }

    if (path === 'settings') {
      const [settings, conn, alerts] = await Promise.all([
        getTenantSettings(db, tenantId),
        db.collection('azure_connections').findOne({ tenantId }),
        db.collection('budget_alerts').find({ tenantId }).sort({ sentAt: -1 }).limit(10).toArray(),
      ])
      return ok({
        azure: conn ? { connected: true, azureTenantId: mask(conn.azureTenantId), azureClientId: mask(conn.azureClientId), azureSubscriptionId: mask(conn.azureSubscriptionId), connectedAt: conn.updatedAt || conn.createdAt } : { connected: false },
        dataSource: settings.dataSource,
        currency: settings.currency,
        lastSyncAt: settings.lastSyncAt,
        email: { configured: !!(settings.email?.resendApiKey), keyMask: settings.email?.resendApiKey ? 're_••••••••' : null, recipient: settings.email?.recipient || '', from: settings.email?.from || 'Cloud-Cost-Pulse <onboarding@resend.dev>' },
        rules: settings.rules,
        alerts: alerts.map((a) => ({ id: a._id, threshold: a.threshold, recipient: a.recipient, sentAt: a.sentAt || null, failedAt: a.failedAt || null, error: a.error || null })),
      })
    }

    if (path === 'tag-governance') {
      const resources = await db.collection('resources').find({ tenantId }).toArray()
      return ok(calculateTagGovernance(resources))
    }

    if (path === 'anomalies') {
      const resources = await db.collection('resources').find({ tenantId }).toArray()
      return ok({ anomalies: detectCostAnomalies(resources) })
    }

    if (path === 'monitor/health') {
      const conn = await db.collection('azure_connections').findOne({ tenantId })
      const metrics = await fetchAzureMonitorMetrics(conn || {})
      return ok(metrics)
    }

    // ---------- Alerts Endpoints ----------
    if (path === 'alerts') {
      const alerts = await db.collection('alerts').find({ tenantId }).toArray()
      return ok(alerts.map(({ _id, ...a }) => a))
    }

    if (path === 'alerts/create') {
      const { name, threshold, period, recipients } = body
      if (!name || !threshold || !period) {
        return ok({ error: 'Missing required fields' }, 400)
      }
      const newAlert = {
        tenantId,
        name,
        threshold,
        period,
        recipients: recipients || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        active: true,
      }
      await db.collection('alerts').insertOne(newAlert)
      await audit(db, tenantId, userId, { action: 'create_alert', entity: 'alert', new_value: name })
      broadcastDashboardUpdateWS({ event: 'alert_created', alertId: newAlert._id })
      return ok({ ok: true, alert: newAlert })
    }

    if (path.endsWith('/activate')) {
      const alertId = path.split('/')[1]
      await db.collection('alerts').updateOne({ tenantId, _id: alertId }, { $set: { active: true, updatedAt: new Date() } })
      await audit(db, tenantId, userId, { action: 'activate_alert', entity: 'alert', entity_id: alertId })
      broadcastDashboardUpdateWS({ event: 'alert_activated', alertId })
      return ok({ ok: true })
    }

    if (path.endsWith('/deactivate')) {
      const alertId = path.split('/')[1]
      await db.collection('alerts').updateOne({ tenantId, _id: alertId }, { $set: { active: false, updatedAt: new Date() } })
      await audit(db, tenantId, userId, { action: 'deactivate_alert', entity: 'alert', entity_id: alertId })
      broadcastDashboardUpdateWS({ event: 'alert_deactivated', alertId })
      return ok({ ok: true })
    }

    // ---------- RBAC Endpoints ----------
    if (path === 'roles') {
      const roles = await db.collection('roles').find({ tenantId }).toArray()
      return ok(roles.map(({ _id, ...r }) => r))
    }

    if (path === 'roles/assign') {
      const { targetUserId, role } = body
      if (!targetUserId || !role) {
        return ok({ error: 'Missing userId or role' }, 400)
      }
      await db.collection('roles').updateOne(
        { tenantId, userId: targetUserId },
        { $set: { role, updatedAt: new Date() } },
        { upsert: true }
      )
      await audit(db, tenantId, userId, { action: 'assign_role', entity: 'role', entity_id: targetUserId, new_value: role })
      broadcastDashboardUpdateWS({ event: 'role_assigned', userId: targetUserId, role })
      return ok({ ok: true })
    }

    // ---------- Tag Editing Endpoint ----------
    if (path.startsWith('resources/') && path.endsWith('/tags')) {
      const resourceId = path.split('/')[1]
      const { tags } = body
      if (!tags) return ok({ error: 'No tags provided' }, 400)
      await db.collection('resources').updateOne({ tenantId, id: resourceId }, { $set: { tags, updatedAt: new Date() } })
      await audit(db, tenantId, userId, { action: 'edit_tags', entity: 'resource', entity_id: resourceId, new_value: JSON.stringify(tags) })
      broadcastDashboardUpdateWS({ event: 'tags_updated', resourceId })
      return ok({ ok: true })
    }

    return ok({ error: 'Not found' }, 404)
  } catch (e) {
    console.error(e)
    return ok({ error: e.message }, 500)
  }
}

async function extraRecs() { return [] }

// =============================== POST ===============================
export async function POST(request, ctx) {
  try {
    const params = await ctx.params
    const path = (params?.path || []).join('/')
    const parts = path.split('/')

    const authRes = await requireAuth()
    if (authRes.error) return authRes.error
    const { tenantId, userId } = authRes

    const db = await getDb()
    await syncWorkspaceIdentity(db, authRes)
    await recordActivity(db, authRes, request, path)
    await seedIfEmptyForTenant(db, tenantId)
    const body = await request.json().catch(() => ({}))

    if (path === 'copilot/ask') {
      const dash = await buildDashboard(db, tenantId)
      const res = await askFinOpsCopilot({ prompt: body.prompt, data: dash })
      return ok(res)
    }

    // Bulk resource operations
    if (path === 'resources/bulk') {
      const action = body.action // 'bulk_delete', 'bulk_status'
      const ids = Array.isArray(body.ids) ? body.ids : []
      if (!ids.length) return ok({ error: 'No resource IDs provided' }, 400)

      if (action === 'bulk_delete') {
        await db.collection('resources').deleteMany({ tenantId, id: { $in: ids } })
        await audit(db, tenantId, userId, { action: 'bulk_delete', entity: 'resources', new_value: `Deleted ${ids.length} resources` })
        await notify(db, tenantId, { type: 'resource', severity: 'warning', title: 'Bulk resources deleted', message: `${ids.length} resources were deleted.` })
        broadcastDashboardUpdateWS({ event: 'bulk_delete', count: ids.length })
        return ok({ ok: true, count: ids.length })
      }

      if (action === 'bulk_status') {
        const status = body.status
        if (!STATUSES.includes(status)) return ok({ error: `Invalid status ${status}` }, 400)
        await db.collection('resources').updateMany({ tenantId, id: { $in: ids } }, { $set: { status, updated_at: new Date() } })
        await audit(db, tenantId, userId, { action: 'bulk_status', entity: 'resources', new_value: `Updated ${ids.length} resources to ${status}` })
        await notify(db, tenantId, { type: 'resource', severity: 'info', title: 'Bulk status updated', message: `${ids.length} resources updated to ${status}.` })
        broadcastDashboardUpdateWS({ event: 'bulk_status', status, count: ids.length })
        return ok({ ok: true, count: ids.length })
      }

      return ok({ error: 'Unsupported bulk action' }, 400)
    }

    // Recommendation Actions (Apply / Dismiss)
    if (path.startsWith('recommendations/')) {
      const parts = path.split('/')
      const recId = parts[1]
      const recAction = parts[2] // 'apply' or 'dismiss'

      if (recAction === 'apply') {
        await db.collection('applied_recommendations').updateOne(
          { tenantId, recId },
          { $set: { tenantId, recId, applied_at: new Date(), applied_by: userId } },
          { upsert: true }
        )
        // Handle specific optimization actions on resources in DB
        if (recId === 'rec-vm-ri') {
          const vms = await db.collection('resources').find({ tenantId, status: 'Active', service_type: 'Azure Virtual Machine' }).toArray()
          for (const vm of vms) {
            const newCost = Math.max(100, Math.round(vm.monthly_cost * 0.8))
            await db.collection('resources').updateOne({ tenantId, id: vm.id }, { $set: { monthly_cost: newCost, updated_at: new Date() } })
          }
          await audit(db, tenantId, userId, { action: 'apply_recommendation', entity: 'recommendation', entity_id: recId, new_value: 'Applied 20% Reserved Instance discount to active Virtual Machines' })
        } else if (recId === 'rec-storage-archive') {
          const storages = await db.collection('resources').find({ tenantId, status: 'Active', service_type: 'Azure Storage' }).toArray()
          for (const st of storages) {
            const newCost = Math.max(100, Math.round(st.monthly_cost * 0.85))
            await db.collection('resources').updateOne({ tenantId, id: st.id }, { $set: { monthly_cost: newCost, updated_at: new Date() } })
          }
          await audit(db, tenantId, userId, { action: 'apply_recommendation', entity: 'recommendation', entity_id: recId, new_value: 'Applied 15% Storage Archive tier optimization' })
        } else if (recId === 'rec-sql-rightsize') {
          const sqls = await db.collection('resources').find({ tenantId, status: 'Active', service_type: 'Azure SQL Database' }).toArray()
          for (const sq of sqls) {
            const newCost = Math.max(100, Math.round(sq.monthly_cost * 0.88))
            await db.collection('resources').updateOne({ tenantId, id: sq.id }, { $set: { monthly_cost: newCost, updated_at: new Date() } })
          }
          await audit(db, tenantId, userId, { action: 'apply_recommendation', entity: 'recommendation', entity_id: recId, new_value: 'Applied 12% Azure SQL right-sizing optimization' })
        } else if (recId.startsWith('rec-idle-')) {
          const resId = recId.replace('rec-idle-', '')
          const target = await db.collection('resources').findOne({ tenantId, id: resId })
          if (target) {
            await db.collection('resources').updateOne({ tenantId, id: resId }, { $set: { status: 'Inactive', monthly_cost: 0, updated_at: new Date() } })
            await audit(db, tenantId, userId, { action: 'apply_recommendation', entity: 'resource', entity_id: resId, new_value: `Deallocated ${target.resource_name}` })
          } else await audit(db, tenantId, userId, { action: 'apply_recommendation', entity: 'recommendation', entity_id: recId, new_value: 'Applied recommendation; target resource was already unavailable' })
        } else {
          // Rule-based recommendations (budget reviews, cost spikes, etc.) do not
          // mutate a resource, but their applied decision still belongs in history.
          await audit(db, tenantId, userId, { action: 'apply_recommendation', entity: 'recommendation', entity_id: recId, new_value: `Applied recommendation ${recId}` })
        }
        cacheClear(tenantId)
        broadcastDashboardUpdateWS({ event: 'recommendation_applied', recId })
        return ok({ ok: true, appliedId: recId })
      }

      if (recAction === 'dismiss') {
        await db.collection('applied_recommendations').updateOne(
          { tenantId, recId },
          { $set: { tenantId, recId, dismissed_at: new Date(), dismissed_by: userId } },
          { upsert: true }
        )
        await audit(db, tenantId, userId, { action: 'dismiss_recommendation', entity: 'recommendation', entity_id: recId })
        cacheClear(tenantId)
        broadcastDashboardUpdateWS({ event: 'recommendation_dismissed', recId })
        return ok({ ok: true, dismissedId: recId })
      }
    }

    // Export/Import full workspace backup
    if (path === 'settings/export') {
      const [resources, budgets, reports, settings, notifications] = await Promise.all([
        db.collection('resources').find({ tenantId }).toArray(),
        db.collection('budgets').find({ tenantId }).toArray(),
        db.collection('reports').find({ tenantId }).toArray(),
        db.collection('settings').findOne({ tenantId }),
        db.collection('notifications').find({ tenantId }).toArray()
      ])
      return ok({
        exportDate: new Date().toISOString(),
        tenantId,
        resources: resources.map(({ _id, ...r }) => r),
        budgets: budgets.map(({ _id, ...b }) => b),
        reports: reports.map(({ _id, ...rp }) => rp),
        notifications: notifications.map(({ _id, ...n }) => n),
        settings: settings ? { currency: settings.currency, rules: settings.rules } : {}
      })
    }

    if (path === 'settings/import') {
      const backup = body
      if (!backup || !Array.isArray(backup.resources)) {
        return ok({ error: 'Invalid backup file payload' }, 400)
      }
      if (backup.resources.length) {
        await db.collection('resources').deleteMany({ tenantId })
        await db.collection('resources').insertMany(backup.resources.map(r => ({ ...r, tenantId, id: r.id || uuidv4() })))
      }
      await audit(db, tenantId, userId, { action: 'restore_backup', entity: 'settings', new_value: `Restored ${backup.resources.length} resources from backup` })
      return ok({ ok: true, restoredResources: backup.resources.length })
    }

    if (path === 'upload') {
      const rows = Array.isArray(body.rows) ? body.rows : []
      if (!rows.length) return ok({ error: 'Upload must contain at least one resource row' }, 400)
      const docs = []
      const errors = []
      rows.slice(0, 1000).forEach((row, index) => {
        const { value, errors: rowErrors } = validateResource({
          ...row,
          resource_name: row.resource_name || row.name || row.ResourceName,
          service_type: row.service_type || row.service || row.ServiceType,
          region: row.region || row.Region,
          owner: row.owner || row.Owner,
          monthly_cost: row.monthly_cost || row.monthlyCost || row.MonthlyCost,
          status: row.status || row.Status || 'Active',
        })
        if (rowErrors.length) errors.push(`Row ${index + 2}: ${rowErrors[0]}`)
        else docs.push({ id: uuidv4(), tenantId, ...value, created_at: new Date(), updated_at: new Date() })
      })
      if (errors.length) return ok({ error: errors[0], errors: errors.slice(0, 10) }, 400)
      await db.collection('resources').insertMany(docs)
      await db.collection('settings').updateOne({ tenantId }, { $set: { dataSource: 'upload' } }, { upsert: true })
      await audit(db, tenantId, userId, { action: 'upload', entity: 'resources', new_value: `${docs.length} resources imported` })
      await notify(db, tenantId, { type: 'system', severity: 'success', title: 'Resources imported', message: `${docs.length} resources imported from your file.` })
      cacheClear(tenantId)
      return ok({ ok: true, count: docs.length }, 201)
    }

    // ---- Resources: create ----
    if (path === 'resources') {
      const { value, errors } = validateResource(body)
      if (errors.length) return ok({ error: errors[0], errors }, 400)
      const doc = { id: uuidv4(), tenantId, ...value, created_at: new Date(), updated_at: new Date() }
      await db.collection('resources').insertOne(doc)
      const { _id, ...rest } = doc
      await audit(db, tenantId, userId, { action: 'create', entity: 'resource', entity_id: doc.id, new_value: `${doc.resource_name} (${fmtMoney(doc.monthly_cost)})` })
      await notify(db, tenantId, { type: 'resource', severity: 'success', title: 'Resource added', message: `${doc.resource_name} (${doc.service_type}) added at ${fmtMoney(doc.monthly_cost)}/mo.` })
      if (doc.status === 'Inactive') await notify(db, tenantId, { type: 'resource', severity: 'warning', title: 'Unused resource detected', message: `${doc.resource_name} was added as Inactive — consider deleting it.` })
      cacheClear(tenantId)
      return ok(rest, 201)
    }

    if (path === 'budget') {
      const n = Number(body.monthly_budget || body.amount)
      if (!Number.isFinite(n) || n < 100) return ok({ error: 'Budget must be at least 100' }, 400)
      const prev = await db.collection('budgets').findOne({ tenantId }, { sort: { created_at: -1 } })
      const doc = { id: uuidv4(), tenantId, monthly_budget: Math.round(n), created_at: new Date() }
      await db.collection('budgets').insertOne(doc)
      await audit(db, tenantId, userId, { action: 'update', entity: 'budget', entity_id: doc.id, prev_value: prev ? fmtMoney(prev.monthly_budget) : null, new_value: fmtMoney(doc.monthly_budget) })
      await notify(db, tenantId, { type: 'budget', severity: 'info', title: 'Budget updated', message: `Monthly budget set to ${fmtMoney(doc.monthly_budget)}.` })
      cacheClear(tenantId)
      const { _id, ...rest } = doc
      return ok(rest)
    }

    // ---- Reports: generate + persist ----
    if (path === 'reports') {
      const type = String(body.type || 'Monthly Cost Report')
      const dash = await buildDashboard(db, tenantId)
      const resources = await db.collection('resources').find({ tenantId }).toArray()
      const regionMap = {}
      resources.forEach(r => {
        if (r.status === 'Active') {
          regionMap[r.region] = (regionMap[r.region] || 0) + (r.monthly_cost || 0)
        }
      })
      const regionBreakdown = Object.entries(regionMap)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value)

      const snapshot = {
        stats: dash.stats,
        totalMonthlyCost: dash.stats.totalMonthlyCost,
        totalResources: dash.stats.totalResources,
        activeResources: dash.stats.activeResources,
        totalServices: dash.stats.totalServices,
        potentialSavings: dash.stats.potentialSavings,
        budget: dash.budget,
        forecast: { expectedCost: dash.forecast.expectedCost, growth: dash.forecast.growth },
        serviceBreakdown: dash.serviceBreakdown,
        regionBreakdown,
        trend: dash.trend,
        recommendations: dash.recommendations.slice(0, 8),
        currency: dash.currency,
      }
      const doc = { id: uuidv4(), tenantId, type, title: `${type} — ${new Date().toLocaleDateString()}`, snapshot, created_by: userId, created_at: new Date() }
      await db.collection('reports').insertOne(doc)
      await audit(db, tenantId, userId, { action: 'generate', entity: 'report', entity_id: doc.id, new_value: type })
      await notify(db, tenantId, { type: 'report', severity: 'success', title: 'Report generated', message: `${type} generated and saved.` })
      cacheClear(tenantId)
      const { _id, ...rest } = doc
      return ok(rest, 201)
    }

    // ---- Notifications POST endpoints ----
    if (parts[0] === 'notifications') {
      if (parts[1] === 'read-all' || path === 'notifications/read-all') {
        const items = await db.collection('notifications').find({ tenantId, read: false }).toArray()
        for (const item of items) await removeNotification(db, tenantId, userId, item.id, 'accept_notification')
        return ok({ ok: true, removed: items.length })
      }
      if (parts[1] === 'clear-all' || path === 'notifications/clear-all') {
        const items = await db.collection('notifications').find({ tenantId }).toArray()
        for (const item of items) await removeNotification(db, tenantId, userId, item.id, 'dismiss_notification')
        return ok({ ok: true, removed: items.length })
      }
      if (parts[1]) {
        // Accepting/opening a notification removes it from the active queue
        // and records the action in the audit history.
        const notifId = parts[1]
        const removed = await removeNotification(db, tenantId, userId, notifId, 'accept_notification')
        return ok({ ok: true, removed })
      }
    }

    if (path === 'settings/notifications') {
      const prefs = {
        inApp: body.inApp !== false,
        budgetAlerts: body.budgetAlerts !== false,
        optAlerts: body.optAlerts !== false,
        emailAlerts: body.emailAlerts !== false,
      }
      await db.collection('settings').updateOne(
        { tenantId },
        { $set: { notification_prefs: prefs, updated_at: new Date() } },
        { upsert: true }
      )
      return ok({ saved: true, notification_prefs: prefs })
    }

    // Clear the live workspace without removing identity, settings, or audit history.
    // This is intentionally separate from /reset, which is the explicit demo-data loader.
    if (path === 'clear') {
      const clearTargets = [
        'resources', 'cost_history', 'cost_data', 'budgets', 'notifications', 'reports',
        'applied_recommendations', 'budget_alerts', 'azure_connections',
      ]
      const results = await Promise.all(clearTargets.map((name) => db.collection(name).deleteMany({ tenantId })))
      await db.collection('settings').updateOne(
        { tenantId },
        { $set: { dataSource: 'empty', lastSyncAt: null, updated_at: new Date() }, $setOnInsert: { tenantId, currency: 'INR' } },
        { upsert: true }
      )
      const removed = results.reduce((total, result) => total + (result.deletedCount || 0), 0)
      await audit(db, tenantId, userId, {
        action: 'clear_workspace', entity: 'workspace',
        new_value: `Cleared ${removed} records; identity, settings and history preserved`,
      })
      cacheClear(tenantId)
      broadcastDashboardUpdateWS({ event: 'workspace_cleared', tenantId })
      return ok({ ok: true, removed, cleared: clearTargets })
    }

    if (path === 'reset') {
      const mode = body.mode || 'replace'
      if (mode === 'replace') {
        await Promise.all([
          db.collection('resources').deleteMany({ tenantId }),
          db.collection('cost_history').deleteMany({ tenantId }),
          db.collection('cost_data').deleteMany({ tenantId, source: { $ne: 'azure' } }),
          db.collection('budgets').deleteMany({ tenantId }),
          db.collection('notifications').deleteMany({ tenantId }),
          db.collection('audit_logs').deleteMany({ tenantId }),
          db.collection('reports').deleteMany({ tenantId }),
          db.collection('meta').deleteMany({ _id: `seed:${SEED_VERSION}:${tenantId}` }),
        ])
      }
      cacheClear(tenantId)
      await seedIfEmptyForTenant(db, tenantId, { demo: true })
      return ok({ status: 'reseeded', mode })
    }

    // ---- Azure ----
    if (path === 'azure/connect') {
      const required = (name) => { const v = String(body[name] || '').trim(); if (!v) { const e = new Error(`${name} is required`); e.kind = 'VALIDATION'; throw e } return v }
      try {
        const config = { tenantId: required('tenantId'), clientId: required('clientId'), clientSecret: required('clientSecret'), subscriptionId: required('subscriptionId') }
        const validation = await validateAzureCredentials(config)
        const encrypted = encryptSecret(config.clientSecret)
        await db.collection('azure_connections').updateOne(
          { tenantId },
          { $set: { tenantId, azureTenantId: config.tenantId, azureClientId: config.clientId, azureSubscriptionId: config.subscriptionId, clientSecret: encrypted, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
          { upsert: true }
        )
        const sync = await syncAzureCosts(db, tenantId)
        await audit(db, tenantId, userId, { action: 'connect', entity: 'azure', new_value: `subscription ${mask(config.subscriptionId)}` })
        await notify(db, tenantId, { type: 'system', severity: 'success', title: 'Azure connected', message: `Live Azure billing connected. Synced ${sync.rows} rows.` })
        return ok({ ok: true, validation, sync })
      } catch (e) { return azureErrorResponse(e) }
    }

    if (path === 'azure/sync') {
      try { const sync = await syncAzureCosts(db, tenantId); return ok({ ok: true, sync }) } catch (e) { return azureErrorResponse(e) }
    }

    if (path === 'azure/disconnect') {
      await db.collection('azure_connections').deleteMany({ tenantId })
      await db.collection('cost_data').deleteMany({ tenantId, source: 'azure' })
      await db.collection('settings').updateOne({ tenantId }, { $set: { dataSource: 'demo', currency: 'INR', lastSyncAt: null } }, { upsert: true })
      await audit(db, tenantId, userId, { action: 'disconnect', entity: 'azure' })
      return ok({ ok: true, dataSource: 'demo' })
    }

    // ---- Settings ----
    if (path === 'settings/currency') {
      const currency = String(body.currency || '').trim().toUpperCase()
      if (!['INR', 'USD', 'EUR', 'GBP'].includes(currency)) return ok({ error: 'Unsupported currency' }, 400)
      await db.collection('settings').updateOne({ tenantId }, { $set: { currency } }, { upsert: true })
      await audit(db, tenantId, userId, { action: 'update', entity: 'settings', new_value: `currency ${currency}` })
      return ok({ saved: true, currency })
    }

    if (path === 'settings/email') {
      const apiKey = String(body.apiKey || '').trim()
      const recipient = String(body.recipient || '').trim()
      const from = String(body.from || '').trim()
      if (recipient && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) return ok({ error: 'Invalid recipient email address' }, 400)
      const update = {}
      if (apiKey) { if (!/^re_[A-Za-z0-9_-]{10,}$/.test(apiKey)) return ok({ error: 'Invalid Resend key format (must start with re_)' }, 400); update['email.resendApiKey'] = encryptSecret(apiKey) }
      if (recipient) update['email.recipient'] = recipient
      if (from) update['email.from'] = from
      if (!Object.keys(update).length) return ok({ error: 'Nothing to update' }, 400)
      await db.collection('settings').updateOne({ tenantId }, { $set: update }, { upsert: true })
      return ok({ saved: true })
    }

    if (path === 'settings/email/test') {
      const settings = await getTenantSettings(db, tenantId)
      if (!settings.email?.resendApiKey || !settings.email?.recipient) return ok({ error: 'Save a Resend API key and recipient first' }, 409)
      try {
        const res = await sendResendEmail({ apiKey: decryptResendKey(settings.email.resendApiKey), from: settings.email.from || 'Cloud-Cost-Pulse <onboarding@resend.dev>', to: settings.email.recipient, subject: 'Test alert — Cloud-Cost-Pulse', html: alertHtml({ workspace: 'your workspace', percent: 80, spent: 12000, budget: 15000, currency: settings.currency }) })
        return ok({ sent: true, emailId: res.id })
      } catch (e) { const status = e instanceof ResendRequestError ? (e.status === 429 ? 429 : e.status === 422 ? 422 : 502) : 500; return ok({ error: safeEmailError(e) }, status) }
    }

    if (path === 'settings/rules') {
      const rules = {}
      const numeric = (name, min, max) => { if (body[name] === undefined || body[name] === null || body[name] === '') return null; const v = Number(body[name]); if (!Number.isFinite(v) || v < min || v > max) { const e = new Error(`${name} must be a number between ${min} and ${max}`); e.kind = 'VALIDATION'; throw e } return v }
      try {
        const idle = numeric('idleCostThreshold', 0, 10000000)
        const spike = numeric('spikePct', 1, 1000)
        const warn = numeric('budgetWarnPct', 1, 99)
        if (idle !== null) rules['rules.idleCostThreshold'] = idle
        if (spike !== null) rules['rules.spikePct'] = spike
        if (warn !== null) rules['rules.budgetWarnPct'] = warn
        if (!Object.keys(rules).length) return ok({ error: 'Nothing to update' }, 400)
        await db.collection('settings').updateOne({ tenantId }, { $set: rules }, { upsert: true })
        await audit(db, tenantId, userId, { action: 'update', entity: 'settings', new_value: 'recommendation rules' })
        const settings = await getTenantSettings(db, tenantId)
        return ok({ saved: true, rules: settings.rules })
      } catch (e) { if (e.kind === 'VALIDATION') return ok({ error: e.message }, 400); throw e }
    }

    return ok({ error: 'Not found' }, 404)
  } catch (e) {
    console.error(e)
    return ok({ error: e.message }, 500)
  }
}

// =============================== PUT ===============================
export async function PUT(request, ctx) {
  try {
    const params = await ctx.params
    const parts = params?.path || []
    const authRes = await requireAuth()
    if (authRes.error) return authRes.error
    const { tenantId, userId } = authRes
    const db = await getDb()
    await syncWorkspaceIdentity(db, authRes)
    await recordActivity(db, authRes, request, parts.join('/'))
    const body = await request.json().catch(() => ({}))

    if (parts[0] === 'resources' && parts[1]) {
      const id = parts[1]
      const existing = await db.collection('resources').findOne({ tenantId, id })
      if (!existing) return ok({ error: 'Resource not found' }, 404)
      const { value, errors } = validateResource(body, { partial: true })
      if (errors.length) return ok({ error: errors[0], errors }, 400)
      if (!Object.keys(value).length) return ok({ error: 'Nothing to update' }, 400)
      value.updated_at = new Date()
      await db.collection('resources').updateOne({ tenantId, id }, { $set: value })
      const updated = await db.collection('resources').findOne({ tenantId, id })
      const changes = Object.keys(value).filter((k) => k !== 'updated_at' && existing[k] !== value[k])
      const prevStr = changes.map((k) => `${k}: ${existing[k]}`).join(', ')
      const newStr = changes.map((k) => `${k}: ${value[k]}`).join(', ')
      await audit(db, tenantId, userId, { action: 'update', entity: 'resource', entity_id: id, prev_value: prevStr || null, new_value: newStr || null })
      await notify(db, tenantId, { type: 'resource', severity: 'info', title: 'Resource updated', message: `${updated.resource_name} was updated${changes.length ? ` (${changes.join(', ')})` : ''}.` })
      cacheClear(tenantId)
      const { _id, ...rest } = updated
      return ok(rest)
    }

    if (parts[0] === 'notifications' && parts[1]) {
      const id = parts[1]
      const read = body.read !== undefined ? !!body.read : true
      await db.collection('notifications').updateOne({ tenantId, id }, { $set: { read } })
      return ok({ ok: true })
    }

    return ok({ error: 'Not found' }, 404)
  } catch (e) {
    console.error(e)
    return ok({ error: e.message }, 500)
  }
}

// =============================== DELETE ===============================
export async function DELETE(request, ctx) {
  try {
    const params = await ctx.params
    const parts = params?.path || []
    const authRes = await requireAuth()
    if (authRes.error) return authRes.error
    const { tenantId, userId } = authRes
    const db = await getDb()
    await syncWorkspaceIdentity(db, authRes)
    await recordActivity(db, authRes, request, parts.join('/'))

    if (parts[0] === 'resources' && parts[1]) {
      const id = parts[1]
      const existing = await db.collection('resources').findOne({ tenantId, id })
      if (!existing) return ok({ error: 'Resource not found' }, 404)
      await db.collection('resources').deleteOne({ tenantId, id })
      await audit(db, tenantId, userId, { action: 'delete', entity: 'resource', entity_id: id, prev_value: `${existing.resource_name} (${fmtMoney(existing.monthly_cost)})` })
      await notify(db, tenantId, { type: 'resource', severity: 'warning', title: 'Resource deleted', message: `${existing.resource_name} (${existing.service_type}) was deleted.` })
      cacheClear(tenantId)
      return ok({ ok: true })
    }

    if (parts[0] === 'reports' && parts[1]) {
      await db.collection('reports').deleteOne({ tenantId, id: parts[1] })
      return ok({ ok: true })
    }

    if (parts[0] === 'notifications') {
      if (parts[1]) {
        const removed = await removeNotification(db, tenantId, userId, parts[1], 'dismiss_notification')
        return ok({ ok: true, removed })
      }
      const items = await db.collection('notifications').find({ tenantId }).toArray()
      for (const item of items) await removeNotification(db, tenantId, userId, item.id, 'dismiss_notification')
      return ok({ ok: true, removed: items.length })
    }

    return ok({ error: 'Not found' }, 404)
  } catch (e) {
    console.error(e)
    return ok({ error: e.message }, 500)
  }
}
