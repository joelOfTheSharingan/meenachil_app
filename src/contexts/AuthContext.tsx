import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.ts'
import type { User } from '@supabase/supabase-js'

type Role = 'admin' | 'supervisor'

type AuthContextType = {
  user: any
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string, role?: Role) => Promise<{ error: any }>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // ✅ Ensure user row exists
  const ensureUserRow = async (authId: string, email: string, role: Role = 'supervisor') => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .maybeSingle()

    if (!data && !error) {
      const { error: insertError } = await supabase.from('users').insert([
        {
          auth_id: authId,
          email,
          name: email.split('@')[0],
          role,
        }
      ])
      if (insertError) console.error('Error inserting user row:', insertError)
    }
  }

  // ✅ Fetch and set user from DB
  const fetchUser = async (authId: string, email: string) => {
    await ensureUserRow(authId, email)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authId)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
    } else {
      setUser(data)
    }
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      setLoading(true)

      // ✅ Always check session on mount
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user && mounted) {
        await fetchUser(session.user.id, session.user.email!)
      }

      setLoading(false)
    }

    init()

    // ✅ Subscribe to future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await fetchUser(session.user.id, session.user.email!)
        } else {
          setUser(null)
        }
        if (mounted) setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // ✅ Auth actions
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error && data.user) {
      await ensureUserRow(data.user.id, email)
    }
    return { error }
  }

  const signUp = async (email: string, password: string, role: Role = 'supervisor') => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error && data.user) {
      await ensureUserRow(data.user.id, email, role)
    }
    return { error }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/home` },
    })
    if (error) console.error('Google Sign-In Error:', error)
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) console.error('Sign-Out Error:', error)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
