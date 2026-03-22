import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Search, Lightbulb, Server, ShieldAlert,
  PiggyBank, Bot, FileText, Code2, History, Settings,
  ChevronLeft, ChevronRight, Zap, Menu, Bell, X, User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'

const NAV = [
  { path: '/',                 label: 'Dashboard',       icon: LayoutDashboard },
  { path: '/new-analysis',     label: 'New Analysis',    icon: Search },
  { path: '/recommendations',  label: 'Recommendations', icon: Lightbulb },
  { path: '/resources',        label: 'Resources',       icon: Server },
  { path: '/risk',             label: 'Risk Analysis',   icon: ShieldAlert },
  { path: '/savings',          label: 'Savings',         icon: PiggyBank },
  { path: '/ai-assistant',     label: 'AI Assistant',    icon: Bot },
  { path: '/executive-report', label: 'Exec Report',     icon: FileText },
  { path: '/terraform',        label: 'Terraform',       icon: Code2 },
  { path: '/history',          label: 'History',         icon: History },
  { path: '/settings',         label: 'Settings',        icon: Settings },
]

function Sidebar({ collapsed, onNavClick }) {
  return (
    <aside className={cn(
      'flex flex-col h-full bg-[hsl(222,47%,6%)] border-r border-border transition-all duration-300 flex-shrink-0',
      collapsed ? 'w-14' : 'w-56'
    )}>
      {/* Logo */}
      <div className={cn('flex items-center gap-2.5 h-14 px-3 border-b border-border', collapsed && 'justify-center')}>
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Zap className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground leading-tight">CloudCost</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.12em]">Pulse</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            onClick={onNavClick}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all',
              collapsed && 'justify-center px-2',
              isActive
                ? 'bg-primary/15 text-primary font-medium border border-primary/20'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'
            )}
            title={collapsed ? label : undefined}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      {!collapsed && (
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/40">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-[11px] font-bold text-primary">AJ</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">Alex Johnson</p>
              <p className="text-[10px] text-muted-foreground truncate">FinOps Engineer</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const isMobile = useIsMobile()
  const location = useLocation()
  const pageLabel = NAV.find(n =>
    n.path === '/' ? location.pathname === '/' : location.pathname.startsWith(n.path)
  )?.label || 'Cloud Cost Pulse'

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && (
        <div className="relative flex-shrink-0">
          <Sidebar collapsed={collapsed} onNavClick={() => {}} />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-6 h-6 rounded-full bg-border hover:bg-muted-foreground flex items-center justify-center transition-colors"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <ChevronRight className="h-3 w-3 text-foreground" /> : <ChevronLeft className="h-3 w-3 text-foreground" />}
          </button>
        </div>
      )}

      {/* Mobile drawer */}
      {isMobile && mobileOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} />
          <div className="relative w-56 h-full z-10">
            <Sidebar collapsed={false} onNavClick={() => setMobileOpen(false)} />
          </div>
          <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 z-20 p-1 rounded-md bg-card border border-border">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-4 flex-shrink-0 bg-background/90 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={() => setMobileOpen(true)} className="p-1.5 rounded-md hover:bg-accent">
                <Menu className="h-4 w-4" />
              </button>
            )}
            <span className="text-sm font-semibold text-foreground hidden sm:block">{pageLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer">
              <span className="text-[11px] font-bold text-primary">AJ</span>
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 md:p-6 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  )
}
