import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { terraformApi, aiApi } from '@/api'
import MetricCard from '@/components/dashboard/MetricCard'
import Markdown from '@/components/Markdown'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import { Code2, DollarSign, Server, Lightbulb, Loader2, Zap } from 'lucide-react'
import { toast } from 'sonner'

const SAMPLE = `resource "aws_instance" "web_servers" {
  count         = 8
  ami           = "ami-0c02fb55956c7d316"
  instance_type = "t3.xlarge"
  tags = { Environment = "production", Team = "platform" }
}

resource "aws_db_instance" "primary" {
  identifier        = "prod-db-primary"
  engine            = "postgres"
  instance_class    = "db.r5.large"
  allocated_storage = 500
  multi_az          = false
}

resource "aws_s3_bucket" "logs" {
  count  = 6
  bucket = "app-logs-\${count.index}"
}

resource "aws_nat_gateway" "main" {
  count         = 3
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
}

resource "aws_cloudwatch_log_group" "api" {
  count = 12
  name  = "/aws/api/service-\${count.index}"
}`

export default function Terraform() {
  const [code, setCode]       = useState(SAMPLE)
  const [aiResult, setAiResult] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const { data: tfData } = useQuery({ queryKey: ['terraform'], queryFn: terraformApi.getAnalysis })
  const { mutate: estimate, data: estData, isPending: estimating } = useMutation({
    mutationFn: () => terraformApi.estimate(code),
    onError: () => toast.error('Estimation failed'),
  })
  const runAI = async () => {
    setAnalyzing(true); setAiResult('')
    try { const res = await aiApi.analyzeTerraform(code); setAiResult(res.analysis) }
    catch (err) { toast.error('AI analysis failed: ' + err.message) }
    setAnalyzing(false)
  }
  const monthly = estData?.estimatedMonthlyCost ?? tfData?.estimatedMonthlyCost ?? 0
  const yearly  = estData?.estimatedYearlyCost  ?? tfData?.estimatedYearlyCost  ?? 0
  const count   = estData?.resourceCount        ?? tfData?.resourceCount        ?? 0
  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold">Terraform Analysis</h1><p className="text-sm text-muted-foreground">Paste your Terraform code for cost estimation and AI optimization</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Resources"    value={count}                 icon={Server}    iconColor="text-blue-400"   iconBg="bg-blue-500/10" />
        <MetricCard title="Monthly Cost" value={formatCurrency(monthly)} icon={DollarSign} iconColor="text-primary"   iconBg="bg-primary/10" />
        <MetricCard title="Annual Cost"  value={formatCurrency(yearly)}  icon={DollarSign} iconColor="text-orange-400" iconBg="bg-orange-500/10" />
        <MetricCard title="Suggestions"  value={tfData?.suggestions?.length??0} icon={Lightbulb} iconColor="text-yellow-400" iconBg="bg-yellow-500/10" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div><CardTitle className="flex items-center gap-2 text-sm"><Code2 className="h-4 w-4 text-primary" />Terraform HCL</CardTitle><CardDescription className="text-xs mt-0.5">Paste your .tf files — sample loaded</CardDescription></div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => estimate()} disabled={estimating}>{estimating?<Loader2 className="h-3 w-3 animate-spin"/>:<DollarSign className="h-3 w-3"/>}Estimate</Button>
                <Button size="sm" className="h-8 text-xs gap-1.5" onClick={runAI} disabled={analyzing}>{analyzing?<Loader2 className="h-3 w-3 animate-spin"/>:<Zap className="h-3 w-3"/>}AI Analyze</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent><Textarea value={code} onChange={e=>setCode(e.target.value)} className="font-mono text-xs h-[380px] resize-none bg-muted/20 leading-relaxed" spellCheck={false} /></CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Cost Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(tfData?.costBreakdown||[]).map((item,i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50">
                  <div className="min-w-0 flex-1"><p className="text-xs font-mono text-foreground truncate">{item.resource}</p><p className="text-[10px] text-muted-foreground">{item.count}× {item.type}</p></div>
                  <span className="text-sm font-bold text-primary flex-shrink-0 ml-3">{formatCurrency(item.monthlyCost)}/mo</span>
                </div>
              ))}
            </CardContent>
          </Card>
          {!aiResult && !analyzing && tfData?.suggestions?.length > 0 && (
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Quick Suggestions</CardTitle></CardHeader>
              <CardContent className="space-y-2">{tfData.suggestions.map((s,i)=><div key={i} className="flex gap-2 p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/10"><Lightbulb className="h-3.5 w-3.5 text-yellow-400 mt-0.5 flex-shrink-0"/><p className="text-xs text-muted-foreground leading-relaxed">{s}</p></div>)}</CardContent>
            </Card>
          )}
          {analyzing && <Card><CardContent className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary mb-2"/><p className="text-sm text-muted-foreground">Analyzing with Claude AI…</p></CardContent></Card>}
          {aiResult && !analyzing && <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Zap className="h-4 w-4 text-primary"/>AI Analysis</CardTitle></CardHeader><CardContent><Markdown text={aiResult} /></CardContent></Card>}
        </div>
      </div>
    </div>
  )
}
