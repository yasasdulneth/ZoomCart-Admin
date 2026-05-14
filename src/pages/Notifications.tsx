import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Send, X, CheckCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import {
  createNotification,
  getAdminsForNotificationPicker,
  getAppUsersForNotificationPicker,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
  type AdminPickerRow,
  type AppUserPickerRow,
  type NotificationTargetAudience,
} from '../lib/services/notification.service'
import type { AdminNotification, NotificationTargetRole } from '../types/models'

type FilterTab = 'all' | 'unread'

const AUDIENCE_OPTIONS: { value: NotificationTargetAudience; label: string }[] = [
  { value: 'STAFF',       label: 'Staff (admins with STAFF role)' },
  { value: 'APP_USER',    label: 'Single app user' },
  { value: 'ALL_ADMINS',  label: 'All admins' },
  { value: 'ALL_USERS',   label: 'All app users' },
  { value: 'BROADCAST',   label: 'Broadcast (everyone)' },
]

function formatCreatedAt(ms?: number): string {
  if (ms == null || Number.isNaN(ms)) return '—'
  return new Date(ms).toLocaleString()
}

const glassInput = 'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white/80 outline-none placeholder:text-white/25 focus:border-indigo-400/40 focus:bg-white/[0.06] backdrop-blur-sm transition-colors'
const glassSelect = 'w-full rounded-xl border border-white/[0.08] bg-zinc-950 px-3 py-2.5 text-sm text-white/80 outline-none focus:border-indigo-400/40 transition-colors'

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

function typeColor(type: string) {
  if (type === 'system')  return 'border-violet-500/25 text-violet-300 bg-violet-500/10'
  if (type === 'order')   return 'border-amber-500/25 text-amber-300 bg-amber-500/10'
  if (type === 'alert')   return 'border-rose-500/25 text-rose-300 bg-rose-500/10'
  return 'border-white/10 text-white/35 bg-white/[0.03]'
}

export function Notifications() {
  const { currentAdmin } = useAuth()
  const inboxContext = useMemo(
    () => (currentAdmin ? { uid: currentAdmin.uid, role: currentAdmin.role } : null),
    [currentAdmin],
  )

  const [items, setItems] = useState<AdminNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const [sendOpen, setSendOpen] = useState(false)
  const [sendTitle, setSendTitle] = useState('')
  const [sendMessage, setSendMessage] = useState('')
  const [sendType, setSendType] = useState('general')
  const [sendAudience, setSendAudience] = useState<NotificationTargetAudience>('ALL_ADMINS')
  const [sendTargetAdminUid, setSendTargetAdminUid] = useState('')
  const [sendTargetUserId, setSendTargetUserId] = useState('')
  const [adminsPick, setAdminsPick] = useState<AdminPickerRow[]>([])
  const [usersPick, setUsersPick] = useState<AppUserPickerRow[]>([])
  const [pickersLoading, setPickersLoading] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    setLoading(true)
    const unsub = subscribeToNotifications(
      (list) => { setItems(list); setLoading(false); setError(null) },
      (err)  => { setError(err.message); setLoading(false) },
      inboxContext,
    )
    return unsub
  }, [inboxContext])

  useEffect(() => {
    if (!sendOpen || !currentAdmin) return
    let cancelled = false
    setPickersLoading(true)
    void (async () => {
      try {
        const [admins, users] = await Promise.all([getAdminsForNotificationPicker(), getAppUsersForNotificationPicker()])
        if (!cancelled) { setAdminsPick(admins); setUsersPick(users) }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load recipients.')
      } finally {
        if (!cancelled) setPickersLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [sendOpen, currentAdmin])

  useEffect(() => {
    if (!sendOpen) return
    setSendTargetAdminUid('')
    setSendTargetUserId('')
  }, [sendAudience, sendOpen])

  const displayed = useMemo(() => filter === 'unread' ? items.filter((n) => !n.isRead) : items, [items, filter])
  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items])

  async function handleMarkRead(id: string) {
    setBusyId(id); setError(null)
    try { await markNotificationAsRead(id) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update.') }
    finally { setBusyId(null) }
  }

  async function handleMarkAllRead() {
    if (!inboxContext) return
    setMarkingAll(true); setError(null)
    try { await markAllNotificationsAsRead(inboxContext) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not mark all as read.') }
    finally { setMarkingAll(false) }
  }

  function closeSendModal() {
    setSendOpen(false); setSendTitle(''); setSendMessage(''); setSendType('general')
    setSendAudience('ALL_ADMINS'); setSendTargetAdminUid(''); setSendTargetUserId('')
  }

  async function handleSendNotification(e: FormEvent) {
    e.preventDefault()
    if (!currentAdmin) return
    setSending(true); setError(null)
    try {
      if (!sendTitle.trim() || !sendMessage.trim()) throw new Error('Title and message are required.')
      let targetUid: string | null = null
      let targetUserId: string | null = null
      let targetRole: NotificationTargetRole | null = null
      if (sendAudience === 'STAFF') {
        targetRole = 'STAFF'
        if (sendTargetAdminUid.trim()) {
          targetUid = sendTargetAdminUid.trim()
          const row = adminsPick.find((a) => a.uid === targetUid)
          if (row && (row.role === 'SUPER_ADMIN' || row.role === 'STAFF')) targetRole = row.role as NotificationTargetRole
        }
      }
      if (sendAudience === 'APP_USER') {
        if (!sendTargetUserId.trim()) throw new Error('Select an app user.')
        targetUserId = sendTargetUserId.trim()
      }
      await createNotification({
        title: sendTitle.trim(), message: sendMessage.trim(), type: sendType.trim() || 'general',
        targetAudience: sendAudience, targetUid, targetUserId, targetRole,
        sentByUid: currentAdmin.uid, sentByName: currentAdmin.fullName,
      })
      closeSendModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send notification.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="orb-float absolute -right-60 -top-60 h-[28rem] w-[28rem] rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/40 to-indigo-600/20">
              <Bell className="h-4 w-4 text-violet-300" />
            </span>
            <h1 className="bg-gradient-to-r from-white via-white/90 to-white/50 bg-clip-text text-xl font-bold tracking-tight text-transparent">Notifications</h1>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
        </div>
        <p className="mt-1 pl-[2.6rem] text-xs text-white/30">Admin notifications inbox</p>
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

      {/* Toolbar */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-wrap items-center gap-2">
        <motion.button
          type="button"
          onClick={() => setSendOpen(true)}
          disabled={!currentAdmin}
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 transition-all"
        >
          <Send className="h-3.5 w-3.5" /> Send notification
        </motion.button>

        {/* Filter tabs */}
        <GlassPanel className="inline-flex !rounded-xl p-0.5">
          <div className="flex">
            {(['all', 'unread'] as FilterTab[]).map((tab) => (
              <motion.button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                whileTap={{ scale: 0.95 }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filter === tab ? 'bg-white/10 text-white/80' : 'text-white/35 hover:text-white/55'}`}
              >
                {tab === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
              </motion.button>
            ))}
          </div>
        </GlassPanel>

        {unreadCount > 0 && inboxContext && (
          <motion.button
            type="button"
            disabled={markingAll}
            onClick={() => void handleMarkAllRead()}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white/50 hover:bg-white/[0.08] hover:text-white/70 disabled:opacity-50 transition-colors backdrop-blur-sm"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {markingAll ? 'Marking…' : 'Mark all read'}
          </motion.button>
        )}
      </motion.div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/[0.04]" />)}</div>
      ) : displayed.length === 0 ? (
        <GlassPanel className="py-14 text-center">
          <Bell className="mx-auto mb-3 h-8 w-8 text-white/15" />
          <p className="text-sm text-white/30">{filter === 'unread' ? 'No unread notifications.' : 'No notifications.'}</p>
        </GlassPanel>
      ) : (
        <motion.ul
          className="space-y-2"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } }, hidden: {} }}
        >
          {displayed.map((n) => (
            <motion.li
              key={n.id}
              variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
              layout
            >
              <div
                className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-colors ${n.isRead ? 'border-white/[0.06] bg-white/[0.02]' : 'border-indigo-500/20 bg-indigo-500/[0.04]'}`}
                style={{ boxShadow: n.isRead ? '0 4px 16px rgba(0,0,0,0.2)' : '0 4px 24px rgba(99,102,241,0.08)' }}
              >
                {!n.isRead && <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent" />}
                <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                  <div className="flex items-start gap-3">
                    {!n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-400 live-ping" />}
                    {n.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-white/10" />}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-white/80">{n.title}</p>
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeColor(n.type)}`}>{n.type}</span>
                        {n.targetAudience && <span className="rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-white/30">{n.targetAudience}</span>}
                      </div>
                      <p className="text-sm text-white/45">{n.message}</p>
                      <p className="mt-2 text-xs text-white/20">
                        {formatCreatedAt(n.createdAt)}{n.sentByName ? ` · From ${n.sentByName}` : ''}
                      </p>
                    </div>
                  </div>
                  {!n.isRead && (
                    <motion.button
                      type="button"
                      disabled={busyId === n.id}
                      onClick={() => void handleMarkRead(n.id)}
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      className="shrink-0 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-white/50 hover:bg-white/[0.08] hover:text-white/70 disabled:opacity-50 transition-colors"
                    >
                      Mark read
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}

      {/* Send notification modal */}
      <AnimatePresence>
        {sendOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            role="dialog" aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="w-full max-w-lg"
            >
              <GlassPanel glow="rgba(99,102,241,0.12)">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-indigo-300" />
                    <p className="text-sm font-semibold text-white/80">Send Notification</p>
                  </div>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button" onClick={closeSendModal} className="rounded-lg p-1 text-white/30 hover:text-white/60">
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>
                <form onSubmit={(e) => void handleSendNotification(e)} className="max-h-[70vh] overflow-y-auto">
                  <div className="space-y-3 p-5">
                    <input value={sendTitle} onChange={(e) => setSendTitle(e.target.value)} placeholder="Title" className={glassInput} />
                    <textarea value={sendMessage} onChange={(e) => setSendMessage(e.target.value)} placeholder="Message" rows={4} className={`${glassInput} resize-none`} />
                    <input value={sendType} onChange={(e) => setSendType(e.target.value)} placeholder="Type (e.g. system, order, alert)" className={glassInput} />
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">Target audience</label>
                      <select value={sendAudience} onChange={(e) => setSendAudience(e.target.value as NotificationTargetAudience)} className={glassSelect}>
                        {AUDIENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    {sendAudience === 'STAFF' && (
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">Specific admin (optional)</label>
                        <select value={sendTargetAdminUid} onChange={(e) => setSendTargetAdminUid(e.target.value)} disabled={pickersLoading} className={`${glassSelect} disabled:opacity-50`}>
                          <option value="">All staff</option>
                          {adminsPick.map((a) => <option key={a.uid} value={a.uid}>{a.fullName} ({a.email}) · {a.role}</option>)}
                        </select>
                      </div>
                    )}
                    {sendAudience === 'APP_USER' && (
                      <div>
                        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">App user</label>
                        <select value={sendTargetUserId} onChange={(e) => setSendTargetUserId(e.target.value)} disabled={pickersLoading} required className={`${glassSelect} disabled:opacity-50`}>
                          <option value="">Select user…</option>
                          {usersPick.map((u) => <option key={u.id} value={u.id}>{u.displayName} ({u.email || u.id})</option>)}
                        </select>
                      </div>
                    )}
                    {pickersLoading && <p className="text-xs text-white/30">Loading recipients…</p>}
                    <div className="flex gap-2 pt-1">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="button" onClick={closeSendModal} className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm text-white/60 hover:bg-white/[0.08] transition-colors">Cancel</motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="submit" disabled={sending || !currentAdmin} className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 transition-all">
                        <Send className="h-3.5 w-3.5" />{sending ? 'Sending…' : 'Send'}
                      </motion.button>
                    </div>
                  </div>
                </form>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
