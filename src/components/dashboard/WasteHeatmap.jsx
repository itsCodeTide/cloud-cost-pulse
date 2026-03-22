import { cn, formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function intensity(waste, max) {
  const r = waste / max
  if (r < 0.1) return 0
  if (r < 0.3) return 1
  if (r < 0.55) return 2
  if (r < 0.8) return 3
  return 4
}

const LEVELS = [
  'bg-muted/30 border-border/30 text-muted-foreground',
  'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  'bg-orange-500/15 border-orange-500/25 text-orange-400',
  'bg-red-500/20 border-red-500/30 text-red-400',
  'bg-red-600/30 border-red-600/40 text-red-300',
]

export default function WasteHeatmap({ data = [] }) {
  const max = Math.max(...data.map(d => d.waste), 1)
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Waste Heatmap</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2">
          {data.map(item => (
            <div key={item.service} className={cn('p-3 rounded-lg border transition-transform hover:scale-105 cursor-default', LEVELS[intensity(item.waste, max)])}>
              <p className="text-xs font-semibold text-foreground">{item.service}</p>
              <p className="text-xs font-bold mt-1">{formatCurrency(item.waste)}</p>
              <p className="text-[10px] opacity-70 mt-0.5">waste/mo</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[10px] text-muted-foreground">Low</span>
          <div className="flex gap-1 flex-1">
            {['bg-muted/50','bg-yellow-500/25','bg-orange-500/35','bg-red-500/40','bg-red-600/55'].map((c,i) => (
              <div key={i} className={cn('h-2 flex-1 rounded-sm', c)} />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">High</span>
        </div>
      </CardContent>
    </Card>
  )
}
