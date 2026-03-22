import { useQuery } from '@tanstack/react-query'
import { recommendationsApi, analysesApi } from '@/api'
import MetricCard from '@/components/dashboard/MetricCard'
import { SavingsProjectionChart } from '@/components/dashboard/CostChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { TrendingDown, DollarSign, Zap, Target } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { CHART_COLORS, TOOLTIP_STYLE, GRID_STYLE, AXIS_STYLE } from '@/components/ui/chart'

const CAT_COLORS = { Rightsizing:'#3B82F6', Reserved:'#8B5CF6', Cleanup:'#10B981', Storage:'#F59E0B', Pricing:'#F97316', Network:'#06B6D4' }

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return <div style={TOOLTIP_STYLE} className="px-3 py-2 text-xs"><p className="text-muted-foreground mb-1">{label || payload[0]?.name}</p>{payload.map(p => <p key={p.name} className="font-bold" style={{ color: p.fill||p.color }}>{formatCurrency(p.value)}</p>)}</div>
}

export default function Savings() {
  const { data: recsData } = useQuery({ queryKey: ['recommendations'], queryFn: () => recommendationsApi.getAll() })
  const { data: summary }  = useQuery({ queryKey: ['summary'],         queryFn: analysesApi.getSummary })
  const recs = recsData?.data || []
  const totalMonthly = recsData?.totalMonthlySavings || 0
  const catData = Object.entries(recs.reduce((acc,r) => ({ ...acc, [r.category]: (acc[r.category]||0) + r.monthlySavings }), {})).map(([name,value]) => ({name,value})).sort((a,b)=>b.value-a.value)
  const provData = Object.entries(recs.reduce((acc,r) => ({ ...acc, [r.provider]: (acc[r.provider]||0) + r.monthlySavings }), {})).map(([name,value]) => ({ name:name.toUpperCase(), value, color: CHART_COLORS[name]||'#6366f1' }))
  const projData = Array.from({length:12}, (_,i) => {
    const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]
    const base = summary?.totalMonthlyCost || 140000
    return { month, baseline: Math.round(base), optimized: Math.round(base - Math.min(totalMonthly*(i*0.08+0.1), totalMonthly)) }
  })
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold">Savings Analysis</h1><p className="text-sm text-muted-foreground">Full savings potential and projection</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Monthly Savings" value={formatCurrency(totalMonthly)} icon={TrendingDown} iconColor="text-green-400" iconBg="bg-green-500/10" trendValue="if all applied" trend="up" />
        <MetricCard title="Annual Savings" value={formatCurrency(totalMonthly*12)} icon={DollarSign} iconColor="text-primary" iconBg="bg-primary/10" />
        <MetricCard title="Quick Wins" value={recs.filter(r=>r.effort==='Low').length} icon={Zap} iconColor="text-yellow-400" iconBg="bg-yellow-500/10" trendValue="low effort" trend="neutral" />
        <MetricCard title="Waste Rate" value={`${summary?.wastePercentage||0}%`} icon={Target} iconColor="text-orange-400" iconBg="bg-orange-500/10" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Savings by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={catData} margin={{top:5,right:10,bottom:0,left:-10}}>
                <CartesianGrid {...GRID_STYLE} vertical={false} />
                <XAxis dataKey="name" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
                <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="value" radius={[4,4,0,0]}>{catData.map(e=><Cell key={e.name} fill={CAT_COLORS[e.name]||'#6366f1'} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Savings by Provider</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-6">
            <PieChart width={160} height={160}><Pie data={provData} cx="50%" cy="50%" innerRadius={44} outerRadius={72} dataKey="value" paddingAngle={3}>{provData.map((e,i)=><Cell key={i} fill={e.color} stroke="none" />)}</Pie><Tooltip content={<Tip />} /></PieChart>
            <div className="space-y-3">{provData.map(d => (<div key={d.name}><div className="flex items-center gap-2 mb-0.5"><div className="w-2.5 h-2.5 rounded-full" style={{background:d.color}} /><span className="text-sm font-medium">{d.name}</span></div><p className="text-lg font-bold text-green-400 ml-4">{formatCurrency(d.value)}/mo</p></div>))}</div>
          </CardContent>
        </Card>
      </div>
      <SavingsProjectionChart data={projData} />
      <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Quick Wins — Low Effort, High Return</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {recs.filter(r=>r.effort==='Low').map(r=>(
            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors">
              <Zap className="h-4 w-4 text-yellow-400 flex-shrink-0" />
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{r.title}</p><p className="text-xs text-muted-foreground">{r.category} · {r.provider?.toUpperCase()}</p></div>
              <div className="text-right flex-shrink-0"><p className="text-sm font-bold text-green-400">+{formatCurrency(r.monthlySavings)}/mo</p><p className="text-xs text-muted-foreground">{formatCurrency(r.annualSavings)}/yr</p></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
