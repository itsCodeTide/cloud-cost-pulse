'use client'

import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard, BarChart3, Wallet, Lightbulb, FileText, User,
  TrendingUp, TrendingDown, Cloud, Server, Activity, PiggyBank,
  Search, Bell, Moon, Sun, Sparkles, AlertTriangle, CheckCircle2, Download,
  LogIn, UserPlus, Plug, Settings as SettingsIcon, Mail, SlidersHorizontal,
  RefreshCw, Unplug, Send, Users,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import {
  SignInButton, SignUpButton, UserButton, useUser,
  OrganizationSwitcher, useOrganization,
} from '@clerk/nextjs'
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
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
  { id: 'profile', label: 'Profile', icon: User },
]

const fmtFor = (c = 'INR') => (n) =>
  new Intl.NumberFormat(c === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n || 0)
const symFor = (c = 'INR') => (c === 'INR' ? '₹' : c === 'USD' ? '$' : c === 'EUR' ? '€' : c === 'GBP' ? '£' : `${c} `)
const formatINR = fmtFor('INR')

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
          <Users className="h-4 w-4 text-purple-400" />
          Team workspaces
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Switch to a Clerk organization in the top bar to share one budget &amp; dashboard with your team.
        </p>
      </div>
    </aside>
  )
}

function Topbar({ active, onReseed, dataSource }) {
  const { theme, setTheme } = useTheme()
  const title = NAV.find((n) => n.id === active)?.label || 'Dashboard'
  return (
    <header className="h-16 border-b border-border bg-background/60 backdrop-blur-xl sticky top-0 z-30">
      <div className="h-full px-4 md:px-8 flex items-center gap-4">
        <div>
          <div className="text-xs text-muted-foreground">FinOps Console</div>
          <div className="text-lg font-semibold leading-none flex items-center gap-2">
            {title}
            {dataSource === 'azure'
              ? <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[10px]">Live Azure</Badge>
              : <Badge variant="secondary" className="text-[10px]">Demo data</Badge>}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden lg:block">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search resources, services…" className="pl-9 w-64 bg-muted/40" />
          </div>
          <OrganizationSwitcher
            afterSelectOrganizationUrl="/"
            afterSelectPersonalUrl="/"
            appearance={{ elements: { rootBox: 'flex items-center', organizationSwitcherTrigger: 'px-2 py-1.5 rounded-lg border border-border bg-muted/40 text-foreground' } }}
          />
          <Button variant="ghost" size="icon" onClick={onReseed} title="Reseed demo data">
            <Activity className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
          <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'h-8 w-8' } }} />
        </div>
      </div>
    </header>
  )
}

function Landing() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(59,130,246,0.15),transparent_50%)]" />
      <nav className="relative z-10 h-16 flex items-center px-6 md:px-12">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 grid place-items-center shadow-lg shadow-blue-500/20">
            <Cloud className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold tracking-tight">Cloud-Cost-Pulse</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SignInButton mode="modal"><Button variant="ghost" size="sm"><LogIn className="h-4 w-4 mr-1" /> Sign in</Button></SignInButton>
          <SignUpButton mode="modal"><Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Get started</Button></SignUpButton>
        </div>
      </nav>
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <Badge variant="secondary" className="mb-6"><Sparkles className="h-3 w-3 mr-1 text-purple-400" /> Azure FinOps for teams</Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
          Smart Azure Cloud Cost<br /><span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Monitoring &amp; Analytics</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Connect your real Azure bill, share one dashboard with your team, get budget alerts by email, and tune optimization rules to your own policies.
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <SignUpButton mode="modal"><Button size="lg">Get started free</Button></SignUpButton>
          <SignInButton mode="modal"><Button size="lg" variant="outline">Sign in</Button></SignInButton>
        </div>
        <div className="mt-16 grid md:grid-cols-4 gap-4 text-left">
          {[
            { icon: Plug, t: 'Real Azure data', d: 'Plug in a Service Principal and pull your actual Cost Management bill.' },
            { icon: Users, t: 'Team workspaces', d: 'A Clerk organization shares one budget and dashboard.' },
            { icon: Mail, t: 'Email alerts', d: 'Budget notices at 80% and 100% straight to your inbox via Resend.' },
            { icon: SlidersHorizontal, t: 'Custom rules', d: 'Set your own idle-resource and cost-spike thresholds.' },
          ].map((f) => (
            <div key={f.t} className="rounded-xl border border-border/60 bg-card/40 p-4">
              <f.icon className="h-5 w-5 text-purple-400" />
              <div className="mt-3 font-semibold">{f.t}</div>
              <div className="mt-1 text-sm text-muted-foreground">{f.d}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
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

function ChartTooltip({ active, payload, label, currency = 'INR' }) {
  if (!active || !payload?.length) return null
  const fmt = fmtFor(currency)
  return (
    <div className="rounded-lg border border-border bg-popover/95 backdrop-blur px-3 py-2 text-xs shadow-xl">
      {label && <div className="font-medium mb-1">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function DashboardPage({ data }) {
  if (!data) return <LoadingGrid />
  const { stats, trend, serviceBreakdown, forecast, budget, recommendations, services = [], currency = 'INR' } = data
  const fmt = fmtFor(currency)
  const sym = symFor(currency)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Wallet} label="Total Monthly Cost" value={fmt(stats.totalMonthlyCost)} tone="blue" trend={stats.growth} />
        <StatCard icon={Server} label="Total Resources" value={stats.totalResources} sub="across regions" tone="purple" />
        <StatCard icon={Activity} label="Active Services" value={stats.activeServices} sub="Azure services live" tone="pink" />
        <StatCard icon={PiggyBank} label="Potential Savings" value={fmt(stats.potentialSavings)} sub="identified this month" tone="green" />
        <StatCard icon={AlertTriangle} label="Budget Utilization" value={`${stats.budgetUsage}%`} sub={`${fmt(budget.used)} of ${fmt(budget.monthly_budget)}`} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Monthly Spending Trend</CardTitle>
              <CardDescription>Total Azure spend over recent months</CardDescription>
            </div>
            <Badge variant="secondary">{data.dataSource === 'azure' ? 'Live Azure' : 'Demo'}</Badge>
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
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
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
                <Pie data={serviceBreakdown.slice(0, 8)} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                  {serviceBreakdown.slice(0, 8).map((s, i) => (
                    <Cell key={i} fill={s.color || SERVICE_COLORS[i % 5]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip currency={currency} />} />
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
            <CardDescription>Cost lines across services</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
                {services.slice(0, 8).map((s) => (
                  <Line key={s.key} type="monotone" dataKey={s.key} name={s.name.replace('Azure ', '')} stroke={s.color} strokeWidth={2} dot={false} />
                ))}
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
              <div className="text-3xl font-bold tracking-tight">{fmt(forecast.expectedCost)}</div>
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
                  <span className="text-muted-foreground">M-{forecast.basis.length - i}</span>
                  <span className="font-medium">{fmt(v)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-400" /> Top Optimization Recommendations</CardTitle>
          <CardDescription>Rule-based suggestions to reduce your Azure bill</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {recommendations.map((r) => <RecCard key={r.id} r={r} currency={currency} />)}
        </CardContent>
      </Card>
    </div>
  )
}

function RecCard({ r, currency = 'INR' }) {
  const fmt = fmtFor(currency)
  const sevColor = { high: 'bg-red-500/20 text-red-400', medium: 'bg-amber-500/20 text-amber-400', low: 'bg-blue-500/20 text-blue-400' }[r.severity] || 'bg-muted'
  return (
    <div className="rounded-xl border border-border/60 bg-card/50 p-4 hover:border-border transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded ${sevColor}`}>{r.severity}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.category}</span>
            {r.rule_based && <Badge variant="outline" className="h-4 text-[9px] px-1.5 border-purple-500/40 text-purple-400">your rule</Badge>}
          </div>
          <div className="mt-2 font-semibold text-sm">{r.title}</div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{r.description}</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase text-muted-foreground">Save/mo</div>
          <div className="text-emerald-400 font-bold">{fmt(r.potential_savings)}</div>
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
  const currency = data.currency || 'INR'
  const sym = symFor(currency)
  const services = data.services || []
  const barData = data.serviceBreakdown.slice(0, 10).map(s => ({ name: s.name.replace('Azure ', ''), cost: s.value, fill: s.color }))
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
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
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
                <Pie data={data.serviceBreakdown.slice(0, 8)} dataKey="value" nameKey="name" outerRadius={110} label={(e) => `${((e.percent || 0) * 100).toFixed(0)}%`}>
                  {data.serviceBreakdown.slice(0, 8).map((s, i) => <Cell key={i} fill={s.color || SERVICE_COLORS[i % 5]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip currency={currency} />} />
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
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip currency={currency} />} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
              {services.slice(0, 8).map((s) => (
                <Area key={s.key} type="monotone" stackId="1" dataKey={s.key} name={s.name.replace('Azure ', '')} stroke={s.color} fill={s.color} fillOpacity={0.7} />
              ))}
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
  const currency = data.currency || 'INR'
  const fmt = fmtFor(currency)

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
          <CardHeader><CardDescription>Monthly Budget {data.workspace?.isOrg ? '(shared by your team)' : ''}</CardDescription><CardTitle className="text-3xl">{fmt(budget.monthly_budget)}</CardTitle></CardHeader>
          <CardContent>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" variant="secondary">Edit Budget</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Set Monthly Budget</DialogTitle></DialogHeader>
                <div className="space-y-2">
                  <Label>Amount ({currency})</Label>
                  <Input type="number" placeholder="e.g. 18000" value={value} onChange={(e) => setValue(e.target.value)} />
                </div>
                <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>Used This Month</CardDescription><CardTitle className="text-3xl text-amber-400">{fmt(budget.used)}</CardTitle></CardHeader>
          <CardContent><Badge variant="secondary">{budget.usage_pct}% of budget</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>Remaining</CardDescription><CardTitle className="text-3xl text-emerald-400">{fmt(budget.remaining)}</CardTitle></CardHeader>
          <CardContent><Badge variant="secondary">{remainingPct.toFixed(1)}% available</Badge></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Budget Utilization</CardTitle><CardDescription>Current month progress against budget</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Used {fmt(budget.used)}</span>
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
              <div className="mt-1 font-semibold">{fmt(data.forecast.expectedCost)}</div>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="text-muted-foreground text-xs">Projected Overrun</div>
              <div className="mt-1 font-semibold">
                {data.forecast.expectedCost > budget.monthly_budget
                  ? <span className="text-red-400">{fmt(data.forecast.expectedCost - budget.monthly_budget)}</span>
                  : <span className="text-emerald-400">Under budget</span>}
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-border p-4 bg-muted/20 text-sm flex items-center gap-3">
            <Mail className="h-4 w-4 text-blue-400 shrink-0" />
            <span className="text-muted-foreground">
              Email alerts fire automatically at {data.meta?.rules?.budgetWarnPct || 80}% and 100% — {data.meta?.emailConfigured ? 'configured and active.' : 'set up Resend in Settings to enable.'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RecommendationsPage({ data }) {
  const [recs, setRecs] = useState(null)
  const currency = data?.currency || 'INR'
  const fmt = fmtFor(currency)
  useEffect(() => {
    fetch('/api/recommendations').then(r => r.json()).then(j => setRecs(Array.isArray(j) ? j : []))
  }, [])
  if (!recs) return <LoadingGrid />
  const total = recs.reduce((s, r) => s + (r.potential_savings || 0), 0)
  const ruleCount = recs.filter(r => r.rule_based).length
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10" />
        <CardContent className="relative p-6 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Total identified savings</div>
            <div className="mt-1 text-4xl font-bold text-emerald-400">{fmt(total)}<span className="text-base text-muted-foreground">/mo</span></div>
            <div className="mt-1 text-sm text-muted-foreground">{recs.length} recommendations · {ruleCount} from your custom rules</div>
          </div>
          <Sparkles className="h-16 w-16 text-emerald-400/40" />
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-2">
        {recs.map(r => <RecCard key={r.id} r={r} currency={currency} />)}
      </div>
    </div>
  )
}

function ReportsPage({ data, mainRef }) {
  if (!data) return <LoadingGrid />
  const fmt = fmtFor(data.currency || 'INR')

  const generatePdf = async (type) => {
    toast.loading(`Generating ${type}...`, { id: 'pdf' })
    try {
      const [{ jsPDF }, html2canvas] = await Promise.all([
        import('jspdf'),
        import('html2canvas').then(m => m.default),
      ])
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      let y = 40

      doc.setFontSize(20); doc.setTextColor(20)
      doc.text(`Cloud-Cost-Pulse — ${type}`, 40, y); y += 20
      doc.setFontSize(10); doc.setTextColor(120)
      doc.text(`${new Date().toLocaleString()}  ·  Data source: ${data.dataSource === 'azure' ? 'Live Azure' : 'Demo'}`, 40, y); y += 24

      doc.setFontSize(12); doc.setTextColor(20)
      const { stats, budget, forecast } = data
      const lines = []
      if (type === 'Monthly Report' || type === 'Service Report') {
        lines.push(`Total Monthly Cost: ${fmt(stats.totalMonthlyCost)}  (growth ${stats.growth}% vs last month)`)
        lines.push(`Total Resources: ${stats.totalResources}   Active Services: ${stats.activeServices}`)
        lines.push(`Potential Savings identified: ${fmt(stats.potentialSavings)}`)
      }
      if (type === 'Budget Report') {
        lines.push(`Monthly Budget: ${fmt(budget.monthly_budget)}`)
        lines.push(`Used: ${fmt(budget.used)}  (${budget.usage_pct}%)`)
        lines.push(`Remaining: ${fmt(budget.remaining)}`)
        lines.push(`Forecasted Spend: ${fmt(forecast.expectedCost)}  (expected change ${forecast.growth}%)`)
      }
      if (type === 'Service Report') {
        lines.push('')
        lines.push('Service-wise Cost (current month):')
        data.serviceBreakdown.forEach(s => lines.push(`  • ${s.name}: ${fmt(s.value)}`))
      }
      lines.forEach(l => { doc.text(l, 40, y); y += 16 })

      if (mainRef?.current) {
        const canvas = await html2canvas(mainRef.current, {
          backgroundColor: '#0a0a0a',
          scale: 1.4,
          useCORS: true,
          logging: false,
        })
        const img = canvas.toDataURL('image/jpeg', 0.85)
        const imgW = pageW - 80
        const imgH = (canvas.height * imgW) / canvas.width
        if (y + imgH > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 40 }
        doc.addImage(img, 'JPEG', 40, y + 10, imgW, imgH)
      }

      const filename = `cloud-cost-pulse-${type.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`
      doc.save(filename)
      toast.success(`${type} downloaded`, { id: 'pdf', description: filename })
    } catch (e) {
      console.error(e)
      toast.error('Failed to generate PDF', { id: 'pdf', description: e.message })
    }
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
              <Button onClick={() => generatePdf(r.title)} className="w-full"><Download className="h-4 w-4 mr-2" /> Export PDF</Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ============================ SETTINGS ============================
function SettingsPage({ refresh }) {
  const [settings, setSettings] = useState(null)
  const [az, setAz] = useState({ tenantId: '', clientId: '', clientSecret: '', subscriptionId: '' })
  const [em, setEm] = useState({ apiKey: '', recipient: '' })
  const [rules, setRules] = useState({ idleCostThreshold: 500, spikePct: 25, budgetWarnPct: 80 })
  const [busy, setBusy] = useState('')

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings')
      const j = await res.json()
      setSettings(j)
      if (j?.rules) setRules(j.rules)
      if (j?.email?.recipient) setEm(prev => ({ ...prev, recipient: j.email.recipient }))
    } catch { toast.error('Failed to load settings') }
  }
  useEffect(() => { loadSettings() }, [])

  const post = async (url, body, label) => {
    setBusy(label)
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Request failed')
      return j
    } finally { setBusy('') }
  }

  const connectAzure = async () => {
    if (!az.tenantId || !az.clientId || !az.clientSecret || !az.subscriptionId) {
      toast.error('All four Azure fields are required'); return
    }
    try {
      const j = await post('/api/azure/connect', az, 'azure')
      toast.success('Azure connected!', { description: `Synced ${j.sync?.rows || 0} monthly cost rows${j.sync?.currency ? ` (${j.sync.currency})` : ''}.` })
      setAz({ tenantId: '', clientId: '', clientSecret: '', subscriptionId: '' })
      await loadSettings(); refresh()
    } catch (e) { toast.error('Azure connection failed', { description: e.message, duration: 9000 }) }
  }

  const syncNow = async () => {
    try {
      const j = await post('/api/azure/sync', {}, 'sync')
      toast.success('Sync complete', { description: `${j.sync?.rows || 0} cost rows refreshed.` })
      await loadSettings(); refresh()
    } catch (e) { toast.error('Sync failed', { description: e.message }) }
  }

  const disconnect = async () => {
    try {
      await post('/api/azure/disconnect', {}, 'disconnect')
      toast.success('Azure disconnected', { description: 'Back to demo data.' })
      await loadSettings(); refresh()
    } catch (e) { toast.error(e.message) }
  }

  const saveEmail = async () => {
    if (!em.apiKey && !em.recipient) { toast.error('Enter a Resend API key and/or recipient'); return }
    try {
      await post('/api/settings/email', em, 'email')
      toast.success('Email alert settings saved')
      setEm(prev => ({ ...prev, apiKey: '' }))
      await loadSettings(); refresh()
    } catch (e) { toast.error('Failed to save', { description: e.message }) }
  }

  const testEmail = async () => {
    try {
      const j = await post('/api/settings/email/test', {}, 'test')
      toast.success('Test email sent!', { description: `Resend ID: ${j.emailId}` })
    } catch (e) { toast.error('Test email failed', { description: e.message, duration: 9000 }) }
  }

  const saveRules = async () => {
    try {
      const j = await post('/api/settings/rules', rules, 'rules')
      toast.success('Recommendation rules saved')
      setRules(j.rules)
      refresh()
    } catch (e) { toast.error('Failed to save rules', { description: e.message }) }
  }

  const alerts = settings?.alerts || []

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Azure connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Plug className="h-5 w-5 text-blue-400" /> Azure Cost Management</CardTitle>
          <CardDescription>
            Connect a Service Principal with the <b>Cost Management Reader</b> role on your subscription. The client secret is encrypted (AES-256-GCM) before storage and never sent back to the browser.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.azure?.connected ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Connected — pulling live Azure billing data</div>
              <div className="grid md:grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div>Tenant: <span className="font-mono">{settings.azure.azureTenantId}</span></div>
                <div>Client: <span className="font-mono">{settings.azure.azureClientId}</span></div>
                <div>Subscription: <span className="font-mono">{settings.azure.azureSubscriptionId}</span></div>
              </div>
              {settings.lastSyncAt && <div className="text-xs text-muted-foreground">Last sync: {new Date(settings.lastSyncAt).toLocaleString()}</div>}
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="secondary" onClick={syncNow} disabled={busy === 'sync'}>
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${busy === 'sync' ? 'animate-spin' : ''}`} /> {busy === 'sync' ? 'Syncing…' : 'Sync now'}
                </Button>
                <Button size="sm" variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={disconnect} disabled={busy === 'disconnect'}>
                  <Unplug className="h-3.5 w-3.5 mr-1.5" /> Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {[['tenantId', 'Tenant ID (Directory ID)'], ['clientId', 'Client ID (Application ID)'], ['clientSecret', 'Client Secret'], ['subscriptionId', 'Subscription ID']].map(([name, label]) => (
                  <div key={name} className="space-y-1.5">
                    <Label htmlFor={`az-${name}`}>{label}</Label>
                    <Input
                      id={`az-${name}`}
                      type={name === 'clientSecret' ? 'password' : 'text'}
                      placeholder={name === 'clientSecret' ? 'secret value' : 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'}
                      value={az[name]}
                      onChange={(e) => setAz({ ...az, [name]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <Button onClick={connectAzure} disabled={busy === 'azure'}>
                <Plug className="h-4 w-4 mr-2" /> {busy === 'azure' ? 'Validating with Azure…' : 'Validate & Connect'}
              </Button>
              <p className="text-xs text-muted-foreground">
                Azure Portal → Microsoft Entra ID → App registrations → your app (tenant + client ID, create a secret under Certificates &amp; secrets), then Subscription → Access control (IAM) → assign <b>Cost Management Reader</b> to the app.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Email alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-purple-400" /> Email Budget Alerts (Resend)</CardTitle>
          <CardDescription>
            Emails are sent automatically when spend crosses your warning threshold and 100% of budget (deduplicated per month). Get a free API key at resend.com → API Keys.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings?.email?.configured && (
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-400" />
              <span>Key saved ({settings.email.keyMask}) · alerts go to <b>{settings.email.recipient || 'no recipient set'}</b></span>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="resend-key">Resend API key</Label>
              <Input id="resend-key" type="password" placeholder="re_…" value={em.apiKey} onChange={(e) => setEm({ ...em, apiKey: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resend-to">Alert recipient email</Label>
              <Input id="resend-to" type="email" placeholder="you@company.com" value={em.recipient} onChange={(e) => setEm({ ...em, recipient: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveEmail} disabled={busy === 'email'}>{busy === 'email' ? 'Saving…' : 'Save settings'}</Button>
            <Button variant="secondary" onClick={testEmail} disabled={busy === 'test' || !settings?.email?.configured}>
              <Send className="h-3.5 w-3.5 mr-1.5" /> {busy === 'test' ? 'Sending…' : 'Send test email'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Note: without a verified domain, Resend&apos;s sandbox sender <span className="font-mono">onboarding@resend.dev</span> can only deliver to the email address of your own Resend account.
          </p>
          {alerts.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Alert history</div>
              {alerts.map(a => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    {a.sentAt ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
                    <span>{a.threshold >= 100 ? 'Budget exceeded (100%)' : `${a.threshold}% warning`} → {a.recipient}</span>
                  </div>
                  <span className="text-muted-foreground">{a.sentAt ? new Date(a.sentAt).toLocaleString() : (a.error || 'failed')}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom recommendation rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-amber-400" /> Custom Recommendation Rules</CardTitle>
          <CardDescription>Tune when Cloud-Cost-Pulse flags idle resources, cost spikes, and budget warnings so suggestions match your policies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Idle resource cost threshold</Label>
              <Input type="number" value={rules.idleCostThreshold} onChange={(e) => setRules({ ...rules, idleCostThreshold: e.target.value })} />
              <p className="text-[11px] text-muted-foreground">Flag idle/stopped resources costing more than this per month.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Cost spike threshold (%)</Label>
              <Input type="number" value={rules.spikePct} onChange={(e) => setRules({ ...rules, spikePct: e.target.value })} />
              <p className="text-[11px] text-muted-foreground">Flag services whose month-over-month cost grows more than this.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Budget warning at (%)</Label>
              <Input type="number" value={rules.budgetWarnPct} onChange={(e) => setRules({ ...rules, budgetWarnPct: e.target.value })} />
              <p className="text-[11px] text-muted-foreground">First email/toast alert fires at this budget utilization.</p>
            </div>
          </div>
          <Button onClick={saveRules} disabled={busy === 'rules'}>{busy === 'rules' ? 'Saving…' : 'Save rules'}</Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ProfilePage({ goSettings }) {
  const { user } = useUser()
  const { organization } = useOrganization()
  const name = user?.fullName || 'Signed-in user'
  const email = user?.primaryEmailAddress?.emailAddress || ''
  const initials = (name.split(' ').map(s => s[0]).join('') || 'U').slice(0, 2).toUpperCase()
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt={name} className="h-full w-full object-cover rounded-full" />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">{initials}</AvatarFallback>
            )}
          </Avatar>
          <div>
            <CardTitle>{name}</CardTitle>
            <CardDescription>{email}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Full name</Label><Input defaultValue={name} /></div>
          <div><Label>Email</Label><Input defaultValue={email} readOnly /></div>
          <div><Label>Role</Label><Input defaultValue="Cloud Administrator" /></div>
          <div><Label>Workspace</Label><Input value={organization?.name || 'Personal workspace'} readOnly /></div>
        </div>
        <div className="rounded-lg border border-border p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium"><Users className="h-4 w-4 text-purple-400" /> Team Workspace</div>
          <p className="mt-1 text-xs text-muted-foreground">
            {organization
              ? `You are viewing the shared workspace for "${organization.name}" — everyone in this organization sees the same budget and dashboard.`
              : 'Create or join a Clerk organization from the switcher in the top bar to share one budget and dashboard with your team.'}
          </p>
        </div>
        <div className="rounded-lg border border-border p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-sm font-medium"><Plug className="h-4 w-4 text-blue-400" /> Azure Connection</div>
          <p className="mt-1 text-xs text-muted-foreground">Connect your Azure Cost Management API in Settings to see your real bill.</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={goSettings}>
            <Plug className="h-4 w-4 mr-2" /> Open Settings
          </Button>
        </div>
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
  const { isSignedIn, isLoaded } = useUser()
  const { organization } = useOrganization()
  const mainRef = useRef(null)
  const alertedRef = useRef({ warn: false, over: false })

  const load = async () => {
    try {
      const res = await fetch('/api/dashboard')
      if (res.status === 401) return
      const j = await res.json()
      setData(j)
    } catch (e) { toast.error('Failed to load data') }
  }

  // Reload when signing in OR when switching team workspace (Clerk organization)
  useEffect(() => {
    if (isSignedIn) {
      setData(null)
      alertedRef.current = { warn: false, over: false }
      load()
    }
  }, [isSignedIn, organization?.id])

  // Budget threshold alerts (toast) + email alert notification
  useEffect(() => {
    if (!data?.budget) return
    const pct = data.budget.usage_pct
    const warnPct = data.meta?.rules?.budgetWarnPct || 80
    const fmt = fmtFor(data.currency || 'INR')
    if (pct >= 100 && !alertedRef.current.over) {
      alertedRef.current.over = true
      toast.error('Budget exceeded!', {
        description: `You are at ${pct}% of ${fmt(data.budget.monthly_budget)}. Consider stopping idle resources.`,
        duration: 8000,
      })
    } else if (pct >= warnPct && pct < 100 && !alertedRef.current.warn) {
      alertedRef.current.warn = true
      toast.warning(`Budget alert: ${warnPct}% reached`, {
        description: `Used ${fmt(data.budget.used)} of ${fmt(data.budget.monthly_budget)} (${pct}%).`,
        duration: 8000,
      })
    }
    if (data.emailAlert?.sent) {
      toast.info('Email alert sent', { description: `Budget notice delivered to ${data.emailAlert.recipient}.` })
    } else if (data.emailAlert?.error) {
      toast.error('Email alert failed', { description: data.emailAlert.error, duration: 9000 })
    }
  }, [data])

  const reseed = async () => {
    toast.loading('Reseeding demo data…', { id: 'reseed' })
    await fetch('/api/reset', { method: 'POST' })
    alertedRef.current = { warn: false, over: false }
    await load()
    toast.success('Fresh demo data loaded', { id: 'reseed' })
  }

  if (!isLoaded) {
    return <div className="min-h-screen bg-background grid place-items-center text-muted-foreground">Loading…</div>
  }

  return isSignedIn ? (
    <div className="min-h-screen bg-background flex">
      <Sidebar active={active} setActive={setActive} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar active={active} onReseed={reseed} dataSource={data?.dataSource} />
        <main ref={mainRef} className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {active === 'dashboard' && <DashboardPage data={data} />}
          {active === 'analytics' && <AnalyticsPage data={data} />}
          {active === 'budget' && <BudgetPage data={data} refresh={load} />}
          {active === 'recommendations' && <RecommendationsPage data={data} />}
          {active === 'reports' && <ReportsPage data={data} mainRef={mainRef} />}
          {active === 'settings' && <SettingsPage refresh={load} />}
          {active === 'profile' && <ProfilePage goSettings={() => setActive('settings')} />}
        </main>
      </div>
    </div>
  ) : (
    <Landing />
  )
}

export default App
