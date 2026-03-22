import { useState } from 'react'
import { cn, formatCurrency, getSeverityClasses, getSeverityBorder } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shield, AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'

const ICONS = { critical: AlertCircle, high: AlertTriangle, medium: AlertTriangle, low: Info }

export default function RiskCard({ risk }) {
  const [open, setOpen] = useState(false)
  const Icon = ICONS[risk.severity] || Info
  return (
    <Card className={cn('border-l-2 transition-all hover:border-l-2', getSeverityBorder(risk.severity))}>
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', getSeverityClasses(risk.severity))}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
              <p className="text-sm font-semibold text-foreground">{risk.title}</p>
              <div className="flex gap-1.5">
                <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase', getSeverityClasses(risk.severity))}>{risk.severity}</span>
                <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{risk.category}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{risk.description}</p>
            {open && (
              <div className="space-y-3 mt-3">
                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                  <p className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1.5">
                    <Shield className="h-3 w-3 text-primary" />Recommendation:
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{risk.recommendation}</p>
                </div>
                {risk.affectedResources?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-foreground mb-1.5">Affected Resources:</p>
                    <div className="flex flex-wrap gap-1">
                      {risk.affectedResources.map(r => (
                        <span key={r} className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">{r}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between mt-3">
              <Button size="sm" variant="ghost" className="h-7 text-xs p-0 gap-1 text-muted-foreground hover:text-foreground" onClick={() => setOpen(!open)}>
                {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {open ? 'Collapse' : 'View recommendation'}
              </Button>
              {risk.estimatedRiskCost > 0 && (
                <p className="text-xs text-muted-foreground">
                  Est. exposure: <span className="text-red-400 font-medium">{formatCurrency(risk.estimatedRiskCost)}</span>
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
