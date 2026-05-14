import {
  Bell,
  CreditCard,
  LayoutDashboard,
  Package,
  UserCircle,
  Users,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'

export type NavItem = {
  label: string
  to: string
  icon: LucideIcon
}

const mainNav: NavItem[] = [
  { label: 'Dashboard',     to: '/',             icon: LayoutDashboard },
  { label: 'Products',      to: '/products',     icon: Package },
  { label: 'Inventory',     to: '/inventory',    icon: Warehouse },
  { label: 'Payments',      to: '/payments',     icon: CreditCard },
  { label: 'Employees',     to: '/employees',    icon: Users },
  { label: 'Notifications', to: '/notifications', icon: Bell },
]

type SidebarProps = { open: boolean; onNavigate: () => void }

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.15 } },
}

const itemVariants = {
  hidden: { opacity: 0, x: -16 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
} satisfies Variants

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const { isSuperAdmin } = useAuth()
  const location = useLocation()

  const visibleNav = isSuperAdmin
    ? mainNav
    : mainNav.filter((item) => item.to !== '/payments' && item.to !== '/employees')

  function isActive(to: string) {
    return to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
  }

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-300 ease-out lg:translate-x-0',
        'border-r border-white/[0.07] bg-zinc-950/70 backdrop-blur-2xl',
        open ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
      style={{ boxShadow: '4px 0 32px rgba(0,0,0,0.4), inset -1px 0 0 rgba(255,255,255,0.04)' }}
      aria-label="Main navigation"
    >
      {/* right-edge shine */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      {/* ambient blob */}
      <div className="orb-float pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl" />

      {/* ── Logo ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative flex h-16 shrink-0 items-center gap-2.5 px-5"
      >
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <motion.img
          src="/logo.png"
          alt="ZoomCart"
          whileHover={{ scale: 1.12, rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.45 }}
          className="shrink-0"
          style={{ width: 36, height: 36, clipPath: 'inset(8% round 22%)', display: 'block' }}
        />

        <div className="flex items-baseline gap-1.5">
          <span className="bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-sm font-bold tracking-tight text-transparent">
            ZoomCart
          </span>
          <motion.span
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 400 }}
            className="rounded-md border border-indigo-500/30 bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300"
          >
            Admin
          </motion.span>
        </div>
      </motion.div>

      {/* ── Nav ────────────────────────────────────────────────────────── */}
      <motion.nav
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3"
      >
        {visibleNav.map(({ label, to, icon: Icon }) => {
          const active = isActive(to)
          return (
            <motion.div key={to} variants={itemVariants}>
              <NavLink
                to={to}
                end={to === '/'}
                onClick={onNavigate}
                className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none"
              >
                {/* sliding active background — shared layoutId */}
                <AnimatePresence>
                  {active && (
                    <motion.div
                      layoutId="nav-active-bg"
                      className="absolute inset-0 rounded-xl border border-white/[0.10] bg-white/[0.08]"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </AnimatePresence>

                {/* left accent bar */}
                <AnimatePresence>
                  {active && (
                    <motion.span
                      layoutId="nav-bar"
                      className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      exit={{ scaleY: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                </AnimatePresence>

                {/* icon */}
                <motion.span
                  whileHover={{ scale: 1.15, rotate: active ? 0 : -6 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className={[
                    'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                    active
                      ? 'bg-gradient-to-br from-indigo-500/30 to-violet-600/15 border border-white/10 text-indigo-300'
                      : 'text-white/35 group-hover:text-white/65',
                  ].join(' ')}
                >
                  <Icon className="h-[15px] w-[15px]" aria-hidden />
                </motion.span>

                {/* label */}
                <motion.span
                  className={[
                    'relative transition-colors duration-200',
                    active ? 'text-white' : 'text-white/40 group-hover:text-white/75',
                  ].join(' ')}
                >
                  {label}
                </motion.span>
              </NavLink>
            </motion.div>
          )
        })}
      </motion.nav>

      {/* ── Profile ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="relative p-3"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {(() => {
          const active = isActive('/profile')
          return (
            <NavLink
              to="/profile"
              onClick={onNavigate}
              className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium outline-none"
            >
              <AnimatePresence>
                {active && (
                  <motion.div
                    layoutId="nav-active-bg"
                    className="absolute inset-0 rounded-xl border border-white/[0.10] bg-white/[0.08]"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </AnimatePresence>
              <AnimatePresence>
                {active && (
                  <motion.span
                    layoutId="nav-bar"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-indigo-400 to-violet-500"
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    exit={{ scaleY: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </AnimatePresence>

              <motion.span
                whileHover={{ scale: 1.15, rotate: active ? 0 : -6 }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className={[
                  'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                  active
                    ? 'bg-gradient-to-br from-indigo-500/30 to-violet-600/15 border border-white/10 text-indigo-300'
                    : 'text-white/35 group-hover:text-white/65',
                ].join(' ')}
              >
                <UserCircle className="h-[15px] w-[15px]" aria-hidden />
              </motion.span>

              <span className={['relative transition-colors duration-200', active ? 'text-white' : 'text-white/40 group-hover:text-white/75'].join(' ')}>
                Profile
              </span>
            </NavLink>
          )
        })()}
      </motion.div>
    </aside>
  )
}
