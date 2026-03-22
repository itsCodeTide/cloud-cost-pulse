import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount, compact = false) {
  const num = Number(amount) || 0
  if (compact && Math.abs(num) >= 1000) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(num)
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num)
}

export function formatPercent(value, decimals = 1) {
  return `${Number(value || 0).toFixed(decimals)}%`
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value) || 0)
}

export function formatRelativeTime(dateString) {
  const diff = Date.now() - new Date(dateString).getTime()
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  const mins = Math.floor(diff / 60000)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'just now'
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function getSeverityClasses(severity) {
  const map = {
    critical: 'bg-red-500/10 text-red-400 border-red-500/25',
    high:     'bg-orange-500/10 text-orange-400 border-orange-500/25',
    medium:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',
    low:      'bg-blue-500/10 text-blue-400 border-blue-500/25',
  }
  return map[severity] || 'bg-muted text-muted-foreground border-border'
}

export function getSeverityBorder(severity) {
  const map = { critical: 'border-l-red-500', high: 'border-l-orange-500', medium: 'border-l-yellow-500', low: 'border-l-blue-500' }
  return map[severity] || 'border-l-border'
}

export function getProviderClasses(provider) {
  const map = {
    aws:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
    azure: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    gcp:   'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  }
  return map[provider] || 'bg-muted text-muted-foreground border-border'
}

export function getProviderColor(provider) {
  const map = { aws: '#FF9900', azure: '#0078D4', gcp: '#4285F4' }
  return map[provider] || '#6366f1'
}

export function getEffortClasses(effort) {
  const map = {
    Low:    'bg-green-500/10 text-green-400 border-green-500/20',
    Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    High:   'bg-red-500/10 text-red-400 border-red-500/20',
  }
  return map[effort] || 'bg-muted text-muted-foreground border-border'
}
