import { createContext, useContext, useState } from 'react'
const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user] = useState({ id:'user_001', name:'Alex Johnson', email:'alex@company.com', role:'FinOps Engineer', avatar:'AJ', plan:'Enterprise' })
  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>
}
export function useAuth() { return useContext(AuthContext) }
