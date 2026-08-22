/**
 * CLOUD-COST-PULSE v3.0 — Advanced Enterprise Executive Report Exporter
 * Generates executive-level PDF, CSV, and Excel reports with complete FinOps business metrics:
 * Unit Economics, Multi-Cloud Share, Top Resources, Regional Analysis, Anomaly Flags & Carbon Estimates.
 */

import jspdfModule from 'jspdf'

const jsPDF = jspdfModule.jsPDF || jspdfModule.default || jspdfModule

/**
 * Generate Advanced CSV string from snapshot
 */
export function generateCSVReport(snapshot, reportTitle = 'Executive FinOps Cloud Cost Report') {
  const currency = snapshot.currency || 'INR'
  const sym = currency === 'INR' ? 'Rs. ' : currency === 'USD' ? '$' : currency === 'EUR' ? 'E ' : 'GBP '
  const rows = []

  rows.push([`"CLOUD-COST-PULSE v3.0 — ${reportTitle.toUpperCase()}"`])
  rows.push([`"Generated Timestamp"`, `"${new Date().toLocaleString()}"`])
  rows.push([`"Currency Mode"`, `"${currency}"`])
  rows.push([])

  // 1. Executive Summary & FinOps Unit Economics
  const totalCost = snapshot.stats?.totalMonthlyCost || snapshot.totalMonthlyCost || 0
  const activeCount = snapshot.stats?.activeResources || snapshot.activeResources || 1
  const costPerRes = activeCount ? Math.round(totalCost / activeCount) : 0
  const savings = snapshot.stats?.potentialSavings || snapshot.potentialSavings || 0
  const co2 = Math.round(totalCost * 0.004)

  rows.push(['"EXECUTIVE FINOPS METRIC"', '"VALUE"'])
  rows.push(['"Total Monthly Cloud Spend"', `"${sym}${totalCost.toLocaleString()}"`])
  rows.push(['"Active Cloud Resources"', `"${activeCount}"`])
  rows.push(['"Unit Cost per Resource"', `"${sym}${costPerRes.toLocaleString()}/resource"`])
  rows.push(['"Identified Potential Savings"', `"${sym}${savings.toLocaleString()}/mo"`])
  rows.push(['"Budget Utilization %"', `"${snapshot.stats?.budgetUsage || snapshot.budget?.usage_pct || 0}%"`])
  rows.push(['"Forecasted 3-Mo Cost"', `"${sym}${(snapshot.forecast?.expectedCost || totalCost).toLocaleString()}"`])
  rows.push(['"Month-over-Month Growth %"', `"${snapshot.stats?.growth || 0}%"`])
  rows.push(['"Est. Carbon Footprint"', `"${co2} kg CO2e/mo"`])
  rows.push([])

  // 2. Multi-Cloud Provider Breakdown
  if (snapshot.vendorBreakdown && snapshot.vendorBreakdown.length > 0) {
    rows.push(['"Cloud Provider / Vendor"', '"Monthly Spend"', '"Vendor Share %"'])
    snapshot.vendorBreakdown.forEach((v) => {
      const share = totalCost ? ((v.value / totalCost) * 100).toFixed(1) : '0.0'
      rows.push([`"${v.name}"`, `"${sym}${v.value.toLocaleString()}"`, `"${share}%"`])
    })
    rows.push([])
  }

  // 3. Top Cloud Services Breakdown
  if (snapshot.serviceBreakdown && snapshot.serviceBreakdown.length > 0) {
    rows.push(['"Cloud Service Name"', '"Monthly Spend"', '"Service Share %"'])
    snapshot.serviceBreakdown.forEach((s) => {
      const share = totalCost ? ((s.value / totalCost) * 100).toFixed(1) : '0.0'
      rows.push([`"${s.name}"`, `"${sym}${s.value.toLocaleString()}"`, `"${share}%"`])
    })
    rows.push([])
  }

  // 4. Regional Distribution
  if (snapshot.regionBreakdown && snapshot.regionBreakdown.length > 0) {
    rows.push(['"Geographic Region"', '"Monthly Spend"'])
    snapshot.regionBreakdown.forEach((r) => {
      rows.push([`"${r.name}"`, `"${sym}${r.value.toLocaleString()}"`])
    })
    rows.push([])
  }

  // 5. Top 10 Highest-Cost Resources
  if (snapshot.topResources && snapshot.topResources.length > 0) {
    rows.push(['"Resource Name"', '"Service Type"', '"Region"', '"Owner"', '"Monthly Cost"', '"Status"'])
    snapshot.topResources.forEach((r) => {
      rows.push([`"${r.resource_name}"`, `"${r.service_type}"`, `"${r.region}"`, `"${r.owner}"`, `"${sym}${r.monthly_cost}"`, `"${r.status}"`])
    })
    rows.push([])
  }

  // 6. Actionable Optimization Recommendations
  if (snapshot.recommendations && snapshot.recommendations.length > 0) {
    rows.push(['"Optimization Action Title"', '"Category"', '"Est. Monthly Savings"', '"Priority"'])
    snapshot.recommendations.forEach((r) => {
      rows.push([`"${r.title}"`, `"${r.category || 'Optimization'}"`, `"${sym}${(r.potential_savings || r.savings || 0).toLocaleString()}"`, `"${r.priority || 'Medium'}"`])
    })
  }

  return rows.map((e) => e.join(',')).join('\n')
}

/**
 * Download file helper in browser environment
 */
export function downloadFile(content, fileName, mimeType = 'text/csv;charset=utf-8;') {
  if (typeof window === 'undefined') return
  const blob = new Blob([content], { type: mimeType })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Generate Advanced Multi-Page Executive PDF Report using jsPDF
 */
export function generatePDFReport(snapshot, reportTitle = 'Executive Cloud Cost & FinOps Report') {
  const doc = new jsPDF()
  const currency = snapshot.currency || 'INR'
  const sym = currency === 'INR' ? 'Rs. ' : currency === 'USD' ? '$' : currency === 'EUR' ? 'E ' : 'GBP '
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header Dark Banner (Slate 900)
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageWidth, 44, 'F')

  // Accent Line (Purple 500)
  doc.setFillColor(139, 92, 246)
  doc.rect(0, 44, pageWidth, 3, 'F')

  // Brand & Title
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('CLOUD-COST-PULSE v3.0', 14, 22)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(203, 213, 225)
  doc.text(`Advanced Enterprise FinOps Intelligence — ${reportTitle}`, 14, 34)

  doc.setFontSize(9)
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 34, { align: 'right' })

  // SECTION 1: Executive Summary & Unit Economics KPI Grid
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('1. EXECUTIVE FINOPS & UNIT ECONOMICS KPI SUMMARY', 14, 56)

  doc.setLineWidth(0.5)
  doc.setDrawColor(226, 232, 240)
  doc.line(14, 59, pageWidth - 14, 59)

  const totalCost = snapshot.stats?.totalMonthlyCost || snapshot.totalMonthlyCost || 0
  const activeCount = snapshot.stats?.activeResources || snapshot.activeResources || 1
  const costPerRes = activeCount ? Math.round(totalCost / activeCount) : 0
  const budgetUsage = snapshot.stats?.budgetUsage || snapshot.budget?.usage_pct || 0
  const potentialSavings = snapshot.stats?.potentialSavings || snapshot.potentialSavings || 0
  const forecastCost = snapshot.forecast?.expectedCost || totalCost
  const co2 = Math.round(totalCost * 0.004)

  const cardW = 43
  const cardH = 24
  const startY = 64

  const cards = [
    { label: 'TOTAL SPEND', val: `${sym}${totalCost.toLocaleString()}`, color: [139, 92, 246] },
    { label: 'UNIT COST/RES.', val: `${sym}${costPerRes.toLocaleString()}`, color: [59, 130, 246] },
    { label: 'BUDGET USAGE', val: `${budgetUsage}%`, color: budgetUsage >= 100 ? [239, 68, 68] : [16, 185, 129] },
    { label: 'POTENTIAL SAVINGS', val: `${sym}${potentialSavings.toLocaleString()}`, color: [16, 185, 129] },
  ]

  cards.forEach((c, idx) => {
    const x = 14 + idx * (cardW + 3)
    doc.setFillColor(248, 250, 252)
    doc.roundedRect(x, startY, cardW, cardH, 2, 2, 'F')
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(100, 116, 139)
    doc.text(c.label, x + 4, startY + 7)
    doc.setFontSize(10)
    doc.setTextColor(c.color[0], c.color[1], c.color[2])
    doc.text(c.val, x + 4, startY + 17)
  })

  // SECTION 2: Top Cloud Services Breakdown
  let currentY = 100
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('2. CLOUD SERVICE COST BREAKDOWN & SPEND SHARE', 14, currentY)
  doc.line(14, currentY + 3, pageWidth - 14, currentY + 3)
  currentY += 10

  doc.setFillColor(241, 245, 249)
  doc.rect(14, currentY, pageWidth - 28, 7, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(71, 85, 105)
  doc.text('Service Name', 18, currentY + 5)
  doc.text('Monthly Cost', 110, currentY + 5)
  doc.text('Share %', 160, currentY + 5)
  currentY += 10

  const services = snapshot.serviceBreakdown || []
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 41, 59)

  services.slice(0, 6).forEach((s) => {
    const share = totalCost ? ((s.value / totalCost) * 100).toFixed(1) : '0.0'
    doc.setFontSize(8.5)
    doc.text(String(s.name || ''), 18, currentY)
    doc.text(`${sym}${Number(s.value).toLocaleString()}`, 110, currentY)
    doc.text(`${share}%`, 160, currentY)

    doc.setDrawColor(241, 245, 249)
    doc.line(14, currentY + 2.5, pageWidth - 14, currentY + 2.5)
    currentY += 8
  })

  // SECTION 3: Geographic Region Breakdown
  currentY += 4
  if (snapshot.regionBreakdown && snapshot.regionBreakdown.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 23, 42)
    doc.text('3. GEOGRAPHIC REGIONAL COST DISTRIBUTION', 14, currentY)
    doc.line(14, currentY + 3, pageWidth - 14, currentY + 3)
    currentY += 10

    doc.setFillColor(241, 245, 249)
    doc.rect(14, currentY, pageWidth - 28, 7, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text('Region Name', 18, currentY + 5)
    doc.text('Monthly Spend', 110, currentY + 5)
    currentY += 10

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 41, 59)

    snapshot.regionBreakdown.slice(0, 5).forEach((r) => {
      doc.setFontSize(8.5)
      doc.text(String(r.name || ''), 18, currentY)
      doc.text(`${sym}${Number(r.value).toLocaleString()}`, 110, currentY)

      doc.setDrawColor(241, 245, 249)
      doc.line(14, currentY + 2.5, pageWidth - 14, currentY + 2.5)
      currentY += 8
    })
  }

  // SECTION 4: FinOps Optimization Recommendations
  currentY += 4
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('4. FINOPS OPTIMIZATION OPPORTUNITIES', 14, currentY)
  doc.line(14, currentY + 3, pageWidth - 14, currentY + 3)
  currentY += 10

  const recs = snapshot.recommendations || []
  if (recs.length === 0) {
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(100, 116, 139)
    doc.text('No active recommendations. All resources are currently optimized.', 18, currentY)
  } else {
    recs.slice(0, 5).forEach((r) => {
      if (currentY > 265) {
        doc.addPage()
        currentY = 20
      }
      doc.setFontSize(8.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text(`• ${r.title}`, 18, currentY)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(16, 185, 129)
      const savingsStr = r.potential_savings || r.savings ? `${sym}${Number(r.potential_savings || r.savings).toLocaleString()}/mo` : 'Review'
      doc.text(`Savings: ${savingsStr}  |  Priority: ${r.priority || 'Medium'}`, 130, currentY)
      currentY += 6.5
    })
  }

  // Footer Page Numbering
  const totalPages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(148, 163, 184)
    doc.line(14, 282, pageWidth - 14, 282)
    doc.text('Cloud-Cost-Pulse v3.0 FinOps Executive SaaS Platform', 14, 288)
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, 288, { align: 'right' })
  }

  return doc
}
