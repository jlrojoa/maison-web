import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Login real vía Supabase Auth. ANTES: comparaba bcrypt client-side contra admin_users
// sin crear una sesión real — la UI "entraba" pero cada escritura (productos, telas,
// categorías, tela_grados…) era rechazada por RLS, porque las políticas usan es_admin(),
// que depende de auth.email() de una sesión de Supabase Auth real, no de sessionStorage.
// AHORA: admin_users es la lista de correos autorizados; la contraseña la valida
// Supabase Auth, y esa sesión sí satisface es_admin(). Requiere que exista un usuario de
// Supabase Auth (Dashboard → Authentication → Users) con el mismo correo que la fila en
// admin_users — si no existe, créalo ahí con una contraseña antes de iniciar sesión aquí.
const Ctx = createContext(null)

export function AdminAuthProvider({ children }) {
  const [email, setEmail] = useState(null)
  const [loading, setLoading] = useState(true)

  const checkAdmin = async (candidateEmail) => {
    if (!candidateEmail) { setEmail(null); return }
    const { data } = await supabase.from('admin_users').select('email').eq('email', candidateEmail).maybeSingle()
    setEmail(data ? candidateEmail : null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      checkAdmin(session?.user?.email).finally(() => setLoading(false))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAdmin(session?.user?.email)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (inputEmail, password) => {
    const { error: authError } = await supabase.auth.signInWithPassword({ email: inputEmail, password })
    if (authError) return { error: 'Correo o contraseña incorrectos.' }

    const { data } = await supabase.from('admin_users').select('email').eq('email', inputEmail).maybeSingle()
    if (!data) {
      await supabase.auth.signOut()
      return { error: 'Esta cuenta no tiene acceso al admin.' }
    }
    setEmail(inputEmail)
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setEmail(null)
  }

  return (
    <Ctx.Provider value={{ email, loading, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAdminAuth = () => useContext(Ctx)
