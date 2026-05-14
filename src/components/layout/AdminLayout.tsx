import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const pageVariants = {
  initial: { opacity: 0, y: 14, scale: 0.99 },
  enter: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.99,
    transition: { duration: 0.18, ease: 'easeIn' as const },
  },
} satisfies Variants

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex min-h-full bg-zinc-950">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.button
            key="overlay"
            type="button"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      <div className="flex min-h-full min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className="flex-1 overflow-auto p-4 md:p-6 lg:p-8"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </div>
    </div>
  )
}
