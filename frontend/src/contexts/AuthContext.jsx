import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSupabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setUser(s?.user ?? null)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setUser(s?.user ?? null)
    })
    return () => subscription?.unsubscribe()
  }, [])

  const login = useCallback(async (email, password) => {
    const supabase = getSupabase()
    if (!supabase) return 'Supabase não configurado.'
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) return error.message || 'E-mail ou senha incorretos.'
    setUser(data.user)
    setSession(data.session)
    return null
  }, [])

  const logout = useCallback(() => {
    const supabase = getSupabase()
    if (supabase) supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }, [])

  const resetPassword = useCallback(async (email) => {
    const supabase = getSupabase()
    if (!supabase) return 'Supabase não configurado.'
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.href })
    if (error) return error.message || 'Erro ao enviar e-mail.'
    return null
  }, [])

  const value = { user, session, loading, login, logout, resetPassword }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
