import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { analysesApi, recommendationsApi, riskApi } from '@/api'
import MetricCard from '@/components/dashboard/MetricCard'
import { MultiProviderAreaChart, WasteByCategoryBarChart, ProviderPieChart } from '@/components/dashboard/CostChart'
import WasteHeatmap from '@/components/dashboard/WasteHeatmap'
import SavingsBreakdown from '@/components/dashboard/SavingsBreakdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, getSeverityClasses, cn } from '@/lib/utils'
import { DollarSign, Trash2, TrendingDown, AlertTriangle, RefreshCw, ArrowRight, Zap } from 'lucide-react'

export default function Dashboard() {
  const { data: summary, isLoading, refetch } = useQuery({ queryKey: ['summary'], queryFn: analysesApi.getSummary })
  const { data: recsData } = useQuery({ queryKey: ['recs-pending'], queryFn: () => recommendationsApi.getAll({ status: 'pending' }) })
  const { data: riskData } = useQuery({ queryKey: ['risks'], queryFn: riskApi.getAll })

  const recs  = recsData?.data || []
  const risks = riskData?.data || []
  const pieData = summary ? [
    { name: 'AWS',   value: summary.monthlyTrend?.at(-1)?.aws   || 0, color: '#FF9900' },
    { name: 'Azure', value: summary.monthlyTrend?.at(-1)?.azure || 0, color: '#0078D4' },
    { name: 'GCP',   value: summary.monthlyTrend?.at(-1)?.gcp   || 0, color: '#4285F4' },
  ] : []

  if (isLoading) return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Multi-cloud FinOps overview</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-accent transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Monthly Spend" value={formatCurrency(summary?.totalMonthlyCost)} icon={DollarSign} iconColor="text-blue-400" iconBg="bg-blue-500/10" trendValue="+4.2% vs last month" trend="up" />
        <MetricCard title="Cloud Waste" value={formatCurrency(summary?.totalWaste)} subtitle={`${summary?.wastePercentage}% of spend`} icon={Trash2} iconColor="text-red-400" iconBg="bg-red-500/10" />
        <MetricCard title="Savings Opportunity" value={formatCurrency(summary?.savingsOpportunity)} subtitle="per month" icon={TrendingDown} iconColor="text-green-400" iconBg="bg-green-500/10" trendValue={`${recs.length} actions`} trend="neutral" />
        <MetricCard title="Active Risks" value={(riskData?.critical || 0) + (riskData?.high || 0)} subtitle={`${riskData?.total || 0} total`} icon={AlertTriangle} iconColor="text-orange-400" iconBg="bg-orange-500/10" valueColor="text-orange-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><MultiProviderAreaChart data={summary?.monthlyTrend || []} /></div>
        <ProviderPieChart data={pieData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><WasteHeatmap data={summary?.wasteByService || []} /></div>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Risks</CardTitle>
              <Link to="/risk" className="text-xs text-primary hover:underline flex items-center gap-0.5">All <ArrowRight className="h-3 w-3" /></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {risks.slice(0, 4).map(r => (
              <div key={r.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/50">
                <span className={cn('text-[9px] font-bold uppercase border rounded-full px-1.5 py-0.5 flex-shrink-0 mt-0.5', getSeverityClasses(r.severity))}>{r.severity}</span>
                <p className="text-xs text-foreground leading-snug">{r.title}</p>
              </div>
            ))}
            {!risks.length && <p className="text-xs text-muted-foreground text-center py-3">No risks found</p>}
          </CardContent>
        </Card>
      </div>

      <WasteByCategoryBarChart data={summary?.wasteByService || []} />
      <SavingsBreakdown recommendations={recs} />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Recommendations <span className="ml-1 text-xs font-normal">{formatCurrency(recsData?.totalMonthlySavings || 0)}/mo potential</span>
            </CardTitle>
            <Link to="/recommendations" className="text-xs text-primary hover:underline flex items-center gap-0.5">View all <ArrowRight className="h-3 w-3" /></Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recs.slice(0, 4).map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/20 transition-colors">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.effort} effort · {r.impact} impact</p>
                </div>
                <span className="text-sm font-bold text-green-400 flex-shrink-0">+{formatCurrency(r.monthlySavings)}/mo</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
