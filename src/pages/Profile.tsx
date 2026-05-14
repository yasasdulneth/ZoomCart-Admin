import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Mail, Shield, UserCircle, Hash, Pencil, X, Check, KeyRound, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { updateOwnProfile, changeOwnPassword } from '../lib/services/auth.service'

const glassInput = 'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white/80 outline-none placeholder:text-white/20 focus:border-indigo-400/40 focus:bg-white/[0.06] backdrop-blur-sm transition-colors'

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

function PasswordInput({ value, onChange, placeholder, disabled }: { value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${glassInput} pr-10`}
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

export function Profile() {
  const { user, logout, refreshAdmin } = useAuth()
  const navigate = useNavigate()

  // Sign out
  const [signingOut, setSigningOut] = useState(false)

  // Edit profile
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Change password
  const [pwOpen, setPwOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwSuccess, setPwSuccess] = useState(false)

  function openEdit() {
    setEditName(user?.fullName ?? '')
    setEditEmail(user?.email ?? '')
    setSaveError(null)
    setSaveSuccess(false)
    setEditOpen(true)
  }

  function closeEdit() {
    setEditOpen(false)
    setSaveError(null)
    setSaveSuccess(false)
  }

  async function handleSaveProfile() {
    if (!user) return
    setSaving(true); setSaveError(null); setSaveSuccess(false)
    try {
      const patch: { fullName?: string; email?: string } = {}
      if (editName.trim() !== user.fullName) patch.fullName = editName.trim()
      if (editEmail.trim().toLowerCase() !== user.email.toLowerCase()) patch.email = editEmail.trim()
      if (Object.keys(patch).length === 0) { closeEdit(); return }
      const updated = await updateOwnProfile(patch)
      refreshAdmin(updated)
      setSaveSuccess(true)
      setTimeout(() => { setSaveSuccess(false); setEditOpen(false) }, 1200)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  function openPw() {
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setPwError(null); setPwSuccess(false); setPwOpen(true)
  }

  function closePw() {
    setPwOpen(false); setPwError(null); setPwSuccess(false)
  }

  async function handleChangePassword() {
    if (!newPw || newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return }
    setPwSaving(true); setPwError(null); setPwSuccess(false)
    try {
      await changeOwnPassword(currentPw, newPw)
      setPwSuccess(true)
      setTimeout(() => { setPwSuccess(false); closePw() }, 1500)
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Could not change password.')
    } finally {
      setPwSaving(false)
    }
  }

  async function handleSignOut() {
    setSigningOut(true)
    try { await logout(); navigate('/login', { replace: true }) }
    finally { setSigningOut(false) }
  }

  return (
    <div className="space-y-6">
      {/* Ambient orb */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="orb-float absolute -left-60 -top-60 h-[28rem] w-[28rem] rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/40 to-violet-600/20">
            <UserCircle className="h-4 w-4 text-indigo-300" />
          </span>
          <h1 className="bg-gradient-to-r from-white via-white/90 to-white/50 bg-clip-text text-xl font-bold tracking-tight text-transparent">Profile</h1>
        </div>
        <p className="mt-1 pl-[2.6rem] text-xs text-white/30">Signed-in admin account</p>
      </motion.div>

      <div className="max-w-lg space-y-4">
        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassPanel glow="rgba(99,102,241,0.08)">
            {/* Avatar + name row */}
            <div className="relative flex items-center justify-between gap-4 border-b border-white/[0.06] p-6">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl" />
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/30 to-violet-600/20 text-2xl font-bold text-white/70 backdrop-blur-sm">
                  {user?.fullName?.charAt(0).toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-base font-semibold text-white/85">{user?.fullName ?? '—'}</p>
                  <p className="text-xs text-white/35">{user?.email ?? ''}</p>
                </div>
              </div>
              <motion.button
                type="button"
                onClick={openEdit}
                whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/50 hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </motion.button>
            </div>

            {/* Info fields */}
            <div className="space-y-0 divide-y divide-white/[0.04] px-6 py-2">
              {[
                { icon: UserCircle, label: 'Display name', value: user?.fullName ?? '—' },
                { icon: Mail,       label: 'Email',        value: user?.email ?? '—' },
                { icon: Shield,     label: 'Role',         value: user?.role ?? '—' },
                { icon: Hash,       label: 'User ID',      value: user?.uid ?? '—', mono: true },
              ].map(({ icon: Icon, label, value, mono }) => (
                <div key={label} className="flex items-center gap-3 py-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-white/25">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/20">{label}</p>
                    <p className={`truncate text-sm ${mono ? 'font-mono text-white/35' : 'text-white/70'}`}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </motion.div>

        {/* Action buttons */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="flex gap-3">
          <motion.button
            type="button"
            onClick={openPw}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm font-medium text-white/55 hover:bg-white/[0.08] hover:text-white/75 transition-colors backdrop-blur-sm"
          >
            <KeyRound className="h-4 w-4" /> Change Password
          </motion.button>
          <motion.button
            type="button"
            disabled={signingOut}
            onClick={() => void handleSignOut()}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 py-2.5 text-sm font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </motion.button>
        </motion.div>
      </div>

      {/* ── Edit Profile Modal ── */}
      <AnimatePresence>
        {editOpen && (
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
              <GlassPanel glow="rgba(99,102,241,0.12)">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-indigo-300" />
                    <p className="text-sm font-semibold text-white/80">Edit Profile</p>
                  </div>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={closeEdit} className="rounded-lg p-1 text-white/30 hover:text-white/60">
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>

                {/* Form */}
                <div className="space-y-3 p-5">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">Display name</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full name" className={glassInput} disabled={saving} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">Email</label>
                    <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} type="email" placeholder="Email address" className={glassInput} disabled={saving} />
                  </div>

                  <AnimatePresence>
                    {saveError && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                        {saveError}
                      </motion.p>
                    )}
                    {saveSuccess && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                        <Check className="h-3.5 w-3.5" /> Profile updated!
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2 pt-1">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="button" onClick={closeEdit} disabled={saving}
                      className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm text-white/55 hover:bg-white/[0.08] disabled:opacity-50 transition-colors">
                      Cancel
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="button" onClick={() => void handleSaveProfile()} disabled={saving}
                      className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 transition-all">
                      {saving ? 'Saving…' : 'Save changes'}
                    </motion.button>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Change Password Modal ── */}
      <AnimatePresence>
        {pwOpen && (
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
              <GlassPanel glow="rgba(99,102,241,0.1)">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-indigo-300" />
                    <p className="text-sm font-semibold text-white/80">Change Password</p>
                  </div>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={closePw} className="rounded-lg p-1 text-white/30 hover:text-white/60">
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>

                {/* Form */}
                <div className="space-y-3 p-5">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">Current password</label>
                    <PasswordInput value={currentPw} onChange={setCurrentPw} placeholder="Enter current password" disabled={pwSaving} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">New password</label>
                    <PasswordInput value={newPw} onChange={setNewPw} placeholder="At least 8 characters" disabled={pwSaving} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">Confirm new password</label>
                    <PasswordInput value={confirmPw} onChange={setConfirmPw} placeholder="Repeat new password" disabled={pwSaving} />
                  </div>

                  {/* Strength hint */}
                  {newPw.length > 0 && (
                    <div className="flex items-center gap-2">
                      {[1,2,3,4].map((n) => (
                        <div key={n} className={`h-1 flex-1 rounded-full transition-colors ${
                          newPw.length >= n * 3
                            ? newPw.length >= 12 ? 'bg-emerald-400'
                              : newPw.length >= 8 ? 'bg-amber-400'
                              : 'bg-rose-400'
                            : 'bg-white/10'
                        }`} />
                      ))}
                      <span className="text-[10px] text-white/25 shrink-0">
                        {newPw.length < 8 ? 'Too short' : newPw.length < 12 ? 'Fair' : 'Strong'}
                      </span>
                    </div>
                  )}

                  <AnimatePresence>
                    {pwError && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                        {pwError}
                      </motion.p>
                    )}
                    {pwSuccess && (
                      <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
                        <Check className="h-3.5 w-3.5" /> Password changed successfully!
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-2 pt-1">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="button" onClick={closePw} disabled={pwSaving}
                      className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm text-white/55 hover:bg-white/[0.08] disabled:opacity-50 transition-colors">
                      Cancel
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="button" onClick={() => void handleChangePassword()} disabled={pwSaving}
                      className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 transition-all">
                      {pwSaving ? 'Updating…' : 'Update password'}
                    </motion.button>
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
