import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { analysesApi } from '@/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { REGIONS } from '@/lib/app-params'
import { Loader2, Zap, Cloud } from 'lucide-react'
import { toast } from 'sonner'

export default function NewAnalysis() {
  const [form, setForm] = useState({ name: '', provider: '', region: '', account: '' })
  const navigate = useNavigate()
  const qc = useQueryClient()
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v, ...(k === 'provider' ? { region: '' } : {}) }))

  const { mutate, isPending } = useMutation({
    mutationFn: () => analysesApi.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['summary'] }); toast.success('Analysis started — results in ~5 seconds'); navigate('/history') },
    onError: (e) => toast.error(e.message),
  })

  const valid = form.name && form.provider && form.region

  return (
    <div className="space-y-5 max-w-2xl">
      <div><h1 className="text-xl font-bold">New Analysis</h1><p className="text-sm text-muted-foreground">Connect a cloud account and start a cost analysis</p></div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Cloud className="h-4 w-4 text-primary" />Cloud Account</CardTitle>
          <CardDescription>Enter your cloud provider details to begin scanning resources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Analysis Name *</Label>
            <Input placeholder="e.g. Q1 2025 AWS Production Review" value={form.name} onChange={e => set('name')(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Cloud Provider *</Label>
              <Select value={form.provider} onValueChange={set('provider')}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aws">☁️ AWS</SelectItem>
                  <SelectItem value="azure">🔷 Azure</SelectItem>
                  <SelectItem value="gcp">🌐 GCP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Region *</Label>
              <Select value={form.region} onValueChange={set('region')} disabled={!form.provider}>
                <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                <SelectContent>{(REGIONS[form.provider] || []).map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Account ID / Subscription</Label>
            <Input placeholder="e.g. 123456789012" value={form.account} onChange={e => set('account')(e.target.value)} />
          </div>
          <div className="p-3 bg-muted/30 rounded-lg border border-border text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Demo Mode:</span> In production this connects via read-only IAM credentials. Realistic mock data is generated instantly.
          </div>
          <Button className="w-full gap-2" disabled={!valid || isPending} onClick={() => mutate()}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Starting Analysis…</> : <><Zap className="h-4 w-4" />Start Analysis</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
