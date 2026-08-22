import { NextResponse } from 'next/server'
import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { auth } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

const MONGO_URL = process.env.MONGO_URL
const DB_NAME = process.env.DB_NAME || 'cloud_cost_pulse'

let cachedClient = null
async function getDb() {
  if (!cachedClient) {
    cachedClient = new MongoClient(MONGO_URL)
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
const REGIONS = ['centralindia', 'eastus', 'westeurope', 'southeastasia', 'uksouth']
const STATUSES = ['running', 'stopped', 'idle', 'running', 'running']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function rand(min, max) { return Math.random() * (max - min) + min }

async function seedIfEmptyForUser(db, userId) {
  const existing = await db.collection('meta').findOne({ _id: `seed:${userId}` })
  if (existing?.done) return

  const resources = []
  for (let i = 0; i < 24; i++) {
    const svc = SERVICES[i % SERVICES.length]
    resources.push({
      id: uuidv4(),
      clerkUserId: userId,
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
        clerkUserId: userId,
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
    id: uuidv4(), clerkUserId: userId, monthly_budget: 15000, created_at: new Date(),
  })

  const recs = [
    { title: 'Stop 3 idle Virtual Machines', description: 'Detected 3 VMs with <5% CPU utilization over the last 14 days. Stopping them can reduce cost immediately.', potential_savings: 2400, category: 'compute', severity: 'high' },
    { title: 'Purchase Reserved Instances for prod-vm-01', description: 'This VM ran 24/7 for 90+ days. A 1-year reservation saves ~35%.', potential_savings: 1800, category: 'compute', severity: 'medium' },
    { title: 'Delete 12 orphaned managed disks', description: 'Unattached disks are still billed. Cleanup will free ~₹950/month.', potential_savings: 950, category: 'storage', severity: 'high' },
    { title: 'Move cold blobs to Archive tier', description: '48 GB of blobs untouched in 90 days. Moving to Archive tier reduces storage cost by up to 80%.', potential_savings: 420, category: 'storage', severity: 'low' },
    { title: 'Right-size Azure SQL DB (S3 → S1)', description: 'DTU usage stays below 20%. Downgrading tier keeps performance and cuts cost.', potential_savings: 1100, category: 'database', severity: 'medium' },
    { title: 'Enable autoscale on App Service Plan', description: 'Traffic is spiky. Autoscale can trim off-peak compute cost.', potential_savings: 680, category: 'compute', severity: 'medium' },
  ]
  await db.collection('recommendations').insertMany(recs.map(r => ({ id: uuidv4(), clerkUserId: userId, created_at: new Date(), ...r })))

  await db.collection('meta').insertOne({ _id: `seed:${userId}`, done: true, at: new Date() })
}

function ok(data, status = 200) { return NextResponse.json(data, { status }) }

async function requireAuth() {
  const { userId } = await auth()
  if (!userId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  return { userId }
}

async function buildDashboard(db, userId) {
  const [resources, costData, budgetDoc, recs] = await Promise.all([
    db.collection('resources').find({ clerkUserId: userId }).toArray(),
    db.collection('cost_data').find({ clerkUserId: userId }).sort({ month_index: 1 }).toArray(),
    db.collection('budgets').findOne({ clerkUserId: userId }, { sort: { created_at: -1 } }),
    db.collection('recommendations').find({ clerkUserId: userId }).toArray(),
  ])

  const byMonth = {}
  for (const c of costData) {
    if (!byMonth[c.month]) byMonth[c.month] = { month: c.month, month_index: c.month_index, total: 0 }
    byMonth[c.month].total += c.cost
    byMonth[c.month][c.service_key] = (byMonth[c.month][c.service_key] || 0) + c.cost
  }
  const trend = Object.values(byMonth).sort((a, b) => a.month_index - b.month_index)
  const currentMonth = trend[trend.length - 1]
  const prevMonth = trend[trend.length - 2]

  const currentIdx = currentMonth.month_index
  const serviceBreakdown = SERVICES.map(s => {
    const item = costData.find(c => c.month_index === currentIdx && c.service_key === s.key)
    return { name: s.name, key: s.key, value: item?.cost || 0, color: s.color }
  })

  const last3 = trend.slice(-3).map(t => t.total)
  const forecast = Math.round(last3.reduce((a, b) => a + b, 0) / last3.length)
  const growth = prevMonth ? ((currentMonth.total - prevMonth.total) / prevMonth.total) * 100 : 0
  const forecastGrowth = ((forecast - currentMonth.total) / currentMonth.total) * 100

  const potentialSavings = recs.reduce((s, r) => s + (r.potential_savings || 0), 0)
  const budget = budgetDoc?.monthly_budget || 15000
  const used = currentMonth.total
  const remaining = Math.max(0, budget - used)
  const budgetUsage = Math.min(100, (used / budget) * 100)
  const activeServices = serviceBreakdown.filter(s => s.value > 0).length

  return {
    stats: {
      totalMonthlyCost: currentMonth.total,
      totalResources: resources.length,
      activeServices,
      potentialSavings,
      budgetUsage: Math.round(budgetUsage * 10) / 10,
      growth: Math.round(growth * 10) / 10,
    },
    trend,
    serviceBreakdown,
    forecast: {
      expectedCost: forecast,
      growth: Math.round(forecastGrowth * 10) / 10,
      basis: last3,
    },
    budget: { monthly_budget: budget, used, remaining, usage_pct: Math.round(budgetUsage * 10) / 10 },
    recommendations: recs.slice(0, 4),
  }
}

export async function GET(request, ctx) {
  try {
    const params = await ctx.params
    const path = (params?.path || []).join('/')

    if (path === '' || path === 'health') {
      return ok({ status: 'ok', service: 'cloud-cost-pulse' })
    }

    const authRes = await requireAuth()
    if (authRes.error) return authRes.error
    const { userId } = authRes

    const db = await getDb()
    await seedIfEmptyForUser(db, userId)

    if (path === 'dashboard') {
      return ok(await buildDashboard(db, userId))
    }
    if (path === 'resources') {
      const items = await db.collection('resources').find({ clerkUserId: userId }).sort({ monthly_cost: -1 }).toArray()
      return ok(items.map(({ _id, ...r }) => r))
    }
    if (path === 'cost-data') {
      const items = await db.collection('cost_data').find({ clerkUserId: userId }).sort({ month_index: 1 }).toArray()
      return ok(items.map(({ _id, ...r }) => r))
    }
    if (path === 'recommendations') {
      const items = await db.collection('recommendations').find({ clerkUserId: userId }).sort({ potential_savings: -1 }).toArray()
      return ok(items.map(({ _id, ...r }) => r))
    }
    if (path === 'budget') {
      const b = await db.collection('budgets').findOne({ clerkUserId: userId }, { sort: { created_at: -1 } })
      if (!b) return ok({ monthly_budget: 15000 })
      const { _id, ...rest } = b
      return ok(rest)
    }
    return ok({ error: 'Not found' }, 404)
  } catch (e) {
    console.error(e)
    return ok({ error: e.message }, 500)
  }
}

export async function POST(request, ctx) {
  try {
    const params = await ctx.params
    const path = (params?.path || []).join('/')

    const authRes = await requireAuth()
    if (authRes.error) return authRes.error
    const { userId } = authRes

    const db = await getDb()
    await seedIfEmptyForUser(db, userId)
    const body = await request.json().catch(() => ({}))

    if (path === 'budget') {
      const doc = {
        id: uuidv4(),
        clerkUserId: userId,
        monthly_budget: Number(body.monthly_budget) || 15000,
        created_at: new Date(),
      }
      await db.collection('budgets').insertOne(doc)
      const { _id, ...rest } = doc
      return ok(rest)
    }

    if (path === 'reset') {
      await db.collection('resources').deleteMany({ clerkUserId: userId })
      await db.collection('cost_data').deleteMany({ clerkUserId: userId })
      await db.collection('budgets').deleteMany({ clerkUserId: userId })
      await db.collection('recommendations').deleteMany({ clerkUserId: userId })
      await db.collection('meta').deleteMany({ _id: `seed:${userId}` })
      await seedIfEmptyForUser(db, userId)
      return ok({ status: 'reseeded' })
    }

    return ok({ error: 'Not found' }, 404)
  } catch (e) {
    console.error(e)
    return ok({ error: e.message }, 500)
  }
}
