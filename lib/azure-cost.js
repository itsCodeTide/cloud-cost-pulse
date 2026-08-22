const ARM = 'https://management.azure.com'
const API_VERSION = '2026-06-01'

function assertGuid(value, name) {
  if (!/^[0-9a-fA-F-]{20,}$/.test(value || '')) {
    const e = new Error(`Invalid ${name}`)
    e.status = 400
    e.kind = 'VALIDATION'
    throw e
  }
}

async function readError(response) {
  const text = await response.text()
  try {
    const json = JSON.parse(text)
    return json.error_description || json.error?.message || json.error || text
  } catch {
    return text || response.statusText
  }
}

export async function getArmToken({ tenantId, clientId, clientSecret }) {
  assertGuid(tenantId, 'tenantId')
  assertGuid(clientId, 'clientId')

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: `${ARM}//.default`,
    grant_type: 'client_credentials',
  })

  const response = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
    }
  )

  if (!response.ok) {
    const error = new Error(await readError(response))
    error.status = response.status
    error.kind = 'TOKEN_ERROR'
    throw error
  }

  const json = await response.json()
  if (!json.access_token) throw new Error('Token response had no access_token')
  return json.access_token
}

function subscriptionScope(subscriptionId) {
  assertGuid(subscriptionId, 'subscriptionId')
  return `/subscriptions/${subscriptionId}`
}

function queryUrl(subscriptionId) {
  return `${ARM}${subscriptionScope(subscriptionId)}/providers/Microsoft.CostManagement/query?api-version=${API_VERSION}`
}

export function costQueryBody(from, to) {
  return {
    type: 'Usage',
    timeframe: 'Custom',
    timePeriod: { from, to },
    dataset: {
      granularity: 'Monthly',
      aggregation: {
        totalCost: { name: 'PreTaxCost', function: 'Sum' },
      },
      grouping: [{ type: 'Dimension', name: 'ServiceName' }],
    },
  }
}

async function postCostQuery({ subscriptionId, token, body }) {
  const response = await fetch(queryUrl(subscriptionId), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (response.status === 204) return { properties: { columns: [], rows: [] } }
  if (!response.ok) {
    const error = new Error(await readError(response))
    error.status = response.status
    error.kind = 'COST_QUERY_ERROR'
    throw error
  }
  return response.json()
}

function isoDate(date) {
  return date.toISOString().slice(0, 10)
}

export async function queryMonthlyCosts(config) {
  const now = new Date()
  // Last 12 months including the current (partial) month.
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
  const token = await getArmToken(config)
  const result = await postCostQuery({
    subscriptionId: config.subscriptionId,
    token,
    body: costQueryBody(`${isoDate(from)}T00:00:00Z`, now.toISOString()),
  })

  const columns = result.properties?.columns || []
  const rows = result.properties?.rows || []
  return rows.map((row) => Object.fromEntries(columns.map((c, i) => [c.name, row[i]])))
}

export async function validateAzureCredentials(config) {
  const token = await getArmToken(config)
  const now = new Date()
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const result = await postCostQuery({
    subscriptionId: config.subscriptionId,
    token,
    body: {
      type: 'Usage',
      timeframe: 'Custom',
      timePeriod: { from: `${isoDate(from)}T00:00:00Z`, to: now.toISOString() },
      dataset: {
        granularity: 'None',
        aggregation: { totalCost: { name: 'PreTaxCost', function: 'Sum' } },
      },
    },
  })
  return { valid: true, hasData: (result.properties?.rows || []).length > 0 }
}
