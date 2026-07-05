import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const Ctx = createContext(null)

export function DistribuidorProvider({ children }) {
  const [session, setSession] = useState(null)
  const [distribuidor, setDistribuidor] = useState(null)
  const [loading, setLoading] = useState(true)

  async function checkDistribuidor(email) {
    if (!email) { setDistribuidor(null); return }
    const { data } = await supabase
      .from('distribuidores')
      .select('*')
      .eq('email', email)
      .eq('activo', true)
      .single()
    setDistribuidor(data ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      checkDistribuidor(session?.user?.email).finally(() => setLoading(false))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      checkDistribuidor(session?.user?.email)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUp = async (email, password) => {
    const { data: dist } = await supabase
      .from('distribuidores')
      .select('id')
      .eq('email', email)
      .eq('activo', true)
      .single()
    if (!dist) return { error: { message: 'Cuenta no autorizada. Contacta a Maison.' } }
    return supabase.auth.signUp({ email, password })
  }

  const signOut = async () => {
    setDistribuidor(null)
    await supabase.auth.signOut()
  }

  return (
    <Ctx.Provider value={{ session, distribuidor, loading, signIn, signUp, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useDistribuidor = () => useContext(Ctx)
