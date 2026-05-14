import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, Users as UsersIcon, UserX, X } from 'lucide-react'
import { subscribeUsers } from '../services/user.service'
import { setAdminActive, updateAdminPassword } from '../lib/services/auth.service'
import { useAuth } from '../contexts/AuthContext'
import type { UserProfile } from '../types/models'

const glassInput = 'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white/80 outline-none placeholder:text-white/25 focus:border-indigo-400/40 focus:bg-white/[0.06] backdrop-blur-sm transition-colors'

function GlassPanel({ children, className, glow }: { children: React.ReactNode; className?: string; glow?: string }) {
  return (
    <div
      className={`glass-shimmer relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl ${className ?? ''}`}
      style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.35)${glow ? `, 0 0 50px ${glow}` : ''}` }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
      <div className="relative">{children}</div>
    </div>
  )
}

function Modal({ open, children, glow }: { open: boolean; children: React.ReactNode; glow?: string }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-md"
          >
            <GlassPanel glow={glow}>{children}</GlassPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Users() {
  const { currentAdmin } = useAuth()
  const [users, setUsers]   = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pwOpen, setPwOpen] = useState(false)
  const [pwTarget, setPwTarget] = useState<UserProfile | null>(null)
  const [pw1, setPw1] = useState('')
  const [pw2, setPw2] = useState('')

  useEffect(() => {
    const unsub = subscribeUsers(
      (list) => { setUsers(list); setLoading(false); setError(null) },
      (err)  => { setError(err.message); setLoading(false) },
    )
    return unsub
  }, [])

  const isSuperAdmin = currentAdmin?.role === 'SUPER_ADMIN'

  async function handleDisable(u: UserProfile) {
    if (!isSuperAdmin) return
    if (!u.id || u.id === currentAdmin?.uid) { setError('You cannot disable your own account.'); return }
    if (u.role !== 'STAFF') { setError('Only STAFF accounts can be removed.'); return }
    setBusyId(u.id); setError(null)
    try { await setAdminActive(u.id, false) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update.') }
    finally { setBusyId(null) }
  }

  function openPasswordModal(u: UserProfile) { setPwTarget(u); setPw1(''); setPw2(''); setPwOpen(true) }

  async function handleSavePassword() {
    if (!isSuperAdmin || !pwTarget) return
    if (pwTarget.id === currentAdmin?.uid) { setError('Use Profile page for your own account.'); return }
    if (pwTarget.role !== 'STAFF') { setError('Only STAFF passwords can be updated here.'); return }
    if (!pw1 || pw1.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (pw1 !== pw2) { setError('Passwords do not match.'); return }
    setBusyId(pwTarget.id); setError(null)
    try {
      await updateAdminPassword(pwTarget.id, pw1)
      setPwOpen(false); setPwTarget(null); setPw1(''); setPw2('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update password.') }
    finally { setBusyId(null) }
  }

  const roleColor = (role?: string) =>
    role === 'SUPER_ADMIN' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25'
    : role === 'STAFF'     ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'
    : 'bg-white/5 text-white/40 border-white/10'

  return (
    <div className="space-y-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="orb-float absolute -left-60 -top-60 h-[28rem] w-[28rem] rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/40 to-violet-600/20">
            <UsersIcon className="h-4 w-4 text-indigo-300" />
          </span>
          <h1 className="bg-gradient-to-r from-white via-white/90 to-white/50 bg-clip-text text-xl font-bold tracking-tight text-transparent">Employees</h1>
        </div>
        <p className="mt-1 pl-[2.6rem] text-xs text-white/30">Employee directory</p>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GlassPanel className="px-4 py-3" glow="rgba(248,113,113,0.15)">
              <p className="text-sm text-rose-300">{error}</p>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/[0.04]" />)}</div>
        ) : (
          <GlassPanel>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-widest text-white/25">
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Email</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Joined</th>
                    {isSuperAdmin && <th className="px-5 py-3.5 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={isSuperAdmin ? 6 : 5} className="px-5 py-10 text-center text-sm text-white/25">No employees found.</td></tr>
                  ) : users.map((u, i) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-t border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-3.5 font-medium text-white/80">{u.displayName ?? '—'}</td>
                      <td className="px-5 py-3.5 text-white/45">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${roleColor(u.role)}`}>
                          {u.role ?? '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${u.isActive === false ? 'bg-rose-500/15 text-rose-300 border-rose-500/25' : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25'}`}>
                          {u.isActive === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-white/30">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                      {isSuperAdmin && (
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <motion.button
                              type="button"
                              disabled={busyId === u.id || u.role !== 'STAFF' || u.id === currentAdmin?.uid}
                              onClick={() => openPasswordModal(u)}
                              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-30"
                            >
                              <KeyRound className="h-3 w-3" /> Password
                            </motion.button>
                            <motion.button
                              type="button"
                              disabled={busyId === u.id || u.role !== 'STAFF' || u.id === currentAdmin?.uid || u.isActive === false}
                              onClick={() => void handleDisable(u)}
                              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                              className="flex items-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-30"
                            >
                              <UserX className="h-3 w-3" /> Remove
                            </motion.button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        )}
      </motion.div>

      {/* Password modal */}
      <Modal open={pwOpen && !!pwTarget} glow="rgba(99,102,241,0.12)">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-indigo-300" />
            <p className="text-sm font-semibold text-white/80">Update Password</p>
          </div>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button" onClick={() => { setPwOpen(false); setPwTarget(null) }} disabled={!!busyId} className="rounded-lg p-1 text-white/30 hover:text-white/60">
            <X className="h-4 w-4" />
          </motion.button>
        </div>
        <div className="space-y-3 p-5">
          <p className="text-xs text-white/35">{pwTarget?.displayName ?? pwTarget?.email}</p>
          <input value={pw1} onChange={(e) => setPw1(e.target.value)} type="password" placeholder="New password" className={glassInput} disabled={!!busyId} />
          <input value={pw2} onChange={(e) => setPw2(e.target.value)} type="password" placeholder="Confirm new password" className={glassInput} disabled={!!busyId} />
          <div className="flex gap-2 pt-1">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="button" onClick={() => { setPwOpen(false); setPwTarget(null) }} className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm text-white/60 hover:bg-white/[0.08] transition-colors" disabled={!!busyId}>Cancel</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="button" onClick={() => void handleSavePassword()} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-indigo-400 transition-all disabled:opacity-50" disabled={!!busyId}>
              {busyId ? 'Saving…' : 'Save'}
            </motion.button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
