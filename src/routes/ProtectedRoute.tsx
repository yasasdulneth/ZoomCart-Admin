import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

type ProtectedRouteProps = {
  children?: React.ReactNode
  /** When true, only SUPER_ADMIN can access this route. */
  requireSuperAdmin?: boolean
}

export function ProtectedRoute({ children, requireSuperAdmin }: ProtectedRouteProps) {
  const { isAuthenticated, isSuperAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/access-denied" replace />
  }

  return children ? children : <Outlet />
}

