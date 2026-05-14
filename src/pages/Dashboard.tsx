import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  CalendarRange,
  FileDown,
  Package,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { AnalyticsReport } from '../lib/reports/AnalyticsReport'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  DATE_RANGE_LABELS, getDashboardData,
  type DashboardData, type DateRangeKey,
} from '../lib/services/dashboard.service'

const REFRESH_MS   = 30_000
const PEAK_COLORS  = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa']
const PAY_MIX_COLORS = ['#34d399', '#fbbf24', '#a1a1aa']
const STOCK_COLORS = { inStock: '#34d399', lowStock: '#fbbf24', outOfStock: '#f87171' }
const TOP_COLOR    = '#818cf8'

/* ── Count-up hook ───────────────────────────────────────────────────────── */
function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(target)
  const prev = useRef(target)
  useEffect(() => {
    const from = prev.current
    prev.current = target
    if (from === target) return
    const start = performance.now()
    let id: number
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(from + (target - from) * ease))
      if (p < 1) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [target, duration])
  return val
}

/* ── Formatters ──────────────────────────────────────────────────────────── */
function fmt(v: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'LKR' }).format(v)
}
function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000)
  if (s < 5)  return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`
}
function fmtDate(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/* ── Framer variants ─────────────────────────────────────────────────────── */
const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}
const stagger = (delay = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: delay } },
})

/* ── Glass tooltip ───────────────────────────────────────────────────────── */
function GlassTip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/90 px-3 py-2 text-xs shadow-2xl backdrop-blur-2xl">
      {children}
    </div>
  )
}
function RevTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <GlassTip>
      <p className="mb-1 font-semibold text-white/80">{label}</p>
      <p className="text-emerald-400">{fmt(payload[0]?.value ?? 0)}</p>
      <p className="text-indigo-300">{payload[1]?.value ?? 0} orders</p>
    </GlassTip>
  )
}
function GenTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <GlassTip>
      {label && <p className="mb-1 font-semibold text-white/80">{label}</p>}
      {payload.map((it: any) => (
        <p key={it.dataKey ?? it.name} style={{ color: it.fill ?? it.color }}>{it.name}: {it.value}</p>
      ))}
    </GlassTip>
  )
}
function MixTip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  return (
    <GlassTip>
      <p className="font-semibold text-white/80">{row?.name ?? payload[0]?.name}</p>
      <p className="text-white/50">{payload[0]?.value ?? 0} payments</p>
    </GlassTip>
  )
}
function PieTip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const it = payload[0]
  return (
    <GlassTip>
      <p style={{ color: it.payload?.fill ?? '#fff' }}>{it.name}: <strong>{it.value}</strong></p>
    </GlassTip>
  )
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function Skel({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.04] ${className ?? ''}`} />
}

/* ── Glass panel ─────────────────────────────────────────────────────────── */
function GlassPanel({ children, className, glow }: { children: React.ReactNode; className?: string; glow?: string }) {
  return (
    <div
      className={`glass-shimmer relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl ${className ?? ''}`}
      style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.35)${glow ? `, 0 0 60px ${glow}` : ''}` }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />
      <div className="relative">{children}</div>
    </div>
  )
}

/* ── Chart panel ─────────────────────────────────────────────────────────── */
function ChartPanel({ title, children, className, compact }: { title: string; children: React.ReactNode; className?: string; compact?: boolean }) {
  return (
    <GlassPanel className={`${compact ? 'p-4' : 'p-5'} ${className ?? ''}`}>
      <h3 className={`${compact ? 'mb-2 text-xs' : 'mb-4 text-sm'} font-semibold text-white/70 tracking-wide`}>{title}</h3>
      {children}
    </GlassPanel>
  )
}

/* ── Animated stat card ──────────────────────────────────────────────────── */
function StatCard({ label, rawValue, hint, icon: Icon, change, textColor, iconGrad, blob, glow, isRevenue }: {
  label: string; rawValue: number; hint: string
  icon: any; change: { d: number; up: boolean } | null
  textColor: string; iconGrad: string; blob: string; glow: string; isRevenue?: boolean
}) {
  const counted = useCountUp(rawValue)
  const displayValue = isRevenue ? fmt(counted) : counted.toLocaleString()

  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      style={{ boxShadow: `0 6px 24px rgba(0,0,0,0.3), 0 0 36px ${glow}` }}
      className="glass-shimmer relative flex h-full flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl cursor-default"
    >
      {/* colored blob */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full blur-2xl" style={{ background: blob }} />
      {/* top shine */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent" />

      {/* Icon: fixed corner so all cards line up visually */}
      <motion.span
        whileHover={{ rotate: 10, scale: 1.08 }}
        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
        className={`pointer-events-auto absolute right-3.5 top-3.5 z-[2] inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br ${iconGrad} border border-white/10 backdrop-blur-sm ${textColor}`}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </motion.span>

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col px-4 pb-3.5 pt-3.5 pr-12">
        <p className="text-[10px] font-semibold uppercase leading-none tracking-widest text-white/30">
          {label}
        </p>
        <p
          key={displayValue}
          className="number-pop mt-2 flex min-h-[3.25rem] items-start text-lg font-bold tabular-nums leading-snug tracking-tight text-white break-words sm:text-xl"
        >
          <span className="min-w-0">{displayValue}</span>
        </p>
        <p className="mt-1.5 min-h-[2.125rem] text-[11px] leading-snug text-white/30 line-clamp-2">{hint}</p>

        <div className="mt-auto shrink-0 border-t border-white/[0.04] pt-2.5">
          <div className="flex min-h-[1.125rem] items-center gap-1 text-[11px] font-medium">
            <AnimatePresence mode="wait">
            {change ? (
              <motion.div
                key="change"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 6 }}
                className="flex items-center gap-1.5"
              >
                {change.up
                  ? <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                  : <ArrowDownRight className="h-3.5 w-3.5 text-rose-400" />}
                <span className={change.up ? 'text-emerald-400' : 'text-rose-400'}>
                  {change.up ? '+' : ''}{change.d}
                </span>
                <span className="font-normal text-white/25">since last refresh</span>
              </motion.div>
            ) : (
              <motion.span
                key="no-change"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-normal text-white/20"
              >
                No change since last refresh
              </motion.span>
            )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.article>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */
export function Dashboard() {
  const [rangeKey, setRangeKey]     = useState<DateRangeKey>('30d')
  const [data, setData]             = useState<DashboardData | null>(null)
  const [prevStats, setPrevStats]   = useState<DashboardData['stats'] | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportError, setReportError]           = useState<string | null>(null)
  const [tick, setTick]             = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const rangeRef    = useRef(rangeKey)
  rangeRef.current  = rangeKey

  async function fetchData(manual = false) {
    if (manual) setRefreshing(true)
    try {
      const next = await getDashboardData(rangeRef.current)
      setData((prev) => { if (prev) setPrevStats(prev.stats); return next })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard.')
    } finally { setLoading(false); setRefreshing(false) }
  }

  async function handleGenerateReport() {
    if (!data || generatingReport) return
    setGeneratingReport(true)
    setReportError(null)
    try {
      // Pull a fresh snapshot for the report so it matches current state.
      const fresh = await getDashboardData(rangeRef.current).catch(() => data)
      const blob  = await pdf(<AnalyticsReport data={fresh} generatedAt={new Date()} />).toBlob()
      const url   = URL.createObjectURL(blob)
      const dt    = new Date()
      const stamp = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      const a = document.createElement('a')
      a.href     = url
      a.download = `ZoomCart-Analytics-${fresh.rangeKey}-${stamp}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1500)
    } catch (err) {
      console.error('Report generation failed:', err)
      setReportError(err instanceof Error ? err.message : 'Failed to generate report.')
    } finally {
      setGeneratingReport(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    void fetchData()
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => void fetchData(), REFRESH_MS)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [rangeKey])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5_000)
    return () => clearInterval(id)
  }, [])
  void tick

  const s = data?.stats
  function delta(cur: number, prev: number | undefined) {
    if (prev == null) return null
    const d = cur - prev
    return d === 0 ? null : { d, up: d > 0 }
  }

  const CARDS = s ? [
    { label: 'Active SKUs',      rawValue: s.activeSkus,                               hint: `${s.totalProducts} total products`,                               icon: Package,       change: delta(s.activeSkus, prevStats?.activeSkus),                                                        textColor: 'text-indigo-300', iconGrad: 'from-indigo-500/30 to-indigo-600/10', blob: 'rgba(99,102,241,0.18)',  glow: 'rgba(99,102,241,0.10)',  isRevenue: false },
    { label: 'Total Revenue',    rawValue: s.totalRevenue,                             hint: `${s.verifiedCount} verified payment${s.verifiedCount !== 1 ? 's' : ''}`, icon: Wallet,        change: delta(s.totalRevenue, prevStats?.totalRevenue),                                                     textColor: 'text-emerald-300', iconGrad: 'from-emerald-500/30 to-emerald-600/10', blob: 'rgba(52,211,153,0.18)',  glow: 'rgba(52,211,153,0.10)',  isRevenue: true  },
    { label: 'Pending Payments', rawValue: s.pendingAmount,                            hint: `${s.pendingCount} awaiting verification`,                         icon: ShoppingCart,  change: delta(s.pendingCount, prevStats?.pendingCount),                                                     textColor: 'text-amber-300',   iconGrad: 'from-amber-500/30 to-amber-600/10',   blob: 'rgba(251,191,36,0.18)', glow: 'rgba(251,191,36,0.10)', isRevenue: true  },
    { label: 'Stock Alerts',     rawValue: s.lowStockCount + s.outOfStockCount,        hint: `${s.outOfStockCount} out · ${s.lowStockCount} low`, icon: AlertTriangle, change: delta(s.lowStockCount + s.outOfStockCount, prevStats ? prevStats.lowStockCount + prevStats.outOfStockCount : undefined), textColor: 'text-rose-300',    iconGrad: 'from-rose-500/30 to-rose-600/10',    blob: 'rgba(248,113,113,0.18)', glow: 'rgba(248,113,113,0.10)', isRevenue: false },
  ] : []

  const revLabel    = rangeKey === 'today' ? 'Revenue Today (by Hour)' : rangeKey === 'year' || rangeKey === 'all' ? 'Revenue (Monthly)' : `Revenue — ${DATE_RANGE_LABELS[rangeKey]}`
  const tickInterval = data ? Math.max(0, Math.floor(data.dailyRevenue.length / 8) - 1) : 4

  const STATUS_PILL = {
    VERIFIED: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20',
    PENDING:  'bg-amber-500/15  text-amber-300  border border-amber-500/20',
    EXPIRED:  'bg-white/5       text-zinc-400   border border-white/10',
  } as const

  return (
    <div className="relative space-y-6">

      {/* ── Ambient orbs ─────────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="orb-float  absolute -left-60 -top-60 h-[32rem] w-[32rem] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="orb-float2 absolute right-0 top-1/3 h-96 w-96 rounded-full bg-violet-600/8 blur-3xl" />
        <div className="orb-float3 absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-600/6 blur-3xl" />
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-wrap items-start justify-between gap-3"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <motion.span
              whileHover={{ rotate: [0, -10, 10, 0], scale: 1.15 }}
              transition={{ duration: 0.5 }}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/40 to-violet-600/20"
            >
              <Sparkles className="h-4 w-4 text-indigo-300" />
            </motion.span>
            <h1 className="bg-gradient-to-r from-white via-white/90 to-white/50 bg-clip-text text-xl font-bold tracking-tight text-transparent">
              Dashboard
            </h1>

            {/* Live indicator */}
            <div className="relative flex h-4 w-4 items-center justify-center">
              <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400/40" />
              <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
            </div>
          </div>
          <p className="mt-1 pl-[2.6rem] text-xs text-white/30">Live store snapshot · auto-refreshes every 30 s</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              onClick={() => void fetchData(true)}
              disabled={refreshing}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-white/60 backdrop-blur-xl transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>

            <motion.button
              type="button"
              onClick={() => void handleGenerateReport()}
              disabled={!data || generatingReport}
              whileHover={!generatingReport ? { scale: 1.04 } : {}}
              whileTap={!generatingReport ? { scale: 0.95 } : {}}
              className="relative flex items-center gap-1.5 overflow-hidden rounded-xl border border-indigo-400/30 bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 disabled:cursor-wait disabled:opacity-80"
              style={{ boxShadow: '0 4px 14px rgba(99,102,241,0.35), inset 0 1px 0 rgba(255,255,255,0.15)' }}
            >
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 transition-opacity hover:opacity-100" />
              {generatingReport
                ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <FileDown className="h-3.5 w-3.5" />
                    Get Report
                  </>
                )
              }
            </motion.button>
          </div>
          {data && <p className="text-[10px] text-white/20">Updated {timeAgo(data.fetchedAt)}</p>}
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GlassPanel className="px-4 py-3" glow="rgba(248,113,113,0.15)">
              <p className="text-sm text-rose-300">{error}</p>
            </GlassPanel>
          </motion.div>
        )}
        {reportError && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GlassPanel className="flex items-center justify-between px-4 py-3" glow="rgba(248,113,113,0.15)">
              <p className="text-sm text-rose-300">Report failed: {reportError}</p>
              <button onClick={() => setReportError(null)} className="text-xs text-white/30 hover:text-white/60">Dismiss</button>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Date filter ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
      >
        <GlassPanel>
          <div className="flex flex-wrap items-center gap-1 p-1.5">
            <span className="px-2 text-[11px] font-medium uppercase tracking-widest text-white/25">Period</span>
            {(Object.keys(DATE_RANGE_LABELS) as DateRangeKey[]).map((key) => (
              <motion.button
                key={key}
                type="button"
                onClick={() => setRangeKey(key)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`rounded-xl px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
                  rangeKey === key
                    ? 'border border-indigo-400/30 bg-indigo-500/20 text-indigo-200 shadow-sm shadow-indigo-500/10'
                    : 'text-white/40 hover:bg-white/[0.06] hover:text-white/70'
                }`}
              >
                {DATE_RANGE_LABELS[key]}
              </motion.button>
            ))}
          </div>
        </GlassPanel>
      </motion.div>

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skel key={i} className="h-28" />)}
        </div>
      ) : (
        <motion.div
          variants={stagger(0.05)}
          initial="hidden"
          animate="visible"
          className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {CARDS.map((card) => <StatCard key={card.label} {...card} />)}
        </motion.div>
      )}

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-12">
            <Skel className="h-32 lg:col-span-4" />
            <Skel className="h-32 lg:col-span-8" />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Skel className="h-52 lg:col-span-2" />
            <Skel className="h-52" />
            <Skel className="h-60" />
            <Skel className="h-60" />
            <Skel className="h-60" />
          </div>
        </div>
      ) : data ? (
        <>
          {/* Extra analytics */}
          <motion.div
            variants={stagger(0.06)}
            initial="hidden"
            animate="visible"
            className="grid gap-3 lg:grid-cols-12"
          >
            <motion.div variants={fadeUp} className="lg:col-span-4">
              <GlassPanel className="p-4">
                <div className="mb-1 flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 shrink-0 text-indigo-300" aria-hidden />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/45">Payment mix</h3>
                </div>
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={data.paymentMix} layout="vertical" margin={{ top: 2, right: 8, left: 0, bottom: 2 }} barSize={12}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.22)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={54} tick={{ fill: 'rgba(255,255,255,0.42)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<MixTip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="value" radius={[0, 3, 3, 0]} opacity={0.92}>
                      {data.paymentMix.map((_, i) => (
                        <Cell key={i} fill={PAY_MIX_COLORS[i % PAY_MIX_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GlassPanel>
            </motion.div>
            <motion.div variants={fadeUp} className="lg:col-span-8">
              <GlassPanel className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/45">Period breakdown</h3>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    { k: 'Verified', v: data.stats.verifiedCount.toLocaleString(), sub: 'payments', color: 'text-emerald-300/90' },
                    { k: 'Pending', v: data.stats.pendingCount.toLocaleString(), sub: fmt(data.stats.pendingAmount), color: 'text-amber-300/90' },
                    { k: 'Expired', v: data.stats.expiredCount.toLocaleString(), sub: 'in range', color: 'text-zinc-400' },
                    { k: 'Verify rate', v: `${data.stats.verificationRate.toFixed(0)}%`, sub: 'of all in period', color: 'text-indigo-300/90' },
                    { k: 'Selling days', v: String(data.stats.activeRevenueDays), sub: 'with revenue', color: 'text-white/85' },
                    { k: 'Categories', v: String(data.stockBar.length), sub: 'stock groups', color: 'text-violet-300/90' },
                  ].map((cell) => (
                    <div key={cell.k} className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-white/28">{cell.k}</p>
                      <p className={`mt-0.5 text-base font-bold tabular-nums leading-tight ${cell.color}`}>{cell.v}</p>
                      <p className="mt-0.5 truncate text-[10px] text-white/22">{cell.sub}</p>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>

          {/* Row 1 */}
          <motion.div
            variants={stagger(0.1)}
            initial="hidden"
            animate="visible"
            className="grid gap-4 lg:grid-cols-3"
          >
            {/* Area — Revenue */}
            <motion.div variants={fadeUp} className="lg:col-span-2">
              <ChartPanel title={revLabel} compact>
                <ResponsiveContainer width="100%" height={158}>
                  <AreaChart data={data.dailyRevenue} margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#34d399" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="oG" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#818cf8" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" interval={tickInterval} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="rev" tickFormatter={(v) => v === 0 ? '0' : `${(v / 1000).toFixed(0)}k`} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} width={46} />
                    <YAxis yAxisId="ord" orientation="right" allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                    <Tooltip content={<RevTip />} />
                    <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="#34d399" strokeWidth={2} fill="url(#rG)" dot={false} activeDot={{ r: 4, fill: '#34d399', strokeWidth: 2, stroke: '#065f46' }} />
                    <Area yAxisId="ord" type="monotone" dataKey="orders"  stroke="#818cf8" strokeWidth={1.25} fill="url(#oG)" dot={false} activeDot={{ r: 3, fill: '#818cf8' }} />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-2 flex gap-4">
                  <span className="flex items-center gap-2 text-[11px] text-white/35"><span className="h-1.5 w-4 rounded-full bg-emerald-400/70 inline-block" /> Revenue</span>
                  <span className="flex items-center gap-2 text-[11px] text-white/35"><span className="h-1.5 w-4 rounded-full bg-indigo-400/70 inline-block" /> Orders</span>
                </div>
              </ChartPanel>
            </motion.div>

            {/* Donut — Peak Hours */}
            <motion.div variants={fadeUp}>
              <ChartPanel title="Peak Shopping Hours" compact>
                {data.peakHours.length === 0 ? (
                  <div className="flex h-36 items-center justify-center">
                    <p className="text-xs text-white/25">No payment data yet.</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={148}>
                      <PieChart>
                        <Pie data={data.peakHours} cx="50%" cy="50%" innerRadius={42} outerRadius={66} paddingAngle={4} dataKey="value" strokeWidth={0}
                          isAnimationActive animationBegin={200} animationDuration={800}>
                          {data.peakHours.map((e, i) => (
                            <Cell key={e.name} fill={PEAK_COLORS[i % PEAK_COLORS.length]} opacity={0.85} />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-0.5 flex flex-wrap justify-center gap-x-2 gap-y-1">
                      {data.peakHours.map((e, i) => (
                        <span key={e.name} className="flex items-center gap-1.5 text-[11px] text-white/40">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: PEAK_COLORS[i % PEAK_COLORS.length] }} />
                          {e.name} ({e.value})
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </ChartPanel>
            </motion.div>
          </motion.div>

          {/* Row 2 */}
          <motion.div
            variants={stagger(0.15)}
            initial="hidden"
            animate="visible"
            className="grid gap-4 lg:grid-cols-3"
          >
            {/* Horizontal bar — Top 5 */}
            <motion.div variants={fadeUp}>
              <ChartPanel title="Top 5 Sold Products">
                {data.topProducts.every((p) => p.salesCount === 0) ? (
                  <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
                    <TrendingUp className="h-8 w-8 text-white/10" />
                    <p className="text-xs text-white/25 leading-relaxed">Sales tracked when stock<br />is reduced via Inventory.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={data.topProducts} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barSize={13}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={88} tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={(v: string) => v.length > 12 ? `${v.slice(0, 11)}…` : v} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null
                        const it = payload[0]
                        return (
                          <GlassTip>
                            <p className="mb-1 font-semibold text-white/80">{(it?.payload as any)?.name}</p>
                            <p style={{ color: TOP_COLOR }}>{it?.value} units sold</p>
                            <p className="text-white/30">{(it?.payload as any)?.stockQuantity} in stock</p>
                          </GlassTip>
                        )
                      }} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Bar dataKey="salesCount" fill={TOP_COLOR} radius={[0, 4, 4, 0]} opacity={0.8}
                        isAnimationActive animationBegin={300} animationDuration={800} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            </motion.div>

            {/* Grouped bar — Stock */}
            <motion.div variants={fadeUp}>
              <ChartPanel title="Stock Status by Category">
                {data.stockBar.length === 0 ? (
                  <div className="flex h-48 items-center justify-center">
                    <p className="text-sm text-white/25">No products in catalog.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={data.stockBar} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={9}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="category" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false}
                        tickFormatter={(v: string) => v.length > 8 ? `${v.slice(0, 7)}…` : v} />
                      <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 11 }} axisLine={false} tickLine={false} width={24} />
                      <Tooltip content={<GenTip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                      <Legend wrapperStyle={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', paddingTop: '8px' }}
                        formatter={(v) => v === 'inStock' ? 'In Stock' : v === 'lowStock' ? 'Low' : 'Out'} />
                      <Bar dataKey="inStock"    name="inStock"    fill={STOCK_COLORS.inStock}    radius={[3,3,0,0]} isAnimationActive animationBegin={400} animationDuration={700} />
                      <Bar dataKey="lowStock"   name="lowStock"   fill={STOCK_COLORS.lowStock}   radius={[3,3,0,0]} isAnimationActive animationBegin={400} animationDuration={700} />
                      <Bar dataKey="outOfStock" name="outOfStock" fill={STOCK_COLORS.outOfStock} radius={[3,3,0,0]} isAnimationActive animationBegin={400} animationDuration={700} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartPanel>
            </motion.div>

            {/* Insights */}
            <motion.div variants={fadeUp}>
              <GlassPanel>
                <div className="p-5">
                  <div className="mb-5 flex items-center gap-2">
                    <motion.span
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.4 }}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/30 to-violet-600/10 border border-white/10"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
                    </motion.span>
                    <h3 className="text-sm font-semibold text-white/70 tracking-wide">Insights</h3>
                  </div>
                  <div className="space-y-4">
                    {data.insights.map((ins, i) => (
                      <motion.div
                        key={ins.label}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 + 0.2 }}
                        className="border-b border-white/[0.06] pb-4 last:border-0 last:pb-0"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/25">{ins.label}</p>
                        <p className="mt-1 text-base font-bold text-white/85">{ins.value}</p>
                        <p className="mt-0.5 text-xs text-white/30">{ins.sub}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        </>
      ) : null}

      {/* ── Recent payments ───────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <GlassPanel>
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h3 className="text-sm font-semibold text-white/70 tracking-wide">Recent Payments</h3>
            {data && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/30">
                {data.stats.totalPayments} in period
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-2 p-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-9 animate-pulse rounded-xl bg-white/[0.04]" />
              ))}
            </div>
          ) : data && data.recentPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-widest text-white/25">
                    <th className="px-5 py-3">Payment ID</th>
                    <th className="px-5 py-3">Amount</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 + 0.1 }}
                      className="border-t border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-white/30">{p.id.slice(-8).toUpperCase()}</td>
                      <td className="px-5 py-3 font-semibold text-white/80">{fmt(p.amount)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_PILL[p.status] ?? STATUS_PILL.EXPIRED}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-white/30">{fmtDate(p.createdAt)}</td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center">
              <p className="text-sm text-white/25">No payments in this period.</p>
            </div>
          )}
        </GlassPanel>
      </motion.div>

    </div>
  )
}
