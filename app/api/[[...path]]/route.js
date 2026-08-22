import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { auth } from '@clerk/nextjs/server'
import { encryptSecret, decryptSecret } from '@/lib/secret'
import { queryMonthlyCosts, validateAzureCredentials } from '@/lib/azure-cost'
import { sendResendEmail, ResendRequestError, escapeHtml } from '@/lib/resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'cloud_cost_pulse'

let cachedClient = null
async function getDb() {
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URL, { maxPoolSize: 10 })
    await cachedClient.connect()
  }
  return cachedClient.db(DB_NAME)
}

const SERVICES = [
  { key: 'vm', name: 'Azure Virtual Machines', color: '#3b82f6', base: 3000 },
  { key: 'storage', name: 'Azure Storage', color: '#8b5cf6', base: 1500 },
  { key: 'sql', name: 'Azure SQL Database', color: '#ec4899', base: 2200 },
  { key: 'appservice', name: 'Azure App Service', color: '#f59e0b', base: 1800 },
  { key: 'functions', name: 'Azure Functions', color: '#10b981', base: 900 },
]
const PALETTE = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#a3e635', '#eab308', '#6366f1', '#14b8a6', '#fb923c']
const REGIONS = ['centralindia', 'eastus', 'westeurope', 'southeastasia', 'uksouth']
const STATUSES = ['running', 'stopped', 'idle', 'running', 'running']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DEFAULT_RULES = { idleCostThreshold: 500, spikePct: 25, budgetWarnPct: 80 }

function rand(min, max) { return Math.random() * (max - min) + min }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'other' }
function ok(data, status = 200) { return NextResponse.json(data, { status }) }

async function requireAuth() {
  const { userId, orgId } = await auth()
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  // Team workspaces: when a Clerk organization is active, all members share the org's data.
  return { userId, tenantId: orgId || userId, isOrg: !!orgId }
}

async function seedIfEmptyForTenant(db, tenantId) {
  const existing = await db.collection('meta').findOne({ _id: `seed:${tenantId}` })
  if (existing?.done) return

  // Migrate legacy per-user documents (previously keyed by clerkUserId) to tenantId
  let migrated = 0
  for (const c of ['resources', 'cost_data', 'budgets', 'recommendations']) {
    const r = await db.collection(c).updateMany(
      { clerkUserId: tenantId, tenantId: { $exists: false } },
      { $set: { tenantId } }
    )
    migrated += r.modifiedCount
  }
  if (migrated > 0) {
    await db.collection('meta').updateOne({ _id: `seed:${tenantId}` }, { $set: { done: true, migrated: true, at: new Date() } }, { upsert: true })
    return
  }

  const resources = []
  for (let i = 0; i < 24; i++) {
    const svc = SERVICES[i % SERVICES.length]
    resources.push({
      id: uuidv4(),
      tenantId,
      resource_name: `${svc.key}-${String(i + 1).padStart(3, '0')}`,
      service_type: svc.name,
      region: REGIONS[i % REGIONS.length],
      status: STATUSES[i % STATUSES.length],
      monthly_cost: Math.round(svc.base * rand(0.6, 1.4)),
      created_at: new Date(),
    })
  }
  await db.collection('resources').insertMany(resources)

  const now = new Date()
  const costData = []
  for (let m = 7; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const monthLabel = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
    for (const svc of SERVICES) {
      const trend = 1 + (7 - m) * 0.04
      costData.push({
        id: uuidv4(),
        tenantId,
        month: monthLabel,
        month_index: d.getFullYear() * 12 + d.getMonth(),
        service: svc.name,
        service_key: svc.key,
        cost: Math.round(svc.base * trend * rand(0.85, 1.15)),
        created_at: new Date(),
      })
    }
  }
  await db.collection('cost_data').insertMany(costData)

  await db.collection('budgets').insertOne({
    id: uuidv4(), tenantId, monthly_budget: 15000, created_at: new Date(),
  })

  const recs = [
    { title: 'Purchase Reserved Instances for prod-vm-01', description: 'This VM ran 24/7 for 90+ days. A 1-year reservation saves ~35%.', potential_savings: 1800, category: 'compute', severity: 'medium' },
    { title: 'Delete 12 orphaned managed disks', description: 'Unattached disks are still billed. Cleanup will free ~950/month.', potential_savings: 950, category: 'storage', severity: 'high' },
    { title: 'Move cold blobs to Archive tier', description: '48 GB of blobs untouched in 90 days. Moving to Archive tier reduces storage cost by up to 80%.', potential_savings: 420, category: 'storage', severity: 'low' },
    { title: 'Right-size Azure SQL DB (S3 to S1)', description: 'DTU usage stays below 20%. Downgrading tier keeps performance and cuts cost.', potential_savings: 1100, category: 'database', severity: 'medium' },
    { title: 'Enable autoscale on App Service Plan', description: 'Traffic is spiky. Autoscale can trim off-peak compute cost.', potential_savings: 680, category: 'compute', severity: 'medium' },
  ]
  await db.collection('recommendations').insertMany(recs.map(r => ({ id: uuidv4(), tenantId, created_at: new Date(), ...r })))

  await db.collection('meta').insertOne({ _id: `seed:${tenantId}`, done: true, at: new Date() })
}

async function getTenantSettings(db, tenantId) {
  const doc = await db.collection('settings').findOne({ tenantId })
  return {
    dataSource: doc?.dataSource || 'demo',
    currency: doc?.currency || 'INR',
    lastSyncAt: doc?.lastSyncAt || null,
    email: doc?.email || null,
    rules: { ...DEFAULT_RULES, ...(doc?.rules || {}) },
  }
}

// ---------- Custom rule-based recommendations ----------
function generateRuleRecs({ resources, trend, services, rules, currency }) {
  const recs = []
  const fmt = (n) => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0)

  // Rule 1: idle/stopped resources costing more than the user's threshold
  const idle = (resources || [])
    .filter(r => (r.status === 'idle' || r.status === 'stopped') && r.monthly_cost >= rules.idleCostThreshold)
    .sort((a, b) => b.monthly_cost - a.monthly_cost)
    .slice(0, 5)
  for (const r of idle) {
    recs.push({
      id: `rule-idle-${r.id}`,
      title: `Deallocate ${r.status} resource ${r.resource_name}`,
      description: `${r.service_type} in ${r.region} is ${r.status} but still costs ${fmt(r.monthly_cost)}/mo — above your idle threshold of ${fmt(rules.idleCostThreshold)}.`,
      potential_savings: r.monthly_cost,
      category: 'idle-resource',
      severity: r.monthly_cost >= rules.idleCostThreshold * 3 ? 'high' : 'medium',
      rule_based: true,
      rule: `idle >= ${rules.idleCostThreshold}`,
    })
  }

  // Rule 2: month-over-month cost spikes per service above the user's percentage threshold
  if (trend.length >= 2) {
    const cur = trend[trend.length - 1]
    const prev = trend[trend.length - 2]
    for (const s of services) {
      const c = cur[s.key] || 0
      const p = prev[s.key] || 0
      if (p > 0 && c > p) {
        const growth = ((c - p) / p) * 100
        if (growth >= rules.spikePct) {
          recs.push({
            id: `rule-spike-${s.key}`,
            title: `Investigate ${Math.round(growth)}% cost spike in ${s.name}`,
            description: `${s.name} jumped from ${fmt(p)} to ${fmt(c)} month-over-month (+${Math.round(growth)}%), exceeding your ${rules.spikePct}% spike threshold.`,
            potential_savings: Math.round(c - p),
            category: 'cost-spike',
            severity: growth >= rules.spikePct * 2 ? 'high' : 'medium',
            rule_based: true,
            rule: `spike >= ${rules.spikePct}%`,
          })
        }
      }
    }
  }
  return recs
}

// ---------- Dashboard ----------
async function buildDashboard(db, tenantId) {
  const settings = await getTenantSettings(db, tenantId)
  const useAzure = settings.dataSource === 'azure'
  const costFilter = { tenantId, ...(useAzure ? { source: 'azure' } : { source: { $ne: 'azure' } }) }

  const [resources, costData, budgetDoc, staticRecs, connection] = await Promise.all([
    db.collection('resources').find({ tenantId }).toArray(),
    db.collection('cost_data').find(costFilter).sort({ month_index: 1 }).toArray(),
    db.collection('budgets').findOne({ tenantId }, { sort: { created_at: -1 } }),
    db.collection('recommendations').find({ tenantId }).toArray(),
    db.collection('azure_connections').findOne({ tenantId }),
  ])

  // Derive service list dynamically (works for both demo and live Azure data)
  const serviceMap = new Map()
  for (const c of costData) {
    if (!serviceMap.has(c.service_key)) {
      const demoColor = SERVICES.find(s => s.key === c.service_key)?.color
      serviceMap.set(c.service_key, { key: c.service_key, name: c.service, color: demoColor || PALETTE[serviceMap.size % PALETTE.length] })
    }
  }
  const services = [...serviceMap.values()]

  const byMonth = {}
  for (const c of costData) {
    if (!byMonth[c.month]) byMonth[c.month] = { month: c.month, month_index: c.month_index, total: 0 }
    byMonth[c.month].total += c.cost
    byMonth[c.month][c.service_key] = (byMonth[c.month][c.service_key] || 0) + c.cost
  }
  const trend = Object.values(byMonth).sort((a, b) => a.month_index - b.month_index)
    .map(t => ({ ...t, total: Math.round(t.total * 100) / 100 }))
  const currentMonth = trend[trend.length - 1] || { total: 0, month_index: 0 }
  const prevMonth = trend[trend.length - 2]

  const serviceBreakdown = services.map(s => ({
    name: s.name, key: s.key, color: s.color,
    value: Math.round(((currentMonth[s.key] || 0)) * 100) / 100,
  })).sort((a, b) => b.value - a.value)

  const last3 = trend.slice(-3).map(t => t.total)
  const forecast = last3.length ? Math.round(last3.reduce((a, b) => a + b, 0) / last3.length) : 0
  const growth = prevMonth?.total ? ((currentMonth.total - prevMonth.total) / prevMonth.total) * 100 : 0
  const forecastGrowth = currentMonth.total ? ((forecast - currentMonth.total) / currentMonth.total) * 100 : 0

  const budget = budgetDoc?.monthly_budget || 15000
  const used = currentMonth.total
  const remaining = Math.max(0, budget - used)
  const budgetUsage = Math.min(100, (used / budget) * 100)

  const ruleRecs = generateRuleRecs({ resources, trend, services, rules: settings.rules, currency: settings.currency })
  const allRecs = [...ruleRecs, ...staticRecs.map(({ _id, ...r }) => r)].sort((a, b) => (b.potential_savings || 0) - (a.potential_savings || 0))
  const potentialSavings = allRecs.reduce((s, r) => s + (r.potential_savings || 0), 0)

  return {
    stats: {
      totalMonthlyCost: used,
      totalResources: resources.length,
      activeServices: serviceBreakdown.filter(s => s.value > 0).length,
      potentialSavings: Math.round(potentialSavings),
      budgetUsage: Math.round(budgetUsage * 10) / 10,
      growth: Math.round(growth * 10) / 10,
    },
    services,
    trend,
    serviceBreakdown,
    forecast: { expectedCost: forecast, growth: Math.round(forecastGrowth * 10) / 10, basis: last3 },
    budget: { monthly_budget: budget, used, remaining, usage_pct: Math.round(budgetUsage * 10) / 10 },
    recommendations: allRecs.slice(0, 4),
    currency: settings.currency,
    dataSource: useAzure && costData.length ? 'azure' : 'demo',
    meta: {
      azureConnected: !!connection,
      emailConfigured: !!(settings.email?.resendApiKey && settings.email?.recipient),
      lastSyncAt: settings.lastSyncAt,
      rules: settings.rules,
    },
  }
}

// ---------- Budget alert emails (Resend) ----------
function alertHtml({ workspace, percent, spent, budget, currency }) {
  const fmt = (n) => new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0)
  const isFinal = percent >= 100
  return `<!doctype html>
<html><body style="font-family:Arial,sans-serif;color:#172033;padding:24px">
  <h2 style="color:${isFinal ? '#dc2626' : '#d97706'}">${isFinal ? 'Budget exceeded' : 'Budget warning'} — Cloud-Cost-Pulse</h2>
  <p>Workspace <strong>${escapeHtml(workspace)}</strong> has reached <strong>${percent}%</strong> of its monthly cloud budget.</p>
  <table style="border-collapse:collapse">
    <tr><td style="padding:4px 12px 4px 0">Spent:</td><td><strong>${fmt(spent)}</strong></td></tr>
    <tr><td style="padding:4px 12px 4px 0">Budget:</td><td><strong>${fmt(budget)}</strong></td></tr>
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
    await db.collection('budget_alerts').updateOne(
      { _id: alertId },
      { $set: { tenantId, threshold, pct, recipient: email.recipient, resendEmailId: res.id, sentAt: new Date() } },
      { upsert: true }
    )
    return { sent: true, threshold, recipient: email.recipient }
  } catch (e) {
    await db.collection('budget_alerts').updateOne(
      { _id: alertId },
      { $set: { tenantId, threshold, pct, recipient: email.recipient, error: safeEmailError(e), failedAt: new Date() } },
      { upsert: true }
    )
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

// Resend keys are stored encrypted; support legacy plaintext just in case.
function decryptResendKey(stored) {
  if (typeof stored === 'string') return stored
  return decryptSecret(stored)
}

// ---------- Azure sync ----------
async function syncAzureCosts(db, tenantId) {
  const conn = await db.collection('azure_connections').findOne({ tenantId })
  if (!conn) {
    const e = new Error('No Azure connection configured for this workspace')
    e.status = 404
    throw e
  }
  const config = {
    tenantId: conn.azureTenantId,
    clientId: conn.azureClientId,
    clientSecret: decryptSecret(conn.clientSecret),
    subscriptionId: conn.azureSubscriptionId,
  }
  const rows = await queryMonthlyCosts(config)

  const docs = []
  let currency = 'USD'
  for (const row of rows) {
    const raw = row.UsageDate ?? row.BillingMonth ?? row.UsageDateTime
    let y, m
    if (typeof raw === 'number') {
      const s = String(raw)
      y = Number(s.slice(0, 4)); m = Number(s.slice(4, 6))
    } else if (raw) {
      const d = new Date(raw)
      if (isNaN(d)) continue
      y = d.getUTCFullYear(); m = d.getUTCMonth() + 1
    } else continue
    if (!y || !m || m < 1 || m > 12) continue
    if (row.Currency) currency = row.Currency
    const name = row.ServiceName || 'Other services'
    docs.push({
      id: uuidv4(),
      tenantId,
      source: 'azure',
      month: `${MONTHS[m - 1]} ${y}`,
      month_index: y * 12 + (m - 1),
      service: name,
      service_key: slug(name),
      cost: Math.round(Number(row.PreTaxCost ?? row.Cost ?? 0) * 100) / 100,
      created_at: new Date(),
    })
  }

  if (docs.length > 0) {
    await db.collection('cost_data').deleteMany({ tenantId, source: 'azure' })
    await db.collection('cost_data').insertMany(docs)
    await db.collection('settings').updateOne(
      { tenantId },
      { $set: { dataSource: 'azure', currency, lastSyncAt: new Date() } },
      { upsert: true }
    )
  } else {
    await db.collection('settings').updateOne(
      { tenantId },
      { $set: { lastSyncAt: new Date() } },
      { upsert: true }
    )
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
  if (e.status === 400 || e.status === 401 || e.status === 403) {
    return ok({ error: 'Credentials could not be validated. Check tenant ID, client ID, client secret, subscription ID, and that the app has the Cost Management Reader role on the subscription.' }, 422)
  }
  if (e.status === 404) return ok({ error: e.message || 'Not found' }, 404)
  if (e.status === 429 || e.status === 503) return ok({ error: 'Azure is temporarily throttling or unavailable; retry shortly.' }, 503)
  return ok({ error: 'Unable to reach Azure Cost Management. Verify the credentials and try again.' }, 502)
}

// =============================== GET ===============================
export async function GET(request, ctx) {
  try {
    const params = await ctx.params
    const path = (params?.path || []).join('/')

    if (path === '' || path === 'health') {
      return ok({ status: 'ok', service: 'cloud-cost-pulse' })
    }

    const authRes = await requireAuth()
    if (authRes.error) return authRes.error
    const { tenantId, isOrg } = authRes

    const db = await getDb()
    await seedIfEmptyForTenant(db, tenantId)

    if (path === 'dashboard') {
      const dash = await buildDashboard(db, tenantId)
      let emailAlert = null
      try { emailAlert = await maybeSendBudgetAlerts(db, tenantId, dash) } catch (e) { console.error('alert check failed', e.message) }
      return ok({ ...dash, workspace: { isOrg, tenantId: isOrg ? tenantId : 'personal' }, emailAlert })
    }
    if (path === 'resources') {
      const items = await db.collection('resources').find({ tenantId }).sort({ monthly_cost: -1 }).toArray()
      return ok(items.map(({ _id, ...r }) => r))
    }
    if (path === 'cost-data') {
      const items = await db.collection('cost_data').find({ tenantId }).sort({ month_index: 1 }).toArray()
      return ok(items.map(({ _id, ...r }) => r))
    }
    if (path === 'recommendations') {
      const dash = await buildDashboard(db, tenantId)
      const staticRecs = await db.collection('recommendations').find({ tenantId }).toArray()
      const settings = await getTenantSettings(db, tenantId)
      const resources = await db.collection('resources').find({ tenantId }).toArray()
      const ruleRecs = generateRuleRecs({ resources, trend: dash.trend, services: dash.services, rules: settings.rules, currency: settings.currency })
      const all = [...ruleRecs, ...staticRecs.map(({ _id, ...r }) => r)].sort((a, b) => (b.potential_savings || 0) - (a.potential_savings || 0))
      return ok(all)
    }
    if (path === 'budget') {
      const b = await db.collection('budgets').findOne({ tenantId }, { sort: { created_at: -1 } })
      if (!b) return ok({ monthly_budget: 15000 })
      const { _id, ...rest } = b
      return ok(rest)
    }
    if (path === 'settings') {
      const [settings, conn, alerts] = await Promise.all([
        getTenantSettings(db, tenantId),
        db.collection('azure_connections').findOne({ tenantId }),
        db.collection('budget_alerts').find({ tenantId }).sort({ sentAt: -1 }).limit(10).toArray(),
      ])
      return ok({
        azure: conn ? {
          connected: true,
          azureTenantId: mask(conn.azureTenantId),
          azureClientId: mask(conn.azureClientId),
          azureSubscriptionId: mask(conn.azureSubscriptionId),
          connectedAt: conn.updatedAt || conn.createdAt,
        } : { connected: false },
        dataSource: settings.dataSource,
        currency: settings.currency,
        lastSyncAt: settings.lastSyncAt,
        email: {
          configured: !!(settings.email?.resendApiKey),
          keyMask: settings.email?.resendApiKey ? 're_••••••••' : null,
          recipient: settings.email?.recipient || '',
          from: settings.email?.from || 'Cloud-Cost-Pulse <onboarding@resend.dev>',
        },
        rules: settings.rules,
        alerts: alerts.map(a => ({ id: a._id, threshold: a.threshold, recipient: a.recipient, sentAt: a.sentAt || null, failedAt: a.failedAt || null, error: a.error || null })),
      })
    }
    return ok({ error: 'Not found' }, 404)
  } catch (e) {
    console.error(e)
    return ok({ error: e.message }, 500)
  }
}

// =============================== POST ===============================
export async function POST(request, ctx) {
  try {
    const params = await ctx.params
    const path = (params?.path || []).join('/')

    const authRes = await requireAuth()
    if (authRes.error) return authRes.error
    const { tenantId } = authRes

    const db = await getDb()
    await seedIfEmptyForTenant(db, tenantId)
    const body = await request.json().catch(() => ({}))

    if (path === 'budget') {
      const doc = {
        id: uuidv4(),
        tenantId,
        monthly_budget: Number(body.monthly_budget) || 15000,
        created_at: new Date(),
      }
      await db.collection('budgets').insertOne(doc)
      const { _id, ...rest } = doc
      return ok(rest)
    }

    if (path === 'reset') {
      await db.collection('resources').deleteMany({ tenantId })
      await db.collection('cost_data').deleteMany({ tenantId, source: { $ne: 'azure' } })
      await db.collection('budgets').deleteMany({ tenantId })
      await db.collection('recommendations').deleteMany({ tenantId })
      await db.collection('meta').deleteMany({ _id: `seed:${tenantId}` })
      await seedIfEmptyForTenant(db, tenantId)
      return ok({ status: 'reseeded' })
    }

    // ---- Azure connection ----
    if (path === 'azure/connect') {
      const required = (name) => {
        const v = String(body[name] || '').trim()
        if (!v) { const e = new Error(`${name} is required`); e.kind = 'VALIDATION'; throw e }
        return v
      }
      try {
        const config = {
          tenantId: required('tenantId'),
          clientId: required('clientId'),
          clientSecret: required('clientSecret'),
          subscriptionId: required('subscriptionId'),
        }
        // Do not persist invalid credentials
        const validation = await validateAzureCredentials(config)
        const encrypted = encryptSecret(config.clientSecret)
        await db.collection('azure_connections').updateOne(
          { tenantId },
          {
            $set: {
              tenantId,
              azureTenantId: config.tenantId,
              azureClientId: config.clientId,
              azureSubscriptionId: config.subscriptionId,
              clientSecret: encrypted,
              updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
          },
          { upsert: true }
        )
        const sync = await syncAzureCosts(db, tenantId)
        return ok({ ok: true, validation, sync })
      } catch (e) {
        return azureErrorResponse(e)
      }
    }

    if (path === 'azure/sync') {
      try {
        const sync = await syncAzureCosts(db, tenantId)
        return ok({ ok: true, sync })
      } catch (e) {
        return azureErrorResponse(e)
      }
    }

    if (path === 'azure/disconnect') {
      await db.collection('azure_connections').deleteMany({ tenantId })
      await db.collection('cost_data').deleteMany({ tenantId, source: 'azure' })
      await db.collection('settings').updateOne(
        { tenantId },
        { $set: { dataSource: 'demo', currency: 'INR', lastSyncAt: null } },
        { upsert: true }
      )
      return ok({ ok: true, dataSource: 'demo' })
    }

    // ---- Email alert settings ----
    if (path === 'settings/email') {
      const apiKey = String(body.apiKey || '').trim()
      const recipient = String(body.recipient || '').trim()
      const from = String(body.from || '').trim()

      if (recipient && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        return ok({ error: 'Invalid recipient email address' }, 400)
      }
      const update = {}
      if (apiKey) {
        if (!/^re_[A-Za-z0-9_-]{10,}$/.test(apiKey)) {
          return ok({ error: 'Invalid Resend key format (must start with re_)' }, 400)
        }
        update['email.resendApiKey'] = encryptSecret(apiKey)
      }
      if (recipient) update['email.recipient'] = recipient
      if (from) update['email.from'] = from
      if (!Object.keys(update).length) return ok({ error: 'Nothing to update' }, 400)

      await db.collection('settings').updateOne({ tenantId }, { $set: update }, { upsert: true })
      return ok({ saved: true })
    }

    if (path === 'settings/email/test') {
      const settings = await getTenantSettings(db, tenantId)
      if (!settings.email?.resendApiKey || !settings.email?.recipient) {
        return ok({ error: 'Save a Resend API key and recipient first' }, 409)
      }
      try {
        const res = await sendResendEmail({
          apiKey: decryptResendKey(settings.email.resendApiKey),
          from: settings.email.from || 'Cloud-Cost-Pulse <onboarding@resend.dev>',
          to: settings.email.recipient,
          subject: 'Test alert — Cloud-Cost-Pulse',
          html: alertHtml({ workspace: 'your workspace', percent: 80, spent: 12000, budget: 15000, currency: settings.currency }),
        })
        return ok({ sent: true, emailId: res.id })
      } catch (e) {
        const status = e instanceof ResendRequestError ? (e.status === 429 ? 429 : e.status === 422 ? 422 : 502) : 500
        return ok({ error: safeEmailError(e) }, status)
      }
    }

    // ---- Custom recommendation rules ----
    if (path === 'settings/rules') {
      const rules = {}
      const numeric = (name, min, max) => {
        if (body[name] === undefined || body[name] === null || body[name] === '') return null
        const v = Number(body[name])
        if (!Number.isFinite(v) || v < min || v > max) { const e = new Error(`${name} must be a number between ${min} and ${max}`); e.kind = 'VALIDATION'; throw e }
        return v
      }
      try {
        const idle = numeric('idleCostThreshold', 0, 10000000)
        const spike = numeric('spikePct', 1, 1000)
        const warn = numeric('budgetWarnPct', 1, 99)
        if (idle !== null) rules['rules.idleCostThreshold'] = idle
        if (spike !== null) rules['rules.spikePct'] = spike
        if (warn !== null) rules['rules.budgetWarnPct'] = warn
        if (!Object.keys(rules).length) return ok({ error: 'Nothing to update' }, 400)
        await db.collection('settings').updateOne({ tenantId }, { $set: rules }, { upsert: true })
        const settings = await getTenantSettings(db, tenantId)
        return ok({ saved: true, rules: settings.rules })
      } catch (e) {
        if (e.kind === 'VALIDATION') return ok({ error: e.message }, 400)
        throw e
      }
    }

    return ok({ error: 'Not found' }, 404)
  } catch (e) {
    console.error(e)
    return ok({ error: e.message }, 500)
  }
}
