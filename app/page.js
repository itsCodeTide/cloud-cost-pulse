'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LayoutDashboard, BarChart3, Wallet, Lightbulb, FileText, User,
  TrendingUp, TrendingDown, Cloud, Server, Activity, PiggyBank,
  Search, Bell, Moon, Sun, Sparkles, AlertTriangle, CheckCircle2, Download,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area, BarChart, Bar,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'recommendations', label: 'Optimize', icon: Lightbulb },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'profile', label: 'Profile', icon: User },
]

const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

function Sidebar({ active, setActive }) {
  return (
    <aside className="hidden md:flex md:w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      <div className="h-16 flex items-center gap-2 px-6 border-b border-border">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 grid place-items-center shadow-lg shadow-blue-500/20">
          <Cloud className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-semibold tracking-tight">Cloud-Cost-Pulse</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Azure FinOps</div>
        </div>
      </div>
      <nav className="p-3 space-y-1 flex-1">
        {NAV.map((n) => {
          const Icon = n.icon
          const is = active === n.id
          return (
            <button
              key={n.id}
              onClick={() => setActive(n.id)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
                is
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{n.label}</span>
              {n.id === 'recommendations' && (
                <Badge variant="secondary" className="ml-auto h-5 text-[10px]">New</Badge>
              )}
            </button>
          )
        })}
      </nav>
      <div className="m-3 rounded-xl border border-border bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-purple-400" />
          Pro tip
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Enable Reserved Instances to cut compute bills up to 72%.
        </p>
      </div>
    </aside>
  )
}

function Topbar({ active, onReseed }) {
  const { theme, setTheme } = useTheme()
  const title = NAV.find((n) => n.id === active)?.label || 'Dashboard'
  return (
    <header className="h-16 border-b border-border bg-background/60 backdrop-blur-xl sticky top-0 z-30">
      <div className="h-full px-4 md:px-8 flex items-center gap-4">
        <div>
          <div className="text-xs text-muted-foreground">FinOps Console</div>
          <div className="text-lg font-semibold leading-none">{title}</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search resources, services…" className="pl-9 w-72 bg-muted/40" />
          </div>
          <Button variant="ghost" size="icon" onClick={onReseed} title="Reseed demo data">
            <Activity className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">AD</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}

function StatCard({ icon: Icon, label, value, sub, tone = 'blue', trend }) {
  const toneMap = {
    blue: 'from-blue-500/20 to-blue-500/0 text-blue-400',
    purple: 'from-purple-500/20 to-purple-500/0 text-purple-400',
    pink: 'from-pink-500/20 to-pink-500/0 text-pink-400',
    green: 'from-emerald-500/20 to-emerald-500/0 text-emerald-400',
    amber: 'from-amber-500/20 to-amber-500/0 text-amber-400',
  }
  return (
    <Card className="relative overflow-hidden border-border/60">
      <div className={`absolute inset-0 bg-gradient-to-br ${toneMap[tone]} opacity-60 pointer-events-none`} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={`h-10 w-10 rounded-lg bg-background/60 backdrop-blur grid place-items-center ${toneMap[tone].split(' ').slice(-1)[0]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {typeof trend === 'number' && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {trend >= 0 ? (
              <><TrendingUp className="h-3.5 w-3.5 text-red-400" /><span className="text-red-400">+{trend}%</span></>
            ) : (
              <><TrendingDown className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">{trend}%</span></>
            )}
            <span className="text-muted-foreground">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const SERVICE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover/95 backdrop-blur px-3 py-2 text-xs shadow-xl">
      {label && <div className="font-medium mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{formatINR(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function DashboardPage({ data, refresh }) {
  if (!data) return <LoadingGrid />
  const { stats, trend, serviceBreakdown, forecast, budget, recommendations } = data

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Wallet} label="Total Monthly Cost" value={formatINR(stats.totalMonthlyCost)} tone="blue" trend={stats.growth} />
        <StatCard icon={Server} label="Total Resources" value={stats.totalResources} sub="across regions" tone="purple" />
        <StatCard icon={Activity} label="Active Services" value={stats.activeServices} sub="Azure services live" tone="pink" />
        <StatCard icon={PiggyBank} label="Potential Savings" value={formatINR(stats.potentialSavings)} sub="identified this month" tone="green" />
        <StatCard icon={AlertTriangle} label="Budget Utilization" value={`${stats.budgetUsage}%`} sub={`${formatINR(budget.used)} of ${formatINR(budget.monthly_budget)}`} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Monthly Spending Trend</CardTitle>
              <CardDescription>Total Azure spend over the last 8 months</CardDescription>
            </div>
            <Badge variant="secondary">Recharts • Area</Badge>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="total" name="Total" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service-wise Cost</CardTitle>
            <CardDescription>Current month breakdown</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={serviceBreakdown} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {serviceBreakdown.map((s, i) => (
                    <Cell key={i} fill={s.color || SERVICE_COLORS[i]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Per-Service Trend</CardTitle>
            <CardDescription>Stacked line across services</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
                <Line type="monotone" dataKey="vm" name="VMs" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="storage" name="Storage" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="sql" name="SQL" stroke="#ec4899" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="appservice" name="App Service" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="functions" name="Functions" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10" />
          <CardHeader className="relative">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <CardTitle>Next Month Forecast</CardTitle>
            </div>
            <CardDescription>Based on average of last 3 months</CardDescription>
          </CardHeader>
          <CardContent className="relative space-y-4">
            <div>
              <div className="text-3xl font-bold tracking-tight">{formatINR(forecast.expectedCost)}</div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                {forecast.growth >= 0 ? (
                  <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/20">+{forecast.growth}%</Badge>
                ) : (
                  <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20">{forecast.growth}%</Badge>
                )}
                <span className="text-muted-foreground">expected change</span>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Basis (last 3 months)</div>
              {forecast.basis.map((v, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">M-{3 - i}</span>
                  <span className="font-medium">{formatINR(v)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-400" /> Top Optimization Recommendations</CardTitle>
          <CardDescription>AI-driven suggestions to reduce your Azure bill</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {recommendations.map((r) => <RecCard key={r.id} r={r} />)}
        </CardContent>
      </Card>
    </div>
  )
}

function RecCard({ r }) {
  const sevColor = { high: 'bg-red-500/20 text-red-400', medium: 'bg-amber-500/20 text-amber-400', low: 'bg-blue-500/20 text-blue-400' }[r.severity] || 'bg-muted'
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4 hover:border-border transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${sevColor}`}>{r.severity}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.category}</span>
          </div>
          <div className="mt-2 font-semibold text-sm">{r.title}</div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{r.description}</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase text-muted-foreground">Save/mo</div>
          <div className="text-emerald-400 font-bold">{formatINR(r.potential_savings)}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" variant="secondary" className="h-7 text-xs">Apply</Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs">Dismiss</Button>
      </div>
    </div>
  )
}

function AnalyticsPage({ data }) {
  if (!data) return <LoadingGrid />
  const barData = data.serviceBreakdown.map(s => ({ name: s.name.replace('Azure ', ''), cost: s.value, fill: s.color }))
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Service Cost — Bar</CardTitle><CardDescription>Current month</CardDescription></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="cost" name="Cost" radius={[8, 8, 0, 0]}>
                  {barData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cost Distribution — Pie</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.serviceBreakdown} dataKey="value" nameKey="name" outerRadius={110} label={(e) => `${((e.percent||0)*100).toFixed(0)}%`}>
                  {data.serviceBreakdown.map((s, i) => <Cell key={i} fill={s.color || SERVICE_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>All Services — Trend (Area Stacked)</CardTitle></CardHeader>
        <CardContent className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
              <Area type="monotone" stackId="1" dataKey="vm" name="VMs" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.7} />
              <Area type="monotone" stackId="1" dataKey="storage" name="Storage" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.7} />
              <Area type="monotone" stackId="1" dataKey="sql" name="SQL" stroke="#ec4899" fill="#ec4899" fillOpacity={0.7} />
              <Area type="monotone" stackId="1" dataKey="appservice" name="App Service" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.7} />
              <Area type="monotone" stackId="1" dataKey="functions" name="Functions" stroke="#10b981" fill="#10b981" fillOpacity={0.7} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

function BudgetPage({ data, refresh }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')

  if (!data) return <LoadingGrid />
  const { budget } = data

  const save = async () => {
    const n = Number(value)
    if (!n || n < 100) { toast.error('Enter a valid budget'); return }
    const res = await fetch('/api/budget', { method: 'POST', body: JSON.stringify({ monthly_budget: n }) })
    if (res.ok) { toast.success('Budget updated'); setOpen(false); setValue(''); refresh() }
    else toast.error('Failed to update')
  }

  const remainingPct = 100 - budget.usage_pct

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardDescription>Monthly Budget</CardDescription><CardTitle className="text-3xl">{formatINR(budget.monthly_budget)}</CardTitle></CardHeader>
          <CardContent>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" variant="secondary">Edit Budget</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Set Monthly Budget</DialogTitle></DialogHeader>
                <div className="space-y-2">
                  <Label>Amount (INR)</Label>
                  <Input type="number" placeholder="e.g. 18000" value={value} onChange={(e) => setValue(e.target.value)} />
                </div>
                <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>Used This Month</CardDescription><CardTitle className="text-3xl text-amber-400">{formatINR(budget.used)}</CardTitle></CardHeader>
          <CardContent><Badge variant="secondary">{budget.usage_pct}% of budget</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>Remaining</CardDescription><CardTitle className="text-3xl text-emerald-400">{formatINR(budget.remaining)}</CardTitle></CardHeader>
          <CardContent><Badge variant="secondary">{remainingPct.toFixed(1)}% available</Badge></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Budget Utilization</CardTitle><CardDescription>Current month progress against budget</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Used {formatINR(budget.used)}</span>
              <span className="font-medium">{budget.usage_pct}%</span>
            </div>
            <Progress value={budget.usage_pct} className="h-3" />
          </div>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-lg border border-border p-4">
              <div className="text-muted-foreground text-xs">Status</div>
              <div className="mt-1 font-semibold flex items-center gap-2">
                {budget.usage_pct < 75 ? (<><CheckCircle2 className="h-4 w-4 text-emerald-400" /> On track</>) :
                 budget.usage_pct < 100 ? (<><AlertTriangle className="h-4 w-4 text-amber-400" /> Warning</>) :
                 (<><AlertTriangle className="h-4 w-4 text-red-400" /> Over budget</>)}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-muted-foreground text-xs">Forecasted Spend</div>
              <div className="mt-1 font-semibold">{formatINR(data.forecast.expectedCost)}</div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-muted-foreground text-xs">Projected Overrun</div>
              <div className="mt-1 font-semibold">
                {data.forecast.expectedCost > budget.monthly_budget
                  ? <span className="text-red-400">{formatINR(data.forecast.expectedCost - budget.monthly_budget)}</span>
                  : <span className="text-emerald-400">Under budget</span>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RecommendationsPage({ data }) {
  const [recs, setRecs] = useState(null)
  useEffect(() => {
    fetch('/api/recommendations').then(r => r.json()).then(setRecs)
  }, [])
  if (!recs) return <LoadingGrid />
  const total = recs.reduce((s, r) => s + r.potential_savings, 0)
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10" />
        <CardContent className="relative p-6 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Total identified savings</div>
            <div className="mt-1 text-4xl font-bold text-emerald-400">{formatINR(total)}<span className="text-base text-muted-foreground">/mo</span></div>
            <div className="mt-1 text-sm text-muted-foreground">{recs.length} actionable recommendations available</div>
          </div>
          <Sparkles className="h-16 w-16 text-emerald-400/40" />
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {recs.map(r => <RecCard key={r.id} r={r} />)}
      </div>
    </div>
  )
}

function ReportsPage({ data }) {
  if (!data) return <LoadingGrid />
  const generate = (type) => {
    toast.success(`${type} report generated`, { description: 'PDF export ready (demo)' })
  }
  const reports = [
    { title: 'Monthly Report', desc: 'Complete overview of this month spend, per-service breakdown, and top resources.', icon: FileText },
    { title: 'Service Report', desc: 'Deep dive per Azure service — cost trend, resource count, and utilization.', icon: BarChart3 },
    { title: 'Budget Report', desc: 'Budget vs actual, forecast, and projected overrun analysis.', icon: Wallet },
  ]
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {reports.map((r) => {
        const Icon = r.icon
        return (
          <Card key={r.title} className="hover:border-primary/50 transition-all">
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary mb-2"><Icon className="h-5 w-5" /></div>
              <CardTitle>{r.title}</CardTitle>
              <CardDescription>{r.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => generate(r.title)} className="w-full"><Download className="h-4 w-4 mr-2" /> Export PDF</Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function ProfilePage() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">AD</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>Admin Demo</CardTitle>
            <CardDescription>admin@cloud-cost-pulse.io</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Full name</Label><Input defaultValue="Admin Demo" /></div>
          <div><Label>Email</Label><Input defaultValue="admin@cloud-cost-pulse.io" /></div>
          <div><Label>Role</Label><Input defaultValue="Cloud Administrator" /></div>
          <div><Label>Organization</Label><Input defaultValue="Acme Corp" /></div>
        </div>
        <Button>Save Changes</Button>
      </CardContent>
    </Card>
  )
}

function LoadingGrid() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  )
}

function App() {
  const [active, setActive] = useState('dashboard')
  const [data, setData] = useState(null)

  const load = async () => {
    try {
      const res = await fetch('/api/dashboard')
      const j = await res.json()
      setData(j)
    } catch (e) { toast.error('Failed to load data') }
  }

  useEffect(() => { load() }, [])

  const reseed = async () => {
    toast.loading('Reseeding demo data…', { id: 'reseed' })
    await fetch('/api/reset', { method: 'POST' })
    await load()
    toast.success('Fresh demo data loaded', { id: 'reseed' })
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar active={active} setActive={setActive} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar active={active} onReseed={reseed} />
        <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {active === 'dashboard' && <DashboardPage data={data} refresh={load} />}
          {active === 'analytics' && <AnalyticsPage data={data} />}
          {active === 'budget' && <BudgetPage data={data} refresh={load} />}
          {active === 'recommendations' && <RecommendationsPage data={data} />}
          {active === 'reports' && <ReportsPage data={data} />}
          {active === 'profile' && <ProfilePage />}
        </main>
      </div>
    </div>
  )
}

export default App
