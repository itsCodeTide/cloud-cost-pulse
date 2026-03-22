import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analysesApi, recommendationsApi, aiApi } from '@/api'
import MetricCard from '@/components/dashboard/MetricCard'
import Markdown from '@/components/Markdown'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { FileText, Download, Loader2, Zap } from 'lucide-react'
import { toast } from 'sonner'

export default function ExecutiveReport() {
  const [analysisId, setAnalysisId] = useState('ana_001')
  const [reportType,  setReportType]  = useState('executive')
  const [report,      setReport]      = useState('')
  const [generating,  setGenerating]  = useState(false)
  const { data: analyses } = useQuery({ queryKey: ['analyses'],         queryFn: () => analysesApi.getAll() })
  const { data: summary }  = useQuery({ queryKey: ['summary'],          queryFn: analysesApi.getSummary })
  const { data: recsData } = useQuery({ queryKey: ['recommendations'],  queryFn: () => recommendationsApi.getAll() })

  const generate = async () => {
    setGenerating(true); setReport('')
    try { const res = await aiApi.generateReport(analysisId, reportType); setReport(res.report) }
    catch (err) { toast.error('Report failed: ' + err.message) }
    setGenerating(false)
  }

  const download = () => {
    const blob = new Blob([report], { type: 'text/markdown' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `cloud-cost-report-${new Date().toISOString().slice(0,10)}.md`; a.click()
    URL.revokeObjectURL(url); toast.success('Report downloaded')
  }

  return (
    <div className="space-y-5">
      <div><h1 className="text-xl font-bold">Executive Report</h1><p className="text-sm text-muted-foreground">AI-generated cloud cost reports for leadership and stakeholders</p></div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Monthly Spend"     value={formatCurrency(summary?.totalMonthlyCost||0)}                   icon={FileText} iconColor="text-blue-400"   iconBg="bg-blue-500/10" />
        <MetricCard title="Waste Identified"  value={formatCurrency(summary?.totalWaste||0)}                         icon={FileText} iconColor="text-orange-400" iconBg="bg-orange-500/10" valueColor="text-orange-400" />
        <MetricCard title="Savings/Month"     value={formatCurrency(recsData?.totalMonthlySavings||0)}               icon={FileText} iconColor="text-green-400"  iconBg="bg-green-500/10"  valueColor="text-green-400" />
        <MetricCard title="Resources Scanned" value={summary?.totalResources||0}                                     icon={FileText} iconColor="text-primary"     iconBg="bg-primary/10" />
      </div>
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base"><Zap className="h-4 w-4 text-primary" />AI Report Generator</CardTitle>
          <CardDescription>Select an analysis and report type, then click Generate. Works in demo mode too.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end mb-5">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Analysis</label>
              <Select value={analysisId} onValueChange={setAnalysisId}>
                <SelectTrigger className="w-72 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{(analyses?.data||[]).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-44 h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="executive">Executive Summary</SelectItem>
                  <SelectItem value="technical">Technical Detail</SelectItem>
                  <SelectItem value="board">Board Presentation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="gap-2 h-9" onClick={generate} disabled={generating}>
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" />Generating…</> : <><FileText className="h-4 w-4" />Generate Report</>}
            </Button>
            {report && <Button variant="outline" size="sm" className="gap-2 h-9" onClick={download}><Download className="h-4 w-4" />Download .md</Button>}
          </div>
          {generating && <div className="flex items-center gap-3 p-6 rounded-lg bg-muted/30 border border-border text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />Claude AI is generating your {reportType} report…</div>}
          {report && !generating && <div className="p-5 rounded-lg bg-muted/20 border border-border"><Markdown text={report} /></div>}
          {!report && !generating && <div className="text-center py-14 text-muted-foreground"><FileText className="h-10 w-10 mx-auto mb-3 opacity-25" /><p className="text-sm">Select an analysis and click Generate Report</p><p className="text-xs mt-1 opacity-70">Works without an API key — returns a structured demo report</p></div>}
        </CardContent>
      </Card>
    </div>
  )
}
