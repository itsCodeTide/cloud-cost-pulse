'use strict';

if (process.env.NODE_ENV !== 'production') {
  try { require('dotenv').config(); } catch (e) {}
}

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const data    = require('./data/mockData.cjs');

const app     = express();
const PORT    = parseInt(process.env.PORT || '3001', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: IS_PROD ? true : ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(morgan(IS_PROD ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));

// ── In-memory state ──────────────────────────────────────────────────────────
let analyses        = [...data.mockAnalyses];
let recommendations = [...data.mockRecommendations];

// ── Health ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString(), ai: !!process.env.ANTHROPIC_API_KEY });
});

// ── Analyses ─────────────────────────────────────────────────────────────────
app.get('/api/analyses', (req, res) => {
  let r = [...analyses];
  if (req.query.provider) r = r.filter(a => a.provider === req.query.provider);
  if (req.query.status)   r = r.filter(a => a.status   === req.query.status);
  r.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ data: r, total: r.length });
});

app.get('/api/analyses/summary', (_req, res) => {
  const total   = analyses.reduce((s, a) => s + a.totalMonthlyCost, 0);
  const waste   = analyses.reduce((s, a) => s + a.wasteAmount, 0);
  const savings = analyses.reduce((s, a) => s + a.savingsOpportunity, 0);
  res.json({
    totalMonthlyCost: total,
    totalWaste: waste,
    wastePercentage: total > 0 ? ((waste / total) * 100).toFixed(1) : '0',
    savingsOpportunity: savings,
    totalResources: analyses.reduce((s, a) => s + a.resources, 0),
    analysisCount: analyses.length,
    monthlyTrend: data.monthlyTrend,
    wasteByService: data.wasteByService,
  });
});

app.get('/api/analyses/:id', (req, res) => {
  const a = analyses.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});

app.post('/api/analyses', (req, res) => {
  const { name, provider, region, account } = req.body;
  if (!name || !provider) return res.status(400).json({ error: 'name and provider required' });
  const id = 'ana_' + uuidv4().slice(0, 8);
  const created = { id, name, provider, region: region || 'us-east-1', account: account || 'default', status: 'running', createdAt: new Date().toISOString(), totalMonthlyCost: 0, wasteAmount: 0, wastePercentage: '0', savingsOpportunity: 0, resources: 0 };
  analyses.unshift(created);
  setTimeout(() => {
    const idx = analyses.findIndex(a => a.id === id);
    if (idx !== -1) {
      const base  = Math.floor(Math.random() * 80000) + 15000;
      const wRate = Math.random() * 0.30 + 0.10;
      analyses[idx] = { ...analyses[idx], status: 'completed', totalMonthlyCost: base, wasteAmount: Math.floor(base * wRate), wastePercentage: (wRate * 100).toFixed(1), savingsOpportunity: Math.floor(base * wRate * 1.4), resources: Math.floor(Math.random() * 250) + 50 };
    }
  }, 4000);
  res.status(201).json(created);
});

app.delete('/api/analyses/:id', (req, res) => {
  const idx = analyses.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  analyses.splice(idx, 1);
  res.json({ message: 'Deleted' });
});

// ── Resources ────────────────────────────────────────────────────────────────
app.get('/api/resources', (req, res) => {
  let r = [...data.mockResources];
  if (req.query.analysisId) r = r.filter(x => x.analysisId === req.query.analysisId);
  if (req.query.category)   r = r.filter(x => x.category   === req.query.category);
  if (req.query.waste !== undefined) r = r.filter(x => x.waste === (req.query.waste === 'true'));
  res.json({ data: r, total: r.length, wasteCount: r.filter(x => x.waste).length, totalMonthlyCost: r.reduce((s, x) => s + x.monthlyCost, 0) });
});

// ── Recommendations ──────────────────────────────────────────────────────────
app.get('/api/recommendations', (req, res) => {
  let r = [...recommendations];
  if (req.query.analysisId) r = r.filter(x => x.analysisId === req.query.analysisId);
  if (req.query.category)   r = r.filter(x => x.category   === req.query.category);
  if (req.query.status)     r = r.filter(x => x.status     === req.query.status);
  r.sort((a, b) => a.priority - b.priority);
  const monthly = r.reduce((s, x) => s + x.monthlySavings, 0);
  res.json({ data: r, total: r.length, totalMonthlySavings: monthly, totalAnnualSavings: monthly * 12 });
});

app.patch('/api/recommendations/:id/status', (req, res) => {
  const { status } = req.body;
  const valid = ['pending', 'in_progress', 'completed', 'dismissed'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const idx = recommendations.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  recommendations[idx] = { ...recommendations[idx], status };
  res.json(recommendations[idx]);
});

// ── Risk ─────────────────────────────────────────────────────────────────────
app.get('/api/risk', (req, res) => {
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  let r = [...data.mockRisks];
  if (req.query.severity) r = r.filter(x => x.severity === req.query.severity);
  r.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
  res.json({ data: r, total: r.length, critical: r.filter(x => x.severity === 'critical').length, high: r.filter(x => x.severity === 'high').length, medium: r.filter(x => x.severity === 'medium').length });
});

// ── Terraform ─────────────────────────────────────────────────────────────────
app.get('/api/terraform/analysis', (_req, res) => res.json(data.terraformData));

app.post('/api/terraform/estimate', (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  const count = (code.match(/^resource\s+/gm) || []).length || Math.ceil(code.split('\n').length / 8);
  const monthly = count * (Math.floor(Math.random() * 600) + 400);
  res.json({ resourceCount: count, estimatedMonthlyCost: monthly, estimatedYearlyCost: monthly * 12 });
});

// ── AI ────────────────────────────────────────────────────────────────────────
const AI_SYSTEM = `You are CloudCost AI, expert FinOps assistant in Cloud Cost Pulse. Current cloud data: $137,920/mo spend (AWS $84k|Azure $32k|GCP $21.5k), $36k waste (26.1%), $100k annual savings opportunity. Be concise, data-driven, use markdown.`;

const DEMO = `**Demo Mode** — Set \`ANTHROPIC_API_KEY\` env var for live AI responses.

## Your Top 3 Actions

**1. Right-size EC2 — saves $1,520/mo**
- 23 instances averaging <15% CPU over 30 days
- Downgrade one instance tier — zero performance impact

**2. Buy Reserved Instances — saves $3,550/mo**
- 8 instances running 24/7 for 90+ days on On-Demand
- 1-year RIs give 40% discount

**3. Delete unattached EBS volumes — saves $380/mo**
- 38 volumes with no instance attached
- Snapshot → delete → done in 30 minutes

**Total potential: $91,320/year**`;

app.post('/api/ai/chat', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: 'messages required' });
  if (!process.env.ANTHROPIC_API_KEY) return res.json({ role: 'assistant', content: DEMO });
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 1024, system: AI_SYSTEM, messages: messages.map(m => ({ role: m.role, content: String(m.content) })) });
    res.json({ role: 'assistant', content: resp.content[0].text });
  } catch (err) {
    console.error('AI error:', err.message);
    res.status(500).json({ error: 'AI error', detail: err.message });
  }
});

app.post('/api/ai/analyze-terraform', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  if (!process.env.ANTHROPIC_API_KEY) return res.json({ analysis: '**Demo Mode** — Add `ANTHROPIC_API_KEY` for AI analysis.\n\n**Quick findings:**\n- `t3.xlarge` instances: Consider `t3.large` if CPU < 40%\n- Missing `multi_az` on RDS — production risk\n- S3 buckets missing `lifecycle_rule` blocks\n- NAT gateways (count=3): Check if all needed' });
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: `Analyze this Terraform for cost optimization with dollar estimates:\n\`\`\`hcl\n${code.slice(0, 4000)}\n\`\`\`` }], system: 'Cloud cost expert. Analyze Terraform HCL. Specific actionable advice with dollar estimates. Use markdown.' });
    res.json({ analysis: resp.content[0].text });
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed', detail: err.message });
  }
});

app.post('/api/ai/generate-report', async (req, res) => {
  const { analysisId, reportType = 'executive' } = req.body;
  const a = analyses.find(x => x.id === analysisId) || analyses[0];
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.json({ report: `# Cloud Cost Report — ${a?.name || 'Infrastructure Review'}\n*${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}*\n\n## Executive Summary\n\nTotal spend **$${(a?.totalMonthlyCost || 137920).toLocaleString()}/mo**. Identified **$${(a?.wasteAmount || 36040).toLocaleString()} waste** (${a?.wastePercentage || '26.1'}%) = **$${((a?.wasteAmount || 36040) * 12).toLocaleString()}/yr savings potential**.\n\n## Top Recommendations\n\n1. **Reserved Instances** — $42,600/yr savings\n2. **Spot Instances for dev** — $22,800/yr savings\n3. **Right-size EC2** — $18,240/yr savings\n\n## 90-Day Roadmap\n\n- **Week 1–2:** Delete EBS, set log retention\n- **Month 1:** Right-size EC2, enable S3 tiering\n- **Month 2–3:** Purchase RIs, move dev to Spot\n\n**12-month ROI: $91,320**` });
  }
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await client.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages: [{ role: 'user', content: `Write a professional ${reportType} cloud cost report. Spend:$${(a?.totalMonthlyCost || 0).toLocaleString()}/mo, Waste:$${(a?.wasteAmount || 0).toLocaleString()} (${a?.wastePercentage}%), Resources:${a?.resources || 559}. Include Executive Summary, Top 5 Recommendations, 90-Day Roadmap, ROI.` }] });
    res.json({ report: resp.content[0].text });
  } catch (err) {
    res.status(500).json({ error: 'Report failed', detail: err.message });
  }
});

// ── Serve frontend in production ─────────────────────────────────────────────
if (IS_PROD) {
  const dist = path.join(__dirname, '..', 'dist');
  app.use(express.static(dist, { maxAge: '1d' }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: IS_PROD ? 'Internal Server Error' : err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Cloud Cost Pulse API`);
  console.log(`   Port : ${PORT}`);
  console.log(`   Mode : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   AI   : ${process.env.ANTHROPIC_API_KEY ? '✅ enabled' : '⚠️  demo mode'}`);
  console.log(`   URL  : http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
