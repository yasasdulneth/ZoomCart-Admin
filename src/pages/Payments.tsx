import { useEffect, useState, useRef, useCallback } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import type { IDetectedBarcode } from '@yudiel/react-qr-scanner'
import { motion, AnimatePresence } from 'framer-motion'
import {
  QrCode, Trash2, X, CheckCircle, AlertCircle, Clock, Loader2,
  Maximize2, Lock, ChevronRight,
} from 'lucide-react'
import { subscribePayments, verifyPayment, getPayment, deletePayment } from '../services/payment.service'
import type { Payment } from '../types/models'

type ScanResult = {
  status: 'verifying' | 'success' | 'error' | 'already_verified'
  payload?: { paymentId: string; amount?: number }
  errorMessage?: string
}

function extractPaymentId(raw: string): string | null {
  const s = raw.trim()
  if (/^[a-f0-9]{24}$/i.test(s)) return s
  if (s.startsWith('http')) {
    try {
      const url = new URL(s)
      const segments = url.pathname.split('/').filter(Boolean)
      for (let i = segments.length - 1; i >= 0; i--) {
        if (/^[a-f0-9]{24}$/i.test(segments[i])) return segments[i]
      }
      for (const val of url.searchParams.values()) {
        if (/^[a-f0-9]{24}$/i.test(val)) return val
      }
    } catch { /* not a valid URL */ }
  }
  const parts = s.split('.')
  if (parts.length === 3) {
    try {
      let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
      while (b64.length % 4) b64 += '='
      const json = JSON.parse(
        decodeURIComponent(atob(b64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')),
      )
      const id = json.paymentId ?? json.payment_id ?? json.id ?? json._id ?? json.sub
      if (id) return String(id)
    } catch { /* not a valid JWT */ }
  }
  const m = s.match(/[a-f0-9]{24}/i)
  return m ? m[0] : null
}

const KIOSK_EXIT_PIN = '1234'

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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="w-full max-w-sm"
          >
            <GlassPanel glow={glow}>{children}</GlassPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Payments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const processingRef = useRef(false)

  /** Fullscreen scan mode — only Scan QR; exit requires PIN. */
  const [kioskMode, setKioskMode] = useState(false)
  const [pinGateOpen, setPinGateOpen] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)

  const openScanner = useCallback(() => {
    setScanResult(null)
    setIsScanning(true)
  }, [])

  const exitKioskAfterPin = useCallback(() => {
    setKioskMode(false)
    setPinGateOpen(false)
    setPinInput('')
    setPinError(null)
  }, [])

  const requestKioskFullscreen = useCallback(() => {
    setKioskMode(true)
    setPinGateOpen(false)
    setPinInput('')
    setPinError(null)
  }, [])

  const openPinGate = useCallback(() => {
    setPinGateOpen(true)
    setPinInput('')
    setPinError(null)
  }, [])

  const submitExitPin = useCallback(() => {
    if (pinInput === KIOSK_EXIT_PIN) exitKioskAfterPin()
    else {
      setPinError('Incorrect PIN. Try again.')
      setPinInput('')
    }
  }, [pinInput, exitKioskAfterPin])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!pinGateOpen) return
      if (e.key === 'Enter') { e.preventDefault(); submitExitPin() }
      if (e.key === 'Escape') {
        e.preventDefault()
        setPinGateOpen(false)
        setPinInput('')
        setPinError(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinGateOpen, submitExitPin])

  const overlayZ = {
    kiosk: 'z-[180]',
    scan:  kioskMode ? 'z-[200]' : 'z-50',
    result: kioskMode ? 'z-[210]' : 'z-[60]',
  } as const

  useEffect(() => {
    const unsub = subscribePayments(
      (list) => { setPayments(list); setLoading(false); setError(null) },
      (err)  => { setError(err.message); setLoading(false) },
    )
    return unsub
  }, [])

  function handleScan(result: IDetectedBarcode[]) {
    if (processingRef.current) return
    if (!result || !result.length || !result[0]?.rawValue) return
    processingRef.current = true
    setIsScanning(false)
    const paymentId = extractPaymentId(result[0].rawValue)
    if (!paymentId) {
      setScanResult({ status: 'error', errorMessage: 'Invalid QR Code' })
      setTimeout(() => { processingRef.current = false }, 1000)
      return
    }
    setScanResult({ status: 'verifying', payload: { paymentId } })
    getPayment(paymentId)
      .then(async (payment) => {
        if (payment.status === 'VERIFIED') {
          setScanResult({ status: 'already_verified', payload: { paymentId, amount: payment.amount } })
        } else if (payment.status === 'EXPIRED') {
          setScanResult({ status: 'error', errorMessage: 'Payment QR Expired' })
        } else {
          try {
            await verifyPayment(paymentId)
            setScanResult({ status: 'success', payload: { paymentId, amount: payment.amount } })
          } catch {
            setScanResult({ status: 'error', errorMessage: 'Verification Failed' })
          }
        }
      })
      .catch(() => { setScanResult({ status: 'error', errorMessage: 'Payment not found' }) })
      .finally(() => { setTimeout(() => { processingRef.current = false }, 1000) })
  }

  const allIds = payments.map((p) => p.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(allIds))

  async function handleDeleteSelected() {
    if (!someSelected) return
    setDeleting(true); setDeleteError(null)
    const ids = [...selected]
    try {
      await Promise.all(ids.map((id) => deletePayment(id)))
      setPayments((prev) => prev.filter((p) => !ids.includes(p.id)))
      setSelected(new Set()); setConfirmDelete(false)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete. Please try again.')
    } finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="orb-float absolute -right-60 -top-60 h-[28rem] w-[28rem] rounded-full bg-emerald-600/10 blur-3xl" />
      </div>

      {/* Header row */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-emerald-500/40 to-teal-600/20">
              <QrCode className="h-4 w-4 text-emerald-300" />
            </span>
            <h1 className="bg-gradient-to-r from-white via-white/90 to-white/50 bg-clip-text text-xl font-bold tracking-tight text-transparent">Payments</h1>
          </div>
          <p className="mt-1 pl-[2.6rem] text-xs text-white/30">Payments list</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <motion.button
            type="button"
            onClick={requestKioskFullscreen}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-white/70 backdrop-blur-sm transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-200"
            title="Fullscreen counter mode — scan only"
          >
            <Maximize2 className="h-4 w-4" /> Full screen
          </motion.button>
          <motion.button
            onClick={openScanner}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-emerald-400 transition-all"
          >
            <QrCode className="h-4 w-4" /> Scan QR
          </motion.button>
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GlassPanel className="px-4 py-3" glow="rgba(248,113,113,0.15)"><p className="text-sm text-rose-300">{error}</p></GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk action bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -8, height: 0 }} transition={{ duration: 0.2 }}>
            <GlassPanel className="px-4 py-2.5" glow="rgba(248,113,113,0.1)">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">{selected.size} {selected.size === 1 ? 'payment' : 'payments'} selected</span>
                <div className="flex items-center gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setSelected(new Set())} className="rounded-xl px-3 py-1.5 text-xs text-white/35 hover:text-white/60 transition-colors">Deselect all</motion.button>
                  <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => setConfirmDelete(true)} disabled={deleting}
                    className="flex items-center gap-1.5 rounded-xl border border-rose-500/25 bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> Delete {selected.size > 1 ? `${selected.size}` : ''}
                  </motion.button>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/[0.04]" />)}</div>
        ) : (
          <GlassPanel>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-widest text-white/25">
                    <th className="w-10 px-5 py-3.5">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded border-white/20 bg-white/[0.04] accent-indigo-500 cursor-pointer" />
                    </th>
                    <th className="px-5 py-3.5">Reference</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-sm text-white/25">No payments.</td></tr>
                  ) : payments.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`border-t border-white/[0.04] transition-colors ${selected.has(p.id) ? 'bg-indigo-500/[0.06]' : 'hover:bg-white/[0.03]'}`}
                    >
                      <td className="w-10 px-5 py-3.5">
                        <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="h-4 w-4 rounded border-white/20 bg-white/[0.04] accent-indigo-500 cursor-pointer" />
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-white/40">{p.reference ?? p.id}</td>
                      <td className="px-5 py-3.5 font-semibold text-white/80">LKR {p.amount.toFixed(2)}</td>
                      <td className="px-5 py-3.5">
                        {p.status === 'VERIFIED' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                            <CheckCircle className="h-3 w-3" /> Verified
                          </span>
                        ) : p.status === 'PENDING' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-300">
                            <Clock className="h-3 w-3" /> Verify Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/35">{p.status}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <motion.button
                          whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                          onClick={() => { setSelected(new Set([p.id])); setConfirmDelete(true) }}
                          className="inline-flex items-center gap-1 rounded-xl border border-transparent px-2 py-1.5 text-xs text-white/25 hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                          title="Delete payment"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        )}
      </motion.div>

      {/* Delete confirm modal */}
      <Modal open={confirmDelete} glow="rgba(248,113,113,0.15)">
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10">
            <Trash2 className="h-7 w-7 text-rose-400" />
          </div>
          <h2 className="text-lg font-bold text-white/85">Delete {selected.size === 1 ? 'payment' : `${selected.size} payments`}?</h2>
          <p className="mt-1 text-sm text-white/35">This action cannot be undone.</p>
          {deleteError && <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{deleteError}</p>}
          <div className="mt-5 flex gap-2">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => { setConfirmDelete(false); setDeleteError(null) }} disabled={deleting} className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm text-white/60 hover:bg-white/[0.08] transition-colors disabled:opacity-50">Cancel</motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleDeleteSelected} disabled={deleting} className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-2.5 text-sm font-semibold text-white hover:from-rose-500 hover:to-rose-400 disabled:opacity-50 transition-all">
              {deleting ? 'Deleting…' : 'Delete'}
            </motion.button>
          </div>
        </div>
      </Modal>

      {/* ── Full screen scan mode ─────────────────────────────────────────── */}
      <AnimatePresence>
        {kioskMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className={`fixed inset-0 ${overlayZ.kiosk} flex flex-col bg-zinc-950 overflow-hidden`}
            style={{ boxShadow: 'inset 0 0 120px rgba(16,185,129,0.06)' }}
          >
            {/* ambient */}
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -left-32 top-1/4 h-[50vh] w-[50vh] rounded-full bg-emerald-500/15 blur-[100px]" />
              <div className="absolute -right-24 bottom-0 h-[45vh] w-[45vh] rounded-full bg-teal-400/10 blur-[90px]" />
              <div className="absolute left-1/2 top-0 h-px w-[min(90%,480px)] -translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
            </div>

            {/* top bar: minimize → PIN (must stay above center content for clicks) */}
            <div className="relative z-20 flex shrink-0 items-center justify-end px-4 py-4 sm:px-8">
              <button
                type="button"
                onClick={() => openPinGate()}
                className="flex items-center gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white/80 backdrop-blur-md transition-colors hover:border-white/40 hover:bg-white/10 hover:text-white active:scale-[0.98]"
              >
                <Lock className="h-4 w-4 text-emerald-400/90" />
                Minimize
                <span className="rounded-lg bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/40">PIN</span>
              </button>
            </div>

            {/* center: hero CTA */}
            <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 pb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.45 }}
                className="mb-10 text-center"
              >
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Verify payment
                </h2>
                <p className="mt-2 max-w-md text-sm text-white/40">
                  Tap the button below to scan the customer&apos;s QR code.
                </p>
              </motion.div>

              <motion.button
                type="button"
                onClick={openScanner}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative z-10 flex w-full max-w-md flex-col items-center justify-center gap-4 rounded-[2rem] px-10 py-14 sm:py-16 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_24px_80px_-12px_rgba(16,185,129,0.55),0_0_120px_-20px_rgba(52,211,153,0.35)]"
                style={{
                  background: 'linear-gradient(145deg, #059669 0%, #10b981 42%, #34d399 100%)',
                }}
              >
                <span className="pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-40" />
                <span className="pointer-events-none absolute inset-[2px] rounded-[1.85rem] border border-white/20" />
                <motion.span
                  className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-white/20 shadow-inner backdrop-blur-sm sm:h-28 sm:w-28"
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <QrCode className="h-14 w-14 text-white drop-shadow-md sm:h-16 sm:w-16" strokeWidth={1.75} />
                </motion.span>
                <div className="relative text-center">
                  <p className="text-2xl font-bold tracking-tight sm:text-3xl">Scan QR</p>
                  <p className="mt-2 flex items-center justify-center gap-1 text-sm font-medium text-emerald-50/90">
                    Open camera <ChevronRight className="h-4 w-4 opacity-80" />
                  </p>
                </div>
              </motion.button>
            </div>

            {/* PIN overlay INSIDE kiosk so it always stacks above (native fullscreen used to hide sibling modals) */}
            <AnimatePresence>
              {pinGateOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-lg"
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 8 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                    className="w-full max-w-sm"
                  >
                    <GlassPanel glow="rgba(16,185,129,0.12)">
                      <div className="border-b border-white/[0.06] px-6 py-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/15">
                            <Lock className="h-5 w-5 text-emerald-400" />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-white/90">Staff PIN required</p>
                            <p className="text-xs text-white/35">Enter PIN to leave fullscreen mode</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4 p-6">
                        <input
                          type="password"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={8}
                          value={pinInput}
                          onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '')); setPinError(null) }}
                          placeholder="••••"
                          className="w-full rounded-2xl border border-white/[0.1] bg-zinc-950/80 px-4 py-3.5 text-center font-mono text-2xl tracking-[0.5em] text-white outline-none placeholder:text-white/30 focus:border-emerald-500/50"
                          autoFocus
                        />
                        {pinError && (
                          <p className="text-center text-xs text-rose-400">{pinError}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setPinGateOpen(false); setPinInput(''); setPinError(null) }}
                            className="flex-1 rounded-2xl border border-white/[0.1] bg-white/[0.05] py-3 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.08] active:scale-[0.98]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => submitExitPin()}
                            className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
                          >
                            Unlock
                          </button>
                        </div>
                      </div>
                    </GlassPanel>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera scanner modal */}
      <AnimatePresence>
        {isScanning && (
          <motion.div className={`fixed inset-0 ${overlayZ.scan} flex items-center justify-center bg-black/80 p-4 backdrop-blur-md`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} className="w-full max-w-md">
              <GlassPanel glow="rgba(52,211,153,0.1)">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-emerald-300" />
                    <h3 className="text-sm font-semibold text-white/80">Scan Payment QR</h3>
                  </div>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsScanning(false)} className="rounded-lg p-1 text-white/30 hover:text-white/60">
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>
                <div className="aspect-square w-full overflow-hidden rounded-b-2xl bg-black">
                  <Scanner
                    onScan={handleScan}
                    onError={(err: unknown) => {
                      console.error(err)
                      setScanResult({ status: 'error', errorMessage: 'Camera access failed or invalid scan.' })
                      setIsScanning(false)
                    }}
                  />
                </div>
                <div className="px-5 py-3 text-center text-xs text-white/25">Point your camera at the customer's QR code to verify the payment.</div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scan result modal */}
      <AnimatePresence>
        {scanResult && (
          <motion.div className={`fixed inset-0 ${overlayZ.result} flex items-center justify-center bg-black/80 p-4 backdrop-blur-md`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="w-full max-w-sm"
            >
              {(() => {
                const { status } = scanResult
                const isSuccess = status === 'success' || status === 'already_verified'
                const isErr = status === 'error'
                const glow = isSuccess ? 'rgba(52,211,153,0.15)' : isErr ? 'rgba(248,113,113,0.15)' : undefined
                return (
                  <GlassPanel glow={glow}>
                    <div className="p-6 text-center">
                      {status === 'verifying' && (
                        <div className="flex flex-col items-center gap-3 py-4">
                          <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
                          <p className="text-base font-semibold text-white/80">Verifying payment…</p>
                        </div>
                      )}
                      {(status === 'success' || status === 'already_verified') && (
                        <>
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/15"
                          >
                            <CheckCircle className="h-9 w-9 text-emerald-400" />
                          </motion.div>
                          <h2 className="text-2xl font-bold text-emerald-300">{status === 'success' ? 'Verified' : 'Already Verified'}</h2>
                          <p className="mt-1 text-sm text-emerald-400/60">{status === 'success' ? 'Payment successfully verified' : 'This payment was verified earlier'}</p>
                        </>
                      )}
                      {status === 'error' && (
                        <>
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/25 bg-rose-500/15"
                          >
                            <AlertCircle className="h-9 w-9 text-rose-400" />
                          </motion.div>
                          <h2 className="text-2xl font-bold text-rose-300">{scanResult.errorMessage || 'Invalid QR'}</h2>
                        </>
                      )}
                      {scanResult.payload && status !== 'verifying' && (
                        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-left text-sm">
                          <p className="text-xs text-white/30">Payment ID</p>
                          <p className="mt-0.5 font-mono text-xs text-white/45">{scanResult.payload.paymentId}</p>
                          {scanResult.payload.amount !== undefined && (
                            <>
                              <p className="mt-3 text-xs text-white/30">Amount</p>
                              <p className="mt-0.5 text-2xl font-bold text-white/80">LKR {Number(scanResult.payload.amount).toFixed(2)}</p>
                            </>
                          )}
                        </div>
                      )}
                      {status !== 'verifying' && (
                        <motion.button
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          onClick={() => setScanResult(null)}
                          className={`mt-5 w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all ${
                            status === 'success'
                              ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 shadow-lg shadow-emerald-500/20'
                              : 'border border-white/[0.08] bg-white/[0.04] text-white/60 hover:bg-white/[0.08]'
                          }`}
                        >
                          {status === 'success' ? 'Done' : 'Close'}
                        </motion.button>
                      )}
                    </div>
                  </GlassPanel>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
