import { adminApi } from '../api/adminApi'

const DEFAULT_LOW_STOCK_THRESHOLD = 10

// ── Date range helpers ────────────────────────────────────────────────────────

export type DateRangeKey = 'today' | '7d' | '30d' | 'month' | 'year' | 'all'

export const DATE_RANGE_LABELS: Record<DateRangeKey, string> = {
  today: 'Today',
  '7d': '7 Days',
  '30d': '30 Days',
  month: 'This Month',
  year: 'This Year',
  all: 'All Time',
}

export function getDateRange(key: DateRangeKey): { from: Date | null; to: Date | null } {
  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  if (key === 'all') return { from: null, to: null }

  const from = new Date(now)
  from.setHours(0, 0, 0, 0)

  if (key === 'today') return { from, to }
  if (key === '7d') { from.setDate(from.getDate() - 6); return { from, to } }
  if (key === '30d') { from.setDate(from.getDate() - 29); return { from, to } }
  if (key === 'month') { from.setDate(1); return { from, to } }
  if (key === 'year') { from.setMonth(0, 1); return { from, to } }
  return { from: null, to: null }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type DashboardStats = {
  activeSkus: number
  totalProducts: number
  lowStockCount: number
  outOfStockCount: number
  totalRevenue: number
  pendingAmount: number
  pendingCount: number
  verifiedCount: number
  totalPayments: number
  avgOrderValue: number
  verificationRate: number
  expiredCount: number
  /** Days (buckets) in range with any verified revenue. */
  activeRevenueDays: number
  /** totalRevenue / activeRevenueDays (0 if no selling days). */
  avgRevenueOnActiveDays: number
}

export type RecentPayment = {
  id: string
  amount: number
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED'
  createdAt: string
}

export type DailyRevenue = {
  date: string
  revenue: number
  orders: number
}

export type PeakHourEntry = { name: string; value: number }
export type TopProductEntry = { name: string; salesCount: number; stockQuantity: number; category: string }
export type StockBarEntry = { category: string; inStock: number; lowStock: number; outOfStock: number }
export type DashboardInsight = { label: string; value: string; sub: string }

export type PaymentMixRow = { name: string; value: number }

export type DashboardData = {
  stats: DashboardStats
  recentPayments: RecentPayment[]
  dailyRevenue: DailyRevenue[]
  peakHours: PeakHourEntry[]
  topProducts: TopProductEntry[]
  stockBar: StockBarEntry[]
  insights: DashboardInsight[]
  /** Counts by status for compact charts. */
  paymentMix: PaymentMixRow[]
  fetchedAt: number
  rangeKey: DateRangeKey
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
}

function formatHourLabel(h: number): string {
  const suffix = h < 12 ? 'AM' : 'PM'
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}${suffix}`
}

function buildBuckets(range: DateRangeKey, from: Date | null, to: Date | null) {
  const buckets = new Map<string, { revenue: number; orders: number }>()
  const end = to ?? new Date()
  end.setHours(23, 59, 59, 999)

  if (range === 'today') {
    // 24 hourly buckets
    for (let h = 0; h < 24; h++) {
      buckets.set(formatHourLabel(h), { revenue: 0, orders: 0 })
    }
    return { buckets, granularity: 'hour' as const }
  }

  if (range === 'year' || range === 'all') {
    // Monthly buckets
    const start = from ?? new Date(2020, 0, 1)
    const cur = new Date(start.getFullYear(), start.getMonth(), 1)
    while (cur <= end) {
      buckets.set(formatMonthLabel(cur), { revenue: 0, orders: 0 })
      cur.setMonth(cur.getMonth() + 1)
    }
    return { buckets, granularity: 'month' as const }
  }

  // Daily buckets
  const days = range === '30d' ? 29 : range === 'month' ? new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate() - 1 : 6
  const start = new Date(end)
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)
  const cur = new Date(start)
  while (cur <= end) {
    buckets.set(formatDayLabel(cur), { revenue: 0, orders: 0 })
    cur.setDate(cur.getDate() + 1)
  }
  return { buckets, granularity: 'day' as const }
}

// ── Main fetch ────────────────────────────────────────────────────────────────

export async function getDashboardData(rangeKey: DateRangeKey = 'all'): Promise<DashboardData> {
  const { from, to } = getDateRange(rangeKey)

  // Build query string for server-side filter (for charts endpoint)
  const qs = new URLSearchParams()
  if (from) qs.set('from', from.toISOString())
  if (to) qs.set('to', to.toISOString())
  const qStr = qs.toString() ? `?${qs.toString()}` : ''

  const [productsRes, paymentsRes, chartsRes] = await Promise.all([
    adminApi<{ products: any[] }>('/api/admin/products?includeInactive=true').catch(() => ({ products: [] })),
    adminApi<{ payments: any[] }>('/api/admin/payments').catch(() => ({ payments: [] })),
    adminApi<{ topProducts: TopProductEntry[]; peakHours: PeakHourEntry[] }>(
      `/api/admin/dashboard/charts${qStr}`,
    ).catch(() => ({ topProducts: [] as TopProductEntry[], peakHours: [] as PeakHourEntry[] })),
  ])

  const products = productsRes.products
  const allPayments = paymentsRes.payments

  // Filter payments client-side by range
  const payments = allPayments.filter((p) => {
    if (!from && !to) return true
    const d = new Date(p.createdAt)
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })

  // ── Stats ──────────────────────────────────────────────────────────────────
  const activeSkus = products.filter((p) => p.isActive !== false).length

  const lowStockCount = products.filter((p) => {
    if (p.isActive === false) return false
    const stock = Number(p.stockQuantity ?? 0)
    const threshold = Number(p.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD)
    return stock > 0 && stock <= threshold
  }).length

  const outOfStockCount = products.filter(
    (p) => p.isActive !== false && Number(p.stockQuantity ?? 0) === 0,
  ).length

  const verifiedPayments = payments.filter((p) => p.status === 'VERIFIED')
  const pendingPayments = payments.filter((p) => p.status === 'PENDING')
  const expiredPayments = payments.filter((p) => p.status === 'EXPIRED')
  const expiredCount = expiredPayments.length
  const totalRevenue = verifiedPayments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0)
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0)
  const verifiedCount = verifiedPayments.length
  const avgOrderValue = verifiedCount > 0 ? totalRevenue / verifiedCount : 0
  const verificationRate = payments.length > 0 ? (verifiedCount / payments.length) * 100 : 0

  // ── Recent payments ────────────────────────────────────────────────────────
  const recentPayments: RecentPayment[] = allPayments.slice(0, 10).map((p) => ({
    id: String(p._id ?? p.id),
    amount: Number(p.amount ?? 0),
    status: p.status as RecentPayment['status'],
    createdAt: String(p.createdAt ?? ''),
  }))

  // ── Line chart: revenue bucketed by granularity ────────────────────────────
  const { buckets } = buildBuckets(rangeKey, from, to)

  for (const p of verifiedPayments) {
    const d = new Date(p.createdAt)
    if (isNaN(d.getTime())) continue
    let label: string
    if (rangeKey === 'today') {
      label = formatHourLabel(d.getHours())
    } else if (rangeKey === 'year' || rangeKey === 'all') {
      label = formatMonthLabel(d)
    } else {
      label = formatDayLabel(d)
    }
    const bucket = buckets.get(label)
    if (bucket) {
      bucket.revenue += Number(p.amount ?? 0)
      bucket.orders += 1
    }
  }

  const dailyRevenue: DailyRevenue[] = Array.from(buckets.entries()).map(
    ([date, { revenue, orders }]) => ({ date, revenue: Math.round(revenue * 100) / 100, orders }),
  )

  const activeRevenueDays = dailyRevenue.filter((d) => d.revenue > 0).length
  const avgRevenueOnActiveDays = activeRevenueDays > 0 ? totalRevenue / activeRevenueDays : 0

  const paymentMix: PaymentMixRow[] = [
    { name: 'Verified', value: verifiedCount },
    { name: 'Pending', value: pendingPayments.length },
    { name: 'Expired', value: expiredCount },
  ]

  // ── Bar chart: stock status per category (current snapshot, no date filter) ─
  const categoryMap = new Map<string, { inStock: number; lowStock: number; outOfStock: number }>()
  for (const p of products) {
    if (p.isActive === false) continue
    const cat = String(p.category ?? 'General')
    if (!categoryMap.has(cat)) categoryMap.set(cat, { inStock: 0, lowStock: 0, outOfStock: 0 })
    const entry = categoryMap.get(cat)!
    const stock = Number(p.stockQuantity ?? 0)
    const threshold = Number(p.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD)
    if (stock === 0) entry.outOfStock += 1
    else if (stock <= threshold) entry.lowStock += 1
    else entry.inStock += 1
  }

  const stockBar: StockBarEntry[] = Array.from(categoryMap.entries())
    .map(([category, counts]) => ({ category, ...counts }))
    .sort((a, b) => b.inStock + b.lowStock + b.outOfStock - (a.inStock + a.lowStock + a.outOfStock))
    .slice(0, 8)

  // ── Insights ───────────────────────────────────────────────────────────────
  const bestDay = dailyRevenue.reduce(
    (best, d) => (d.revenue > best.revenue ? d : best),
    { date: '—', revenue: 0, orders: 0 },
  )

  const insights: DashboardInsight[] = [
    {
      label: 'Avg. Order Value',
      value: new Intl.NumberFormat(undefined, { style: 'currency', currency: 'LKR' }).format(avgOrderValue),
      sub: `across ${verifiedCount} verified payment${verifiedCount !== 1 ? 's' : ''}`,
    },
    {
      label: 'Verification Rate',
      value: `${verificationRate.toFixed(1)}%`,
      sub: `${verifiedCount} of ${payments.length} payments verified`,
    },
    {
      label: 'Peak Period',
      value: bestDay.revenue > 0 ? bestDay.date : '—',
      sub: bestDay.revenue > 0
        ? `${new Intl.NumberFormat(undefined, { style: 'currency', currency: 'LKR' }).format(bestDay.revenue)} · ${bestDay.orders} order${bestDay.orders !== 1 ? 's' : ''}`
        : 'No revenue in this period',
    },
    {
      label: 'Stock Health',
      value: `${activeSkus - outOfStockCount - lowStockCount} / ${activeSkus}`,
      sub: `${outOfStockCount} out of stock · ${lowStockCount} low`,
    },
    {
      label: 'Expired payments',
      value: expiredCount.toLocaleString(),
      sub: `in this period · ${payments.length} total payments`,
    },
    {
      label: 'Avg. revenue / selling day',
      value: new Intl.NumberFormat(undefined, { style: 'currency', currency: 'LKR' }).format(avgRevenueOnActiveDays),
      sub:
        activeRevenueDays > 0
          ? `${activeRevenueDays} day${activeRevenueDays !== 1 ? 's' : ''} with verified revenue`
          : 'No revenue in this period',
    },
  ]

  return {
    stats: {
      activeSkus,
      totalProducts: products.length,
      lowStockCount,
      outOfStockCount,
      totalRevenue,
      pendingAmount,
      pendingCount: pendingPayments.length,
      verifiedCount,
      totalPayments: payments.length,
      avgOrderValue,
      verificationRate,
      expiredCount,
      activeRevenueDays,
      avgRevenueOnActiveDays,
    },
    recentPayments,
    dailyRevenue,
    peakHours: chartsRes.peakHours,
    topProducts: chartsRes.topProducts,
    stockBar,
    insights,
    paymentMix,
    fetchedAt: Date.now(),
    rangeKey,
  }
}
