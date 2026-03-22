import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/query-client'
import { AuthProvider } from '@/lib/AuthContext'
import { AnalysisProvider } from '@/components/AnalysisContext'
import Layout from '@/components/Layout'
import PageNotFound from '@/lib/PageNotFound'
import Dashboard       from '@/pages/Dashboard'
import NewAnalysis     from '@/pages/NewAnalysis'
import Recommendations from '@/pages/Recommendations'
import Resources       from '@/pages/Resources'
import RiskAnalysis    from '@/pages/RiskAnalysis'
import Savings         from '@/pages/Savings'
import AIAssistant     from '@/pages/AIAssistant'
import ExecutiveReport from '@/pages/ExecutiveReport'
import Terraform       from '@/pages/Terraform'
import AnalysisHistory from '@/pages/AnalysisHistory'
import Settings        from '@/pages/Settings'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AnalysisProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index                   element={<Dashboard />} />
                <Route path="new-analysis"     element={<NewAnalysis />} />
                <Route path="recommendations"  element={<Recommendations />} />
                <Route path="resources"        element={<Resources />} />
                <Route path="risk"             element={<RiskAnalysis />} />
                <Route path="savings"          element={<Savings />} />
                <Route path="ai-assistant"     element={<AIAssistant />} />
                <Route path="executive-report" element={<ExecutiveReport />} />
                <Route path="terraform"        element={<Terraform />} />
                <Route path="history"          element={<AnalysisHistory />} />
                <Route path="settings"         element={<Settings />} />
                <Route path="*"                element={<PageNotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AnalysisProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
