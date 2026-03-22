import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CHART_COLORS, TOOLTIP_STYLE, GRID_STYLE, AXIS_STYLE } from '@/components/ui/chart'
import { formatCurrency } from '@/lib/utils'

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={TOOLTIP_STYLE} className='px-3 py-2'>
      <p className='text-muted-foreground mb-1.5 font-medium text-xs'>{label}</p>
      {payload.map(p => (
        <p key={p.name} className='font-semibold text-xs' style={{ color: p.color || p.fill }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export function MultiProviderAreaChart({ data = [], height = 240 }) {
  return (
    <Card>
      <CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Monthly Spend by Provider</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width='100%' height={height}>
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
            <defs>
              {Object.entries(CHART_COLORS).slice(0, 3).map(([k, c]) => (
                <linearGradient key={k} id={`ga-${k}`} x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor={c} stopOpacity={0.25} />
                  <stop offset='95%' stopColor={c} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey='month' tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip />} />
            {['aws','azure','gcp'].map(k => (
              <Area key={k} type='monotone' dataKey={k} name={k.toUpperCase()} stroke={CHART_COLORS[k]} strokeWidth={2} fill={`url(#ga-${k})`} dot={false} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        <div className='flex gap-4 mt-3'>
          {['aws','azure','gcp'].map(k => (
            <div key={k} className='flex items-center gap-1.5'>
              <div className='w-2.5 h-2.5 rounded-sm' style={{ background: CHART_COLORS[k] }} />
              <span className='text-xs text-muted-foreground uppercase font-medium'>{k}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function WasteByCategoryBarChart({ data = [], height = 200 }) {
  return (
    <Card>
      <CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Waste by Service</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width='100%' height={height}>
          <BarChart data={data} layout='vertical' margin={{ top: 0, right: 30, bottom: 0, left: 10 }}>
            <CartesianGrid {...GRID_STYLE} horizontal={false} />
            <XAxis type='number' tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <YAxis type='category' dataKey='service' tick={AXIS_STYLE} axisLine={false} tickLine={false} width={68} />
            <Tooltip content={<ChartTip />} />
            <Bar dataKey='waste' name='Waste' fill='hsl(0 84% 55% / 0.75)' radius={[0, 3, 3, 0]} />
            <Bar dataKey='optimizable' name='Optimizable' fill='hsl(217 91% 60% / 0.65)' radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function ProviderPieChart({ data = [] }) {
  return (
    <Card>
      <CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Spend Split</CardTitle></CardHeader>
      <CardContent>
        <PieChart width={180} height={140} className='mx-auto'>
          <Pie data={data} cx='50%' cy='50%' innerRadius={40} outerRadius={65} dataKey='value' paddingAngle={3}>
            {data.map((e, i) => <Cell key={i} fill={e.color || CHART_COLORS[e.name?.toLowerCase()] || '#6366f1'} stroke='none' />)}
          </Pie>
          <Tooltip content={<ChartTip />} />
        </PieChart>
        <div className='space-y-2 mt-2'>
          {data.map((d, i) => {
            const total = data.reduce((s, x) => s + x.value, 0)
            const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : 0
            const color = d.color || CHART_COLORS[d.name?.toLowerCase()] || '#6366f1'
            return (
              <div key={i} className='flex items-center justify-between'>
                <div className='flex items-center gap-1.5'>
                  <div className='w-2 h-2 rounded-full flex-shrink-0' style={{ background: color }} />
                  <span className='text-xs text-muted-foreground'>{d.name}</span>
                </div>
                <span className='text-xs font-semibold'>{pct}%</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function SavingsProjectionChart({ data = [], height = 200 }) {
  return (
    <Card>
      <CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>12-Month Cost Projection</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width='100%' height={height}>
          <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
            <CartesianGrid {...GRID_STYLE} />
            <XAxis dataKey='month' tick={AXIS_STYLE} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTip />} />
            <Bar dataKey='baseline' name='Current' fill='hsl(217 33% 25%)' radius={[3,3,0,0]} />
            <Bar dataKey='optimized' name='Optimized' fill='hsl(142 70% 40% / 0.85)' radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
