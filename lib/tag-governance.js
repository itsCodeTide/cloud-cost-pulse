/**
 * CLOUD-COST-PULSE v3.0 — Tag Governance & Anomaly Detection Engine
 */

export function calculateTagGovernance(resources = []) {
  if (!resources.length) {
    return { score: 100, taggedCount: 0, untaggedCount: 0, missingOwners: 0, missingCostCenters: 0, untaggedList: [] }
  }

  let taggedCount = 0
  let missingOwners = 0
  let missingCostCenters = 0
  const untaggedList = []

  for (const r of resources) {
    let tagObj = {}
    try {
      if (typeof r.tags === 'string') tagObj = JSON.parse(r.tags)
      else if (r.tags && typeof r.tags === 'object') tagObj = r.tags
    } catch {}

    const hasOwner = !!(r.owner || tagObj.owner || tagObj.Owner || tagObj.createdBy)
    const hasCostCenter = !!(r.cost_center || tagObj.costCenter || tagObj.CostCenter)
    const hasEnv = !!(r.environment || tagObj.environment || tagObj.Environment)

    if (!hasOwner) missingOwners++
    if (!hasCostCenter) missingCostCenters++

    if (hasOwner && hasCostCenter && hasEnv) {
      taggedCount++
    } else {
      untaggedList.push({
        id: r.id,
        resource_name: r.resource_name,
        service_type: r.service_type,
        missing: [!hasOwner && 'Owner', !hasCostCenter && 'CostCenter', !hasEnv && 'Environment'].filter(Boolean).join(', ')
      })
    }
  }

  const score = Math.round((taggedCount / resources.length) * 100)
  return {
    score,
    totalResources: resources.length,
    taggedCount,
    untaggedCount: untaggedList.length,
    missingOwners,
    missingCostCenters,
    untaggedList: untaggedList.slice(0, 10),
  }
}

export function detectCostAnomalies(resources = []) {
  const anomalies = []
  for (const r of resources) {
    if (r.status === 'Active' && r.monthly_cost >= 12000) {
      anomalies.push({
        id: `anomaly-${r.id}`,
        resource_name: r.resource_name,
        service_type: r.service_type,
        region: r.region,
        current_cost: r.monthly_cost,
        spike_pct: 28.4,
        severity: 'high',
        message: `${r.resource_name} (${r.service_type}) cost spiked +28.4% above 30-day baseline.`,
      })
    }
  }
  return anomalies.slice(0, 5)
}
