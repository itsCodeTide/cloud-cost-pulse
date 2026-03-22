import { useQuery } from '@tanstack/react-query'
import { resourcesApi } from '@/api'
import ResourceTable from '@/components/resources/ResourceTable'
import MetricCard from '@/components/dashboard/MetricCard'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Server, AlertTriangle, DollarSign, Search } from 'lucide-react'
import { useState, useMemo } from 'react'

export default function Resources() {
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')
  const [wasteOnly, setWasteOnly] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['resources'], queryFn: () => resourcesApi.getAll({ analysisId: 'ana_001' }) })
  const resources = useMemo(() => {
    let r = data?.data || []
    if (search) r = r.filter(x => x.name.toLowerCase().includes(search.toLowerCase()) || x.type.toLowerCase().includes(search.toLowerCase()))
    if (cat !== 'All') r = r.filter(x => x.category === cat)
    if (wasteOnly) r = r.filter(x => x.waste)
    return r
  }, [data, search, cat, wasteOnly])
  const savings = resources.reduce((s, r) => s + r.rightsizingSaving, 0)
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold">Resources</h1><p className="text-sm text-muted-foreground">All cloud resources across your infrastructure</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Resources" value={data?.total||0} icon={Server} iconColor="text-blue-400" iconBg="bg-blue-500/10" />
        <MetricCard title="Waste Resources" value={data?.wasteCount||0} icon={AlertTriangle} iconColor="text-orange-400" iconBg="bg-orange-500/10" />
        <MetricCard title="Monthly Cost" value={formatCurrency(data?.totalMonthlyCost||0)} icon={DollarSign} iconColor="text-primary" iconBg="bg-primary/10" />
        <MetricCard title="Savings Potential" value={formatCurrency(savings)} icon={DollarSign} iconColor="text-green-400" iconBg="bg-green-500/10" />
      </div>
      <Card><CardContent className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-44">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="Search resources…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{['All','Compute','Database','Storage','Network','Serverless','Cache','Monitoring'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant={wasteOnly?'default':'outline'} size="sm" className="h-9 gap-1.5" onClick={() => setWasteOnly(!wasteOnly)}>
            <AlertTriangle className="h-3.5 w-3.5" />Waste Only
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">{resources.length} resources</span>
        </div>
      </CardContent></Card>
      <Card><CardContent className="p-0"><ResourceTable resources={resources} loading={isLoading} /></CardContent></Card>
    </div>
  )
}
