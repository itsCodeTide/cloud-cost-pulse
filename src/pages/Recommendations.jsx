import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { recommendationsApi } from '@/api'
import RecommendationCard from '@/components/recommendations/RecommendationCard'
import MetricCard from '@/components/dashboard/MetricCard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { Lightbulb, TrendingDown, Zap, CheckCircle } from 'lucide-react'
import { useState } from 'react'

const CATS = ['All','Rightsizing','Reserved','Cleanup','Storage','Pricing','Network']
const STATS = ['All','pending','in_progress','completed','dismissed']

export default function Recommendations() {
  const [cat, setCat] = useState('All')
  const [stat, setStat] = useState('All')
  const { data, isLoading } = useQuery({
    queryKey: ['recommendations', cat, stat],
    queryFn: () => recommendationsApi.getAll({ ...(cat !== 'All' && { category: cat }), ...(stat !== 'All' && { status: stat }) }),
  })
  const recs = data?.data || []
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold">Recommendations</h1><p className="text-sm text-muted-foreground">AI-powered cost optimization opportunities</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Monthly Savings" value={formatCurrency(data?.totalMonthlySavings||0)} icon={TrendingDown} iconColor="text-green-400" iconBg="bg-green-500/10" />
        <MetricCard title="Annual Savings" value={formatCurrency(data?.totalAnnualSavings||0)} icon={Lightbulb} iconColor="text-yellow-400" iconBg="bg-yellow-500/10" />
        <MetricCard title="Pending" value={recs.filter(r=>r.status==='pending').length} icon={Zap} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
        <MetricCard title="Completed" value={recs.filter(r=>r.status==='completed').length} icon={CheckCircle} iconColor="text-green-400" iconBg="bg-green-500/10" />
      </div>
      <div className="flex gap-3">
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-40 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={stat} onValueChange={setStat}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{STATS.map(s => <SelectItem key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {isLoading
        ? <div className="space-y-3">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-36 rounded-xl" />)}</div>
        : <div className="space-y-3">
            {recs.map(r => <RecommendationCard key={r.id} rec={r} />)}
            {!recs.length && <div className="text-center py-16 text-muted-foreground"><Lightbulb className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No recommendations for selected filters</p></div>}
          </div>
      }
    </div>
  )
}
