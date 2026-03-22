import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

const CAT_COLORS = {
  Rightsizing: '#3B82F6', Reserved: '#8B5CF6', Cleanup: '#10B981',
  Storage: '#F59E0B', Pricing: '#F97316', Network: '#06B6D4',
}

export default function SavingsBreakdown({ recommendations = [] }) {
  const categories = recommendations.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = { total: 0, count: 0 }
    acc[r.category].total += r.monthlySavings || 0
    acc[r.category].count++
    return acc
  }, {})

  const sorted = Object.entries(categories)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)

  const maxVal = sorted[0]?.total || 1

  return (
    <Card>
      <CardHeader className='pb-2'><CardTitle className='text-sm font-medium text-muted-foreground'>Savings by Category</CardTitle></CardHeader>
      <CardContent className='space-y-4'>
        {sorted.map(cat => (
          <div key={cat.name} className='space-y-1.5'>
            <div className='flex justify-between text-sm'>
              <span className='font-medium flex items-center gap-2'>
                <span className='w-2 h-2 rounded-full inline-block' style={{ background: CAT_COLORS[cat.name] || '#6366f1' }} />
                {cat.name}
              </span>
              <span className='text-green-400 font-semibold'>{formatCurrency(cat.total)}/mo</span>
            </div>
            <div className='h-2 bg-secondary rounded-full overflow-hidden'>
              <div className='h-full rounded-full transition-all duration-700' style={{ width: `${(cat.total / maxVal) * 100}%`, background: CAT_COLORS[cat.name] || '#6366f1' }} />
            </div>
            <p className='text-xs text-muted-foreground'>{cat.count} recommendation{cat.count !== 1 ? 's' : ''}</p>
          </div>
        ))}
        {!sorted.length && <p className='text-sm text-muted-foreground text-center py-4'>No recommendations available</p>}
      </CardContent>
    </Card>
  )
}
