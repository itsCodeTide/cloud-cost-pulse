import { createContext, useContext, useState } from 'react'

const AnalysisContext = createContext(null)

export function AnalysisProvider({ children }) {
  const [activeAnalysisId, setActiveAnalysisId] = useState('ana_001')
  return (
    <AnalysisContext.Provider value={{ activeAnalysisId, setActiveAnalysisId }}>
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis() {
  return useContext(AnalysisContext)
}
