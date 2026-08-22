'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  LayoutDashboard, BarChart3, Wallet, Lightbulb, FileText, User, Server as ServerIcon,
  TrendingUp, TrendingDown, Cloud, Server, Activity, PiggyBank, Boxes,
  Search, Bell, Moon, Sun, Sparkles, AlertTriangle, CheckCircle2, Download,
  LogIn, UserPlus, Plug, Settings as SettingsIcon, Mail, SlidersHorizontal,
  RefreshCw, Unplug, Send, Users, Plus, Pencil, Trash2, Filter, X, Clock, Info,
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'resources', label: 'Resources', icon: Boxes },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'recommendations', label: 'Optimize', icon: Lightbulb },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
  { id: 'profile', label: 'Profile', icon: User },
]

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP']
const fmtFor = (c = 'INR') => (n) =>
  new Intl.NumberFormat(c === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n || 0)
const symFor = (c = 'INR') => (c === 'INR' ? '₹' : c === 'USD' ? '$' : c === 'EUR' ? '€' : c === 'GBP' ? '£' : `${c} `)

const STATUS_BADGE = {
  Active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Idle: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Inactive: 'bg-red-500/15 text-red-400 border-red-500/30',
}

// ============================ CHROME ============================
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
            <button key={n.id} onClick={() => setActive(n.id)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${is ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
              <Icon className="h-4 w-4" />
              <span>{n.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="m-3 rounded-xl border border-border bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent p-4">
        <div className="flex items-center gap-2 text-sm font-medium"><Users className="h-4 w-4 text-purple-400" /> Team workspaces</div>
        <p className="mt-2 text-xs text-muted-foreground">Switch to a Clerk organization in the top bar to share one budget &amp; dashboard with your team.</p>
      </div>
    </aside>
  )
}

function MobileNav({ active, setActive }) {
  return (
    <div className="md:hidden sticky top-16 z-20 border-b border-border bg-background/80 backdrop-blur">
      <div className="flex gap-1 overflow-x-auto px-2 py-2">
        {NAV.map((n) => (
          <button key={n.id} onClick={() => setActive(n.id)}
            className={`shrink-0 rounded-md px-3 py-1.5 text-xs ${active === n.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground bg-muted/40'}`}>
            {n.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function NotificationBell({ notif, onRead, onReadAll }) {
  const iconFor = (s) => s === 'error' ? <AlertTriangle className="h-4 w-4 text-red-400" /> : s === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-400" /> : s === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Info className="h-4 w-4 text-blue-400" />
  const unread = notif?.unread || 0
  return (
    <DropdownMenu onOpenChange={(o) => { if (o) onRead?.() }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[9px] text-white grid place-items-center">{unread > 9 ? '9+' : unread}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {unread > 0 && <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onReadAll}>Mark all read</Button>}
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-80">
          {(notif?.items || []).length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            (notif.items || []).map((n) => (
              <div key={n.id} className={`flex gap-2 px-3 py-2.5 border-b border-border/50 ${!n.read ? 'bg-muted/30' : ''}`}>
                <div className="mt-0.5">{iconFor(n.severity)}</div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  <div className="text-xs text-muted-foreground">{n.message}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleString()}</div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Topbar({ active, onReseed, dataSource, currency, onCurrency, notif, onReadNotif, onReadAll, search, setSearch, goResources }) {
  const { theme, setTheme } = useTheme()
  const title = NAV.find((n) => n.id === active)?.label || 'Dashboard'
  return (
    <header className="h-16 border-b border-border bg-background/60 backdrop-blur-xl sticky top-0 z-30">
      <div className="h-full px-4 md:px-8 flex items-center gap-3">
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
          <form onSubmit={(e) => { e.preventDefault(); goResources() }} className="relative hidden lg:block">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search resources…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 w-56 bg-muted/40" />
          </form>
          <Select value={currency} onValueChange={onCurrency}>
            <SelectTrigger className="w-[84px] h-9 bg-muted/40"><SelectValue /></SelectTrigger>
            <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{symFor(c)} {c}</SelectItem>)}</SelectContent>
          </Select>
          <OrganizationSwitcher afterSelectOrganizationUrl="/" afterSelectPersonalUrl="/" hidePersonal={false}
            appearance={{ elements: { rootBox: 'hidden sm:flex items-center', organizationSwitcherTrigger: 'px-2 py-1.5 rounded-lg border border-border bg-muted/40 text-foreground' } }} />
          <Button variant="ghost" size="icon" onClick={onReseed} title="Reset demo data"><RefreshCw className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
          <NotificationBell notif={notif} onRead={onReadNotif} onReadAll={onReadAll} />
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
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 grid place-items-center shadow-lg shadow-blue-500/20"><Cloud className="h-5 w-5 text-white" /></div>
          <span className="font-semibold tracking-tight">Cloud-Cost-Pulse</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SignInButton mode="modal"><Button variant="ghost" size="sm"><LogIn className="h-4 w-4 mr-1" /> Sign in</Button></SignInButton>
          <SignUpButton mode="modal"><Button size="sm"><UserPlus className="h-4 w-4 mr-1" /> Get started</Button></SignUpButton>
        </div>
      </nav>
      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-24 text-center">
        <Badge variant="secondary" className="mb-6"><Sparkles className="h-3 w-3 mr-1 text-purple-400" /> Azure FinOps for teams</Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">Smart Azure Cloud Cost<br /><span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Monitoring &amp; Analytics</span></h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">Track every resource, compute costs live from your data, forecast next month, and get budget alerts by email — with Google sign-in and team workspaces.</p>
        <div className="mt-8 flex gap-3 justify-center">
          <SignUpButton mode="modal"><Button size="lg">Get started free</Button></SignUpButton>
          <SignInButton mode="modal"><Button size="lg" variant="outline"><LogIn className="h-4 w-4 mr-2" /> Sign in with Google</Button></SignInButton>
        </div>
        <div className="mt-16 grid md:grid-cols-4 gap-4 text-left">
          {[
            { icon: Boxes, t: 'Live cost engine', d: 'Every metric is computed from your resource database — no static numbers.' },
            { icon: Users, t: 'Team workspaces', d: 'A Clerk organization shares one budget and dashboard.' },
            { icon: Mail, t: 'Email alerts', d: 'Budget notices at your warning threshold and 100% via Resend.' },
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
    cyan: 'from-cyan-500/20 to-cyan-500/0 text-cyan-400',
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
          <div className={`h-10 w-10 rounded-lg bg-background/60 backdrop-blur grid place-items-center ${toneMap[tone].split(' ').slice(-1)[0]}`}><Icon className="h-5 w-5" /></div>
        </div>
        {typeof trend === 'number' && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {trend >= 0 ? (<><TrendingUp className="h-3.5 w-3.5 text-red-400" /><span className="text-red-400">+{trend}%</span></>) : (<><TrendingDown className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">{trend}%</span></>)}
            <span className="text-muted-foreground">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const SERVICE_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e']

function ChartTooltip({ active, payload, label, currency = 'INR' }) {
  if (!active || !payload?.length) return null
  const fmt = fmtFor(currency)
  return (
    <div className="rounded-lg border border-border bg-popover/95 backdrop-blur px-3 py-2 text-xs shadow-xl">
      {label && <div className="font-medium mb-1">{label}</div>}
      {payload.filter((p) => p.value != null).map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ============================ DASHBOARD ============================
function DashboardPage({ data }) {
  if (!data) return <LoadingGrid />
  const { stats, trend, serviceBreakdown, forecast, budget, recommendations, services = [], currency = 'INR' } = data
  const fmt = fmtFor(currency)
  const sym = symFor(currency)
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Wallet} label="Total Monthly Cost" value={fmt(stats.totalMonthlyCost)} tone="blue" trend={stats.growth} />
        <StatCard icon={Server} label="Active Resources" value={`${stats.activeResources}/${stats.totalResources}`} sub="active / total" tone="purple" />
        <StatCard icon={Activity} label="Total Services" value={stats.totalServices} sub="Azure service types" tone="cyan" />
        <StatCard icon={PiggyBank} label="Est. Savings" value={fmt(stats.potentialSavings)} sub="from recommendations" tone="green" />
        <StatCard icon={Sparkles} label="Forecast (next mo.)" value={fmt(forecast.expectedCost)} sub={`${forecast.growth >= 0 ? '+' : ''}${forecast.growth}% expected`} tone="pink" />
        <StatCard icon={AlertTriangle} label="Budget Used" value={`${stats.budgetUsage}%`} sub={`${budget.status} · ${fmt(budget.remaining)} left`} tone="amber" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div><CardTitle>Monthly Spending Trend</CardTitle><CardDescription>Historical months + live current month</CardDescription></div>
            <Badge variant="secondary">{data.dataSource === 'azure' ? 'Live Azure' : 'Live from resources'}</Badge>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient></defs>
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
          <CardHeader><CardTitle>Service Cost Distribution</CardTitle><CardDescription>Active resources, current month</CardDescription></CardHeader>
          <CardContent className="h-80">
            {serviceBreakdown.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={serviceBreakdown.slice(0, 8)} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={3}>
                    {serviceBreakdown.slice(0, 8).map((s, i) => <Cell key={i} fill={s.color || SERVICE_COLORS[i % 7]} stroke="transparent" />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Cost Forecast</CardTitle><CardDescription>Actuals plus 3-month projection (avg of last 3 months)</CardDescription></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast.series}>
                <defs>
                  <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} /><stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.4} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
                <Area type="monotone" dataKey="actual" name="Actual" stroke="#3b82f6" strokeWidth={2.5} fill="url(#ga)" connectNulls />
                <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#10b981" strokeWidth={2.5} strokeDasharray="5 4" fill="url(#gf)" connectNulls />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-pink-500/10" />
          <CardHeader className="relative"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-purple-400" /><CardTitle>Next Month Forecast</CardTitle></div><CardDescription>Average of last 3 months</CardDescription></CardHeader>
          <CardContent className="relative space-y-4">
            <div>
              <div className="text-3xl font-bold tracking-tight">{fmt(forecast.expectedCost)}</div>
              <div className="mt-1 flex items-center gap-2 text-xs">
                {forecast.growth >= 0 ? <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/20">+{forecast.growth}%</Badge> : <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20">{forecast.growth}%</Badge>}
                <span className="text-muted-foreground">expected change</span>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Basis (last 3 months)</div>
              {forecast.basis.map((v, i) => (<div key={i} className="flex items-center justify-between text-sm"><span className="text-muted-foreground">M-{forecast.basis.length - i}</span><span className="font-medium">{fmt(v)}</span></div>))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-400" /> Top Optimization Recommendations</CardTitle><CardDescription>Generated live from your resources and rules</CardDescription></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {recommendations.length === 0 ? <p className="text-sm text-muted-foreground">No recommendations right now — nice and lean!</p> : recommendations.map((r) => <RecCard key={r.id} r={r} currency={currency} />)}
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyChart() {
  return <div className="h-full grid place-items-center text-sm text-muted-foreground text-center px-6">No active resources yet.<br />Add resources to see the breakdown.</div>
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
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase text-muted-foreground">Save/mo</div>
          <div className="text-emerald-400 font-bold">{fmt(r.potential_savings)}</div>
        </div>
      </div>
    </div>
  )
}

// ============================ RESOURCES (CRUD) ============================
const EMPTY_FORM = { resource_name: '', service_type: '', region: '', monthly_cost: '', status: 'Active', owner: '' }

function ResourceForm({ open, setOpen, initial, onSaved, catalog, regions, currency }) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setForm(initial?.id ? { ...initial, monthly_cost: String(initial.monthly_cost) } : EMPTY_FORM) }, [open, initial])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const submit = async () => {
    if (!form.resource_name.trim()) return toast.error('Resource name is required')
    if (!form.service_type) return toast.error('Service type is required')
    if (!form.region) return toast.error('Region is required')
    const cost = Number(form.monthly_cost)
    if (!Number.isFinite(cost) || cost <= 0) return toast.error('Monthly cost must be greater than 0')
    setBusy(true)
    try {
      const payload = { resource_name: form.resource_name, service_type: form.service_type, region: form.region, monthly_cost: cost, status: form.status, owner: form.owner || 'unassigned' }
      const res = await fetch(isEdit ? `/api/resources/${initial.id}` : '/api/resources', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed')
      toast.success(isEdit ? 'Resource updated' : 'Resource added')
      setOpen(false); onSaved()
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{isEdit ? 'Edit Resource' : 'Add Resource'}</DialogTitle><DialogDescription>All metrics recalculate immediately after saving.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="space-y-1.5"><Label>Resource Name *</Label><Input placeholder="e.g. prod-web-vm-01" value={form.resource_name} onChange={(e) => set('resource_name', e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Service Type *</Label>
              <Select value={form.service_type} onValueChange={(v) => set('service_type', v)}>
                <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                <SelectContent>{(catalog || []).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Region *</Label>
              <Select value={form.region} onValueChange={(v) => set('region', v)}>
                <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                <SelectContent>{(regions || []).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Monthly Cost ({currency}) *</Label><Input type="number" min="1" placeholder="e.g. 3000" value={form.monthly_cost} onChange={(e) => set('monthly_cost', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Status *</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Active', 'Idle', 'Inactive'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Owner</Label><Input placeholder="e.g. platform-team" value={form.owner} onChange={(e) => set('owner', e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add resource'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ResourcesPage({ currency, onDataChange, externalSearch }) {
  const fmt = fmtFor(currency)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', service: 'all', region: 'all', status: 'all', minCost: '', maxCost: '', page: 1 })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [delTarget, setDelTarget] = useState(null)

  useEffect(() => { if (externalSearch !== undefined) setFilters((f) => ({ ...f, search: externalSearch, page: 1 })) }, [externalSearch])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const qp = new URLSearchParams()
      if (filters.search) qp.set('search', filters.search)
      if (filters.service !== 'all') qp.set('service', filters.service)
      if (filters.region !== 'all') qp.set('region', filters.region)
      if (filters.status !== 'all') qp.set('status', filters.status)
      if (filters.minCost) qp.set('minCost', filters.minCost)
      if (filters.maxCost) qp.set('maxCost', filters.maxCost)
      qp.set('page', filters.page); qp.set('pageSize', '10')
      const res = await fetch(`/api/resources?${qp.toString()}`)
      setData(await res.json())
    } catch { toast.error('Failed to load resources') } finally { setLoading(false) }
  }, [filters])
  useEffect(() => { load() }, [load])

  const doDelete = async () => {
    const id = delTarget.id
    setDelTarget(null)
    const res = await fetch(`/api/resources/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Resource deleted'); load(); onDataChange() } else toast.error('Delete failed')
  }
  const afterSave = () => { load(); onDataChange() }
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v, page: k === 'page' ? v : 1 }))
  const clearFilters = () => setFilters({ search: '', service: 'all', region: 'all', status: 'all', minCost: '', maxCost: '', page: 1 })
  const facets = data?.facets || { services: [], regions: [], statuses: ['Active', 'Idle', 'Inactive'] }
  const activeFilterCount = [filters.service, filters.region, filters.status].filter((v) => v !== 'all').length + (filters.minCost ? 1 : 0) + (filters.maxCost ? 1 : 0)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, service, region, owner…" value={filters.search} onChange={(e) => setF('search', e.target.value)} className="pl-9" />
        </div>
        <Select value={filters.service} onValueChange={(v) => setF('service', v)}><SelectTrigger className="w-[170px]"><SelectValue placeholder="Service" /></SelectTrigger><SelectContent><SelectItem value="all">All services</SelectItem>{facets.services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={filters.region} onValueChange={(v) => setF('region', v)}><SelectTrigger className="w-[150px]"><SelectValue placeholder="Region" /></SelectTrigger><SelectContent><SelectItem value="all">All regions</SelectItem>{facets.regions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={filters.status} onValueChange={(v) => setF('status', v)}><SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem>{facets.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Input type="number" placeholder="Min ₹" value={filters.minCost} onChange={(e) => setF('minCost', e.target.value)} className="w-24" />
        <Input type="number" placeholder="Max ₹" value={filters.maxCost} onChange={(e) => setF('maxCost', e.target.value)} className="w-24" />
        {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Clear</Button>}
        <Button onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="h-4 w-4 mr-1.5" /> Add Resource</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && !data ? (
            <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead><TableHead>Service</TableHead><TableHead>Region</TableHead>
                  <TableHead className="text-right">Monthly Cost</TableHead><TableHead>Status</TableHead><TableHead>Owner</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items || []).length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No resources found. {activeFilterCount || filters.search ? 'Try clearing filters.' : 'Click "Add Resource" to create one.'}</TableCell></TableRow>
                ) : (data.items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.resource_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.service_type}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.region}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(r.monthly_cost)}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_BADGE[r.status] || ''}>{r.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.owner}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditing(r); setFormOpen(true) }}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-400" onClick={() => setDelTarget(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                )))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{data.total} resource{data.total !== 1 ? 's' : ''} · page {data.page} of {data.pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={filters.page <= 1} onClick={() => setF('page', filters.page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={filters.page >= data.pages} onClick={() => setF('page', filters.page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <ResourceForm open={formOpen} setOpen={setFormOpen} initial={editing} onSaved={afterSave} catalog={data?.catalog || facets.services} regions={data?.allRegions || facets.regions} currency={currency} />

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete resource?</AlertDialogTitle><AlertDialogDescription>This permanently deletes <b>{delTarget?.resource_name}</b> ({delTarget && fmt(delTarget.monthly_cost)}/mo). Total cost, budget usage, forecast and recommendations will recalculate.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============================ ANALYTICS ============================
function AnalyticsPage({ data }) {
  if (!data) return <LoadingGrid />
  const currency = data.currency || 'INR'
  const sym = symFor(currency)
  const services = data.services || []
  const barData = data.serviceBreakdown.slice(0, 10).map((s) => ({ name: s.name.replace('Azure ', ''), cost: s.value, fill: s.color }))
  const trend = data.trend || []
  const cur = trend[trend.length - 1] || { total: 0 }
  const prev = trend[trend.length - 2] || { total: 0 }
  const compare = [{ name: prev.month || 'Prev', cost: prev.total || 0, fill: '#64748b' }, { name: cur.month || 'Current', cost: cur.total || 0, fill: '#8b5cf6' }]
  const diff = (cur.total || 0) - (prev.total || 0)
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Service Cost — Bar</CardTitle><CardDescription>Current month (active resources)</CardDescription></CardHeader>
          <CardContent className="h-80">
            {barData.length === 0 ? <EmptyChart /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Bar dataKey="cost" name="Cost" radius={[8, 8, 0, 0]}>{barData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Monthly Comparison</CardTitle><CardDescription>Current vs previous month · diff {diff >= 0 ? '+' : ''}{fmtFor(currency)(diff)}</CardDescription></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compare}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTooltip currency={currency} />} />
                <Bar dataKey="cost" name="Total" radius={[8, 8, 0, 0]}>{compare.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>All Services — Stacked Trend</CardTitle><CardDescription>Per-service spend over time</CardDescription></CardHeader>
        <CardContent className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `${sym}${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip currency={currency} />} />
              <Legend wrapperStyle={{ fontSize: 10 }} iconType="circle" />
              {services.slice(0, 8).map((s) => <Area key={s.key} type="monotone" stackId="1" dataKey={s.key} name={s.name.replace('Azure ', '')} stroke={s.color} fill={s.color} fillOpacity={0.7} />)}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================ BUDGET ============================
function BudgetPage({ data, refresh }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  if (!data) return <LoadingGrid />
  const { budget } = data
  const currency = data.currency || 'INR'
  const fmt = fmtFor(currency)
  const save = async () => {
    const n = Number(value)
    if (!n || n < 100) { toast.error('Enter a valid budget (min 100)'); return }
    const res = await fetch('/api/budget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthly_budget: n }) })
    if (res.ok) { toast.success('Budget updated'); setOpen(false); setValue(''); refresh() } else { const j = await res.json(); toast.error(j.error || 'Failed to update') }
  }
  const remainingPct = Math.max(0, 100 - budget.usage_pct)
  const statusTone = { green: 'text-emerald-400', amber: 'text-amber-400', red: 'text-red-400' }[budget.statusTone] || 'text-foreground'
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader><CardDescription>Monthly Budget {data.workspace?.isOrg ? '(shared by your team)' : ''}</CardDescription><CardTitle className="text-3xl">{fmt(budget.monthly_budget)}</CardTitle></CardHeader>
          <CardContent>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm" variant="secondary">Edit Budget</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Set Monthly Budget</DialogTitle><DialogDescription>Budget status, alerts and forecast update instantly.</DialogDescription></DialogHeader>
                <div className="space-y-2"><Label>Amount ({currency})</Label><Input type="number" placeholder="e.g. 60000" value={value} onChange={(e) => setValue(e.target.value)} /></div>
                <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
        <Card><CardHeader><CardDescription>Used This Month</CardDescription><CardTitle className="text-3xl text-amber-400">{fmt(budget.used)}</CardTitle></CardHeader><CardContent><Badge variant="secondary">{budget.usage_pct}% of budget</Badge></CardContent></Card>
        <Card><CardHeader><CardDescription>Remaining</CardDescription><CardTitle className={`text-3xl ${budget.remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(budget.remaining)}</CardTitle></CardHeader><CardContent><Badge variant="secondary">{remainingPct.toFixed(1)}% available</Badge></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Budget Utilization</CardTitle><CardDescription>Current month progress against budget</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between text-sm mb-2"><span className="text-muted-foreground">Used {fmt(budget.used)}</span><span className="font-medium">{budget.usage_pct}%</span></div>
            <Progress value={Math.min(100, budget.usage_pct)} className="h-3" />
          </div>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="rounded-lg border border-border p-4"><div className="text-muted-foreground text-xs">Status</div><div className={`mt-1 font-semibold flex items-center gap-2 ${statusTone}`}>{budget.statusTone === 'green' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />} {budget.status}</div></div>
            <div className="rounded-lg border border-border p-4"><div className="text-muted-foreground text-xs">Forecasted Spend</div><div className="mt-1 font-semibold">{fmt(data.forecast.expectedCost)}</div></div>
            <div className="rounded-lg border border-border p-4"><div className="text-muted-foreground text-xs">Projected Overrun</div><div className="mt-1 font-semibold">{data.forecast.expectedCost > budget.monthly_budget ? <span className="text-red-400">{fmt(data.forecast.expectedCost - budget.monthly_budget)}</span> : <span className="text-emerald-400">Under budget</span>}</div></div>
          </div>
          <div className="rounded-lg border border-border p-4 bg-muted/20 text-sm flex items-center gap-3"><Mail className="h-4 w-4 text-blue-400 shrink-0" /><span className="text-muted-foreground">Email alerts fire automatically at {data.meta?.rules?.budgetWarnPct || 80}% and 100% — {data.meta?.emailConfigured ? 'configured and active.' : 'set up Resend in Settings to enable.'}</span></div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================ OPTIMIZE ============================
function RecommendationsPage({ data }) {
  const [recs, setRecs] = useState(null)
  const currency = data?.currency || 'INR'
  const fmt = fmtFor(currency)
  useEffect(() => { fetch('/api/recommendations').then((r) => r.json()).then((j) => setRecs(Array.isArray(j) ? j : [])) }, [data])
  if (!recs) return <LoadingGrid />
  const total = recs.reduce((s, r) => s + (r.potential_savings || 0), 0)
  const ruleCount = recs.filter((r) => r.rule_based).length
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10" />
        <CardContent className="relative p-6 flex items-center justify-between">
          <div><div className="text-xs uppercase tracking-widest text-muted-foreground">Total identified savings</div><div className="mt-1 text-4xl font-bold text-emerald-400">{fmt(total)}<span className="text-base text-muted-foreground">/mo</span></div><div className="mt-1 text-sm text-muted-foreground">{recs.length} recommendations · {ruleCount} from your custom rules</div></div>
          <Sparkles className="h-16 w-16 text-emerald-400/40" />
        </CardContent>
      </Card>
      {recs.length === 0 ? <Card><CardContent className="p-10 text-center text-muted-foreground">No recommendations — your workspace looks optimized.</CardContent></Card> : (
        <div className="grid gap-3 md:grid-cols-2">{recs.map((r) => <RecCard key={r.id} r={r} currency={currency} />)}</div>
      )}
    </div>
  )
}

// ============================ REPORTS ============================
function ReportsPage({ data, mainRef, refresh }) {
  const [reports, setReports] = useState([])
  const fmt = fmtFor(data?.currency || 'INR')
  const loadReports = () => fetch('/api/reports').then((r) => r.json()).then((j) => setReports(Array.isArray(j) ? j : []))
  useEffect(() => { loadReports() }, [])

  const generate = async (type) => {
    toast.loading(`Generating ${type}…`, { id: 'gen' })
    try {
      const res = await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed')
      toast.success('Report generated & saved', { id: 'gen' })
      loadReports(); refresh?.()
    } catch (e) { toast.error('Failed to generate', { id: 'gen', description: e.message }) }
  }

  const exportPdf = async (report) => {
    toast.loading('Building PDF…', { id: 'pdf' })
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'pt', format: 'a4' })
      const s = report.snapshot || {}
      const cur = s.currency || data?.currency || 'INR'
      const F = fmtFor(cur)
      let y = 44
      doc.setFontSize(20); doc.setTextColor(20); doc.text(`Cloud-Cost-Pulse — ${report.type}`, 40, y); y += 20
      doc.setFontSize(10); doc.setTextColor(120); doc.text(`${new Date(report.created_at).toLocaleString()}`, 40, y); y += 26
      doc.setFontSize(12); doc.setTextColor(20)
      const lines = [
        `Total Monthly Cost: ${F(s.totalMonthlyCost)}`,
        `Resources: ${s.totalResources} (active ${s.activeResources}) · Services: ${s.totalServices}`,
        `Potential Savings: ${F(s.potentialSavings)}`,
        `Budget: ${F(s.budget?.monthly_budget)} · Used ${F(s.budget?.used)} (${s.budget?.usage_pct}%) · ${s.budget?.status}`,
        `Forecast (next month): ${F(s.forecast?.expectedCost)} (${s.forecast?.growth}%)`,
        '',
        'Service breakdown:',
        ...(s.serviceBreakdown || []).map((x) => `   • ${x.name}: ${F(x.value)}`),
        '',
        'Top recommendations:',
        ...(s.recommendations || []).slice(0, 6).map((r) => `   • ${r.title} — save ${F(r.potential_savings)}`),
      ]
      lines.forEach((l) => { if (y > 800) { doc.addPage(); y = 44 } doc.text(String(l), 40, y); y += 16 })
      doc.save(`ccp-${report.type.toLowerCase().replace(/\s+/g, '-')}-${report.id.slice(0, 6)}.pdf`)
      toast.success('PDF downloaded', { id: 'pdf' })
    } catch (e) { toast.error('PDF failed', { id: 'pdf', description: e.message }) }
  }

  const exportCsv = (report) => {
    const s = report.snapshot || {}
    const rows = [['Metric', 'Value'], ['Total Monthly Cost', s.totalMonthlyCost], ['Resources', s.totalResources], ['Active Resources', s.activeResources], ['Total Services', s.totalServices], ['Potential Savings', s.potentialSavings], ['Budget', s.budget?.monthly_budget], ['Used', s.budget?.used], ['Usage %', s.budget?.usage_pct], ['Status', s.budget?.status], ['Forecast', s.forecast?.expectedCost], [], ['Service', 'Cost'], ...(s.serviceBreakdown || []).map((x) => [x.name, x.value])]
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `ccp-${report.type.toLowerCase().replace(/\s+/g, '-')}.csv`; a.click()
    toast.success('CSV downloaded')
  }

  const del = async (id) => { await fetch(`/api/reports/${id}`, { method: 'DELETE' }); loadReports() }

  const types = [
    { title: 'Monthly Cost Report', desc: 'Total spend, per-service breakdown, top resources.', icon: FileText },
    { title: 'Budget Report', desc: 'Budget vs actual, forecast, projected overrun.', icon: Wallet },
    { title: 'Forecast Report', desc: 'Projection based on the last three months.', icon: TrendingUp },
    { title: 'Optimization Report', desc: 'Savings opportunities and recommendations.', icon: Lightbulb },
  ]
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {types.map((r) => { const Icon = r.icon; return (
          <Card key={r.title} className="hover:border-primary/50 transition-all">
            <CardHeader><div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center text-primary mb-2"><Icon className="h-5 w-5" /></div><CardTitle className="text-base">{r.title}</CardTitle><CardDescription className="text-xs">{r.desc}</CardDescription></CardHeader>
            <CardContent><Button onClick={() => generate(r.title)} className="w-full" size="sm"><Plus className="h-4 w-4 mr-1.5" /> Generate</Button></CardContent>
          </Card>
        )})}
      </div>
      <Card>
        <CardHeader><CardTitle>Generated Reports</CardTitle><CardDescription>Saved snapshots — export as PDF or CSV anytime</CardDescription></CardHeader>
        <CardContent className="p-0">
          {reports.length === 0 ? <div className="p-10 text-center text-muted-foreground text-sm">No reports yet. Generate one above.</div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Report</TableHead><TableHead>Generated</TableHead><TableHead className="text-right">Total Cost</TableHead><TableHead className="text-right">Savings</TableHead><TableHead className="text-right">Export</TableHead></TableRow></TableHeader>
              <TableBody>
                {reports.map((rep) => (
                  <TableRow key={rep.id}>
                    <TableCell className="font-medium">{rep.type}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(rep.created_at).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{fmt(rep.snapshot?.totalMonthlyCost)}</TableCell>
                    <TableCell className="text-right text-emerald-400">{fmt(rep.snapshot?.potentialSavings)}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" className="h-7 text-xs mr-1" onClick={() => exportPdf(rep)}><Download className="h-3 w-3 mr-1" /> PDF</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs mr-1" onClick={() => exportCsv(rep)}><Download className="h-3 w-3 mr-1" /> CSV</Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => del(rep.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================ SETTINGS ============================
function SettingsPage({ refresh, currency, onCurrency }) {
  const [settings, setSettings] = useState(null)
  const [az, setAz] = useState({ tenantId: '', clientId: '', clientSecret: '', subscriptionId: '' })
  const [em, setEm] = useState({ apiKey: '', recipient: '' })
  const [rules, setRules] = useState({ idleCostThreshold: 500, spikePct: 25, budgetWarnPct: 80 })
  const [busy, setBusy] = useState('')

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings'); const j = await res.json(); setSettings(j)
      if (j?.rules) setRules(j.rules)
      if (j?.email?.recipient) setEm((p) => ({ ...p, recipient: j.email.recipient }))
    } catch { toast.error('Failed to load settings') }
  }
  useEffect(() => { loadSettings() }, [])

  const post = async (url, body, label) => {
    setBusy(label)
    try { const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); const j = await res.json(); if (!res.ok) throw new Error(j.error || 'Request failed'); return j } finally { setBusy('') }
  }
  const connectAzure = async () => {
    if (!az.tenantId || !az.clientId || !az.clientSecret || !az.subscriptionId) { toast.error('All four Azure fields are required'); return }
    try { const j = await post('/api/azure/connect', az, 'azure'); toast.success('Azure connected!', { description: `Synced ${j.sync?.rows || 0} rows${j.sync?.currency ? ` (${j.sync.currency})` : ''}.` }); setAz({ tenantId: '', clientId: '', clientSecret: '', subscriptionId: '' }); await loadSettings(); refresh() } catch (e) { toast.error('Azure connection failed', { description: e.message, duration: 9000 }) }
  }
  const syncNow = async () => { try { const j = await post('/api/azure/sync', {}, 'sync'); toast.success('Sync complete', { description: `${j.sync?.rows || 0} rows refreshed.` }); await loadSettings(); refresh() } catch (e) { toast.error('Sync failed', { description: e.message }) } }
  const disconnect = async () => { try { await post('/api/azure/disconnect', {}, 'disconnect'); toast.success('Azure disconnected'); await loadSettings(); refresh() } catch (e) { toast.error(e.message) } }
  const saveEmail = async () => { if (!em.apiKey && !em.recipient) { toast.error('Enter a Resend API key and/or recipient'); return } try { await post('/api/settings/email', em, 'email'); toast.success('Email settings saved'); setEm((p) => ({ ...p, apiKey: '' })); await loadSettings(); refresh() } catch (e) { toast.error('Failed to save', { description: e.message }) } }
  const testEmail = async () => { try { const j = await post('/api/settings/email/test', {}, 'test'); toast.success('Test email sent!', { description: `Resend ID: ${j.emailId}` }) } catch (e) { toast.error('Test email failed', { description: e.message, duration: 9000 }) } }
  const saveRules = async () => { try { const j = await post('/api/settings/rules', rules, 'rules'); toast.success('Rules saved'); setRules(j.rules); refresh() } catch (e) { toast.error('Failed to save rules', { description: e.message }) } }
  const alerts = settings?.alerts || []

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-cyan-400" /> Preferences</CardTitle><CardDescription>Currency applies across dashboards, charts, budgets and reports.</CardDescription></CardHeader>
        <CardContent><div className="flex items-center gap-3"><Label className="w-32">Display currency</Label><Select value={currency} onValueChange={onCurrency}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{symFor(c)} {c}</SelectItem>)}</SelectContent></Select></div></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plug className="h-5 w-5 text-blue-400" /> Azure Cost Management</CardTitle><CardDescription>Connect a Service Principal with the <b>Cost Management Reader</b> role. The client secret is encrypted (AES-256-GCM) and never sent back to the browser.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {settings?.azure?.connected ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-400"><CheckCircle2 className="h-4 w-4" /> Connected — pulling live Azure billing data</div>
              <div className="grid md:grid-cols-3 gap-2 text-xs text-muted-foreground"><div>Tenant: <span className="font-mono">{settings.azure.azureTenantId}</span></div><div>Client: <span className="font-mono">{settings.azure.azureClientId}</span></div><div>Subscription: <span className="font-mono">{settings.azure.azureSubscriptionId}</span></div></div>
              {settings.lastSyncAt && <div className="text-xs text-muted-foreground">Last sync: {new Date(settings.lastSyncAt).toLocaleString()}</div>}
              <div className="flex gap-2 pt-1"><Button size="sm" variant="secondary" onClick={syncNow} disabled={busy === 'sync'}><RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${busy === 'sync' ? 'animate-spin' : ''}`} /> {busy === 'sync' ? 'Syncing…' : 'Sync now'}</Button><Button size="sm" variant="outline" className="text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={disconnect} disabled={busy === 'disconnect'}><Unplug className="h-3.5 w-3.5 mr-1.5" /> Disconnect</Button></div>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {[['tenantId', 'Tenant ID (Directory ID)'], ['clientId', 'Client ID (Application ID)'], ['clientSecret', 'Client Secret'], ['subscriptionId', 'Subscription ID']].map(([name, label]) => (
                  <div key={name} className="space-y-1.5"><Label htmlFor={`az-${name}`}>{label}</Label><Input id={`az-${name}`} type={name === 'clientSecret' ? 'password' : 'text'} placeholder={name === 'clientSecret' ? 'secret value' : 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'} value={az[name]} onChange={(e) => setAz({ ...az, [name]: e.target.value })} /></div>
                ))}
              </div>
              <Button onClick={connectAzure} disabled={busy === 'azure'}><Plug className="h-4 w-4 mr-2" /> {busy === 'azure' ? 'Validating with Azure…' : 'Validate & Connect'}</Button>
              <p className="text-xs text-muted-foreground">Entra ID → App registrations → your app (tenant + client ID, create a secret), then Subscription → Access control (IAM) → assign <b>Cost Management Reader</b> to the app.</p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-purple-400" /> Email Budget Alerts (Resend)</CardTitle><CardDescription>Emails send automatically at your warning threshold and 100% of budget (deduplicated per month). Free key at resend.com → API Keys.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {settings?.email?.configured && <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 text-sm flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-purple-400" /><span>Key saved ({settings.email.keyMask}) · alerts go to <b>{settings.email.recipient || 'no recipient set'}</b></span></div>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="resend-key">Resend API key</Label><Input id="resend-key" type="password" placeholder="re_…" value={em.apiKey} onChange={(e) => setEm({ ...em, apiKey: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="resend-to">Alert recipient email</Label><Input id="resend-to" type="email" placeholder="you@company.com" value={em.recipient} onChange={(e) => setEm({ ...em, recipient: e.target.value })} /></div>
          </div>
          <div className="flex gap-2"><Button onClick={saveEmail} disabled={busy === 'email'}>{busy === 'email' ? 'Saving…' : 'Save settings'}</Button><Button variant="secondary" onClick={testEmail} disabled={busy === 'test' || !settings?.email?.configured}><Send className="h-3.5 w-3.5 mr-1.5" /> {busy === 'test' ? 'Sending…' : 'Send test email'}</Button></div>
          <p className="text-xs text-muted-foreground">Without a verified domain, Resend&apos;s sandbox sender <span className="font-mono">onboarding@resend.dev</span> can only deliver to your own Resend account email.</p>
          {alerts.length > 0 && (
            <div className="space-y-2"><div className="text-xs uppercase tracking-wider text-muted-foreground">Alert history</div>
              {alerts.map((a) => (<div key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-xs"><div className="flex items-center gap-2">{a.sentAt ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}<span>{a.threshold >= 100 ? 'Budget exceeded (100%)' : `${a.threshold}% warning`} → {a.recipient}</span></div><span className="text-muted-foreground">{a.sentAt ? new Date(a.sentAt).toLocaleString() : (a.error || 'failed')}</span></div>))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><SlidersHorizontal className="h-5 w-5 text-amber-400" /> Custom Recommendation Rules</CardTitle><CardDescription>Tune when Cloud-Cost-Pulse flags idle resources, spikes and budget warnings.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5"><Label>Idle resource cost threshold</Label><Input type="number" value={rules.idleCostThreshold} onChange={(e) => setRules({ ...rules, idleCostThreshold: e.target.value })} /><p className="text-[11px] text-muted-foreground">Flag idle/inactive resources above this per month.</p></div>
            <div className="space-y-1.5"><Label>Cost spike threshold (%)</Label><Input type="number" value={rules.spikePct} onChange={(e) => setRules({ ...rules, spikePct: e.target.value })} /><p className="text-[11px] text-muted-foreground">Flag services whose month-over-month cost grows more than this.</p></div>
            <div className="space-y-1.5"><Label>Budget warning at (%)</Label><Input type="number" value={rules.budgetWarnPct} onChange={(e) => setRules({ ...rules, budgetWarnPct: e.target.value })} /><p className="text-[11px] text-muted-foreground">First alert fires at this budget utilization.</p></div>
          </div>
          <Button onClick={saveRules} disabled={busy === 'rules'}>{busy === 'rules' ? 'Saving…' : 'Save rules'}</Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================ PROFILE ============================
function ProfilePage({ goSettings, data }) {
  const { user } = useUser()
  const { organization } = useOrganization()
  const [audit, setAudit] = useState([])
  useEffect(() => { fetch('/api/audit').then((r) => r.json()).then((j) => setAudit(Array.isArray(j) ? j : [])) }, [data])
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Signed-in user'
  const email = user?.primaryEmailAddress?.emailAddress || ''
  const initials = (name.split(' ').map((s) => s[0]).join('') || 'U').slice(0, 2).toUpperCase()
  const joined = user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'
  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader><div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">{user?.imageUrl ? <img src={user.imageUrl} alt={name} className="h-full w-full object-cover rounded-full" /> : <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">{initials}</AvatarFallback>}</Avatar>
          <div><CardTitle>{name}</CardTitle><CardDescription>{email}</CardDescription></div>
        </div></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div><Label>Role</Label><Input value={organization ? 'Organization member' : 'Workspace owner'} readOnly /></div>
            <div><Label>Workspace</Label><Input value={organization?.name || 'Personal workspace'} readOnly /></div>
            <div><Label>Joined</Label><Input value={joined} readOnly /></div>
            <div><Label>Resources</Label><Input value={`${data?.stats?.totalResources ?? '—'} total`} readOnly /></div>
          </div>
          <div className="rounded-lg border border-border p-4 bg-muted/30"><div className="flex items-center gap-2 text-sm font-medium"><Users className="h-4 w-4 text-purple-400" /> Team Workspace</div><p className="mt-1 text-xs text-muted-foreground">{organization ? `Viewing the shared workspace for "${organization.name}" — everyone in this organization sees the same budget and dashboard.` : 'Create or join a Clerk organization from the switcher in the top bar to share one budget and dashboard with your team.'}</p></div>
          <Button size="sm" variant="outline" onClick={goSettings}><SettingsIcon className="h-4 w-4 mr-2" /> Open Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-blue-400" /> Activity History (Audit Log)</CardTitle><CardDescription>Every change in this workspace is recorded</CardDescription></CardHeader>
        <CardContent className="p-0">
          {audit.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">No activity yet.</div> : (
            <ScrollArea className="h-96">
              {audit.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-4 py-3 border-b border-border/50 text-sm">
                  <Badge variant="outline" className="capitalize shrink-0">{a.action}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="capitalize font-medium">{a.action} {a.entity}</div>
                    {(a.prev_value || a.new_value) && <div className="text-xs text-muted-foreground truncate">{a.prev_value ? `from ${a.prev_value} ` : ''}{a.new_value ? `→ ${a.new_value}` : ''}</div>}
                  </div>
                  <div className="text-[11px] text-muted-foreground shrink-0">{new Date(a.created_at).toLocaleString()}</div>
                </div>
              ))}
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-80 lg:col-span-2" /><Skeleton className="h-80" /></div>
    </div>
  )
}

// ============================ APP ============================
function App() {
  const [active, setActive] = useState('dashboard')
  const [data, setData] = useState(null)
  const [notif, setNotif] = useState({ items: [], unread: 0 })
  const [topSearch, setTopSearch] = useState('')
  const [resourceSearch, setResourceSearch] = useState(undefined)
  const { isSignedIn, isLoaded } = useUser()
  const { organization } = useOrganization()
  const mainRef = useRef(null)
  const alertedRef = useRef({ warn: false, over: false })
  const currency = data?.currency || 'INR'

  const loadNotif = useCallback(async () => { try { const r = await fetch('/api/notifications'); if (r.ok) setNotif(await r.json()) } catch {} }, [])

  const load = useCallback(async () => {
    try { const res = await fetch('/api/dashboard'); if (res.status === 401) return; const j = await res.json(); setData(j); loadNotif() } catch { toast.error('Failed to load data') }
  }, [loadNotif])

  useEffect(() => { if (isSignedIn) { setData(null); alertedRef.current = { warn: false, over: false }; load() } }, [isSignedIn, organization?.id, load])

  useEffect(() => {
    if (!data?.budget) return
    const pct = data.budget.usage_pct
    const warnPct = data.meta?.rules?.budgetWarnPct || 80
    const fmt = fmtFor(data.currency || 'INR')
    if (pct >= 100 && !alertedRef.current.over) { alertedRef.current.over = true; toast.error('Budget exceeded!', { description: `At ${pct}% of ${fmt(data.budget.monthly_budget)}.`, duration: 8000 }) }
    else if (pct >= warnPct && pct < 100 && !alertedRef.current.warn) { alertedRef.current.warn = true; toast.warning(`Budget alert: ${warnPct}% reached`, { description: `Used ${fmt(data.budget.used)} of ${fmt(data.budget.monthly_budget)}.`, duration: 8000 }) }
    if (data.emailAlert?.sent) toast.info('Email alert sent', { description: `Delivered to ${data.emailAlert.recipient}.` })
    else if (data.emailAlert?.error) toast.error('Email alert failed', { description: data.emailAlert.error, duration: 9000 })
  }, [data])

  const setCurrency = async (c) => {
    try { const res = await fetch('/api/settings/currency', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currency: c }) }); if (!res.ok) throw new Error(); toast.success(`Currency set to ${c}`); load() } catch { toast.error('Failed to change currency') }
  }

  const reseed = async () => { toast.loading('Resetting demo data…', { id: 'reseed' }); await fetch('/api/reset', { method: 'POST' }); alertedRef.current = { warn: false, over: false }; await load(); toast.success('Fresh demo data loaded', { id: 'reseed' }) }
  const readAll = async () => { await fetch('/api/notifications/read-all', { method: 'POST' }); loadNotif() }
  const goResources = () => { setResourceSearch(topSearch); setActive('resources') }

  if (!isLoaded) return <div className="min-h-screen bg-background grid place-items-center text-muted-foreground">Loading…</div>

  return isSignedIn ? (
    <div className="min-h-screen bg-background flex">
      <Sidebar active={active} setActive={setActive} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar active={active} onReseed={reseed} dataSource={data?.dataSource} currency={currency} onCurrency={setCurrency} notif={notif} onReadNotif={loadNotif} onReadAll={readAll} search={topSearch} setSearch={setTopSearch} goResources={goResources} />
        <MobileNav active={active} setActive={setActive} />
        <main ref={mainRef} className="flex-1 p-4 md:p-8 overflow-x-hidden">
          {active === 'dashboard' && <DashboardPage data={data} />}
          {active === 'resources' && <ResourcesPage currency={currency} onDataChange={load} externalSearch={resourceSearch} />}
          {active === 'analytics' && <AnalyticsPage data={data} />}
          {active === 'budget' && <BudgetPage data={data} refresh={load} />}
          {active === 'recommendations' && <RecommendationsPage data={data} />}
          {active === 'reports' && <ReportsPage data={data} mainRef={mainRef} refresh={load} />}
          {active === 'settings' && <SettingsPage refresh={load} currency={currency} onCurrency={setCurrency} />}
          {active === 'profile' && <ProfilePage goSettings={() => setActive('settings')} data={data} />}
        </main>
      </div>
    </div>
  ) : <Landing />
}

export default App
