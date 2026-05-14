import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { AdminUser } from '../lib/services/auth.service'
import {
  loginAdmin,
  logoutAdmin,
  subscribeToAuthState,
} from '../lib/services/auth.service'

export type AuthContextValue = {
  /** Authenticated admin (Firestore `admins` doc) or `null`. */
  currentAdmin: AdminUser | null
  /** `true` while resolving initial auth state. */
  loading: boolean
  /** Convenience flag for `currentAdmin !== null`. */
  isAuthenticated: boolean
  /** Convenience flag derived from `currentAdmin.role`. */
  isSuperAdmin: boolean
  /** Convenience flag derived from `currentAdmin.role`. */
  isStaff: boolean
  login: (email: string, password: string) => Promise<AdminUser>
  logout: () => Promise<void>
  /** Update the in-memory admin after a profile edit. */
  refreshAdmin: (updated: AdminUser) => void

  /**
   * Back-compat fields used by existing components.
   * Prefer `currentAdmin` and `loading` for new code.
   */
  user: AdminUser | null
  isReady: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const DEBUG = import.meta.env.DEV

  useEffect(() => {
    let unsub: null | (() => void) = null

    const run = () => {
      if (unsub) unsub()
      setLoading(true)
      if (DEBUG) console.debug('[ZoomCart AuthContext] resolving auth state')
      unsub = subscribeToAuthState((next) => {
        if (DEBUG) console.debug('[ZoomCart AuthContext] auth state resolved', { hasAdmin: Boolean(next) })
        setCurrentAdmin(next)
        setLoading(false)
      })
    }

    run()

    const onAuthChanged = () => run()
    window.addEventListener('zoomcart:auth-changed', onAuthChanged)

    return () => {
      window.removeEventListener('zoomcart:auth-changed', onAuthChanged)
      if (unsub) unsub()
    }
  }, [DEBUG])

  const login = useCallback(async (email: string, password: string) => {
    const admin = await loginAdmin(email, password)
    setCurrentAdmin(admin)
    return admin
  }, [])

  const logout = useCallback(async () => {
    await logoutAdmin()
    setCurrentAdmin(null)
  }, [])

  const refreshAdmin = useCallback((updated: AdminUser) => {
    setCurrentAdmin(updated)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      currentAdmin,
      loading,
      isAuthenticated: currentAdmin !== null,
      isSuperAdmin: currentAdmin?.role === 'SUPER_ADMIN',
      isStaff: currentAdmin?.role === 'STAFF',
      login,
      logout,
      refreshAdmin,
      user: currentAdmin,
      isReady: !loading,
    }),
    [currentAdmin, loading, login, logout, refreshAdmin],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook colocated with provider for this app shell.
// eslint-disable-next-line react-refresh/only-export-components -- useAuth must live next to AuthProvider
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
