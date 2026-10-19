import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// Keeps track of who is signed in and their profile (name and role),
// and makes that available to every page through useAuth().

const AuthContext = createContext(null)

export const ROLE_LABELS = {
  citizen: 'Citizen',
  authority: 'Authority',
  worker: 'Maintenance crew',
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [sessionLoading, setSessionLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState(null)

  // 1. Find out whether someone is already signed in, and listen for changes.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // 2. Whenever the signed-in user changes, load their profile.
  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) {
      setProfile(null)
      return
    }

    let cancelled = false
    setProfileLoading(true)
    setProfileError(null)

    supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setProfileError(error.message)
        else if (!data) setProfileError('This account has no profile in the database.')
        setProfile(data ?? null)
        setProfileLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [userId])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading: sessionLoading || profileLoading,
    profileError,

    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),

    // full_name is saved on the profile by a database trigger. Role is always "citizen".
    signUp: (fullName, email, password) =>
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/app`,
        },
      }),

    // Sends the sign-up confirmation email again (for example if it went to spam or expired).
    resendConfirmation: (email) =>
      supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/app` } }),

    signOut: () => supabase.auth.signOut(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
