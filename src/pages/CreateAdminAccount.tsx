import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
  createAdminAccount,
  type AdminRole,
  type CreateAdminAccountData,
} from '../lib/services/auth.service'

const MIN_PASSWORD_LENGTH = 8

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validateForm(params: {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  role: AdminRole | ''
}): string | null {
  if (!params.fullName.trim()) return 'Full name is required.'
  if (!params.email.trim()) return 'Email is required.'
  if (!EMAIL_RE.test(params.email.trim())) return 'Enter a valid email address.'
  if (!params.password) return 'Password is required.'
  if (params.password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (params.password !== params.confirmPassword) {
    return 'Passwords do not match.'
  }
  if (!params.role) return 'Select a role.'
  return null
}

export function CreateAdminAccount() {
  const navigate = useNavigate()
  const { isAuthenticated, isReady } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<AdminRole | ''>('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Set from `createAdminAccount` success `message` (then redirect). */
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!successMessage) return
    const id = window.setTimeout(() => {
      navigate('/login', { replace: true })
    }, 1600)
    return () => window.clearTimeout(id)
  }, [successMessage, navigate])

  if (!isReady) {
    return (
      <div className="flex min-h-full items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const validationError = validateForm({
      fullName,
      email,
      password,
      confirmPassword,
      role,
    })
    if (validationError) {
      setError(validationError)
      return
    }

    const payload: CreateAdminAccountData = {
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      role: role as AdminRole,
    }

    setLoading(true)
    try {
      const result = await createAdminAccount(payload)
      if (result.success) {
        setSuccessMessage(result.message)
      } else {
        setError(result.message)
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Keep the form usable even when Firebase env is incomplete so we can show a clear error on submit.
  const disableForm = loading || successMessage !== null

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-xl shadow-black/20">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold text-zinc-100">Create admin account</p>
          <p className="mt-1 text-xs text-zinc-500">
            Register a new ZoomCart admin. You will sign in on the next screen.
          </p>
        </div>

        {successMessage ? (
          <div
            className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
            role="status"
          >
            {successMessage}
          </div>
        ) : null}

        {error ? (
          <div
            className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label htmlFor="fullName" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Jane Admin"
              disabled={disableForm}
            />
          </div>

          <div>
            <label htmlFor="create-email" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Email
            </label>
            <input
              id="create-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="admin@example.com"
              disabled={disableForm}
            />
          </div>

          <div>
            <label htmlFor="create-password" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Password
            </label>
            <input
              id="create-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              disabled={disableForm}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-xs font-medium text-zinc-400"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
              placeholder="Repeat password"
              disabled={disableForm}
            />
          </div>

          <div>
            <label htmlFor="role" className="mb-1.5 block text-xs font-medium text-zinc-400">
              Role
            </label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as AdminRole | '')}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
              disabled={disableForm}
            >
              <option value="">Select role</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="STAFF">STAFF</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={disableForm}
            className="mt-2 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account…' : successMessage ? 'Redirecting…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          <Link
            to="/login"
            className="font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
