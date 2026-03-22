import { useState } from 'react'
import { cn, formatCurrency, getProviderClasses, getEffortClasses } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, Zap, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { recommendationsApi } from '@/api'
import { toast } from 'sonner'

const STATUS_CONF = {
  pending:     { label: 'Pending',     cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Clock },
  in_progress: { label: 'In Progress', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',       icon: Clock },
  completed:   { label: 'Completed',   cls: 'bg-green-500/10 text-green-400 border-green-500/20',    icon: CheckCircle },
  dismissed:   { label: 'Dismissed',   cls: 'bg-muted text-muted-foreground border-border',           icon: XCircle },
}

const CAT_EMOJI = { Rightsizing:'⚖️', Reserved:'📅', Cleanup:'🗑️', Storage:'💾', Pricing:'💰', Network:'🌐' }

export default function RecommendationCard({ rec }) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const conf = STATUS_CONF[rec.status] || STATUS_CONF.pending
  const Icon = conf.icon

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: (status) => recommendationsApi.updateStatus(rec.id, status),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ['recommendations'] })
      toast.success(`Status updated to ${status}`)
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <Card className="transition-all hover:border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-base">
            {CAT_EMOJI[rec.category] || '✦'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-snug mb-2">{rec.title}</p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase', getProviderClasses(rec.provider))}>{rec.provider}</span>
              <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium', getEffortClasses(rec.effort))}>{rec.effort} effort</span>
              <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{rec.impact} impact</span>
              <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', conf.cls)}>
                <Icon className="h-2.5 w-2.5" />{conf.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{rec.description}</p>
            {open && (
              <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                <p className="text-xs font-medium text-foreground mb-1.5">Implementation:</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{rec.implementation}</p>
                {rec.affectedResources && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Affects <span className="font-semibold text-foreground">{rec.affectedResources}</span> resources
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {rec.status === 'pending' && (
                <>
                  <Button size="sm" className="h-7 text-xs gap-1.5" disabled={isPending} onClick={() => updateStatus('in_progress')}>
                    <Zap className="h-3 w-3" />Apply
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={isPending} onClick={() => updateStatus('dismissed')}>
                    Dismiss
                  </Button>
                </>
              )}
              {rec.status === 'in_progress' && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5 text-green-400 border-green-500/30" disabled={isPending} onClick={() => updateStatus('completed')}>
                  <CheckCircle className="h-3 w-3" />Mark Complete
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs ml-auto gap-1" onClick={() => setOpen(!open)}>
                {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {open ? 'Less' : 'Details'}
              </Button>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-green-400 flex items-center gap-1 justify-end">
              <TrendingUp className="h-4 w-4" />{formatCurrency(rec.monthlySavings)}
            </p>
            <p className="text-[10px] text-muted-foreground">per month</p>
            <p className="text-xs text-green-400/60 font-medium mt-0.5">{formatCurrency(rec.annualSavings)}/yr</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
