/**
 * CLOUD-COST-PULSE v3.0 — Data Import Parser Module
 * Supports CSV, Excel (.xlsx, .xls), and JSON cloud cost files.
 * Provides file structure validation, error detection, duplicate checks, and standard formatting.
 */

export const ALLOWED_SERVICES = [
  'Azure Virtual Machine',
  'Azure Storage',
  'Azure SQL Database',
  'Azure App Service',
  'Azure Functions',
  'Azure Kubernetes Service',
  'Azure AI Services',
  'AWS EC2',
  'AWS S3',
  'AWS RDS',
  'AWS Lambda',
  'GCP Compute Engine',
  'GCP Cloud Storage'
]

export const ALLOWED_REGIONS = [
  'Central India',
  'East US',
  'West Europe',
  'Southeast Asia',
  'UK South',
  'East US 2',
  'North Europe',
  'us-east-1',
  'us-west-2',
  'eu-west-1',
  'ap-south-1',
  'us-central1'
]

export const ALLOWED_STATUSES = ['Active', 'Idle', 'Inactive']

/**
 * Validate and parse raw imported rows (array of objects)
 * @param {Array<Object>} rawData - Parsed JSON rows
 * @param {Array<Object>} existingResources - Current database resources to detect duplicates
 */
export function validateAndParseImportData(rawData, existingResources = []) {
  if (!Array.isArray(rawData) || rawData.length === 0) {
    return {
      valid: false,
      errors: ['File is empty or contains no readable rows.'],
      parsedRows: [],
      summary: { total: 0, validCount: 0, errorCount: 0, duplicateCount: 0 }
    }
  }

  const existingNames = new Set(existingResources.map((r) => String(r.resource_name || r.name).toLowerCase().trim()))
  const seenInFile = new Set()
  const parsedRows = []
  const globalErrors = []
  let validCount = 0
  let errorCount = 0
  let duplicateCount = 0

  rawData.forEach((row, index) => {
    const rowNum = index + 1
    const rowErrors = []

    // Normalize keys
    const normalized = {}
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = String(key).toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')
      normalized[cleanKey] = val
    }

    const name = String(normalized.resource_name || normalized.name || normalized.resource || '').trim()
    let service_type = String(normalized.service_type || normalized.service || normalized.type || '').trim()
    let region = String(normalized.region || normalized.location || '').trim()
    const owner = String(normalized.owner || normalized.team || normalized.user || 'platform-team').trim()
    let status = String(normalized.status || 'Active').trim()
    let monthly_cost = Number(normalized.monthly_cost || normalized.cost || normalized.amount || 0)
    const description = String(normalized.description || normalized.desc || 'Imported cloud resource').trim()

    // Status Capitalization
    if (status) {
      status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    }

    // Validation rules
    if (!name) {
      rowErrors.push('Missing resource name')
    }

    if (!service_type) {
      rowErrors.push('Missing service type')
    }

    if (!region) {
      region = 'East US'
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      rowErrors.push(`Invalid status "${status}". Must be Active, Idle, or Inactive`)
    }

    if (isNaN(monthly_cost) || monthly_cost <= 0) {
      rowErrors.push('Monthly cost must be a positive number')
    }

    // Duplicate detection (check existing DB + intra-file)
    const nameLower = name.toLowerCase()
    const isDuplicate = existingNames.has(nameLower) || seenInFile.has(nameLower)
    if (isDuplicate && name) {
      duplicateCount++
    }
    if (name) {
      seenInFile.add(nameLower)
    }

    const isValid = rowErrors.length === 0

    if (isValid) {
      validCount++
    } else {
      errorCount++
    }

    parsedRows.push({
      rowNumber: rowNum,
      resource_name: name,
      service_type: service_type || 'Azure Virtual Machine',
      region: region || 'East US',
      owner: owner || 'platform-team',
      status: ALLOWED_STATUSES.includes(status) ? status : 'Active',
      monthly_cost: Number(monthly_cost) || 0,
      description,
      isDuplicate,
      isValid,
      errors: rowErrors
    })
  })

  return {
    valid: globalErrors.length === 0,
    errors: globalErrors,
    parsedRows,
    summary: {
      total: rawData.length,
      validCount,
      errorCount,
      duplicateCount
    }
  }
}

/**
 * Parse CSV text into array of objects
 */
export function parseCSVText(csvContent) {
  const lines = csvContent.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^["']|["']$/g, ''))
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''))
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = values[idx] !== undefined ? values[idx] : ''
    })
    rows.push(obj)
  }

  return rows
}
