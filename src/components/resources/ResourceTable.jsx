import { cn, formatCurrency } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, CheckCircle } from 'lucide-react'

export default function ResourceTable({ resources = [], loading }) {
  if (loading) return (
    <div className="p-4 space-y-2">
      {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  )
  if (!resources.length) return (
    <div className="p-12 text-center text-muted-foreground text-sm">No resources match the current filters.</div>
  )
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {['Resource', 'Type', 'Region', 'Category', 'Cost/mo', 'Utilization', 'Status', 'Saving'].map(h => (
            <TableHead key={h} className="text-[10px] uppercase tracking-wider font-medium">{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {resources.map(r => (
          <TableRow key={r.id} className={cn(r.waste && 'bg-red-500/3')}>
            <TableCell><span className="font-mono text-xs text-foreground font-medium">{r.name}</span></TableCell>
            <TableCell><span className="text-xs text-muted-foreground">{r.type}</span></TableCell>
            <TableCell><span className="font-mono text-xs text-muted-foreground">{r.region}</span></TableCell>
            <TableCell><span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground bg-muted/30">{r.category}</span></TableCell>
            <TableCell className="font-semibold text-sm">{formatCurrency(r.monthlyCost)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="w-14 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full', r.utilizationScore > 60 ? 'bg-green-500' : r.utilizationScore > 30 ? 'bg-yellow-500' : 'bg-red-500')}
                    style={{ width: `${r.utilizationScore}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-7">{r.utilizationScore}%</span>
              </div>
            </TableCell>
            <TableCell>
              {r.waste ? (
                <div className="flex items-start gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-orange-400 leading-tight max-w-[180px]">{r.wasteReason}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-xs text-green-400">Optimized</span>
                </div>
              )}
            </TableCell>
            <TableCell>
              {r.rightsizingSaving > 0
                ? <span className="text-sm font-semibold text-green-400">+{formatCurrency(r.rightsizingSaving)}</span>
                : <span className="text-xs text-muted-foreground">—</span>
              }
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
