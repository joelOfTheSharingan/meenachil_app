// AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.ts'

const AuthContext = createContext<any>(null)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => subscription?.subscription.unsubscribe()
  }, [])

  // 👇 Add debug log here
  console.log("Auth state:", { user, loading, error })

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
