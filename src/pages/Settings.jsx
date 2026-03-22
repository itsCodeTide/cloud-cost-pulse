import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Settings, Bell, Shield, Database, Zap, Check } from 'lucide-react'
import { toast } from 'sonner'

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)
  const [notifs, setNotifs] = useState({ anomaly:true, weekly:true, budget:true, recs:false })
  const [thresh, setThresh] = useState({ anomaly:'15', budget:'80', waste:'25' })
  const save = () => { setSaved(true); toast.success('Settings saved'); setTimeout(()=>setSaved(false),2000) }
  return (
    <div className="space-y-5 max-w-2xl">
      <div><h1 className="text-xl font-bold">Settings</h1><p className="text-sm text-muted-foreground">Manage account preferences and alert thresholds</p></div>
      <Card>
        <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-sm"><Shield className="h-4 w-4 text-primary"/>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Name</Label><Input defaultValue="Alex Johnson"/></div>
            <div className="space-y-1.5"><Label>Email</Label><Input defaultValue="alex@company.com"/></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Role</Label><Input defaultValue="FinOps Engineer"/></div>
            <div className="space-y-1.5"><Label>Plan</Label><Input defaultValue="Enterprise" disabled className="opacity-50"/></div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-sm"><Bell className="h-4 w-4 text-primary"/>Notifications</CardTitle><CardDescription className="text-xs">Control which alerts and reports you receive</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {[
            {key:'anomaly',label:'Cost Anomaly Alerts',      desc:'Notified when unusual cost spikes detected'},
            {key:'weekly', label:'Weekly Summary Report',    desc:'Weekly digest of your cloud costs every Monday'},
            {key:'budget', label:'Budget Threshold Alerts',  desc:'Alerts when spending approaches budget limits'},
            {key:'recs',   label:'New Recommendations',      desc:'Notified when new optimization opportunities found'},
          ].map(({key,label,desc}) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="min-w-0"><p className="text-sm font-medium text-foreground">{label}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
              <Switch checked={notifs[key]} onCheckedChange={v=>setNotifs(n=>({...n,[key]:v}))} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-sm"><Zap className="h-4 w-4 text-primary"/>Alert Thresholds</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {[{key:'anomaly',label:'Anomaly Threshold (%)',hint:'Alert when cost spikes by this %'},{key:'budget',label:'Budget Alert At (%)',hint:'Alert when this % of budget used'},{key:'waste',label:'Waste Alert (%)',hint:'Alert when waste exceeds this %'}].map(({key,label,hint}) => (
              <div key={key} className="space-y-1.5"><Label>{label}</Label><Input type="number" min="1" max="100" value={thresh[key]} onChange={e=>setThresh(t=>({...t,[key]:e.target.value}))} /><p className="text-[10px] text-muted-foreground">{hint}</p></div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-sm"><Database className="h-4 w-4 text-primary"/>Data & Integrations</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Default Currency</Label><Select defaultValue="usd"><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="usd">USD ($)</SelectItem><SelectItem value="eur">EUR (€)</SelectItem><SelectItem value="gbp">GBP (£)</SelectItem><SelectItem value="inr">INR (₹)</SelectItem></SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Data Refresh</Label><Select defaultValue="2h"><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="1h">Every hour</SelectItem><SelectItem value="2h">Every 2 hours</SelectItem><SelectItem value="6h">Every 6 hours</SelectItem><SelectItem value="24h">Daily</SelectItem></SelectContent></Select></div>
          </div>
          <Separator />
          <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Anthropic API Key</p><p className="text-xs text-muted-foreground">Required for AI Assistant, Report Generator, and Terraform analysis.</p></div><Button variant="outline" size="sm">Configure Key</Button></div>
          <div className="flex items-center justify-between"><div><p className="text-sm font-medium">Cloud Credentials</p><p className="text-xs text-muted-foreground">Currently using demo data. Connect real credentials for live analysis.</p></div><Button variant="outline" size="sm">Connect Cloud</Button></div>
        </CardContent>
      </Card>
      <Button className="gap-2" onClick={save}>{saved?<><Check className="h-4 w-4"/>Saved!</>:<><Settings className="h-4 w-4"/>Save Settings</>}</Button>
    </div>
  )
}
