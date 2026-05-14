import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

/** Gates admin routes using Firebase Auth or mock session via `AuthContext`. */
export function ProtectedRoute() {
  const { isAuthenticated, isReady } = useAuth()
  const location = useLocation()

  if (!isReady) {
    return (
      <div className="flex min-h-full items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
