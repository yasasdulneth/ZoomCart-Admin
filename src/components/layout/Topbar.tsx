import { Bell, LogOut, Menu } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { subscribeToNotifications, type NotificationViewer } from '../../lib/services/notification.service'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/inventory': 'Inventory',
  '/payments': 'Payments',
  '/employees': 'Employees',
  '/notifications': 'Notifications',
  '/profile': 'Profile',
}

type TopbarProps = {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? 'ZoomCart Admin'
  const navigate = useNavigate()
  const { logout, currentAdmin } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [unreadBell, setUnreadBell] = useState(0)

  const bellViewer: NotificationViewer | undefined = useMemo(() => {
    if (!currentAdmin) return undefined
    return { role: currentAdmin.role, uid: currentAdmin.uid }
  }, [currentAdmin])

  useEffect(() => {
    if (!bellViewer) {
      setUnreadBell(0)
      return
    }
    const unsub = subscribeToNotifications(
      (list) => setUnreadBell(list.filter((n) => !n.isRead).length),
      () => setUnreadBell(0),
      bellViewer,
    )
    return unsub
  }, [bellViewer])

  async function handleLogout() {
    setSigningOut(true)
    try {
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur-md md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>
        <h2 className="truncate text-base font-semibold text-zinc-100 md:text-lg">{title}</h2>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Link
          to="/notifications"
          className="relative inline-flex size-10 items-center justify-center rounded-lg border border-transparent text-zinc-400 transition-colors hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100"
          aria-label={unreadBell > 0 ? `Notifications, ${unreadBell} unread` : 'Notifications'}
        >
          <Bell className="size-5" />
          {unreadBell > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-semibold text-white">
              {unreadBell > 99 ? '99+' : unreadBell}
            </span>
          ) : null}
        </Link>
        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={signingOut}
          className="inline-flex size-10 items-center justify-center rounded-lg border border-transparent text-zinc-400 transition-colors hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Logout"
          title="Logout"
        >
          <LogOut className="size-5" />
        </button>
      </div>
    </header>
  )
}
