import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { analysesApi } from '@/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency, formatRelativeTime, getProviderClasses } from '@/lib/utils'
import { History, Trash2, RefreshCw, Clock, CheckCircle, Loader2, Server } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_CONF = {
  completed: { cls:'bg-green-500/10 text-green-400 border-green-500/20', icon:CheckCircle },
  running:   { cls:'bg-blue-500/10 text-blue-400 border-blue-500/20',    icon:Loader2 },
  failed:    { cls:'bg-red-500/10 text-red-400 border-red-500/20',       icon:Clock },
}

export default function AnalysisHistory() {
  const qc = useQueryClient()
  const { data, isLoading, refetch } = useQuery({ queryKey: ['analyses'], queryFn: () => analysesApi.getAll(), refetchInterval: 5000 })
  const { mutate: del } = useMutation({
    mutationFn: (id) => analysesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['analyses','summary'] }); toast.success('Analysis deleted') },
    onError: () => toast.error('Delete failed'),
  })
  const analyses = data?.data || []
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-bold">Analysis History</h1><p className="text-sm text-muted-foreground">All past and ongoing cloud cost analyses</p></div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5" />Refresh</Button>
      </div>
      {isLoading
        ? <div className="space-y-3">{[...Array(3)].map((_,i) => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
        : <div className="space-y-3">
            {analyses.map(a => {
              const conf = STATUS_CONF[a.status] || STATUS_CONF.running
              const Icon = conf.icon
              return (
                <Card key={a.id} className="transition-all hover:border-border/60">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Server className="h-4.5 w-4.5 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-foreground">{a.name}</span>
                          <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', conf.cls)}><Icon className={cn('h-2.5 w-2.5', a.status==='running'&&'animate-spin')} />{a.status}</span>
                          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase', getProviderClasses(a.provider))}>{a.provider}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                          <span className="font-mono">{a.account}</span><span>{a.region}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelativeTime(a.createdAt)}</span>
                        </div>
                        {a.status === 'completed' && (
                          <div className="flex flex-wrap gap-5">
                            <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Monthly Cost</p><p className="text-sm font-bold">{formatCurrency(a.totalMonthlyCost)}</p></div>
                            <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Waste</p><p className="text-sm font-bold text-orange-400">{formatCurrency(a.wasteAmount)} ({a.wastePercentage}%)</p></div>
                            <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Savings</p><p className="text-sm font-bold text-green-400">+{formatCurrency(a.savingsOpportunity)}/mo</p></div>
                            <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Resources</p><p className="text-sm font-bold">{a.resources}</p></div>
                          </div>
                        )}
                        {a.status === 'running' && <p className="text-xs text-blue-400 flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Scanning resources… auto-refresh every 5s</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive" onClick={() => del(a.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {!analyses.length && (
              <div className="text-center py-16 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No analyses yet. <a href="/new-analysis" className="text-primary hover:underline">Start your first analysis →</a></p>
              </div>
            )}
          </div>
      }
    </div>
  )
}
