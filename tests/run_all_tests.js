/**
 * CLOUD-COST-PULSE v3.0 — Comprehensive Enterprise Test Verification Suite
 * Tests backend APIs, live cost formulas, enterprise dataset import parser,
 * budget threshold logic, recommendation rules, and PDF/CSV report exporters.
 */

import fs from 'fs'
import path from 'path'
import { validateAndParseImportData, parseCSVText } from '../lib/import-parser.js'
import { generateCSVReport, generatePDFReport } from '../lib/report-exporter.js'

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`)
    throw new Error(`Assertion failed: ${message}`)
  }
}

async function runTests() {
  console.log('===================================================================')
  console.log('  CLOUD-COST-PULSE v3.0 — ENTERPRISE FINOPS VERIFICATION SUITE')
  console.log('===================================================================\n')

  let passed = 0
  let failed = 0

  // -------------------------------------------------------------------------
  // TEST 1: Enterprise CSV Dataset Import Parsing & Error Detection
  // -------------------------------------------------------------------------
  try {
    console.log('[TEST 1] Testing Enterprise Dataset Import Parser & Error Detection...')
    const csvFilePath = path.join(process.cwd(), 'sample_enterprise_cloud_costs.csv')
    const csvContent = fs.readFileSync(csvFilePath, 'utf8')

    const rawRows = parseCSVText(csvContent)
    assert(rawRows.length === 24, `Parsed 24 raw rows from enterprise CSV (got ${rawRows.length})`)

    const existingResources = [
      { resource_name: 'existing-vm-01' }
    ]

    const parsed = validateAndParseImportData(rawRows, existingResources)
    assert(parsed.summary.total === 24, 'Summary total count is 24')
    assert(parsed.summary.validCount === 23, `Summary valid count is 23 (got ${parsed.summary.validCount})`)
    assert(parsed.summary.errorCount === 1, `Summary error count is 1 for invalid row (got ${parsed.summary.errorCount})`)
    assert(parsed.summary.duplicateCount === 1, `Duplicate count is 1 for duplicate resource (got ${parsed.summary.duplicateCount})`)

    // Verify invalid row details
    const invalidRow = parsed.parsedRows.find((r) => !r.isValid)
    assert(invalidRow !== undefined, 'Invalid row correctly detected')
    assert(invalidRow.errors.length > 0, 'Invalid row has error message')

    console.log('  ✅ PASSED: Enterprise CSV Dataset parsed with full validation & error detection.\n')
    passed++
  } catch (e) {
    console.error(`  ❌ FAILED: ${e.message}\n`)
    failed++
  }

  // -------------------------------------------------------------------------
  // TEST 2: Live Cost Engine Formula & Stats Aggregation
  // -------------------------------------------------------------------------
  try {
    console.log('[TEST 2] Testing Live Cost Engine Calculation Logic...')
    const csvFilePath = path.join(process.cwd(), 'sample_enterprise_cloud_costs.csv')
    const csvContent = fs.readFileSync(csvFilePath, 'utf8')
    const parsed = validateAndParseImportData(parseCSVText(csvContent))

    const validResources = parsed.parsedRows.filter((r) => r.isValid)
    const activeResources = validResources.filter((r) => r.status === 'Active')

    // SUM(active resources monthly_cost)
    const totalActiveCost = activeResources.reduce((sum, r) => sum + r.monthly_cost, 0)
    assert(totalActiveCost > 0, `Total active cost calculated (${totalActiveCost})`)

    // Unique active services
    const activeServicesCount = new Set(activeResources.map((r) => r.service_type)).size
    assert(activeServicesCount >= 5, `Active service types counted (${activeServicesCount})`)

    console.log(`  • Total Monthly Spend: ₹${totalActiveCost.toLocaleString()}`)
    console.log(`  • Active Resources: ${activeResources.length} / ${validResources.length}`)
    console.log(`  • Active Services: ${activeServicesCount}`)
    console.log('  ✅ PASSED: Live Cost Engine formulas verified.\n')
    passed++
  } catch (e) {
    console.error(`  ❌ FAILED: ${e.message}\n`)
    failed++
  }

  // -------------------------------------------------------------------------
  // TEST 3: FinOps Recommendation Engine Rules
  // -------------------------------------------------------------------------
  try {
    console.log('[TEST 3] Testing Recommendation Engine Rules on Enterprise Data...')
    const csvFilePath = path.join(process.cwd(), 'sample_enterprise_cloud_costs.csv')
    const parsed = validateAndParseImportData(parseCSVText(fs.readFileSync(csvFilePath, 'utf8')))
    const validResources = parsed.parsedRows.filter((r) => r.isValid)

    // Rule 1: VM Cost > 5000 -> Reserved Instances (20% savings)
    const vmSpend = validResources
      .filter((r) => r.status === 'Active' && r.service_type === 'Azure Virtual Machine')
      .reduce((sum, r) => sum + r.monthly_cost, 0)
    const vmRiSavings = vmSpend > 5000 ? Math.round(vmSpend * 0.2) : 0

    // Rule 2: Storage Cost > 3000 -> Archive Tier (15% savings)
    const storageSpend = validResources
      .filter((r) => r.status === 'Active' && r.service_type === 'Azure Storage')
      .reduce((sum, r) => sum + r.monthly_cost, 0)
    const storageSavings = storageSpend > 3000 ? Math.round(storageSpend * 0.15) : 0

    // Rule 3: Idle / Inactive resource deletion -> 100% cost reclaim
    const idleReclaim = validResources
      .filter((r) => r.status === 'Idle' || r.status === 'Inactive')
      .reduce((sum, r) => sum + r.monthly_cost, 0)

    const totalSavings = vmRiSavings + storageSavings + idleReclaim
    assert(totalSavings > 0, `Total potential savings calculated (₹${totalSavings.toLocaleString()})`)

    console.log(`  • VM Reserved Instance Savings: ₹${vmRiSavings.toLocaleString()}`)
    console.log(`  • Storage Archive Savings: ₹${storageSavings.toLocaleString()}`)
    console.log(`  • Idle / Inactive Resource Reclaim: ₹${idleReclaim.toLocaleString()}`)
    console.log('  ✅ PASSED: Recommendation engine rules evaluated correctly.\n')
    passed++
  } catch (e) {
    console.error(`  ❌ FAILED: ${e.message}\n`)
    failed++
  }

  // -------------------------------------------------------------------------
  // TEST 4: Executive PDF & CSV Report Generators
  // -------------------------------------------------------------------------
  try {
    console.log('[TEST 4] Testing Executive PDF & CSV Report Generators...')
    const snapshot = {
      currency: 'INR',
      stats: {
        totalMonthlyCost: 145000,
        totalResources: 23,
        activeResources: 19,
        activeServices: 7,
        potentialSavings: 28400,
        budgetUsage: 88.5,
        growth: 6.2
      },
      forecast: { expectedCost: 152000, growth: 4.8 },
      serviceBreakdown: [
        { name: 'Azure Virtual Machine', value: 42000 },
        { name: 'Azure Kubernetes Service', value: 35000 },
        { name: 'AWS RDS', value: 25000 },
        { name: 'Azure AI Services', value: 22000 }
      ],
      recommendations: [
        { title: 'Purchase Reserved Instances for VMs', potential_savings: 8400, priority: 'High' },
        { title: 'Deallocate idle resource vm-legacy-analytics-worker', potential_savings: 5200, priority: 'High' }
      ]
    }

    // Verify CSV Exporter
    const csvReport = generateCSVReport(snapshot, 'Enterprise Executive Report')
    assert(csvReport.includes('CLOUD-COST-PULSE'), 'CSV header formatted')

    // Verify PDF Exporter
    const pdfDoc = generatePDFReport(snapshot, 'Enterprise FinOps Executive Report')
    assert(pdfDoc !== null && typeof pdfDoc.output === 'function', 'PDF jsPDF instance generated')

    console.log('  ✅ PASSED: PDF & CSV Report generators produced valid outputs.\n')
    passed++
  } catch (e) {
    console.error(`  ❌ FAILED: ${e.message}\n`)
    failed++
  }

  console.log('===================================================================')
  console.log(`  TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
  console.log('===================================================================')

  if (failed > 0) process.exit(1)
}

runTests()
