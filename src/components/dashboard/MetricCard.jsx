import { cn, formatCurrency } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function MetricCard({
  title, value, subtitle, trend, trendValue,
  icon: Icon, iconColor = 'text-primary', iconBg = 'bg-primary/10',
  className, valueColor,
}) {
  const trendIcon = !trend || trend === 'neutral' ? <Minus className='h-3 w-3' />
    : trend === 'up' ? <TrendingUp className='h-3 w-3' /> : <TrendingDown className='h-3 w-3' />
  const trendColor = !trend || trend === 'neutral' ? 'text-muted-foreground'
    : trend === 'up' ? 'text-green-400' : 'text-red-400'

  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 transition-all hover:border-border/60', className)}>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <p className='text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 truncate'>{title}</p>
          <p className={cn('text-2xl font-bold leading-none', valueColor || 'text-foreground')}>{value}</p>
          {(trendValue || subtitle) && (
            <div className='flex items-center gap-1.5 mt-2 flex-wrap'>
              {trendValue && (<span className={cn('flex items-center gap-0.5 text-xs font-medium', trendColor)}>{trendIcon}{trendValue}</span>)}
              {subtitle && <span className='text-xs text-muted-foreground'>{subtitle}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('rounded-lg p-2 flex-shrink-0', iconBg)}>
            <Icon className={cn('h-5 w-5', iconColor)} />
          </div>
        )}
      </div>
    </div>
  )
}
