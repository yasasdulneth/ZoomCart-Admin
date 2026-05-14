import { useEffect, useState, type FormEvent } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Search, X, Plus, Tag, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from '../lib/services/product.service'
import type { Product } from '../types/models'

function formatMoney(value: number): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'LKR' }).format(value)
}

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

export function Products() {
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [aisle, setAisle] = useState('')
  const [shelfLocation, setShelfLocation] = useState('')
  const [adding, setAdding] = useState(false)

  const [selected, setSelected] = useState<Product | null>(null)
  const [editBarcode, setEditBarcode] = useState('')
  const [editOriginalPrice, setEditOriginalPrice] = useState('')
  const [editDiscountPercentage, setEditDiscountPercentage] = useState('')
  const [editDiscountedPrice, setEditDiscountedPrice] = useState('')
  const [editAisle, setEditAisle] = useState('')
  const [editShelfLocation, setEditShelfLocation] = useState('')
  const [editErrors, setEditErrors] = useState<string[]>([])
  const [savingEdit, setSavingEdit] = useState(false)

  const [search, setSearch] = useState('')
  const [scanTarget, setScanTarget] = useState<'add' | 'edit' | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  function handleBarcodeScan(result: { rawValue: string }[]) {
    if (!result?.length || !result[0]?.rawValue) return
    const value = result[0].rawValue.trim()
    if (scanTarget === 'add') setSku(value)
    if (scanTarget === 'edit') setEditBarcode(value)
    setScanTarget(null); setScanError(null)
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await getProducts({ includeInactive: true })
        if (!cancelled) { setItems(list); setError(null) }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load products.')
      } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault(); setAdding(true); setError(null)
    try {
      const p = Number(price); const s = Number(stock)
      if (!name.trim()) throw new Error('Name is required.')
      if (!sku.trim())  throw new Error('Barcode is required.')
      if (Number.isNaN(p) || p < 0) throw new Error('Valid price required.')
      if (Number.isNaN(s) || s < 0) throw new Error('Valid stock required.')
      await createProduct({ id: '', name: name.trim(), barcode: sku.trim(), price: p, originalPrice: p, discountPercentage: 0, discountedPrice: p, hasDiscount: false, category: 'General', aisle: aisle.trim(), shelfSection: shelfLocation.trim(), stockQuantity: s, nutritionInfo: '', cheaperAlternativeId: undefined, imageUrl: undefined, isActive: true, createdAt: undefined, updatedAt: undefined })
      const list = await getProducts({ includeInactive: true })
      setItems(list); setName(''); setSku(''); setPrice(''); setStock(''); setAisle(''); setShelfLocation('')
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add product.')
    } finally { setAdding(false) }
  }

  async function handleDelete(id: string) {
    setBusyId(id); setError(null)
    try { await deleteProduct(id); const list = await getProducts({ includeInactive: true }); setItems(list) }
    catch (err) { setError(err instanceof Error ? err.message : 'Delete failed.')
    } finally { setBusyId(null) }
  }

  async function handleToggleActive(p: Product) {
    setBusyId(p.id); setError(null)
    try { await updateProduct(p.id, { isActive: !p.isActive }); const list = await getProducts({ includeInactive: true }); setItems(list) }
    catch (err) { setError(err instanceof Error ? err.message : 'Update failed.')
    } finally { setBusyId(null) }
  }

  function openEdit(p: Product) {
    setSelected(p); setEditErrors([])
    setEditBarcode(p.barcode ?? p.sku ?? '')
    setEditOriginalPrice(String(p.originalPrice ?? p.price))
    setEditDiscountPercentage(String(p.discountPercentage ?? 0))
    setEditDiscountedPrice(String(p.discountedPrice ?? p.price))
    setEditAisle(p.aisle ?? ''); setEditShelfLocation(p.shelfSection ?? '')
  }

  function validateDiscountInputs(op: number, dp: number, discounted: number) {
    const errs: string[] = []
    if (Number.isNaN(op) || op < 0) errs.push('Original price must be a non-negative number.')
    if (Number.isNaN(dp) || dp < 0 || dp > 100) errs.push('Discount % must be between 0 and 100.')
    if (Number.isNaN(discounted) || discounted < 0) errs.push('Discounted price must be a non-negative number.')
    if (!Number.isNaN(op) && !Number.isNaN(discounted) && discounted > op) errs.push('Discounted price cannot exceed original price.')
    return errs
  }

  function onChangeDiscountPercentage(next: string) {
    setEditDiscountPercentage(next)
    const op = Number(editOriginalPrice); const dp = Number(next)
    if (!Number.isNaN(op) && !Number.isNaN(dp)) setEditDiscountedPrice((op - (op * dp) / 100).toFixed(2))
  }
  function onChangeDiscountedPrice(next: string) {
    setEditDiscountedPrice(next)
    const op = Number(editOriginalPrice); const d = Number(next)
    if (!Number.isNaN(op) && !Number.isNaN(d) && op > 0) setEditDiscountPercentage((((op - d) / op) * 100).toFixed(2))
  }
  function onChangeOriginalPrice(next: string) {
    setEditOriginalPrice(next)
    const op = Number(next); const dp = Number(editDiscountPercentage); const d = Number(editDiscountedPrice)
    if (!Number.isNaN(op) && !Number.isNaN(dp)) { setEditDiscountedPrice((op - (op * dp) / 100).toFixed(2)); return }
    if (!Number.isNaN(op) && !Number.isNaN(d) && op > 0) setEditDiscountPercentage((((op - d) / op) * 100).toFixed(2))
  }

  async function handleSaveEdit() {
    if (!selected) return
    setSavingEdit(true); setEditErrors([]); setError(null)
    try {
      const op = Number(editOriginalPrice), dp = Number(editDiscountPercentage), discounted = Number(editDiscountedPrice)
      const errs = validateDiscountInputs(op, dp, discounted)
      if (errs.length > 0) { setEditErrors(errs); return }
      await updateProduct(selected.id, { barcode: editBarcode.trim(), originalPrice: op, discountPercentage: dp, discountedPrice: discounted, aisle: editAisle.trim(), shelfSection: editShelfLocation.trim() })
      const list = await getProducts({ includeInactive: true })
      setItems(list); setSelected(list.find((p) => p.id === selected.id) ?? null)
    } catch (err) { setError(err instanceof Error ? err.message : 'Save failed.')
    } finally { setSavingEdit(false) }
  }

  const q = search.trim().toLowerCase()
  const filteredItems = q ? items.filter((p) => p.name.toLowerCase().includes(q) || (p.barcode ?? '').toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)) : items

  return (
    <div className="space-y-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="orb-float absolute -left-60 -top-60 h-[30rem] w-[30rem] rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="orb-float2 absolute -right-60 bottom-0 h-[24rem] w-[24rem] rounded-full bg-violet-600/8 blur-3xl" />
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/40 to-violet-600/20">
            <Tag className="h-4 w-4 text-indigo-300" />
          </span>
          <h1 className="bg-gradient-to-r from-white via-white/90 to-white/50 bg-clip-text text-xl font-bold tracking-tight text-transparent">Products</h1>
        </div>
        <p className="mt-1 pl-[2.6rem] text-xs text-white/30">Product catalog</p>
      </motion.div>

      {/* Add product form */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassPanel glow="rgba(99,102,241,0.06)">
          <div className="border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-indigo-300" />
              <p className="text-sm font-semibold text-white/70">Add Product</p>
            </div>
          </div>
          <form onSubmit={(e) => void handleAdd(e)} className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name *" className={`${glassInput} xl:col-span-2`} />

            <div className="sm:col-span-2 xl:col-span-2">
              <div className="flex items-center gap-2">
                <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="Barcode *" className={`${glassInput} flex-1`} />
                <motion.button
                  type="button" title="Scan barcode" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => { setScanTarget('add'); setScanError(null) }}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs text-white/50 hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors"
                >
                  <Camera className="h-4 w-4" /> Scan
                </motion.button>
              </div>
              <p className="mt-1 text-[10px] text-white/20">Required — enter or scan</p>
            </div>

            <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" type="number" min={0} step="0.01" className={glassInput} />
            <input value={aisle} onChange={(e) => setAisle(e.target.value)} placeholder="Aisle #" className={glassInput} />
            <input value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} placeholder="Shelf location" className={glassInput} />
            <input value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Stock" type="number" min={0} step="1" className={glassInput} />

            <motion.button
              type="submit" disabled={adding}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 transition-all"
            >
              <Plus className="h-4 w-4" />{adding ? 'Adding…' : 'Add'}
            </motion.button>
          </form>
        </GlassPanel>
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
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or barcode…" className="flex-1 bg-transparent text-sm text-white/70 outline-none placeholder:text-white/20" />
          {search && <span className="text-xs text-white/25">{filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}</span>}
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
                    <th className="px-5 py-3.5">SKU</th>
                    <th className="px-5 py-3.5">Aisle</th>
                    <th className="px-5 py-3.5">Shelf</th>
                    <th className="px-5 py-3.5">Orig. Price</th>
                    <th className="px-5 py-3.5">Discount %</th>
                    <th className="px-5 py-3.5">Discounted</th>
                    <th className="px-5 py-3.5">Stock</th>
                    <th className="px-5 py-3.5">Active</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr><td colSpan={10} className="px-5 py-12 text-center">
                      <Tag className="mx-auto mb-3 h-8 w-8 text-white/10" />
                      <p className="text-sm text-white/25">{q ? 'No products match your search.' : 'No products yet. Add one above.'}</p>
                    </td></tr>
                  ) : filteredItems.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.025 }}
                      className="border-t border-white/[0.04] transition-colors hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3.5 font-medium text-white/80">{p.name}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-white/35">{p.sku ?? '—'}</td>
                      <td className="px-5 py-3.5 text-white/40">{p.aisle?.trim() || '—'}</td>
                      <td className="px-5 py-3.5 text-white/40">{p.shelfSection?.trim() || '—'}</td>
                      <td className="px-5 py-3.5">
                        {p.hasDiscount
                          ? <span className="text-white/30 line-through">{formatMoney(p.originalPrice)}</span>
                          : <span className="text-white/70">{formatMoney(p.originalPrice)}</span>}
                      </td>
                      <td className="px-5 py-3.5 text-white/45">{p.hasDiscount ? `${p.discountPercentage.toFixed(1)}%` : '—'}</td>
                      <td className="px-5 py-3.5">
                        {p.hasDiscount
                          ? <span className="font-semibold text-emerald-300">{formatMoney(p.discountedPrice)}</span>
                          : <span className="text-white/25">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`font-semibold ${p.stockQuantity === 0 ? 'text-rose-300' : p.stockQuantity < 5 ? 'text-amber-300' : 'text-white/70'}`}>{p.stockQuantity}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        {p.isActive === false
                          ? <span className="inline-flex items-center rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">Inactive</span>
                          : <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">Active</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <motion.button type="button" disabled={busyId === p.id} onClick={() => openEdit(p)} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                            className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/50 hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-30 transition-colors">
                            <Pencil className="h-3 w-3" /> Edit
                          </motion.button>
                          <motion.button type="button" disabled={busyId === p.id} onClick={() => void handleToggleActive(p)} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                            className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/50 hover:bg-white/[0.08] hover:text-white/80 disabled:opacity-30 transition-colors">
                            {p.isActive === false ? <ToggleLeft className="h-3 w-3" /> : <ToggleRight className="h-3 w-3" />}
                          </motion.button>
                          <motion.button type="button" disabled={busyId === p.id} onClick={() => void handleDelete(p.id)} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                            className="flex items-center gap-1 rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-2.5 py-1.5 text-xs text-rose-300/70 hover:bg-rose-500/15 hover:text-rose-300 disabled:opacity-30 transition-colors">
                            <Trash2 className="h-3 w-3" />{busyId === p.id ? '…' : ''}
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        )}
      </motion.div>

      {/* Edit discount panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <GlassPanel glow="rgba(99,102,241,0.08)">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                <div className="flex items-center gap-2">
                  <Pencil className="h-4 w-4 text-indigo-300" />
                  <p className="text-sm font-semibold text-white/70">Edit Discount</p>
                  <span className="text-xs text-white/30">— {selected.name}</span>
                </div>
                <motion.button type="button" onClick={() => setSelected(null)} disabled={savingEdit} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  className="rounded-lg p-1 text-white/30 hover:text-white/60">
                  <X className="h-4 w-4" />
                </motion.button>
              </div>

              <div className="p-5 space-y-4">
                {/* Barcode row */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">Barcode</label>
                  <div className="flex gap-2">
                    <input id="edit-barcode" value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} placeholder="Type or scan barcode" className={glassInput} disabled={savingEdit} />
                    <motion.button type="button" disabled={savingEdit} onClick={() => { setScanTarget('edit'); setScanError(null) }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs text-white/50 hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-indigo-300 disabled:opacity-50 transition-colors">
                      <Camera className="h-4 w-4" /> Scan
                    </motion.button>
                  </div>
                </div>

                {/* Validation errors */}
                <AnimatePresence>
                  {editErrors.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3" role="alert">
                      <ul className="list-disc space-y-0.5 pl-4 text-xs text-rose-300">
                        {editErrors.map((m) => <li key={m}>{m}</li>)}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Price/discount fields */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">Aisle #</label>
                    <input id="edit-aisle" value={editAisle} onChange={(e) => setEditAisle(e.target.value)} placeholder="e.g. 12" className={glassInput} disabled={savingEdit} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">Shelf location</label>
                    <input id="edit-shelf" value={editShelfLocation} onChange={(e) => setEditShelfLocation(e.target.value)} placeholder="e.g. B-3" className={glassInput} disabled={savingEdit} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">Original price</label>
                    <input id="edit-original" value={editOriginalPrice} onChange={(e) => onChangeOriginalPrice(e.target.value)} type="number" min={0} step="0.01" className={glassInput} disabled={savingEdit} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">Discount %</label>
                    <input id="edit-discount-pct" value={editDiscountPercentage} onChange={(e) => onChangeDiscountPercentage(e.target.value)} type="number" min={0} max={100} step="0.01" className={glassInput} disabled={savingEdit} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/25">Discounted price</label>
                    <input id="edit-discounted" value={editDiscountedPrice} onChange={(e) => onChangeDiscountedPrice(e.target.value)} type="number" min={0} step="0.01" className={glassInput} disabled={savingEdit} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <motion.button type="button" onClick={() => void handleSaveEdit()} disabled={savingEdit} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 transition-all">
                    {savingEdit ? 'Saving…' : 'Save discount'}
                  </motion.button>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barcode scanner modal */}
      <AnimatePresence>
        {scanTarget !== null && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', stiffness: 300, damping: 26 }}
              className="w-full max-w-sm"
            >
              <GlassPanel glow="rgba(99,102,241,0.12)">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-indigo-300" />
                    <p className="text-sm font-semibold text-white/80">Scan Barcode</p>
                  </div>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button" onClick={() => { setScanTarget(null); setScanError(null) }} className="rounded-lg p-1 text-white/30 hover:text-white/60">
                    <X className="h-4 w-4" />
                  </motion.button>
                </div>
                <p className="px-5 pt-3 text-xs text-white/25">Point your camera at a barcode or QR code. The value will be filled in automatically.</p>
                <div className="overflow-hidden p-3">
                  <div className="overflow-hidden rounded-xl border border-white/[0.06]">
                    <Scanner
                      onScan={handleBarcodeScan}
                      onError={(err: unknown) => {
                        console.error(err)
                        setScanError('Camera access failed. Please allow camera permission and try again.')
                      }}
                    />
                  </div>
                </div>
                {scanError && <p className="px-5 pb-3 text-xs text-rose-300">{scanError}</p>}
                <div className="border-t border-white/[0.06] p-4">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} type="button" onClick={() => { setScanTarget(null); setScanError(null) }} className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm text-white/55 hover:bg-white/[0.08] transition-colors">
                    Cancel
                  </motion.button>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
