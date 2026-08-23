'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  LayoutDashboard, BarChart3, Wallet, Lightbulb, FileText, User, Server as ServerIcon,
  TrendingUp, TrendingDown, Cloud, Server, Activity, PiggyBank, Boxes,
  Search, Bell, Moon, Sun, Sparkles, AlertTriangle, CheckCircle2, Download,
  LogIn, UserPlus, Plug, Settings as SettingsIcon, Mail, SlidersHorizontal,
  RefreshCw, Unplug, Send, Users, Plus, Pencil, Trash2, Filter, X, Clock, Info, Upload,
  Database, FileSpreadsheet, ShieldAlert, Check, ChevronRight, Eye, Layers, Shield, Play,
  Maximize2, Minimize2, Image, BarChart2, LineChart as LineChartIcon, Palette, ZoomIn, ZoomOut, ToggleLeft, Hash,
  CalendarDays, History as HistoryIcon
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
  ReferenceLine, Brush, ComposedChart,
} from 'recharts'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'

import { validateAndParseImportData, parseCSVText } from '@/lib/import-parser'
import { generateCSVReport, generatePDFReport, downloadFile } from '@/lib/report-exporter'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'resources', label: 'Resources', icon: Boxes },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'budget', label: 'Budget', icon: Wallet },
  { id: 'recommendations', label: 'Optimize', icon: Lightbulb },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
  { id: 'workspaces', label: 'Workspaces', icon: Layers },
  { id: 'history', label: 'History', icon: HistoryIcon },
  { id: 'profile', label: 'Profile', icon: User },
]

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP']
const CONVERSION_RATES = { INR: 1, USD: 0.012, EUR: 0.011, GBP: 0.0095 }

const fmtFor = (c = 'INR') => (n) => {
  const rate = CONVERSION_RATES[c] || 1
  const converted = (n || 0) * (c === 'INR' ? 1 : rate)
  return new Intl.NumberFormat(c === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(converted)
}
const symFor = (c = 'INR') => (c === 'INR' ? '₹' : c === 'USD' ? '$' : c === 'EUR' ? '€' : c === 'GBP' ? '£' : `${c} `)

const STATUS_BADGE = {
  Active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Idle: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Inactive: 'bg-red-500/15 text-red-400 border-red-500/30',
}

// ============================ GLOBAL SEARCH MODAL ============================
function GlobalSearchModal({ open, setOpen, onNavigate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ resources: [] })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setOpen])

  useEffect(() => {
    if (!query.trim()) { setResults({ resources: [] }); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/resources?search=${encodeURIComponent(query)}&pageSize=5`)
        const data = await res.json()
        setResults({ resources: data.items || [] })
      } catch { } finally { setLoading(false) }
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl w-[95vw] max-h-[90vh] p-0 gap-0 overflow-hidden">
        <div className="flex items-center px-3 sm:px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
          <Input
            placeholder="Search resources, services, regions... (Cmd+K)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-11 sm:h-12 text-xs sm:text-sm"
          />
          <Badge variant="outline" className="hidden sm:inline-flex text-[10px] text-muted-foreground ml-auto shrink-0">ESC to close</Badge>
        </div>
        <ScrollArea className="max-h-[60vh] sm:max-h-80 p-3 sm:p-4">
          {!query.trim() ? (
            <div className="text-xs text-muted-foreground text-center py-6">Type a query to search resources across services, regions, and owners.</div>
          ) : loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : results.resources.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-6">No matching resources found.</div>
          ) : (
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resources</div>
              {results.resources.map((r) => (
                <div
                  key={r.id}
                  onClick={() => { onNavigate('resources', r.resource_name); setOpen(false) }}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Boxes className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="font-medium truncate">{r.resource_name}</span>
                    <span className="text-[11px] text-muted-foreground hidden sm:inline truncate">({r.service_type})</span>
                  </div>
                  <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${STATUS_BADGE[r.status] || ''}`}>{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// ============================ DATA IMPORT MODAL ============================
function DataImportModal({ open, setOpen, onImportSuccess }) {
  const [file, setFile] = useState(null)
  const [parsedResult, setParsedResult] = useState(null)
  const [busy, setBusy] = useState(false)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return
    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = async (evt) => {
      const text = evt.target.result
      let rawData = []
      try {
        if (selectedFile.name.endsWith('.json')) {
          rawData = JSON.parse(text)
        } else {
          rawData = parseCSVText(text)
        }
        const result = validateAndParseImportData(rawData)
        setParsedResult(result)
      } catch (err) {
        toast.error('Failed to parse file format')
      }
    }
    reader.readAsText(selectedFile)
  }

  const handleConfirmImport = async () => {
    if (!parsedResult || parsedResult.summary.validCount === 0) {
      toast.error('No valid rows to import')
      return
    }

    setBusy(true)
    const validRows = parsedResult.parsedRows.filter((r) => r.isValid)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows }),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Import failed')

      toast.success(`Successfully imported ${j.count} cloud resources!`)
      setOpen(false)
      setFile(null)
      setParsedResult(null)
      onImportSuccess?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Upload className="h-5 w-5 text-purple-400" /> Import Cloud Cost Data
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Upload a CSV, Excel, or JSON file to import cloud resource costs into your database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="border-2 border-dashed border-border rounded-xl p-4 sm:p-6 text-center hover:border-primary/50 transition-colors">
            <FileSpreadsheet className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground mx-auto mb-2" />
            <div className="text-xs sm:text-sm font-medium">Select a CSV or JSON cost file</div>
            <div className="text-[11px] sm:text-xs text-muted-foreground mt-1">Expected columns: resource_name, service_type, region, monthly_cost, status, owner</div>
            <Input type="file" accept=".csv,.json,.txt" onChange={handleFileChange} className="mt-4 max-w-xs mx-auto text-xs" />
          </div>

          {parsedResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-muted/30 p-2.5 sm:p-3 rounded-lg border border-border text-center sm:text-left">
                <div>Total: <b>{parsedResult.summary.total}</b></div>
                <div className="text-emerald-400">Valid: <b>{parsedResult.summary.validCount}</b></div>
                <div className="text-amber-400">Duplicates: <b>{parsedResult.summary.duplicateCount}</b></div>
                <div className="text-red-400">Errors: <b>{parsedResult.summary.errorCount}</b></div>
              </div>

              <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parsed Preview (First 5 Rows)</div>
              <ScrollArea className="max-h-44 sm:max-h-48 rounded-lg border border-border">
                <Table className="text-xs min-w-[480px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Row</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedResult.parsedRows.slice(0, 5).map((r, idx) => (
                      <TableRow key={idx} className={!r.isValid ? 'bg-red-500/10' : ''}>
                        <TableCell>{r.rowNumber}</TableCell>
                        <TableCell className="font-medium">{r.resource_name || '—'}</TableCell>
                        <TableCell>{r.service_type}</TableCell>
                        <TableCell>₹{r.monthly_cost}</TableCell>
                        <TableCell>
                          {r.isValid ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Valid</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">{r.errors[0]}</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} className="w-full sm:w-auto text-xs">Cancel</Button>
          <Button onClick={handleConfirmImport} disabled={busy || !parsedResult || parsedResult.summary.validCount === 0} className="w-full sm:w-auto text-xs">
            {busy ? 'Importing…' : `Import ${parsedResult?.summary.validCount || 0} Resources`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================ DEMO DATA MODAL ============================
function DemoDataModal({ open, setOpen, onConfirm }) {
  const [mode, setMode] = useState('replace')

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-5 w-5 text-purple-400" /> Load FinOps Demo Dataset
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Populates your workspace with 50 Azure resources across 7 services, 12 months of spending history, budgets, recommendations, and audit logs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Select Seed Mode</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              onClick={() => setMode('replace')}
              className={`p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${mode === 'replace' ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
            >
              <div className="font-semibold text-sm">Replace Data</div>
              <div className="text-xs text-muted-foreground mt-1">Clears existing workspace resources and reseeds fresh demo records.</div>
            </div>
            <div
              onClick={() => setMode('merge')}
              className={`p-3.5 sm:p-4 rounded-xl border cursor-pointer transition-all ${mode === 'merge' ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent'}`}
            >
              <div className="font-semibold text-sm">Merge Data</div>
              <div className="text-xs text-muted-foreground mt-1">Preserves existing resources and appends default demo datasets.</div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} className="w-full sm:w-auto text-xs">Cancel</Button>
          <Button onClick={() => { onConfirm(mode); setOpen(false) }} className="w-full sm:w-auto text-xs">
            Confirm &amp; Load Demo Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================ SIDEBAR & MOBILE CHROME ============================
function Sidebar({ active, setActive }) {
  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 flex-col border-r border-border bg-sidebar text-sidebar-foreground sticky top-0 h-screen shrink-0">
      <div className="h-16 flex items-center gap-2.5 px-5 lg:px-6 border-b border-border">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 grid place-items-center shadow-lg shadow-blue-500/20 shrink-0">
          <Cloud className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold tracking-tight truncate text-sm lg:text-base">Cloud-Cost-Pulse</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">FinOps SaaS</div>
        </div>
      </div>
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {NAV.map((n) => {
          const Icon = n.icon
          const is = active === n.id
          return (
            <button key={n.id} onClick={() => setActive(n.id)}
              className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${is ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{n.label}</span>
            </button>
          )
        })}
      </nav>
      <div className="m-3 rounded-xl border border-border bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-transparent p-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold"><Users className="h-4 w-4 text-purple-400 shrink-0" /> Team workspaces</div>
        <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">Switch to a Clerk organization in the top bar to share one budget &amp; dashboard with your team.</p>
      </div>
    </aside>
  )
}

function MobileNav({ active, setActive }) {
  return (
    <div className="md:hidden sticky top-16 z-20 border-b border-border/80 bg-background/95 backdrop-blur-md shadow-sm">
      <div className="flex gap-1.5 overflow-x-auto px-2.5 py-2 no-scrollbar scroll-smooth">
        {NAV.map((n) => {
          const Icon = n.icon
          const is = active === n.id
          return (
            <button
              key={n.id}
              onClick={() => setActive(n.id)}
              className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                is
                  ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground bg-muted/40 hover:bg-muted/70 hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span>{n.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatRelativeTime(date) {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diffSec = Math.floor((now - d) / 1000)
  if (diffSec < 45) return 'Just now'
  if (diffSec < 3600) return `${Math.max(1, Math.floor(diffSec / 60))}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  if (diffSec < 172800) return 'Yesterday'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function NotificationBell({ notif, onRead, onReadAll, onReadItem, onDeleteItem, onClearAll }) {
  const [tab, setTab] = useState('all')
  const iconFor = (s) => s === 'error' ? <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" /> : s === 'warning' ? <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" /> : s === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <Info className="h-4 w-4 text-blue-400 shrink-0" />
  const unread = notif?.unread || 0
  const items = notif?.items || []
  const displayedItems = tab === 'unread' ? items.filter(n => !n.read) : items

  return (
    <DropdownMenu onOpenChange={(o) => { if (o) onRead?.() }}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9 hover:bg-muted/60" title="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white grid place-items-center animate-pulse">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[340px] sm:w-[360px] max-w-[95vw] p-0 shadow-2xl border-border/80 bg-popover">
        <div className="p-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Notifications</span>
              {unread > 0 && <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-red-500/10 text-red-400 font-mono">{unread} new</Badge>}
            </div>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground" onClick={onReadAll} title="Mark all read">
                  <Check className="h-3 w-3 mr-1" /> Mark all read
                </Button>
              )}
              {items.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-red-400" onClick={onClearAll} title="Clear all notifications">
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex gap-1 mt-2">
            <button
              onClick={() => setTab('all')}
              className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${tab === 'all' ? 'bg-primary/20 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => setTab('unread')}
              className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${tab === 'unread' ? 'bg-primary/20 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Unread ({unread})
            </button>
          </div>
        </div>

        <ScrollArea className="h-72 sm:h-80">
          {displayedItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center justify-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
              <span>{tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}</span>
            </div>
          ) : (
            displayedItems.map((n) => (
              <div
                key={n.id}
                onClick={() => { if (!n.read) onReadItem?.(n.id) }}
                className={`group flex items-start gap-2.5 px-3 py-2.5 border-b border-border/40 hover:bg-muted/40 transition-colors cursor-pointer ${!n.read ? 'bg-primary/5' : ''}`}
              >
                <div className="mt-0.5">{iconFor(n.severity)}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-medium truncate ${!n.read ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>{n.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{formatRelativeTime(n.created_at)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{n.message}</div>
                </div>
                <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {!n.read && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onReadItem?.(n.id) }}
                      className="p-1 text-muted-foreground hover:text-foreground rounded"
                      title="Mark as read"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteItem?.(n.id) }}
                    className="p-1 text-muted-foreground hover:text-red-400 rounded"
                    title="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function Topbar({ active, onOpenDemoModal, onOpenImportModal, onOpenSearch, dataSource, currency, onCurrency, notif, onReadNotif, onReadAll, onReadItem, onDeleteItem, onClearAll, isDemoPreview, onExitDemo }) {
  const { theme, setTheme } = useTheme()
  const title = NAV.find((n) => n.id === active)?.label || 'Dashboard'
  return (
    <header className="h-16 border-b border-border bg-background/60 backdrop-blur-xl sticky top-0 z-30">
      <div className="h-full px-2.5 sm:px-4 md:px-6 flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          <div className="min-w-0">
            <div className="text-[10px] sm:text-xs text-muted-foreground truncate">FinOps Console</div>
            <div className="text-sm sm:text-base md:text-lg font-semibold leading-none flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="truncate">{title}</span>
              {isDemoPreview ? (
                <Badge className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/20 text-[9px] sm:text-[10px] shrink-0">Demo</Badge>
              ) : dataSource === 'azure' ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[9px] sm:text-[10px] shrink-0">Azure</Badge>
              ) : dataSource === 'empty' ? (
                <Badge variant="outline" onClick={onOpenImportModal} className="text-[9px] sm:text-[10px] cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors border-primary/40 shrink-0">+ Connect</Badge>
              ) : (
                <Badge variant="secondary" className="text-[9px] sm:text-[10px] shrink-0">Demo</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
          {isDemoPreview ? (
            <Button size="sm" variant="secondary" onClick={onExitDemo} className="text-xs bg-purple-500/15 text-purple-400 hover:bg-purple-500/25 h-8">
              Exit Demo
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="icon" onClick={onOpenSearch} className="h-8 w-8 lg:hidden text-muted-foreground" title="Search">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={onOpenSearch} className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 h-8 sm:h-9">
                <Search className="h-3.5 w-3.5" />
                <span>Search...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">⌘K</kbd>
              </Button>
              <Button variant="outline" size="sm" onClick={onOpenImportModal} className="hidden sm:flex items-center gap-1 text-xs h-8 sm:h-9">
                <Upload className="h-3.5 w-3.5 mr-1" /> Import
              </Button>
              <Select value={currency} onValueChange={onCurrency}>
                <SelectTrigger className="w-[68px] sm:w-[84px] h-8 sm:h-9 bg-muted/40 text-xs px-2"><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{symFor(c)} {c}</SelectItem>)}</SelectContent>
              </Select>
              <OrganizationSwitcher afterSelectOrganizationUrl="/" afterSelectPersonalUrl="/" hidePersonal={false}
                appearance={{ elements: { rootBox: 'hidden md:flex items-center', organizationSwitcherTrigger: 'px-2 py-1.5 rounded-lg border border-border bg-muted/40 text-foreground text-xs' } }} />
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={onOpenDemoModal} title="Load Demo Data"><RefreshCw className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}</Button>
              <NotificationBell notif={notif} onRead={onReadNotif} onReadAll={onReadAll} onReadItem={onReadItem} onDeleteItem={onDeleteItem} onClearAll={onClearAll} />
              <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'h-7 w-7 sm:h-8 sm:w-8' } }} />
            </>
          )}
        </div>
      </div>
    </header>
  )
}

// ============================ MODERN BEAUTIFUL LANDING PAGE ============================
function Landing({ onExploreDemo }) {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden selection:bg-purple-500/30">
      {/* Background Gradients & Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-96 h-96 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03] pointer-events-none" />

      {/* Header Navbar */}
      <nav className="relative z-20 max-w-7xl mx-auto h-20 flex items-center justify-between px-6 md:px-12 border-b border-border/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 grid place-items-center shadow-lg shadow-purple-500/25">
            <Cloud className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">Cloud-Cost-Pulse</span>
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-500/15 text-purple-400 border border-purple-500/30">v3.0</span>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Button variant="outline" size="sm" onClick={onExploreDemo} className="hidden sm:flex items-center gap-2 border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
            <Play className="h-3.5 w-3.5 fill-current" /> Demo Workspace
          </Button>
          <SignInButton mode="modal"><Button variant="ghost" size="sm"><LogIn className="h-4 w-4 mr-1.5" /> Sign in</Button></SignInButton>
          <SignUpButton mode="modal"><Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/20"><UserPlus className="h-4 w-4 mr-1.5" /> Get started</Button></SignUpButton>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-16 md:pt-24 pb-20 text-center">
        <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-xs font-medium bg-purple-500/10 border-purple-500/30 text-purple-300 rounded-full inline-flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" /> Production-Grade FinOps SaaS Platform
        </Badge>
        
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl mx-auto">
          Master Cloud Costs &amp; FinOps with <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Live Real-Time Intelligence
          </span>
        </h1>
        
        <p className="mt-6 text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Monitor multi-cloud spending, track live budget thresholds, forecast future costs, import CSV/Excel data, and receive automated optimization recommendations.
        </p>

        {/* Hero Actions */}
        <div className="mt-10 flex flex-wrap gap-4 justify-center items-center">
          <Button size="lg" onClick={onExploreDemo} className="h-13 px-8 text-base bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-xl shadow-purple-500/25 transition-all duration-300 transform hover:-translate-y-0.5">
            <Play className="h-5 w-5 mr-2.5 fill-current" /> Explore Demo Workspace Instant Preview
          </Button>
          <SignUpButton mode="modal">
            <Button size="lg" variant="outline" className="h-13 px-8 text-base border-border bg-card/60 hover:bg-accent rounded-xl">
              Get started free
            </Button>
          </SignUpButton>
        </div>

        {/* Proof Stats Bar */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl border border-border/60 bg-card/40 backdrop-blur-xl max-w-4xl mx-auto">
          {[
            { metric: '$1.2M+', label: 'Cloud Costs Monitored' },
            { metric: '35%', label: 'Average Savings Found' },
            { metric: '100%', label: 'Database-Driven Engine' },
            { metric: 'Instant', label: 'Multi-Currency & Export' },
          ].map((s, i) => (
            <div key={i} className="p-3">
              <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{s.metric}</div>
              <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Feature Cards Grid */}
        <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
          {[
            { icon: Boxes, t: 'Live Cost Calculation Engine', d: 'Every single KPI is computed directly from active database resource rows — no static or fake values.' },
            { icon: BarChart3, t: '7 Interactive FinOps Charts', d: 'Monthly spending trends, service distribution pie, budget vs spend bars, and rolling forecast areas.' },
            { icon: Wallet, t: 'Smart Budget Alert System', d: 'Track Healthy (Green), Warning (Yellow), Critical (Orange), and Exceeded (Red) thresholds automatically.' },
            { icon: Lightbulb, t: 'FinOps Recommendation Engine', d: 'Automated savings rules for VM Reserved Instances (20%), Storage Archive (15%), and Idle deletion.' },
            { icon: FileSpreadsheet, t: 'CSV/Excel Upload Parser', d: 'Import cloud cost spreadsheets with column validation, preview data grid, and duplicate detection.' },
            { icon: Download, t: 'Multi-Format Exporters', d: 'Generate professional Executive Cost Reports instantly downloadable in PDF, CSV, or Excel formats.' },
          ].map((f, i) => {
            const Icon = f.icon
            return (
              <div key={i} className="group rounded-2xl border border-border/60 bg-card/40 hover:bg-card/70 p-6 backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-purple-500/5">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30 grid place-items-center text-purple-400 group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-bold text-lg">{f.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.d}</p>
              </div>
            )
          })}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 py-8 px-6 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-4 w-4 text-purple-400" />
            <span className="font-semibold text-foreground">Cloud-Cost-Pulse v3.0</span>
          </div>
          <div>© 2026 Cloud-Cost-Pulse FinOps SaaS. Production-Grade Platform.</div>
          <div className="flex gap-4">
            <button onClick={onExploreDemo} className="hover:text-foreground text-purple-400 underline">Demo Preview</button>
          </div>
        </div>
      </footer>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, sub, tone = 'blue' }) {
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
      <CardContent className="relative p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground truncate">{label}</p>
            <p className="mt-1 sm:mt-2 text-xl sm:text-2xl font-bold tracking-tight">{value}</p>
            {sub && <p className="mt-1 text-[11px] text-muted-foreground truncate">{sub}</p>}
          </div>
          <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-background/60 backdrop-blur grid place-items-center ${toneMap[tone].split(' ').slice(-1)[0]}`}><Icon className="h-4 w-4 sm:h-5 sm:w-5" /></div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChartTooltip({ active, payload, label, currency = 'INR', totalSum }) {
  if (!active || !payload || !payload.length) return null
  const fmt = fmtFor(currency)
  return (
    <div className="rounded-lg border border-border bg-popover/95 p-3 text-xs shadow-xl backdrop-blur min-w-[160px]">
      {label && <p className="font-semibold text-foreground mb-1.5 border-b border-border/50 pb-1">{label}</p>}
      <div className="space-y-1.5">
        {payload.map((p, i) => {
          const val = typeof p.value === 'number' ? p.value : Number(p.value || 0)
          const pct = p.payload?.percent != null 
            ? (p.payload.percent * 100).toFixed(1)
            : (totalSum > 0 ? ((val / totalSum) * 100).toFixed(1) : null)
          return (
            <div key={i} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color || p.fill }} />
                <span className="text-muted-foreground truncate">{p.name || p.dataKey}:</span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-mono font-semibold text-foreground">{fmt(val)}</span>
                {pct != null && (
                  <span className="ml-1.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                    {pct}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="h-full w-full grid place-items-center text-muted-foreground text-sm">
      <div className="text-center">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p>No cost data available for this view.</p>
      </div>
    </div>
  )
}
// ============================ TIME RANGE OPTIONS ============================
const TIME_RANGES = [
  { value: 'all', label: 'Overall (All)', shortLabel: 'All', months: Infinity },
  { value: '1m', label: '1 Month (1M)', shortLabel: '1M', months: 1 },
  { value: '3m', label: '3 Months (3M)', shortLabel: '3M', months: 3 },
  { value: '6m', label: '6 Months (6M)', shortLabel: '6M', months: 6 },
  { value: '1y', label: '1 Year (1Y)', shortLabel: '1Y', months: 12 },
]

/** Parse "Mon YYYY" label into a Date object for filtering */
function parseMonthLabel(label) {
  if (!label || typeof label !== 'string') return null
  const MONTH_MAP = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 }
  const parts = label.trim().split(/\s+/)
  if (parts.length < 2) return null
  const month = MONTH_MAP[parts[0].toLowerCase().slice(0, 3)]
  const year = parseInt(parts[parts.length - 1], 10)
  if (month === undefined || isNaN(year)) return null
  return new Date(year, month, 1)
}

function filterDataByTimeRange(data, nameKey, rangeValue) {
  if (!data || !Array.isArray(data) || data.length === 0 || rangeValue === 'all') return data
  const rangeDef = TIME_RANGES.find(r => r.value === rangeValue)
  if (!rangeDef || rangeDef.months === Infinity) return data
  const m = rangeDef.months
  if (data.length <= m) return data
  return data.slice(-m)
}

// ============================ COLOR THEME PRESETS ============================
const CHART_THEMES = {
  default: { primary: '#8b5cf6', secondary: '#3b82f6', tertiary: '#ec4899', gradient1: '#8b5cf6', gradient2: '#06b6d4', name: 'Violet' },
  ocean: { primary: '#06b6d4', secondary: '#0ea5e9', tertiary: '#3b82f6', gradient1: '#06b6d4', gradient2: '#0ea5e9', name: 'Ocean' },
  sunset: { primary: '#f97316', secondary: '#ef4444', tertiary: '#f59e0b', gradient1: '#f97316', gradient2: '#ef4444', name: 'Sunset' },
  forest: { primary: '#10b981', secondary: '#22c55e', tertiary: '#059669', gradient1: '#10b981', gradient2: '#22c55e', name: 'Forest' },
  neon: { primary: '#a855f7', secondary: '#ec4899', tertiary: '#06b6d4', gradient1: '#a855f7', gradient2: '#ec4899', name: 'Neon' },
}

// ============================ ENHANCED CHART WRAPPER ============================
function EnhancedChart({
  title, description, data, dataKey = 'total', nameKey = 'month',
  defaultType = 'area', currency = 'INR', allowTypes = ['area', 'line', 'bar'],
  extraLines = [], pieData, pieInnerRadius = 55, pieOuterRadius = 80,
  height = 'h-72 sm:h-80', showBrush = false, showTrend = false,
  showAnnotations = false, children, headerAction, className = '',
  globalTimeRange, onTimeRangeChange, trendData: trendHistory,
}) {
  const [chartType, setChartType] = useState(defaultType)
  const [theme, setTheme] = useState('default')
  const [timeRange, setTimeRange] = useState(globalTimeRange || 'all')
  const [showTrendLine, setShowTrendLine] = useState(showTrend)
  const [showRefLines, setShowRefLines] = useState(showAnnotations)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const chartRef = useRef(null)
  const fmt = fmtFor(currency)
  const sym = symFor(currency)
  const colors = CHART_THEMES[theme]

  // Sync with global time range when updated
  useEffect(() => {
    if (globalTimeRange) {
      setTimeRange(globalTimeRange)
    }
  }, [globalTimeRange])

  // Apply time range filter to time-series data
  const filteredData = !pieData ? filterDataByTimeRange(data, nameKey, timeRange) : data

  // Apply time range to pie / distribution data
  let activePieData = pieData
  if (pieData && Array.isArray(pieData)) {
    if (trendHistory && Array.isArray(trendHistory) && timeRange !== 'all') {
      const trendSlice = filterDataByTimeRange(trendHistory, 'month', timeRange)
      if (trendSlice && trendSlice.length > 0) {
        activePieData = pieData.map(p => {
          const key = p.key || (p.name ? String(p.name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : '')
          const sum = trendSlice.reduce((acc, t) => acc + (t[key] || 0), 0)
          return { ...p, value: sum > 0 ? Math.round(sum) : p.value }
        }).filter(p => p.value > 0).sort((a, b) => b.value - a.value)
      }
    } else if (timeRange !== 'all') {
      const mult = timeRange === '1m' ? 1 : timeRange === '3m' ? 3 : timeRange === '6m' ? 6 : timeRange === '1y' ? 12 : 1
      if (mult > 1) {
        activePieData = pieData.map(p => ({ ...p, value: Math.round(p.value * mult) }))
      }
    }
  }

  // Compute moving average trend line (using filtered data)
  const trendData = filteredData && showTrendLine ? filteredData.map((item, i, arr) => {
    const window = 3
    const start = Math.max(0, i - window + 1)
    const slice = arr.slice(start, i + 1)
    const avg = slice.reduce((s, d) => s + (d[dataKey] || 0), 0) / slice.length
    return { ...item, _trend: Math.round(avg) }
  }) : filteredData

  // Compute reference values (using filtered data)
  const values = filteredData ? filteredData.map(d => d[dataKey] || 0).filter(v => v > 0) : []
  const avgVal = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0
  const maxVal = values.length ? Math.max(...values) : 0
  const minVal = values.length ? Math.min(...values) : 0

  // Download chart as PNG
  const downloadPNG = useCallback(() => {
    const el = chartRef.current
    if (!el) return
    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(el, { backgroundColor: '#0a0a0a', scale: 2 }).then(canvas => {
        const link = document.createElement('a')
        link.download = `${title?.replace(/\s+/g, '_').toLowerCase() || 'chart'}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      })
    })
  }, [title])

  const typeIcons = { area: Activity, line: LineChartIcon, bar: BarChart2 }

  const renderTimeSeriesChart = (chartData) => {
    const ChartContainer = chartType === 'bar' ? BarChart : chartType === 'line' ? LineChart : AreaChart
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ChartContainer data={chartData}>
          <defs>
            <linearGradient id={`grad-${theme}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.gradient1} stopOpacity={0.4} />
              <stop offset="95%" stopColor={colors.gradient1} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`grad2-${theme}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.secondary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors.secondary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis
            dataKey={nameKey}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v) => `${sym}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip currency={currency} />} />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          {/* Reference Lines */}
          {showRefLines && avgVal > 0 && (
            <ReferenceLine
              y={avgVal}
              stroke="#f59e0b"
              strokeDasharray="8 4"
              strokeWidth={1.5}
              label={{ value: `Avg: ${fmt(avgVal)}`, position: 'insideTopRight', fill: '#f59e0b', fontSize: 10, fontWeight: 600 }}
            />
          )}
          {showRefLines && maxVal > 0 && (
            <ReferenceLine
              y={maxVal}
              stroke="#ef4444"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: `Max`, position: 'insideTopRight', fill: '#ef4444', fontSize: 9 }}
            />
          )}
          {showRefLines && minVal > 0 && minVal !== maxVal && (
            <ReferenceLine
              y={minVal}
              stroke="#10b981"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{ value: `Min`, position: 'insideBottomRight', fill: '#10b981', fontSize: 9 }}
            />
          )}
          {/* Primary data */}
          {chartType === 'area' && (
            <Area
              type="monotone"
              dataKey={dataKey}
              name="Total Spend"
              stroke={colors.primary}
              strokeWidth={2.5}
              fillOpacity={1}
              fill={`url(#grad-${theme})`}
              animationDuration={800}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
            />
          )}
          {chartType === 'line' && (
            <Line
              type="monotone"
              dataKey={dataKey}
              name="Total Spend"
              stroke={colors.primary}
              strokeWidth={2.5}
              dot={{ r: 3, strokeWidth: 2, fill: colors.primary }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
              animationDuration={800}
            />
          )}
          {chartType === 'bar' && (
            <Bar
              dataKey={dataKey}
              name="Total Spend"
              fill={colors.primary}
              radius={[4, 4, 0, 0]}
              animationDuration={800}
            />
          )}
          {/* Extra data lines */}
          {extraLines.map((line, i) => (
            chartType === 'area' ? (
              <Area
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color || colors.secondary}
                strokeWidth={line.strokeWidth || 2}
                strokeDasharray={line.dashed ? '5 5' : undefined}
                fillOpacity={0.15}
                fill={`url(#grad2-${theme})`}
                dot={false}
                animationDuration={800}
              />
            ) : chartType === 'line' ? (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color || colors.secondary}
                strokeWidth={line.strokeWidth || 2}
                strokeDasharray={line.dashed ? '5 5' : undefined}
                dot={{ r: 3 }}
                animationDuration={800}
              />
            ) : (
              <Bar
                key={line.dataKey}
                dataKey={line.dataKey}
                name={line.name}
                fill={line.color || colors.secondary}
                radius={[4, 4, 0, 0]}
                animationDuration={800}
              />
            )
          ))}
          {/* Trend line */}
          {showTrendLine && (
            <Line
              type="monotone"
              dataKey="_trend"
              name="3-Mo Moving Avg"
              stroke="#f59e0b"
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              animationDuration={1000}
            />
          )}
          {/* Brush for zoom */}
          {showBrush && chartData && chartData.length > 4 && (
            <Brush
              dataKey={nameKey}
              height={24}
              stroke={colors.primary}
              fill="hsl(var(--card))"
              tickFormatter={() => ''}
              startIndex={0}
              endIndex={chartData.length - 1}
            />
          )}
        </ChartContainer>
      </ResponsiveContainer>
    )
  }

  const controlBar = (
    <div className={`flex flex-wrap items-center gap-1.5 ${showControls ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity duration-300`}>
      {/* Time Range Selector - Enabled for ALL charts */}
      {((data && data.length > 0) || (pieData && pieData.length > 0)) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={`flex items-center gap-1 px-2 py-1.5 rounded-md border text-xs font-medium transition-all duration-200 ${
                timeRange !== 'all'
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 font-semibold'
                  : 'border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
              }`}
              title="Select time range"
            >
              <CalendarDays className="h-3.5 w-3.5 text-cyan-400" />
              <span>{TIME_RANGES.find(r => r.value === timeRange)?.shortLabel || 'All'}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[130px]">
            <DropdownMenuLabel className="text-xs">Time Range</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {TIME_RANGES.map(r => (
              <DropdownMenuItem
                key={r.value}
                onClick={() => {
                  setTimeRange(r.value)
                  onTimeRangeChange?.(r.value)
                }}
                className="gap-2 text-xs cursor-pointer"
              >
                <span>{r.label}</span>
                {timeRange === r.value && <Check className="h-3.5 w-3.5 ml-auto text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {/* Chart type switcher */}
      {!pieData && allowTypes.length > 1 && (
        <div className="flex items-center rounded-md border border-border/60 bg-muted/30 p-0.5">
          {allowTypes.map(type => {
            const TypeIcon = typeIcons[type] || Activity
            return (
              <button
                key={type}
                onClick={() => setChartType(type)}
                className={`p-1.5 rounded-sm transition-all duration-200 ${chartType === type ? 'bg-primary/20 text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                title={`${type.charAt(0).toUpperCase() + type.slice(1)} chart`}
              >
                <TypeIcon className="h-3.5 w-3.5" />
              </button>
            )
          })}
        </div>
      )}
      {/* Trend line toggle */}
      {!pieData && filteredData && filteredData.length > 2 && (
        <button
          onClick={() => setShowTrendLine(p => !p)}
          className={`p-1.5 rounded-md border transition-all duration-200 ${showTrendLine ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-border/60 text-muted-foreground hover:text-foreground'}`}
          title="Toggle trend line"
        >
          <TrendingUp className="h-3.5 w-3.5" />
        </button>
      )}
      {/* Annotations toggle */}
      {!pieData && values.length > 0 && (
        <button
          onClick={() => setShowRefLines(p => !p)}
          className={`p-1.5 rounded-md border transition-all duration-200 ${showRefLines ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-border/60 text-muted-foreground hover:text-foreground'}`}
          title="Toggle avg/min/max reference lines"
        >
          <Hash className="h-3.5 w-3.5" />
        </button>
      )}
      {/* Color theme picker */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 rounded-md border border-border/60 text-muted-foreground hover:text-foreground transition-all duration-200" title="Color theme">
            <Palette className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          <DropdownMenuLabel className="text-xs">Color Theme</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {Object.entries(CHART_THEMES).map(([key, t]) => (
            <DropdownMenuItem key={key} onClick={() => setTheme(key)} className="gap-2 text-xs">
              <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: t.primary }} />
              {t.name}
              {theme === key && <Check className="h-3 w-3 ml-auto text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Download PNG */}
      <button
        onClick={downloadPNG}
        className="p-1.5 rounded-md border border-border/60 text-muted-foreground hover:text-foreground transition-all duration-200"
        title="Download as PNG"
      >
        <Image className="h-3.5 w-3.5" />
      </button>
      {/* Fullscreen toggle */}
      <button
        onClick={() => setIsFullscreen(p => !p)}
        className="p-1.5 rounded-md border border-border/60 text-muted-foreground hover:text-foreground transition-all duration-200"
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
      >
        {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  )

  // Summary stats bar
  const statsBar = !pieData && values.length > 0 ? (
    <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-2 px-1">
      <span>Avg: <span className="font-medium text-foreground">{fmt(avgVal)}</span></span>
      <span>Min: <span className="font-medium text-emerald-400">{fmt(minVal)}</span></span>
      <span>Max: <span className="font-medium text-red-400">{fmt(maxVal)}</span></span>
      {values.length >= 2 && (() => {
        const change = values[values.length - 1] - values[values.length - 2]
        const pct = values[values.length - 2] ? ((change / values[values.length - 2]) * 100).toFixed(1) : 0
        return (
          <span className={`flex items-center gap-0.5 ${change >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {change >= 0 ? '+' : ''}{pct}% MoM
          </span>
        )
      })()}
    </div>
  ) : null

  const fullscreenClasses = isFullscreen ? 'fixed inset-4 z-50 bg-card border border-border rounded-xl shadow-2xl' : ''

  return (
    <>
      {isFullscreen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setIsFullscreen(false)} />}
      <Card ref={chartRef} className={`group transition-all duration-300 ${fullscreenClasses} ${className}`}>
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base sm:text-lg">{title}</CardTitle>
              {timeRange !== 'all' && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-cyan-500/40 bg-cyan-500/10 text-cyan-400 font-mono">
                  {TIME_RANGES.find(r => r.value === timeRange)?.shortLabel} Range
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            {controlBar}
          </div>
        </CardHeader>
        <CardContent className={isFullscreen ? 'h-[calc(100%-100px)] p-6 overflow-y-auto' : height}>
          {pieData ? (
            activePieData.length === 0 ? <EmptyChart /> : (() => {
              const totalPieValue = activePieData.reduce((s, d) => s + (d.value || 0), 0)
              const enrichedPieData = activePieData.map((d, i) => ({
                ...d,
                color: d.color || [CHART_THEMES[theme].primary, CHART_THEMES[theme].secondary, CHART_THEMES[theme].tertiary, '#06b6d4', '#f59e0b', '#10b981', '#ec4899'][i % 7],
                percent: totalPieValue > 0 ? d.value / totalPieValue : 0
              })).sort((a, b) => b.value - a.value)
              const topItem = enrichedPieData[0]

              if (isFullscreen) {
                return (
                  <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                    {/* Left: Expanded Interactive Donut Chart */}
                    <div className="lg:col-span-6 h-[340px] sm:h-[400px] flex flex-col justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={enrichedPieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={115}
                            paddingAngle={3}
                            animationDuration={800}
                            label={({ percent }) => (percent >= 0.03 ? `${(percent * 100).toFixed(1)}%` : '')}
                          >
                            {enrichedPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--card))" strokeWidth={2} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip currency={currency} totalSum={totalPieValue} />} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center Donut Ring Stat */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">Total Distribution</span>
                        <span className="text-xl sm:text-2xl font-bold font-mono text-foreground">{fmt(totalPieValue)}</span>
                        <span className="text-[10px] text-emerald-400 font-medium mt-0.5">{enrichedPieData.length} Categories</span>
                      </div>
                    </div>

                    {/* Right: Comprehensive Breakdown Table & Metrics */}
                    <div className="lg:col-span-6 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-border">
                        <h4 className="font-semibold text-sm">Detailed Category Breakdown</h4>
                        <Badge variant="outline" className="text-xs">
                          Top: {topItem?.name} ({(topItem?.percent * 100).toFixed(1)}%)
                        </Badge>
                      </div>

                      <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                        {enrichedPieData.map((item, idx) => {
                          const pct = (item.percent * 100).toFixed(1)
                          return (
                            <div key={idx} className="p-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors space-y-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 font-medium">
                                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                  <span className="text-foreground">{item.name}</span>
                                </div>
                                <div className="text-right font-mono">
                                  <span className="font-bold text-foreground">{fmt(item.value)}</span>
                                  <span className="ml-2 text-primary font-semibold">{pct}%</span>
                                </div>
                              </div>
                              <Progress value={item.percent * 100} className="h-1.5" />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              }

              // Abstract Clean View for Dashboard Card
              return (
                <div className="h-full flex flex-col justify-between">
                  <div className="flex-1 min-h-0 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={enrichedPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={pieInnerRadius + 5}
                          outerRadius={pieOuterRadius}
                          paddingAngle={3}
                          animationDuration={800}
                          label={false}
                          labelLine={false}
                        >
                          {enrichedPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--card))" strokeWidth={1.5} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip currency={currency} totalSum={totalPieValue} />} />
                        <Legend
                          wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                          layout="horizontal"
                          align="center"
                          verticalAlign="bottom"
                          iconType="circle"
                          iconSize={6}
                          formatter={(value) => <span className="text-muted-foreground text-[11px] font-medium">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Clean Center Donut Label */}
                    <div className="absolute inset-0 pb-6 flex flex-col items-center justify-center pointer-events-none text-center">
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total</span>
                      <span className="text-sm font-bold font-mono text-foreground">{fmt(totalPieValue)}</span>
                    </div>
                  </div>

                  {/* Clean Abstract Summary Footer */}
                  {topItem && (
                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 truncate text-muted-foreground">
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: topItem.color }} />
                        <span>Top Service: <strong className="text-foreground">{topItem.name}</strong></span>
                      </span>
                      <Badge variant="secondary" className="font-mono text-[10px] px-1.5 py-0">
                        {(topItem.percent * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  )}
                </div>
              )
            })()
          ) : (
            <>
              {renderTimeSeriesChart(trendData)}
              {statsBar}
            </>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function RecCard({ r, currency, onApply }) {
  const fmt = fmtFor(currency)
  const severityBadge = {
    high: 'bg-red-500/15 text-red-400 border-red-500/30',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    low: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  }[r.severity || 'medium']

  return (
    <Card className="border-border/60 hover:border-primary/40 transition-all">
      <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              {r.title}
              {r.rule_based && <Badge variant="secondary" className="text-[10px] bg-purple-500/15 text-purple-400 border-purple-500/30">Custom Rule</Badge>}
            </h4>
            <Badge variant="outline" className={severityBadge}>{r.priority || 'Medium'}</Badge>
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{r.description}</p>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Est. Savings</span>
            <div className="text-lg font-bold text-emerald-400">{r.potential_savings > 0 ? `${fmt(r.potential_savings)}/mo` : 'Efficiency Review'}</div>
          </div>
          <Button size="sm" onClick={() => onApply(r.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">Apply Action</Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================ DASHBOARD PAGE ============================
function DashboardPage({ data, onOpenDemoModal, onOpenImportModal, onNavigate, onApplyRec, onClearWorkspace }) {
  const [timeRange, setTimeRange] = useState('all')
  const [clearOpen, setClearOpen] = useState(false)
  if (!data) return <LoadingGrid />
  const { stats, services, trend, serviceBreakdown, forecast, budget, recommendations } = data
  const currency = data.currency || 'INR'
  const fmt = fmtFor(currency)
  const sym = symFor(currency)

  // Budget vs Spend history for multi-month comparison
  const budgetSpendData = Array.isArray(trend)
    ? trend.map(t => ({ name: t.month, month: t.month, Actual: t.total, Budget: budget.monthly_budget }))
    : [{ name: 'Budget Health', Budget: budget.monthly_budget, Actual: budget.used }]

  return (
    <div className="space-y-6">
      {/* 7 KPI Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <StatCard icon={PiggyBank} label="Total Monthly Cost" value={fmt(stats.totalMonthlyCost)} sub="Live sum of active resources" tone="purple" />
        <StatCard icon={Boxes} label="Active Resources" value={stats.activeResources} sub={`out of ${stats.totalResources} total`} tone="blue" />
        <StatCard icon={Server} label="Total Services" value={stats.activeServices} sub="unique active services" tone="cyan" />
        <StatCard icon={Wallet} label="Budget Usage" value={`${budget.usage_pct}%`} sub={`${fmt(budget.used)} of ${fmt(budget.monthly_budget)}`} tone={budget.statusTone === 'red' ? 'pink' : budget.statusTone === 'amber' ? 'amber' : 'green'} />
        <StatCard icon={TrendingUp} label="Forecast Cost" value={fmt(forecast.expectedCost)} sub="based on 3 mo avg" tone="pink" />
        <StatCard icon={Lightbulb} label="Potential Savings" value={fmt(stats.potentialSavings)} sub="identified optimizations" tone="green" />
        <StatCard icon={Activity} label="Cost Growth" value={`${stats.growth >= 0 ? '+' : ''}${stats.growth}%`} sub="month-over-month" tone={stats.growth > 0 ? 'amber' : 'green'} />
      </div>

      {/* Global Dashboard Time Range Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center text-primary">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <span>Interactive FinOps Visualizations</span>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Live data" />
            </div>
            <div className="text-[11px] text-muted-foreground">Adjust global time range across all 7 charts or customize each individually</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
        <div className="flex items-center gap-1 bg-background/80 p-1 rounded-lg border border-border/60">
          <span className="text-[11px] font-medium text-muted-foreground px-2 flex items-center gap-1">
            <CalendarDays className="h-3 w-3 text-cyan-400" /> Range:
          </span>
          {TIME_RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                timeRange === r.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              {r.shortLabel || r.label}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={onOpenDemoModal} title="Reset charts with demo dataset"><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Reset dataset</Button>
        <AlertDialog open={clearOpen} onOpenChange={setClearOpen}><Button variant="outline" size="sm" className="text-red-400 border-red-500/40 hover:bg-red-500/10" onClick={() => setClearOpen(true)}><Trash2 className="h-3.5 w-3.5 mr-1.5" /> Clear all data</Button><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Clear dashboard data and charts?</AlertDialogTitle><AlertDialogDescription>This removes all resources, uploaded costs, budgets, reports, recommendations and active notifications for this workspace. Your workspace and History are preserved.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); onClearWorkspace?.(() => setClearOpen(false)) }}>Clear all data</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        </div>
      </div>

      {/* Primary 7 Charts Grid */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chart 1: Monthly Cost Trend */}
        <EnhancedChart
          title="1. Monthly Spending Trend"
          description="Historical & current month spending with trendlines, min/max bounds & moving avg"
          data={trend}
          dataKey="total"
          nameKey="month"
          currency={currency}
          defaultType="area"
          showTrend={true}
          showAnnotations={true}
          showBrush={true}
          globalTimeRange={timeRange}
          className="lg:col-span-2"
          headerAction={<Button variant="outline" size="sm" onClick={() => generatePDFReport(data)} className="hidden sm:flex">Export PDF</Button>}
        />

        {/* Chart 2: Service Distribution */}
        <EnhancedChart
          title="2. Service Distribution"
          description="Cost share by active cloud service"
          pieData={serviceBreakdown}
          trendData={trend}
          globalTimeRange={timeRange}
          currency={currency}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chart 3: Budget vs Spend */}
        <EnhancedChart
          title="3. Budget vs Actual Spend"
          description="Allocated budget vs total current consumption over selected horizon"
          data={budgetSpendData}
          dataKey="Actual"
          nameKey="name"
          currency={currency}
          defaultType="bar"
          extraLines={[{ dataKey: 'Budget', name: 'Budget Limit', color: '#3b82f6' }]}
          showAnnotations={true}
          globalTimeRange={timeRange}
        />

        {/* Chart 4: Cost Forecast */}
        <EnhancedChart
          title="4. Cost Forecast (Next 3 Months)"
          description="Projected spending based on rolling average"
          data={forecast.series}
          dataKey="actual"
          nameKey="month"
          currency={currency}
          defaultType="line"
          extraLines={[{ dataKey: 'forecast', name: 'Forecast', color: '#ec4899', dashed: true }]}
          showTrend={true}
          showAnnotations={true}
          globalTimeRange={timeRange}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chart 5: Resource Status Breakdown */}
        <EnhancedChart
          title="5. Resource Status Breakdown"
          description="Active vs Idle & Inactive cloud inventory ratio"
          pieData={[
            { name: 'Active Resources', value: stats.activeResources, color: '#10b981' },
            { name: 'Idle / Inactive', value: Math.max(0, stats.totalResources - stats.activeResources), color: '#f59e0b' },
          ]}
          globalTimeRange={timeRange}
          currency={currency}
        />

        {/* Chart 6: FinOps Cost Efficiency Score & Health Gauge */}
        <Card className="relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base sm:text-lg">6. FinOps Cost Efficiency Score</CardTitle>
                <CardDescription className="text-xs">Composite score based on budget usage, idle ratio &amp; potential savings</CardDescription>
              </div>
              <Badge variant="outline" className={stats.potentialSavings === 0 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border-amber-500/30'}>
                {stats.potentialSavings === 0 ? '98/100 Excellent' : '78/100 Attention'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-extrabold tracking-tight">
                  {stats.potentialSavings === 0 ? '98' : '78'}
                  <span className="text-base font-normal text-muted-foreground"> / 100</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stats.potentialSavings === 0 ? 'Your cloud environment is highly optimized with zero wasted spend.' : `Apply identified savings (${fmt(stats.potentialSavings)}/mo) to boost your score to 98+.`}
                </div>
              </div>
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30 grid place-items-center text-emerald-400">
                <Sparkles className="h-8 w-8" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Optimization Health Progress</span>
                <span className="font-medium text-foreground">{stats.potentialSavings === 0 ? '98%' : '78%'}</span>
              </div>
              <Progress value={stats.potentialSavings === 0 ? 98 : 78} className="h-2.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FinOps Quick Recommendations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">Top Optimization Recommendations</CardTitle>
            <CardDescription className="text-xs">Actionable FinOps rules to reduce cloud expenditure</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate('recommendations')}>View All ({recommendations.length})</Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {recommendations.slice(0, 3).map((r) => (
              <RecCard key={r.id} r={r} currency={currency} onApply={onApplyRec} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================ RESOURCE FORM ============================
function ResourceForm({ open, setOpen, initial, onSaved, catalog, regions, currency }) {
  const [form, setForm] = useState({ resource_name: '', service_type: '', region: '', monthly_cost: '', status: 'Active', owner: '', description: '', tags: '' })
  const [busy, setBusy] = useState(false)
  const isEdit = !!initial

  useEffect(() => {
    if (initial) {
      setForm({
        resource_name: initial.resource_name || '',
        service_type: initial.service_type || '',
        region: initial.region || '',
        monthly_cost: initial.monthly_cost || '',
        status: initial.status || 'Active',
        owner: initial.owner || '',
        description: initial.description || '',
        tags: Array.isArray(initial.tags) ? initial.tags.join(', ') : '',
      })
    } else {
      setForm({ resource_name: '', service_type: catalog?.[0] || 'Azure Virtual Machine', region: regions?.[0] || 'East US', monthly_cost: '', status: 'Active', owner: 'platform-team', description: '', tags: '' })
    }
  }, [initial, catalog, regions, open])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const submit = async () => {
    if (!form.resource_name.trim()) { toast.error('Resource name is required'); return }
    if (!form.monthly_cost || Number(form.monthly_cost) <= 0) { toast.error('Monthly cost must be > 0'); return }
    setBusy(true)
    try {
      const url = isEdit ? `/api/resources/${initial.id}` : '/api/resources'
      const method = isEdit ? 'PUT' : 'POST'
      const payload = { ...form, monthly_cost: Number(form.monthly_cost) }
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error || 'Failed')
      toast.success(isEdit ? 'Resource updated' : 'Resource added')
      setOpen(false)
      onSaved()
    } catch (e) {
      toast.error('Save failed', { description: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Resource' : 'Add Cloud Resource'}</DialogTitle>
          <DialogDescription>Add to inventory to update live cost engine and dashboard metrics.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2 text-sm">
          <div className="space-y-1.5"><Label>Resource Name *</Label><Input placeholder="e.g. prod-app-vm-01" value={form.resource_name} onChange={(e) => set('resource_name', e.target.value)} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Monthly Cost ({currency}) *</Label><Input type="number" min="1" placeholder="e.g. 3000" value={form.monthly_cost} onChange={(e) => set('monthly_cost', e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Status *</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{['Active', 'Idle', 'Inactive'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Owner</Label><Input placeholder="e.g. platform-team" value={form.owner} onChange={(e) => set('owner', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea placeholder="What this resource is used for" value={form.description || ''} onChange={(e) => set('description', e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit} disabled={busy}>{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add resource'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================ RESOURCES PAGE ============================
function ResourcesPage({ currency, onDataChange, externalSearch }) {
  const fmt = fmtFor(currency)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ search: '', service: 'all', region: 'all', status: 'all', minCost: '', maxCost: '', page: 1 })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [delTarget, setDelTarget] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])

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

  const handleBulkAction = async (action, status = null) => {
    if (!selectedIds.length) return
    try {
      const res = await fetch('/api/resources/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: selectedIds, status }),
      })
      if (res.ok) {
        toast.success(`Bulk action "${action}" completed`)
        setSelectedIds([])
        load()
        onDataChange()
      }
    } catch {
      toast.error('Bulk action failed')
    }
  }

  const toggleSelectAll = (e) => {
    if (e.target.checked && data?.items) {
      setSelectedIds(data.items.map((i) => i.id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  const afterSave = () => { load(); onDataChange() }
  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v, page: k === 'page' ? v : 1 }))
  const clearFilters = () => setFilters({ search: '', service: 'all', region: 'all', status: 'all', minCost: '', maxCost: '', page: 1 })
  const facets = data?.facets || { services: [], regions: [], statuses: ['Active', 'Idle', 'Inactive'] }
  const activeFilterCount = [filters.service, filters.region, filters.status].filter((v) => v !== 'all').length + (filters.minCost ? 1 : 0) + (filters.maxCost ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, service, region, owner…" value={filters.search} onChange={(e) => setF('search', e.target.value)} className="pl-9 text-xs" />
        </div>
        <Select value={filters.service} onValueChange={(v) => setF('service', v)}><SelectTrigger className="w-[140px] text-xs"><SelectValue placeholder="Service" /></SelectTrigger><SelectContent><SelectItem value="all">All services</SelectItem>{facets.services.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={filters.region} onValueChange={(v) => setF('region', v)}><SelectTrigger className="w-[130px] text-xs"><SelectValue placeholder="Region" /></SelectTrigger><SelectContent><SelectItem value="all">All regions</SelectItem>{facets.regions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={filters.status} onValueChange={(v) => setF('status', v)}><SelectTrigger className="w-[120px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All status</SelectItem>{facets.statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs"><X className="h-4 w-4 mr-1" /> Clear</Button>}
        <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }} className="text-xs"><Plus className="h-4 w-4 mr-1.5" /> Add Resource</Button>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 px-4 py-2 rounded-lg text-xs">
          <span>Selected <b>{selectedIds.length}</b> resources</span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => handleBulkAction('bulk_status', 'Active')}>Set Active</Button>
            <Button size="sm" variant="secondary" onClick={() => handleBulkAction('bulk_status', 'Idle')}>Set Idle</Button>
            <Button size="sm" variant="destructive" onClick={() => handleBulkAction('bulk_delete')}>Delete Selected</Button>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading && !data ? (
            <div className="p-6 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length > 0 && selectedIds.length === data?.items?.length} />
                  </TableHead>
                  <TableHead>Resource</TableHead><TableHead>Service</TableHead><TableHead>Region</TableHead>
                  <TableHead className="text-right">Monthly Cost</TableHead><TableHead>Status</TableHead><TableHead>Owner</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items || []).length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-10 text-muted-foreground">No resources found. {activeFilterCount || filters.search ? 'Try clearing filters.' : 'Click "Add Resource" to create one.'}</TableCell></TableRow>
                ) : (data.items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelectOne(r.id)} />
                    </TableCell>
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
        <div className="flex items-center justify-between text-xs sm:text-sm">
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

// ============================ ANALYTICS PAGE ============================
function AnalyticsPage({ data }) {
  const [analyticsData, setAnalyticsData] = useState(null)
  const [timeRange, setTimeRange] = useState('all')

  useEffect(() => {
    fetch('/api/analytics').then((r) => r.json()).then((j) => setAnalyticsData(j))
  }, [data])

  if (!analyticsData) return <LoadingGrid />
  const currency = analyticsData.currency || 'INR'
  const sym = symFor(currency)
  const serviceBreakdown = analyticsData.serviceBreakdown || []
  const regionBreakdown = analyticsData.regionBreakdown || []
  const ownerBreakdown = analyticsData.ownerBreakdown || []
  const departmentBreakdown = analyticsData.departmentBreakdown || []
  const trendHistory = analyticsData.trend || data?.trend || []

  return (
    <div className="space-y-6">
      {/* Global Analytics Time Range Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-border/60 bg-muted/20 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center text-primary">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold flex items-center gap-2">
              <span>Deep-Dive Cost Analytics</span>
              <Badge variant="outline" className="text-[10px] text-primary border-primary/30 font-mono">4 Dimensions</Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">Analyze spending distribution by service, region, owner and department across time horizons</div>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-background/80 p-1 rounded-lg border border-border/60 self-start sm:self-auto">
          <span className="text-[11px] font-medium text-muted-foreground px-2 flex items-center gap-1">
            <CalendarDays className="h-3 w-3 text-cyan-400" /> Range:
          </span>
          {TIME_RANGES.map(r => (
            <button
              key={r.value}
              onClick={() => setTimeRange(r.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                timeRange === r.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              }`}
            >
              {r.shortLabel || r.label}
            </button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="service" className="space-y-6">
        <TabsList className="bg-muted/40 overflow-x-auto no-scrollbar">
          <TabsTrigger value="service">Service Analysis</TabsTrigger>
          <TabsTrigger value="region">Region Analysis</TabsTrigger>
          <TabsTrigger value="owner">Owner Analysis</TabsTrigger>
          <TabsTrigger value="department">Department Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="service" className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <EnhancedChart
              title="Service Cost Distribution"
              description="Spend per cloud service with customizable visualization"
              data={serviceBreakdown}
              dataKey="value"
              nameKey="name"
              currency={currency}
              defaultType="bar"
              showAnnotations={true}
              globalTimeRange={timeRange}
              trendData={trendHistory}
            />
            <EnhancedChart
              title="Service Share %"
              description="Proportional spend share by cloud service"
              pieData={serviceBreakdown}
              currency={currency}
              globalTimeRange={timeRange}
              trendData={trendHistory}
            />
          </div>
        </TabsContent>

        <TabsContent value="region" className="space-y-6">
          <EnhancedChart
            title="Region Cost Breakdown"
            description="Cloud spending grouped by geographic region with reference markers"
            data={regionBreakdown}
            dataKey="value"
            nameKey="name"
            currency={currency}
            defaultType="bar"
            showAnnotations={true}
            globalTimeRange={timeRange}
          />
        </TabsContent>

        <TabsContent value="owner" className="space-y-6">
          <EnhancedChart
            title="Owner & Team Spend"
            description="Cost distribution across platform teams with interactive trend analysis"
            data={ownerBreakdown}
            dataKey="value"
            nameKey="name"
            currency={currency}
            defaultType="bar"
            showAnnotations={true}
            globalTimeRange={timeRange}
          />
        </TabsContent>

        <TabsContent value="department" className="space-y-6">
          <EnhancedChart
            title="Department Spend Breakdown"
            description="Engineering vs Data Science vs DevOps cost allocation"
            data={departmentBreakdown}
            dataKey="value"
            nameKey="name"
            currency={currency}
            defaultType="bar"
            showAnnotations={true}
            globalTimeRange={timeRange}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================ BUDGET PAGE ============================
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
          <CardHeader><CardDescription>Monthly Budget {data.workspace?.isOrg ? '(shared by your team)' : ''}</CardDescription><CardTitle className="text-2xl sm:text-3xl">{fmt(budget.monthly_budget)}</CardTitle></CardHeader>
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
        <Card><CardHeader><CardDescription>Used This Month</CardDescription><CardTitle className="text-2xl sm:text-3xl text-amber-400">{fmt(budget.used)}</CardTitle></CardHeader><CardContent><Badge variant="secondary">{budget.usage_pct}% of budget</Badge></CardContent></Card>
        <Card><CardHeader><CardDescription>Remaining</CardDescription><CardTitle className={`text-2xl sm:text-3xl ${budget.remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fmt(budget.remaining)}</CardTitle></CardHeader><CardContent><Badge variant="secondary">{remainingPct.toFixed(1)}% available</Badge></CardContent></Card>
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

// ============================ OPTIMIZE PAGE ============================
function RecommendationsPage({ data, refresh }) {
  const [recs, setRecs] = useState(null)
  const currency = data?.currency || 'INR'
  const fmt = fmtFor(currency)
  const loadRecs = useCallback(() => {
    fetch('/api/recommendations').then((r) => r.json()).then((j) => setRecs(Array.isArray(j) ? j : []))
  }, [])
  useEffect(() => { loadRecs() }, [data, loadRecs])

  const handleApply = async (recId) => {
    try {
      const res = await fetch(`/api/recommendations/${recId}/apply`, { method: 'POST' })
      if (res.ok) {
        toast.success('Recommendation action applied!')
        loadRecs()
        refresh?.()
      }
    } catch {
      toast.error('Failed to apply recommendation')
    }
  }

  if (!recs) return <LoadingGrid />
  const total = recs.reduce((s, r) => s + (r.potential_savings || 0), 0)
  const ruleCount = recs.filter((r) => r.rule_based).length
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-blue-500/10" />
        <CardContent className="relative p-6 flex items-center justify-between">
          <div><div className="text-xs uppercase tracking-widest text-muted-foreground">Total identified savings</div><div className="mt-1 text-3xl sm:text-4xl font-bold text-emerald-400">{fmt(total)}<span className="text-base text-muted-foreground">/mo</span></div><div className="mt-1 text-xs sm:text-sm text-muted-foreground">{recs.length} recommendations · {ruleCount} from your custom rules</div></div>
          <Sparkles className="h-12 w-12 sm:h-16 sm:w-16 text-emerald-400/40" />
        </CardContent>
      </Card>
      {recs.length === 0 ? <Card><CardContent className="p-10 text-center text-muted-foreground">No recommendations — your workspace looks optimized.</CardContent></Card> : (
        <div className="grid gap-3 md:grid-cols-2">{recs.map((r) => <RecCard key={r.id} r={r} currency={currency} onApply={handleApply} />)}</div>
      )}
    </div>
  )
}

// ============================ REPORTS PAGE ============================
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

  const exportPdf = (report) => {
    const doc = generatePDFReport(report.snapshot || {}, report.type)
    doc.save(`ccp-${report.type.toLowerCase().replace(/\s+/g, '-')}-${report.id.slice(0, 6)}.pdf`)
    toast.success('PDF downloaded')
  }

  const exportCsv = (report) => {
    const csvContent = generateCSVReport(report.snapshot || {}, report.type)
    downloadFile(csvContent, `ccp-${report.type.toLowerCase().replace(/\s+/g, '-')}.csv`, 'text/csv')
    toast.success('CSV downloaded')
  }

  const exportExcel = (report) => {
    const csvContent = generateCSVReport(report.snapshot || {}, report.type)
    downloadFile(csvContent, `ccp-${report.type.toLowerCase().replace(/\s+/g, '-')}.xls`, 'application/vnd.ms-excel')
    toast.success('Excel downloaded')
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
        <CardHeader><CardTitle>Generated Reports</CardTitle><CardDescription>Saved snapshots — export as PDF, CSV, or Excel anytime</CardDescription></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {reports.length === 0 ? <div className="p-10 text-center text-muted-foreground text-sm">No reports yet. Generate one above.</div> : (
            <Table className="min-w-[640px]">
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
                      <Button variant="outline" size="sm" className="h-7 text-xs mr-1" onClick={() => exportExcel(rep)}><Download className="h-3 w-3 mr-1" /> Excel</Button>
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

// ============================ SETTINGS PAGE ============================
function SettingsPage({ refresh, currency, onCurrency }) {
  const [settings, setSettings] = useState(null)
  const [az, setAz] = useState({ tenantId: '', clientId: '', clientSecret: '', subscriptionId: '' })
  const [em, setEm] = useState({ apiKey: '', recipient: '' })
  const [rules, setRules] = useState({ idleCostThreshold: 500, spikePct: 25, budgetWarnPct: 80 })
  const [notifPrefs, setNotifPrefs] = useState({ inApp: true, budgetAlerts: true, optAlerts: true, emailAlerts: true })
  const [busy, setBusy] = useState('')
  const [clearOpen, setClearOpen] = useState(false)

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings'); const j = await res.json(); setSettings(j)
      if (j?.rules) setRules(j.rules)
      if (j?.email?.recipient) setEm((p) => ({ ...p, recipient: j.email.recipient }))
      if (j?.notification_prefs) setNotifPrefs(j.notification_prefs)
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

  const saveNotifPrefs = async (nextPrefs) => {
    setNotifPrefs(nextPrefs)
    try {
      await post('/api/settings/notifications', nextPrefs, 'notif')
      toast.success('Notification preferences updated')
      refresh?.()
    } catch {
      toast.error('Failed to save notification preferences')
    }
  }

  const exportBackup = async () => {
    try {
      const res = await fetch('/api/settings/export', { method: 'POST' })
      const data = await res.json()
      downloadFile(JSON.stringify(data, null, 2), `ccp-backup-${new Date().toISOString().slice(0, 10)}.json`, 'application/json')
      toast.success('Workspace backup exported')
    } catch { toast.error('Export failed') }
  }

  const clearWorkspace = async () => {
    setBusy('clear')
    try {
      const res = await fetch('/api/clear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Clear failed')
      setClearOpen(false)
      toast.success('Workspace data cleared', { description: 'Charts, resources, budgets, reports and active notifications were reset. History was preserved.' })
      await loadSettings()
      refresh?.()
    } catch (e) {
      toast.error('Unable to clear workspace data', { description: e.message })
    } finally { setBusy('') }
  }

  const alerts = settings?.alerts || []

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5 text-cyan-400" /> Preferences</CardTitle><CardDescription>Currency applies across dashboards, charts, budgets and reports.</CardDescription></CardHeader>
        <CardContent><div className="flex items-center gap-3"><Label className="w-32">Display currency</Label><Select value={currency} onValueChange={onCurrency}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{symFor(c)} {c}</SelectItem>)}</SelectContent></Select></div></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" /> Notification &amp; Alert Rules
          </CardTitle>
          <CardDescription>
            Configure in-app alerts, thresholds, and notification delivery options.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
              <div className="space-y-0.5">
                <div className="font-medium text-xs sm:text-sm">In-App Notifications</div>
                <div className="text-[11px] text-muted-foreground">Receive real-time alerts for CRUD operations &amp; reports</div>
              </div>
              <Switch checked={notifPrefs.inApp} onCheckedChange={(v) => saveNotifPrefs({ ...notifPrefs, inApp: v })} />
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
              <div className="space-y-0.5">
                <div className="font-medium text-xs sm:text-sm">Budget Threshold Alerts</div>
                <div className="text-[11px] text-muted-foreground">Alert when monthly spending reaches 80% and 100%</div>
              </div>
              <Switch checked={notifPrefs.budgetAlerts} onCheckedChange={(v) => saveNotifPrefs({ ...notifPrefs, budgetAlerts: v })} />
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
              <div className="space-y-0.5">
                <div className="font-medium text-xs sm:text-sm">Optimization Alerts</div>
                <div className="text-[11px] text-muted-foreground">Notify when AI identifies new cost optimization actions</div>
              </div>
              <Switch checked={notifPrefs.optAlerts} onCheckedChange={(v) => saveNotifPrefs({ ...notifPrefs, optAlerts: v })} />
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
              <div className="space-y-0.5">
                <div className="font-medium text-xs sm:text-sm">Email Alert Delivery</div>
                <div className="text-[11px] text-muted-foreground">Send high-priority alerts via configured Resend email</div>
              </div>
              <Switch checked={notifPrefs.emailAlerts} onCheckedChange={(v) => saveNotifPrefs({ ...notifPrefs, emailAlerts: v })} />
            </div>
          </div>
        </CardContent>
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
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-purple-400" /> Email Budget Alerts (Resend)</CardTitle><CardDescription>Emails send automatically at your warning threshold and 100% of budget.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="resend-key">Resend API key</Label><Input id="resend-key" type="password" placeholder="re_…" value={em.apiKey} onChange={(e) => setEm({ ...em, apiKey: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="resend-to">Alert recipient email</Label><Input id="resend-to" type="email" placeholder="you@company.com" value={em.recipient} onChange={(e) => setEm({ ...em, recipient: e.target.value })} /></div>
          </div>
          <div className="flex gap-2"><Button onClick={saveEmail} disabled={busy === 'email'}>{busy === 'email' ? 'Saving…' : 'Save settings'}</Button><Button variant="secondary" onClick={testEmail} disabled={busy === 'test' || !settings?.email?.configured}><Send className="h-3.5 w-3.5 mr-1.5" /> {busy === 'test' ? 'Sending…' : 'Send test email'}</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5 text-emerald-400" /> Data Management &amp; Backup</CardTitle><CardDescription>Backup your entire FinOps workspace state or restore from JSON.</CardDescription></CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" onClick={exportBackup}><Download className="h-4 w-4 mr-2" /> Export Workspace JSON</Button>
        </CardContent>
      </Card>

      <Card className="border-red-500/30">
        <CardHeader><CardTitle className="flex items-center gap-2 text-red-400"><Trash2 className="h-5 w-5" /> Clear workspace data</CardTitle><CardDescription>Remove uploaded cloud data, resources, costs, budgets, reports and active notifications. Your user identity, settings and complete action history remain available.</CardDescription></CardHeader>
        <CardContent>
          <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
            <Button variant="outline" className="text-red-400 border-red-500/40 hover:bg-red-500/10" onClick={() => setClearOpen(true)}><Trash2 className="h-4 w-4 mr-2" /> Clear data and reset charts</Button>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>Clear all workspace data?</AlertDialogTitle><AlertDialogDescription>This permanently removes the workspace&apos;s resources, uploaded cost data, budgets, reports, recommendations and active notifications. The action is recorded in History and cannot be undone except by re-uploading or importing a backup.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel disabled={busy === 'clear'}>Cancel</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); clearWorkspace() }} disabled={busy === 'clear'}>{busy === 'clear' ? 'Clearing…' : 'Clear workspace'}</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================ WORKSPACES PAGE ============================
function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadWorkspaces = useCallback(async () => {
    const res = await fetch('/api/workspaces')
    const rows = await res.json()
    if (res.ok) setWorkspaces(Array.isArray(rows) ? rows : [])
  }, [])
  useEffect(() => { loadWorkspaces() }, [loadWorkspaces])

  const createWorkspace = async () => {
    const clean = name.trim()
    if (!clean) return toast.error('Enter a workspace name')
    setBusy('create')
    try {
      const res = await fetch('/api/workspaces', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: clean }) })
      const result = await res.json(); if (!res.ok) throw new Error(result.error || 'Create failed')
      setName(''); setCreateOpen(false); await loadWorkspaces(); toast.success('Fresh workspace created')
    } catch (e) { toast.error('Could not create workspace', { description: e.message }) } finally { setBusy('') }
  }
  const switchWorkspace = async (id) => {
    setBusy(`switch:${id}`)
    try { const res = await fetch('/api/workspaces/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); if (!res.ok) throw new Error('Switch failed'); window.location.reload() } catch (e) { toast.error(e.message) } finally { setBusy('') }
  }
  const saveWorkspace = async () => {
    const clean = name.trim(); if (!clean) return toast.error('Enter a workspace name')
    setBusy('save')
    try { const res = await fetch('/api/workspaces/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: clean }) }); const result = await res.json(); if (!res.ok) throw new Error(result.error || 'Save failed'); setEditing(null); setName(''); await loadWorkspaces(); toast.success('Workspace saved') } catch (e) { toast.error('Could not save workspace', { description: e.message }) } finally { setBusy('') }
  }
  const deleteWorkspace = async (id) => {
    setBusy(`delete:${id}`)
    try { const res = await fetch('/api/workspaces/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); const result = await res.json(); if (!res.ok) throw new Error(result.error || 'Delete failed'); toast.success('Workspace deleted'); window.location.reload() } catch (e) { toast.error('Could not delete workspace', { description: e.message }) } finally { setBusy('') }
  }

  return <div className="space-y-6 max-w-4xl"><div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold">Workspaces</h2><p className="text-sm text-muted-foreground mt-1">Create separate fresh environments for different teams, clients or projects. Every workspace keeps its own cloud data, budgets, reports and history.</p></div><Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> New workspace</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Create a fresh workspace</DialogTitle><DialogDescription>New workspaces start empty. Upload cloud data whenever you are ready.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="new-workspace-name">Workspace name</Label><Input id="new-workspace-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production Cloud" onKeyDown={(e) => e.key === 'Enter' && createWorkspace()} /></div><DialogFooter><Button onClick={createWorkspace} disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create workspace'}</Button></DialogFooter></DialogContent></Dialog></div><div className="grid gap-4 md:grid-cols-2">{workspaces.map((workspace) => <Card key={workspace.id} className={workspace.active ? 'border-primary/60' : ''}><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3 min-w-0"><div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center shrink-0"><Layers className="h-5 w-5 text-primary" /></div><div className="min-w-0">{editing === workspace.id ? <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveWorkspace()} /> : <div className="font-semibold truncate">{workspace.name}</div>}<div className="text-xs text-muted-foreground mt-1">{workspace.active ? 'Current workspace' : 'Empty or saved workspace'}</div></div></div>{workspace.active && <Badge>Active</Badge>}</div><div className="flex flex-wrap gap-2 mt-5">{editing === workspace.id ? <><Button size="sm" onClick={saveWorkspace} disabled={busy === 'save'}><Check className="h-3.5 w-3.5 mr-1" /> Save</Button><Button size="sm" variant="ghost" onClick={() => { setEditing(null); setName('') }}>Cancel</Button></> : <><Button size="sm" variant={workspace.active ? 'secondary' : 'default'} onClick={() => !workspace.active && switchWorkspace(workspace.id)} disabled={workspace.active || busy.startsWith('switch:')}>{workspace.active ? 'Using workspace' : 'Switch'}</Button><Button size="sm" variant="outline" onClick={() => { setEditing(workspace.id); setName(workspace.name) }}><Pencil className="h-3.5 w-3.5 mr-1" /> Edit</Button><Button size="sm" variant="outline" className="text-red-400 border-red-500/30" onClick={() => setDeleteTarget(workspace)} disabled={busy.startsWith('delete:')}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button></>}</div></CardContent></Card>)}</div><AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle><AlertDialogDescription>This permanently deletes this workspace and all resources, uploaded costs, budgets, reports, notifications, recommendations, settings and workspace history inside it. Other workspaces are not affected. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy.startsWith('delete:')}>Cancel</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={(e) => { e.preventDefault(); deleteWorkspace(deleteTarget.id).then(() => setDeleteTarget(null)) }} disabled={busy.startsWith('delete:')}>{busy.startsWith('delete:') ? 'Deleting…' : 'Delete workspace'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
}

// ============================ HISTORY PAGE ============================
const HISTORY_TITLES = {
  apply_recommendation: 'Recommendation Applied', dismiss_recommendation: 'Recommendation Dismissed',
  create_workspace: 'Workspace Created', update_workspace: 'Workspace Saved', delete_workspace: 'Workspace Deleted', switch_workspace: 'Workspace Switched',
  clear_workspace: 'Workspace Data Cleared', reset_dataset: 'Dataset Reset', accept_notification: 'Notification Accepted', dismiss_notification: 'Notification Dismissed',
  upload: 'Cloud Data Uploaded', restore_backup: 'Workspace Backup Restored', create: 'Resource Created', update: 'Resource Updated', delete: 'Resource Deleted',
  bulk_delete: 'Resources Deleted', bulk_status: 'Resource Status Updated', generate: 'Report Generated', connect: 'Azure Connected', disconnect: 'Azure Disconnected',
  edit_tags: 'Resource Tags Updated', assign_role: 'Role Assigned', create_alert: 'Alert Created', activate_alert: 'Alert Activated', deactivate_alert: 'Alert Deactivated',
}
function historyTitle(item) {
  if (HISTORY_TITLES[item.action]) return HISTORY_TITLES[item.action]
  const entity = item.entity ? String(item.entity).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Workspace'
  return `${entity} Action`
}

function HistoryPage({ data }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const auditRes = await fetch('/api/audit')
      const audit = auditRes.ok ? await auditRes.json() : []
      const merged = (Array.isArray(audit) ? audit : []).map((item) => ({ ...item, kind: 'Action', at: item.created_at })).sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0))
      setItems(merged)
    } catch { toast.error('Failed to load history') } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory, data])

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3"><div><h2 className="text-2xl font-semibold">History</h2><p className="text-sm text-muted-foreground mt-1">Only actions you took are shown here: applied, created, updated, accepted, dismissed and deleted.</p></div><Button variant="outline" size="sm" onClick={loadHistory} disabled={loading}><RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh</Button></div>
      <Card>
        <CardContent className="p-0">
          {loading ? <div className="p-8 text-center text-sm text-muted-foreground">Loading history…</div> : items.length === 0 ? <div className="p-10 text-center text-sm text-muted-foreground">No actions yet. Applied changes will appear here.</div> : <ScrollArea className="h-[calc(100vh-230px)] min-h-96"><div className="divide-y divide-border/50">{items.map((item, index) => <div key={`${item.kind}-${item.id || index}`} className="flex items-start gap-3 px-4 py-3.5 text-sm"><Badge variant="outline" className="shrink-0">{item.kind}</Badge><div className="min-w-0 flex-1"><div className="font-medium">{historyTitle(item)}</div><div className="text-xs text-muted-foreground">{item.entity ? String(item.entity).replace(/_/g, ' ') : 'workspace'}{item.entity_id ? ` · ${item.entity_id}` : ''}</div>{(item.prev_value || item.new_value) && <div className="text-xs text-muted-foreground mt-1 break-words">{item.prev_value ? `Previous: ${item.prev_value} ` : ''}{item.new_value ? `Result: ${item.new_value}` : ''}</div>}</div><time className="text-[11px] text-muted-foreground shrink-0">{item.at ? new Date(item.at).toLocaleString() : '—'}</time></div>)}</div></ScrollArea>}
        </CardContent>
      </Card>
    </div>
  )
}

// ============================ PROFILE PAGE ============================
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
          <Button size="sm" variant="outline" onClick={goSettings}><SettingsIcon className="h-4 w-4 mr-2" /> Open Settings</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4 text-blue-400" /> Audit Log History</CardTitle><CardDescription>All CRUD operations and system events recorded for compliance</CardDescription></CardHeader>
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
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{[...Array(7)].map((_, i) => <Skeleton key={i} className="h-24 sm:h-28" />)}</div>
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-72 sm:h-80 lg:col-span-2" /><Skeleton className="h-72 sm:h-80" /></div>
    </div>
  )
}

// ============================ MAIN APP CONTAINER ============================
export default function App() {
  const [active, setActive] = useState('dashboard')
  const [data, setData] = useState(null)
  const [notif, setNotif] = useState({ items: [], unread: 0 })
  const [topSearch, setTopSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [demoModalOpen, setDemoModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [demoMode, setDemoMode] = useState(false)

  const { isSignedIn, isLoaded } = useUser()
  const mainRef = useRef(null)
  const currency = data?.currency || 'INR'

  const loadNotif = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications')
      if (r.ok) setNotif(await r.json())
    } catch {}
  }, [])

  const load = useCallback(async () => {
    try {
      const [dashRes, notifRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/notifications')
      ])
      const dash = await dashRes.json().catch(() => ({}))
      if (dashRes.ok && dash?.stats) {
        setData(dash)
      }
      if (notifRes.ok) setNotif(await notifRes.json().catch(() => ({ items: [], unread: 0 })))
    } catch (error) {
      console.error('Data load error', error)
    }
  }, [])

  useEffect(() => {
    if (isLoaded && (isSignedIn || demoMode)) {
      load()
      const interval = setInterval(loadNotif, 20000)
      return () => clearInterval(interval)
    }
  }, [isLoaded, isSignedIn, demoMode, load, loadNotif])

  const handleCurrency = async (nextCurrency) => {
    try {
      const res = await fetch('/api/settings/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: nextCurrency }),
      })
      if (res.ok) {
        toast.success(`Currency changed to ${nextCurrency}`)
        load()
      }
    } catch {
      toast.error('Failed to change currency')
    }
  }

  const handleDemoConfirm = async (mode) => {
    toast.loading('Loading demo dataset…', { id: 'demo' })
    try {
      const res = await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
      if (res.ok) {
        toast.success('FinOps Demo Dataset Loaded!', { id: 'demo' })
        load()
      }
    } catch {
      toast.error('Failed to load demo data', { id: 'demo' })
    }
  }

  const handleClearWorkspace = async (closeDialog) => {
    toast.loading('Clearing workspace data…', { id: 'clear-workspace' })
    try {
      const res = await fetch('/api/clear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Clear failed')
      closeDialog?.(); await load()
      toast.success('All dashboard data cleared', { id: 'clear-workspace', description: 'Charts are reset to zero. The action is saved in History.' })
    } catch (e) { toast.error('Unable to clear dashboard data', { id: 'clear-workspace', description: e.message }) }
  }

  const handleReadNotif = () => { loadNotif() }

  const handleReadAllNotif = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
      loadNotif()
      toast.success('All notifications marked as read')
    } catch {}
  }

  const handleReadItem = async (id) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'POST' })
      loadNotif()
    } catch {}
  }

  const handleDeleteItem = async (id) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      loadNotif()
    } catch {}
  }

  const handleClearAllNotif = async () => {
    try {
      await fetch('/api/notifications/clear-all', { method: 'POST' })
      loadNotif()
      toast.success('Notifications cleared')
    } catch {}
  }

  const handleApplyRecommendation = async (recId) => {
    toast.loading('Applying optimization action…', { id: 'rec' })
    try {
      const res = await fetch(`/api/recommendations/${recId}/apply`, { method: 'POST' })
      if (res.ok) {
        toast.success('Optimization applied! Saved in database & metrics recalculated live.', { id: 'rec' })
        load()
      } else {
        toast.error('Failed to apply recommendation', { id: 'rec' })
      }
    } catch {
      toast.error('Failed to apply recommendation', { id: 'rec' })
    }
  }

  const handleNavigate = (tab, query = '') => {
    setActive(tab)
    if (query) setTopSearch(query)
  }

  if (!isLoaded) return <div className="min-h-screen bg-background grid place-items-center"><RefreshCw className="h-6 w-6 animate-spin text-purple-400" /></div>
  
  // Show Modern Landing Page if user is not signed in AND not in explicit Demo Preview mode
  if (!isSignedIn && !demoMode) {
    return <Landing onExploreDemo={() => { setDemoMode(true); toast.info('Entered Demo Workspace Preview') }} />
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      <Sidebar active={active} setActive={setActive} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar
          active={active}
          onOpenDemoModal={() => setDemoModalOpen(true)}
          onOpenImportModal={() => setImportModalOpen(true)}
          onOpenSearch={() => setSearchOpen(true)}
          dataSource={data?.dataSource}
          currency={currency}
          onCurrency={handleCurrency}
          notif={notif}
          onReadNotif={handleReadNotif}
          onReadAll={handleReadAllNotif}
          onReadItem={handleReadItem}
          onDeleteItem={handleDeleteItem}
          onClearAll={handleClearAllNotif}
          isDemoPreview={demoMode && !isSignedIn}
          onExitDemo={() => setDemoMode(false)}
        />
        <MobileNav active={active} setActive={setActive} />

        <main ref={mainRef} className="flex-1 p-3 sm:p-6 md:p-8 overflow-y-auto">
          {active === 'dashboard' && <DashboardPage data={data} onOpenDemoModal={() => setDemoModalOpen(true)} onOpenImportModal={() => setImportModalOpen(true)} onNavigate={handleNavigate} onApplyRec={handleApplyRecommendation} onClearWorkspace={handleClearWorkspace} />}
          {active === 'resources' && <ResourcesPage currency={currency} onDataChange={load} externalSearch={topSearch} />}
          {active === 'analytics' && <AnalyticsPage data={data} />}
          {active === 'budget' && <BudgetPage data={data} refresh={load} />}
          {active === 'recommendations' && <RecommendationsPage data={data} refresh={load} />}
          {active === 'reports' && <ReportsPage data={data} mainRef={mainRef} refresh={load} />}
          {active === 'settings' && <SettingsPage refresh={load} currency={currency} onCurrency={handleCurrency} />}
          {active === 'workspaces' && <WorkspacesPage />}
          {active === 'history' && <HistoryPage data={data} />}
          {active === 'profile' && <ProfilePage goSettings={() => setActive('settings')} data={data} />}
        </main>
      </div>

      <GlobalSearchModal open={searchOpen} setOpen={setSearchOpen} onNavigate={handleNavigate} />
      <DataImportModal open={importModalOpen} setOpen={setImportModalOpen} onImportSuccess={load} />
      <DemoDataModal open={demoModalOpen} setOpen={setDemoModalOpen} onConfirm={handleDemoConfirm} />
    </div>
  )
}
