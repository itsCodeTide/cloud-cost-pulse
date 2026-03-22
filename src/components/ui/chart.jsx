import * as React from 'react'
import { cn } from '@/lib/utils'

// Recharts color tokens for consistent theming
export const CHART_COLORS = {
  aws:   '#FF9900',
  azure: '#0078D4',
  gcp:   '#4285F4',
  primary:  'hsl(217 91% 60%)',
  success:  'hsl(142 76% 36%)',
  warning:  'hsl(38 92% 50%)',
  danger:   'hsl(0 84% 60%)',
  muted:    'hsl(217 33% 25%)',
}

// Shared tooltip style for recharts
export const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(222 47% 8%)',
  border: '1px solid hsl(217 33% 17%)',
  borderRadius: 8,
  color: 'hsl(213 31% 91%)',
  fontSize: 12,
}

export const GRID_STYLE = { stroke: 'hsl(217 33% 17%)', strokeDasharray: '3 3' }
export const AXIS_STYLE = { fill: 'hsl(215 20% 52%)', fontSize: 11 }

const ChartContainer = React.forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn('w-full', className)} {...props}>{children}</div>
))
ChartContainer.displayName = 'ChartContainer'

export { ChartContainer }
