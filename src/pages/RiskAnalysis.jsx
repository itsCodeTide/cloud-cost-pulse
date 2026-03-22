import { useQuery } from '@tanstack/react-query'
import { riskApi } from '@/api'
import RiskCard from '@/components/risk/RiskCard'
import MetricCard from '@/components/dashboard/MetricCard'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { ShieldAlert, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useState } from 'react'

export default function RiskAnalysis() {
  const [sev, setSev] = useState('All')
  const { data, isLoading } = useQuery({
    queryKey: ['risk', sev],
    queryFn: () => riskApi.getAll(sev !== 'All' ? { severity: sev.toLowerCase() } : {}),
  })
  const risks = data?.data || []
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold">Risk Analysis</h1><p className="text-sm text-muted-foreground">Security, availability, and compliance risks</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Risks" value={data?.total||0} icon={ShieldAlert} iconColor="text-muted-foreground" iconBg="bg-muted/50" />
        <MetricCard title="Critical" value={data?.critical||0} icon={AlertCircle} iconColor="text-red-400" iconBg="bg-red-500/10" valueColor="text-red-400" />
        <MetricCard title="High" value={data?.high||0} icon={AlertTriangle} iconColor="text-orange-400" iconBg="bg-orange-500/10" valueColor="text-orange-400" />
        <MetricCard title="Medium" value={data?.medium||0} icon={Info} iconColor="text-yellow-400" iconBg="bg-yellow-500/10" valueColor="text-yellow-400" />
      </div>
      <div className="flex gap-3">
        <Select value={sev} onValueChange={setSev}>
          <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{['All','Critical','High','Medium','Low'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {isLoading
        ? <div className="space-y-3">{[...Array(4)].map((_,i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
        : <div className="space-y-3">
            {risks.map(r => <RiskCard key={r.id} risk={r} />)}
            {!risks.length && <div className="text-center py-16 text-muted-foreground"><ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>No risks found</p></div>}
          </div>
      }
    </div>
  )
}
