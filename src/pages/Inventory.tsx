import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Archive, Search, Save, AlertTriangle } from 'lucide-react'
import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  getInventoryProducts,
  getStockStatus,
  updateLowStockThreshold,
  updateProductStock,
  type InventoryProduct,
} from '../lib/services/inventory.service'

const glassNumInput = 'w-24 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2 py-1.5 text-sm text-white/80 outline-none focus:border-indigo-400/40 focus:bg-white/[0.07] backdrop-blur-sm transition-colors [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

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

function StockBadge({ status }: { status: string }) {
  if (status === 'In Stock')    return <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">In Stock</span>
  if (status === 'Low Stock')   return <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300"><AlertTriangle className="h-2.5 w-2.5" />Low</span>
  return <span className="inline-flex items-center rounded-full border border-rose-500/25 bg-rose-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-rose-300">Out of Stock</span>
}

export function Inventory() {
  const [rows, setRows] = useState<InventoryProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stockDrafts, setStockDrafts] = useState<Record<string, string>>({})
  const [thresholdDrafts, setThresholdDrafts] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    try {
      const list = await getInventoryProducts()
      setRows(list); setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const setStockDraft = (id: string, v: string) => setStockDrafts((d) => ({ ...d, [id]: v }))
  const setThresholdDraft = (id: string, v: string) => setThresholdDrafts((d) => ({ ...d, [id]: v }))

  async function handleSaveStock(row: InventoryProduct) {
    const next = Number(stockDrafts[row.id] ?? String(row.stockQuantity))
    if (Number.isNaN(next) || next < 0) { setError('Stock quantity must be a non-negative number.'); return }
    setBusyId(row.id); setError(null)
    try {
      await updateProductStock(row.id, next)
      setStockDrafts((d) => { const n = { ...d }; delete n[row.id]; return n })
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update stock.')
    } finally { setBusyId(null) }
  }

  async function handleSaveThreshold(row: InventoryProduct) {
    const next = Number(thresholdDrafts[row.id] ?? String(row.lowStockThreshold))
    if (Number.isNaN(next) || next < 0) { setError('Threshold must be a non-negative number.'); return }
    setBusyId(row.id); setError(null)
    try {
      await updateLowStockThreshold(row.id, next)
      setThresholdDrafts((d) => { const n = { ...d }; delete n[row.id]; return n })
      await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update threshold.')
    } finally { setBusyId(null) }
  }

  const q = search.trim().toLowerCase()
  const filteredRows = q
    ? rows.filter((r) => r.name.toLowerCase().includes(q) || (r.barcode ?? '').toLowerCase().includes(q) || (r.category ?? '').toLowerCase().includes(q))
    : rows

  const outCount  = rows.filter((r) => getStockStatus(r.stockQuantity, r.lowStockThreshold) === 'Out of Stock').length
  const lowCount  = rows.filter((r) => getStockStatus(r.stockQuantity, r.lowStockThreshold) === 'Low Stock').length

  return (
    <div className="space-y-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="orb-float absolute -left-60 top-20 h-[28rem] w-[28rem] rounded-full bg-amber-600/8 blur-3xl" />
        <div className="orb-float2 absolute -right-40 bottom-20 h-[20rem] w-[20rem] rounded-full bg-emerald-600/8 blur-3xl" />
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-amber-500/40 to-orange-600/20">
            <Archive className="h-4 w-4 text-amber-300" />
          </span>
          <h1 className="bg-gradient-to-r from-white via-white/90 to-white/50 bg-clip-text text-xl font-bold tracking-tight text-transparent">Inventory</h1>
          {(outCount > 0 || lowCount > 0) && (
            <span className="flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
              <AlertTriangle className="h-3 w-3" />{outCount > 0 ? `${outCount} out` : `${lowCount} low`}
            </span>
          )}
        </div>
        <p className="mt-1 pl-[2.6rem] text-xs text-white/30">
          Stock from the Products collection · Default low-stock threshold: {DEFAULT_LOW_STOCK_THRESHOLD}
        </p>
      </motion.div>

      {/* Stats strip */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Products', value: rows.length, color: 'text-white/70' },
          { label: 'Low Stock',      value: lowCount,    color: 'text-amber-300' },
          { label: 'Out of Stock',   value: outCount,    color: 'text-rose-300'  },
        ].map((s) => (
          <GlassPanel key={s.label} className="px-4 py-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-white/30">{s.label}</p>
          </GlassPanel>
        ))}
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <GlassPanel className="px-4 py-3" glow="rgba(248,113,113,0.15)"><p className="text-sm text-rose-300">{error}</p></GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassPanel className="flex items-center gap-3 px-4 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-white/25" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, barcode or category…"
            className="flex-1 bg-transparent text-sm text-white/70 outline-none placeholder:text-white/20"
          />
        </GlassPanel>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-white/[0.04]" />)}</div>
        ) : (
          <GlassPanel>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-[11px] font-semibold uppercase tracking-widest text-white/25">
                    <th className="px-5 py-3.5">Name</th>
                    <th className="px-5 py-3.5">Barcode</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Stock qty</th>
                    <th className="px-5 py-3.5">Low threshold</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-white/25">{q ? 'No products match your search.' : 'No active products. Add products first.'}</td></tr>
                  ) : filteredRows.map((r, i) => {
                    const stockVal = Number(stockDrafts[r.id] ?? r.stockQuantity)
                    const thresholdVal = Number(thresholdDrafts[r.id] ?? r.lowStockThreshold)
                    const status = getStockStatus(Number.isNaN(stockVal) ? r.stockQuantity : stockVal, Number.isNaN(thresholdVal) ? r.lowStockThreshold : thresholdVal)
                    const warn = status !== 'In Stock'

                    return (
                      <motion.tr
                        key={r.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className={`border-t border-white/[0.04] transition-colors ${warn ? 'bg-rose-500/[0.03]' : 'hover:bg-white/[0.02]'}`}
                      >
                        <td className="px-5 py-3.5 font-medium text-white/80">{r.name}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-white/35">{r.barcode || '—'}</td>
                        <td className="px-5 py-3.5 text-white/45">{r.category || '—'}</td>
                        <td className="px-5 py-3.5">
                          <input type="number" min={0} step={1} value={stockDrafts[r.id] ?? String(r.stockQuantity)} onChange={(e) => setStockDraft(r.id, e.target.value)} className={glassNumInput} />
                        </td>
                        <td className="px-5 py-3.5">
                          <input type="number" min={0} step={1} value={thresholdDrafts[r.id] ?? String(r.lowStockThreshold)} onChange={(e) => setThresholdDraft(r.id, e.target.value)} className={glassNumInput} />
                        </td>
                        <td className="px-5 py-3.5"><StockBadge status={status} /></td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <motion.button
                              type="button" disabled={busyId === r.id}
                              onClick={() => void handleSaveStock(r)}
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/50 hover:bg-white/[0.08] hover:text-white/75 disabled:opacity-30 transition-colors"
                            >
                              <Save className="h-3 w-3" /> Stock
                            </motion.button>
                            <motion.button
                              type="button" disabled={busyId === r.id}
                              onClick={() => void handleSaveThreshold(r)}
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-white/50 hover:bg-white/[0.08] hover:text-white/75 disabled:opacity-30 transition-colors"
                            >
                              <Save className="h-3 w-3" /> Threshold
                            </motion.button>
                          </div>
                        </td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        )}
      </motion.div>
    </div>
  )
}
