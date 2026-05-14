import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const glassInput = 'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white/80 outline-none placeholder:text-white/20 focus:border-indigo-400/50 focus:bg-white/[0.07] backdrop-blur-sm transition-colors'

function PasswordInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        id="password"
        name="password"
        type={show ? 'text' : 'password'}
        autoComplete="current-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${glassInput} pr-10`}
        placeholder="••••••••"
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}

export function Login() {
  const { isAuthenticated, isReady, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const from = (location.state as { from?: string } | null)?.from ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isReady) {
    return (
      <div className="flex min-h-full items-center justify-center bg-zinc-950">
        <div className="flex items-center gap-2 text-sm text-white/25">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />
          Loading…
        </div>
      </div>
    )
  }

  if (isAuthenticated) return <Navigate to={from} replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const trimmedEmail = email.trim()
    if (!trimmedEmail) { setError('Email is required.'); return }
    if (!password)     { setError('Password is required.'); return }
    setSubmitting(true)
    try { await login(trimmedEmail, password); navigate(from, { replace: true }) }
    catch (err) { setError(err instanceof Error ? err.message : 'Sign-in failed.') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12">
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="orb-float absolute -left-64 -top-64 h-[40rem] w-[40rem] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="orb-float2 absolute -bottom-48 -right-48 h-[32rem] w-[32rem] rounded-full bg-violet-600/8 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-sm"
      >
        {/* Glass card */}
        <div
          className="glass-shimmer relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 backdrop-blur-xl"
          style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 0 80px rgba(99,102,241,0.08)' }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />

          {/* Logo + branding */}
          <div className="relative mb-8 flex flex-col items-center gap-3">
            <motion.img
              src="/logo.png"
              alt="ZoomCart"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 22 }}
              style={{ width: 80, height: 80, clipPath: 'inset(8% round 22%)', display: 'block', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }}
            />

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <h1 className="bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-xl font-bold tracking-tight text-transparent">
                ZoomCart Admin
              </h1>
              <p className="mt-1 text-xs text-white/30">Sign in to your admin account</p>
            </motion.div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-300"
                role="alert"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form className="relative space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={glassInput}
                placeholder="admin@example.com"
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">
                Password
              </label>
              <PasswordInput value={password} onChange={setPassword} disabled={submitting} />
            </div>

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 transition-all"
            >
              {submitting
                ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Signing in…</>
                : <><LogIn className="h-4 w-4" /> Sign in</>
              }
            </motion.button>
          </form>

          <p className="relative mt-6 text-center">
            <Link
              to="/create-account"
              className="text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
            >
              Create New Account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
