import {
  Document, Page, View, Text, Image, StyleSheet, Svg,
  Path, Rect, Line, Circle, G, Polyline, Defs, LinearGradient, Stop,
} from '@react-pdf/renderer'
import {
  DATE_RANGE_LABELS,
  type DashboardData,
} from '../services/dashboard.service'

/* ── Brand palette (matches dashboard) ─────────────────────────────────────── */
const C = {
  bg:       '#0a0a0f',
  panel:    '#14141c',
  panelAlt: '#1a1a24',
  border:   '#2a2a35',
  text:     '#e8e8f0',
  textDim:  '#9090a0',
  textMute: '#5a5a68',
  accent:   '#818cf8',  // indigo-400
  accentDk: '#6366f1',
  emerald:  '#34d399',
  amber:    '#fbbf24',
  rose:     '#f87171',
  violet:   '#a78bfa',
}

const PEAK_COLORS  = [C.accent, C.emerald, C.amber, C.rose, C.violet]
const STOCK_IN     = C.emerald
const STOCK_LOW    = C.amber
const STOCK_OUT    = C.rose

/* ── Styles ────────────────────────────────────────────────────────────────── */
const s = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    color: C.text,
    fontFamily: 'Helvetica',
    fontSize: 10,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 40,
  },

  /* Cover */
  cover: {
    backgroundColor: C.bg,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  coverHeaderBand: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 280,
  },
  coverFooterBand: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 90,
    backgroundColor: '#11111a',
    borderTopWidth: 1, borderTopColor: '#262636',
  },
  coverInner: {
    width: '100%',
    paddingHorizontal: 60,
    alignItems: 'center',
  },
  coverLogoWrap: {
    width: 120, height: 120, marginBottom: 28,
    borderRadius: 28,
    overflow: 'hidden',
  },
  coverEyebrow: {
    fontSize: 10, fontFamily: 'Helvetica-Bold',
    color: C.accent, letterSpacing: 4, marginBottom: 12,
  },
  coverTitle: {
    fontSize: 40, fontFamily: 'Helvetica-Bold', color: '#ffffff',
    letterSpacing: 1, marginBottom: 10, textAlign: 'center',
  },
  coverSub: {
    fontSize: 13, color: C.textDim, marginBottom: 40, textAlign: 'center',
  },
  coverInfoCard: {
    width: 360, backgroundColor: C.panel, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    padding: 20, marginTop: 16,
  },
  coverInfoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  coverInfoRowLast: { borderBottomWidth: 0 },
  coverInfoLabel: { fontSize: 9, color: C.textMute, fontFamily: 'Helvetica-Bold', letterSpacing: 1 },
  coverInfoValue: { fontSize: 11, color: C.text, fontFamily: 'Helvetica-Bold' },

  /* Section header */
  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  pageHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageHeaderLogo: { width: 22, height: 22, borderRadius: 5, overflow: 'hidden' },
  pageHeaderBrand: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.text },
  pageHeaderRight: { fontSize: 9, color: C.textMute },

  pageTitle: {
    fontSize: 18, fontFamily: 'Helvetica-Bold',
    color: '#ffffff', marginBottom: 4,
  },
  pageSubtitle: { fontSize: 10, color: C.textDim, marginBottom: 22 },

  /* Sections */
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginBottom: 14, marginTop: 8,
  },
  sectionAccent: { width: 3, height: 16, backgroundColor: C.accent, borderRadius: 2 },
  sectionTitle: {
    fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.text, letterSpacing: 0.5,
  },

  /* KPI grid */
  kpiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24,
  },
  kpiCard: {
    width: 240, backgroundColor: C.panel,
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
    padding: 14,
  },
  kpiTopBar: {
    height: 3, marginHorizontal: -14, marginTop: -14, marginBottom: 12,
    borderTopLeftRadius: 9, borderTopRightRadius: 9,
  },
  kpiLabel: {
    fontSize: 8, fontFamily: 'Helvetica-Bold',
    color: C.textMute, letterSpacing: 1.5, marginBottom: 6,
  },
  kpiValue: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginBottom: 4 },
  kpiHint: { fontSize: 8.5, color: C.textDim },

  /* Insights */
  insightGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  insightCard: {
    width: 240, backgroundColor: C.panelAlt,
    borderRadius: 8, borderWidth: 1, borderColor: C.border,
    padding: 12,
  },
  insightLabel: {
    fontSize: 7.5, fontFamily: 'Helvetica-Bold',
    color: C.accent, letterSpacing: 1.5, marginBottom: 5,
  },
  insightValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 3 },
  insightSub: { fontSize: 8, color: C.textDim },

  /* Chart container */
  chartCard: {
    backgroundColor: C.panel,
    borderRadius: 10, borderWidth: 1, borderColor: C.border,
    padding: 16, marginBottom: 16,
  },
  chartTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.text, marginBottom: 12 },
  chartLegendRow: { flexDirection: 'row', gap: 14, marginTop: 10 },
  chartLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chartLegendSwatch: { width: 10, height: 8, borderRadius: 2 },
  chartLegendText: { fontSize: 8.5, color: C.textDim },

  /* Two-col charts */
  twoCol: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },

  /* Tables */
  table: {
    backgroundColor: C.panel,
    borderRadius: 8, borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.panelAlt,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  th: {
    fontSize: 8, fontFamily: 'Helvetica-Bold',
    color: C.textMute, letterSpacing: 1.2,
    padding: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5, borderBottomColor: '#22222d',
  },
  tableRowAlt: { backgroundColor: '#101019' },
  td: { fontSize: 9, color: C.text, padding: 10 },
  tdMono: { fontSize: 8, color: C.textDim, padding: 10, fontFamily: 'Courier' },
  tdMute: { fontSize: 9, color: C.textDim, padding: 10 },

  /* Status pills */
  pill: {
    fontSize: 7, fontFamily: 'Helvetica-Bold',
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 8, alignSelf: 'flex-start',
  },

  /* Footer */
  footer: {
    position: 'absolute', bottom: 24, left: 40, right: 40,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    fontSize: 8, color: C.textMute,
    paddingTop: 10, borderTopWidth: 0.5, borderTopColor: C.border,
  },
})

/* ── Helpers ───────────────────────────────────────────────────────────────── */
const fmtMoney = (v: number) =>
  'LKR ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)

function fmtDateLong(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}
function fmtDateShort(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/* Pie/donut math: produce SVG path for an arc segment */
function arcPath(cx: number, cy: number, rOuter: number, rInner: number, startA: number, endA: number) {
  const start = (startA - 90) * (Math.PI / 180)
  const end   = (endA   - 90) * (Math.PI / 180)
  const x1 = cx + rOuter * Math.cos(start), y1 = cy + rOuter * Math.sin(start)
  const x2 = cx + rOuter * Math.cos(end),   y2 = cy + rOuter * Math.sin(end)
  const x3 = cx + rInner * Math.cos(end),   y3 = cy + rInner * Math.sin(end)
  const x4 = cx + rInner * Math.cos(start), y4 = cy + rInner * Math.sin(start)
  const large = endA - startA > 180 ? 1 : 0
  return `M ${x1} ${y1} A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4} Z`
}

/* ── Reusable header on every non-cover page ──────────────────────────────── */
function PageChrome({ generatedAt, periodLabel }: { generatedAt: Date; periodLabel: string }) {
  return (
    <View style={s.pageHeader} fixed>
      <View style={s.pageHeaderLeft}>
        <View style={s.pageHeaderLogo}>
          <Image src="/logo.png" style={{ width: 26, height: 26, marginLeft: -2, marginTop: -2 }} />
        </View>
        <Text style={s.pageHeaderBrand}>ZoomCart Analytics</Text>
      </View>
      <Text style={s.pageHeaderRight}>
        {periodLabel} · Generated {generatedAt.toLocaleDateString()}
      </Text>
    </View>
  )
}
function PageFooter() {
  return (
    <View style={s.footer} fixed>
      <Text>ZoomCart Admin · Confidential</Text>
      <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
    </View>
  )
}

/* ── Cover page ────────────────────────────────────────────────────────────── */
function CoverPage({ data, generatedAt }: { data: DashboardData; generatedAt: Date }) {
  const periodLabel = DATE_RANGE_LABELS[data.rangeKey]
  return (
    <Page size="A4" style={s.cover}>
      {/* Decorative gradient band on top */}
      <View style={s.coverHeaderBand}>
        <Svg width="595" height="280" viewBox="0 0 595 280">
          <Defs>
            <LinearGradient id="cb1" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#1a1a3a" stopOpacity={1} />
              <Stop offset="1" stopColor="#3b1d6b" stopOpacity={1} />
            </LinearGradient>
            <LinearGradient id="cb2" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#6366f1" stopOpacity={0.55} />
              <Stop offset="1" stopColor="#8b5cf6" stopOpacity={0.25} />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="595" height="280" fill="url(#cb1)" />
          {/* glow blobs */}
          <Circle cx="100"  cy="60"  r="120" fill="#6366f1" opacity={0.18} />
          <Circle cx="500"  cy="140" r="160" fill="#a78bfa" opacity={0.12} />
          <Circle cx="295"  cy="240" r="120" fill="#34d399" opacity={0.07} />
          {/* bottom fade */}
          <Rect x="0" y="240" width="595" height="40" fill="url(#cb2)" opacity={0.4} />
        </Svg>
      </View>

      <View style={s.coverInner}>
        {/* Logo */}
        <View style={s.coverLogoWrap}>
          <Image src="/logo.png" style={{ width: 140, height: 140, marginLeft: -10, marginTop: -10 }} />
        </View>

        <Text style={s.coverEyebrow}>ZOOMCART · ADMIN</Text>
        <Text style={s.coverTitle}>Analytics Report</Text>
        <Text style={s.coverSub}>
          A snapshot of your store performance, inventory health and revenue insights.
        </Text>

        {/* Period info card */}
        <View style={s.coverInfoCard}>
          <View style={s.coverInfoRow}>
            <Text style={s.coverInfoLabel}>REPORTING PERIOD</Text>
            <Text style={s.coverInfoValue}>{periodLabel}</Text>
          </View>
          <View style={s.coverInfoRow}>
            <Text style={s.coverInfoLabel}>GENERATED ON</Text>
            <Text style={s.coverInfoValue}>{fmtDateLong(generatedAt)}</Text>
          </View>
          <View style={s.coverInfoRow}>
            <Text style={s.coverInfoLabel}>TOTAL REVENUE</Text>
            <Text style={[s.coverInfoValue, { color: C.emerald }]}>
              {fmtMoney(data.stats.totalRevenue)}
            </Text>
          </View>
          <View style={[s.coverInfoRow, s.coverInfoRowLast]}>
            <Text style={s.coverInfoLabel}>VERIFIED ORDERS</Text>
            <Text style={s.coverInfoValue}>{data.stats.verifiedCount.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      {/* Footer band */}
      <View style={s.coverFooterBand}>
        <View style={{ paddingHorizontal: 60, paddingTop: 28 }}>
          <Text style={{ fontSize: 9, color: C.textMute, textAlign: 'center' }}>
            CONFIDENTIAL · This report contains sensitive business data.
          </Text>
          <Text style={{ fontSize: 8, color: C.textMute, textAlign: 'center', marginTop: 6 }}>
            Generated automatically by ZoomCart Admin Panel
          </Text>
        </View>
      </View>
    </Page>
  )
}

/* ── KPI card ──────────────────────────────────────────────────────────────── */
function Kpi({ label, value, hint, accent }: { label: string; value: string; hint: string; accent: string }) {
  return (
    <View style={s.kpiCard}>
      <View style={[s.kpiTopBar, { backgroundColor: accent }]} />
      <Text style={s.kpiLabel}>{label.toUpperCase()}</Text>
      <Text style={s.kpiValue}>{value}</Text>
      <Text style={s.kpiHint}>{hint}</Text>
    </View>
  )
}

/* ── Area chart (revenue / orders) ─────────────────────────────────────────── */
function RevenueAreaChart({ data: rows }: { data: DashboardData['dailyRevenue'] }) {
  const W = 500, H = 200, padL = 40, padR = 30, padT = 14, padB = 30
  const cw = W - padL - padR, ch = H - padT - padB
  if (rows.length === 0) {
    return (
      <View style={[s.chartCard, { alignItems: 'center', justifyContent: 'center', height: 220 }]}>
        <Text style={{ color: C.textMute, fontSize: 10 }}>No revenue data for this period</Text>
      </View>
    )
  }

  const maxRev = Math.max(1, ...rows.map((r) => r.revenue))
  const maxOrd = Math.max(1, ...rows.map((r) => r.orders))
  const xStep = rows.length > 1 ? cw / (rows.length - 1) : 0

  const revPts = rows.map((r, i) => `${padL + i * xStep},${padT + ch - (r.revenue / maxRev) * ch}`).join(' ')
  const ordPts = rows.map((r, i) => `${padL + i * xStep},${padT + ch - (r.orders  / maxOrd) * ch}`).join(' ')
  const areaPath = `M ${padL},${padT + ch} L ${revPts.split(' ').join(' L ')} L ${padL + (rows.length - 1) * xStep},${padT + ch} Z`

  // X-axis ticks (about 6)
  const tickStep = Math.max(1, Math.ceil(rows.length / 6))
  const tickIdx: number[] = []
  for (let i = 0; i < rows.length; i += tickStep) tickIdx.push(i)
  if (tickIdx[tickIdx.length - 1] !== rows.length - 1) tickIdx.push(rows.length - 1)

  // Y ticks (4)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    y: padT + ch - p * ch,
    revLabel: maxRev * p >= 1000 ? `${((maxRev * p) / 1000).toFixed(1)}k` : `${Math.round(maxRev * p)}`,
  }))

  return (
    <View style={s.chartCard}>
      <Text style={s.chartTitle}>Daily Revenue & Orders</Text>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <Defs>
          <LinearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={C.emerald} stopOpacity={0.45} />
            <Stop offset="1" stopColor={C.emerald} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {/* gridlines + Y labels */}
        {yTicks.map((t, i) => (
          <G key={i}>
            <Line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke={C.border} strokeWidth={0.5} />
            <Text x={padL - 6} y={t.y + 3} style={{ fontSize: 7, color: C.textMute }} fill={C.textMute} textAnchor="end">
              {t.revLabel}
            </Text>
          </G>
        ))}
        {/* Revenue area */}
        <Path d={areaPath} fill="url(#revGrad)" />
        {/* Revenue line */}
        <Polyline points={revPts} stroke={C.emerald} strokeWidth={1.6} fill="none" />
        {/* Orders line */}
        <Polyline points={ordPts} stroke={C.accent} strokeWidth={1.2} fill="none" strokeDasharray="3,3" />

        {/* X labels */}
        {tickIdx.map((i) => {
          const x = padL + i * xStep
          const lbl = rows[i].date
          return (
            <G key={i}>
              <Line x1={x} y1={padT + ch} x2={x} y2={padT + ch + 3} stroke={C.border} strokeWidth={0.5} />
              <Text x={x} y={padT + ch + 12} style={{ fontSize: 6.5, color: C.textMute }} fill={C.textMute} textAnchor="middle">
                {lbl.length > 9 ? lbl.slice(0, 8) + '…' : lbl}
              </Text>
            </G>
          )
        })}
      </Svg>

      <View style={s.chartLegendRow}>
        <View style={s.chartLegendItem}>
          <View style={[s.chartLegendSwatch, { backgroundColor: C.emerald }]} />
          <Text style={s.chartLegendText}>Revenue (LKR)</Text>
        </View>
        <View style={s.chartLegendItem}>
          <View style={[s.chartLegendSwatch, { backgroundColor: C.accent }]} />
          <Text style={s.chartLegendText}>Orders</Text>
        </View>
      </View>
    </View>
  )
}

/* ── Donut/pie chart ───────────────────────────────────────────────────────── */
function DonutChart({ title, data: rows, height = 220 }: { title: string; data: { name: string; value: number }[]; height?: number }) {
  const total = rows.reduce((sum, r) => sum + r.value, 0)
  if (total === 0 || rows.length === 0) {
    return (
      <View style={[s.chartCard, { height, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={s.chartTitle}>{title}</Text>
        <Text style={{ color: C.textMute, fontSize: 10 }}>No data available</Text>
      </View>
    )
  }
  const W = 240, H = height - 50
  const cx = W / 2 - 30, cy = H / 2, rO = 70, rI = 38

  type Slice = { path: string; color: string; pct: number; name: string; value: number }
  const { slices } = rows.reduce<{ acc: number; slices: Slice[] }>(
    (state, r, i) => {
      const startA = (state.acc / total) * 360
      const nextAcc = state.acc + r.value
      const endA = (nextAcc / total) * 360
      const slice: Slice = {
        path: arcPath(cx, cy, rO, rI, startA, endA),
        color: PEAK_COLORS[i % PEAK_COLORS.length],
        pct: (r.value / total) * 100,
        name: r.name,
        value: r.value,
      }
      return { acc: nextAcc, slices: [...state.slices, slice] }
    },
    { acc: 0, slices: [] },
  )

  return (
    <View style={s.chartCard}>
      <Text style={s.chartTitle}>{title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {slices.map((sl, i) => <Path key={i} d={sl.path} fill={sl.color} />)}
          <Text x={cx} y={cy - 3}  fill={C.text}     textAnchor="middle" style={{ fontSize: 14, fontFamily: 'Helvetica-Bold' }}>{total}</Text>
          <Text x={cx} y={cy + 10} fill={C.textMute} textAnchor="middle" style={{ fontSize: 7 }}>TOTAL</Text>
        </Svg>
        <View style={{ flex: 1, paddingLeft: 4 }}>
          {slices.map((sl, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: sl.color, marginRight: 6 }} />
              <Text style={{ fontSize: 9, color: C.text, flex: 1 }}>{sl.name}</Text>
              <Text style={{ fontSize: 8.5, color: C.textDim }}>
                {sl.value} ({sl.pct.toFixed(1)}%)
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}

/* ── Horizontal bar chart (Top 5 products) ─────────────────────────────────── */
function TopProductsBarChart({ data: rows }: { data: DashboardData['topProducts'] }) {
  const W = 500, H = Math.max(120, rows.length * 36 + 30)
  const padL = 130, padR = 50, padT = 8, padB = 8
  const cw = W - padL - padR, ch = H - padT - padB
  const max = Math.max(1, ...rows.map((r) => r.salesCount))
  const barH = Math.min(20, (ch - rows.length * 6) / Math.max(1, rows.length))

  if (rows.length === 0 || rows.every((r) => r.salesCount === 0)) {
    return (
      <View style={[s.chartCard, { alignItems: 'center', justifyContent: 'center', height: 160 }]}>
        <Text style={s.chartTitle}>Top 5 Sold Products</Text>
        <Text style={{ color: C.textMute, fontSize: 10 }}>
          Sales tracked when stock is reduced via Inventory.
        </Text>
      </View>
    )
  }

  return (
    <View style={s.chartCard}>
      <Text style={s.chartTitle}>Top 5 Sold Products</Text>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {rows.map((r, i) => {
          const y = padT + i * (barH + 6) + 8
          const w = (r.salesCount / max) * cw
          const truncName = r.name.length > 18 ? r.name.slice(0, 17) + '…' : r.name
          return (
            <G key={i}>
              <Text x={padL - 6} y={y + barH * 0.7} fill={C.text}    textAnchor="end" style={{ fontSize: 8.5 }}>{truncName}</Text>
              <Rect x={padL} y={y} width={cw} height={barH} fill={C.panelAlt} rx={2} />
              <Rect x={padL} y={y} width={w}  height={barH} fill={C.accent}   rx={2} opacity={0.85} />
              <Text x={padL + w + 6} y={y + barH * 0.7} fill={C.text}    style={{ fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{r.salesCount}</Text>
            </G>
          )
        })}
      </Svg>
    </View>
  )
}

/* ── Stacked bar chart by category (in/low/out) ────────────────────────────── */
function StockBarChart({ data: rows }: { data: DashboardData['stockBar'] }) {
  if (rows.length === 0) {
    return (
      <View style={[s.chartCard, { alignItems: 'center', justifyContent: 'center', height: 160 }]}>
        <Text style={s.chartTitle}>Stock Status by Category</Text>
        <Text style={{ color: C.textMute, fontSize: 10 }}>No products in catalog.</Text>
      </View>
    )
  }
  const W = 500, H = 220, padL = 32, padR = 12, padT = 12, padB = 36
  const cw = W - padL - padR, ch = H - padT - padB
  const groupW = cw / rows.length
  const barW = Math.min(14, (groupW - 8) / 3)
  const max = Math.max(1, ...rows.map((r) => Math.max(r.inStock, r.lowStock, r.outOfStock)))

  // 4 Y ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1]

  return (
    <View style={s.chartCard}>
      <Text style={s.chartTitle}>Stock Status by Category</Text>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Grid */}
        {yTicks.map((p, i) => {
          const y = padT + ch - p * ch
          return (
            <G key={i}>
              <Line x1={padL} y1={y} x2={W - padR} y2={y} stroke={C.border} strokeWidth={0.5} />
              <Text x={padL - 4} y={y + 3} fill={C.textMute} textAnchor="end" style={{ fontSize: 7 }}>
                {Math.round(max * p)}
              </Text>
            </G>
          )
        })}
        {/* Bars */}
        {rows.map((r, i) => {
          const xBase = padL + i * groupW + 4
          const inH  = (r.inStock / max) * ch
          const loH  = (r.lowStock / max) * ch
          const ouH  = (r.outOfStock / max) * ch
          const cat = r.category.length > 9 ? r.category.slice(0, 8) + '…' : r.category
          return (
            <G key={i}>
              <Rect x={xBase + 0 * (barW + 2)} y={padT + ch - inH} width={barW} height={inH} fill={STOCK_IN}  rx={1.5} />
              <Rect x={xBase + 1 * (barW + 2)} y={padT + ch - loH} width={barW} height={loH} fill={STOCK_LOW} rx={1.5} />
              <Rect x={xBase + 2 * (barW + 2)} y={padT + ch - ouH} width={barW} height={ouH} fill={STOCK_OUT} rx={1.5} />
              <Text x={xBase + (barW * 3 + 4) / 2} y={padT + ch + 12} fill={C.textMute} textAnchor="middle" style={{ fontSize: 7 }}>{cat}</Text>
            </G>
          )
        })}
      </Svg>
      <View style={s.chartLegendRow}>
        <View style={s.chartLegendItem}><View style={[s.chartLegendSwatch, { backgroundColor: STOCK_IN }]} />  <Text style={s.chartLegendText}>In Stock</Text></View>
        <View style={s.chartLegendItem}><View style={[s.chartLegendSwatch, { backgroundColor: STOCK_LOW }]} /> <Text style={s.chartLegendText}>Low Stock</Text></View>
        <View style={s.chartLegendItem}><View style={[s.chartLegendSwatch, { backgroundColor: STOCK_OUT }]} /> <Text style={s.chartLegendText}>Out of Stock</Text></View>
      </View>
    </View>
  )
}

/* ── Status pill ──────────────────────────────────────────────────────────── */
function StatusPill({ status }: { status: 'PENDING' | 'VERIFIED' | 'EXPIRED' }) {
  const styles =
    status === 'VERIFIED' ? { backgroundColor: '#0e3a2a', color: C.emerald }
    : status === 'PENDING'  ? { backgroundColor: '#3f2e0a', color: C.amber }
    :                          { backgroundColor: '#252530', color: C.textDim }
  return <Text style={[s.pill, styles]}>{status}</Text>
}

/* ── Document ──────────────────────────────────────────────────────────────── */
export function AnalyticsReport({ data, generatedAt = new Date() }: { data: DashboardData; generatedAt?: Date }) {
  const periodLabel = DATE_RANGE_LABELS[data.rangeKey]
  const cs = data.stats

  return (
    <Document
      title={`ZoomCart Analytics Report — ${periodLabel} — ${generatedAt.toLocaleDateString()}`}
      author="ZoomCart Admin"
      subject="Analytics Report"
      keywords="zoomcart, analytics, sales, inventory"
    >
      {/* ─────────── Cover ─────────── */}
      <CoverPage data={data} generatedAt={generatedAt} />

      {/* ─────────── Page 2 — Executive Summary ─────────── */}
      <Page size="A4" style={s.page}>
        <PageChrome generatedAt={generatedAt} periodLabel={periodLabel} />

        <Text style={s.pageTitle}>Executive Summary</Text>
        <Text style={s.pageSubtitle}>Key performance indicators for {periodLabel.toLowerCase()}.</Text>

        <View style={s.sectionHeader}>
          <View style={s.sectionAccent} />
          <Text style={s.sectionTitle}>Top-line Metrics</Text>
        </View>

        <View style={s.kpiGrid}>
          <Kpi label="Active SKUs"       value={cs.activeSkus.toLocaleString()}      hint={`${cs.totalProducts} total products`}                           accent={C.accent}  />
          <Kpi label="Total Revenue"     value={fmtMoney(cs.totalRevenue)}           hint={`${cs.verifiedCount} verified payment${cs.verifiedCount !== 1 ? 's' : ''}`} accent={C.emerald} />
          <Kpi label="Pending Payments"  value={fmtMoney(cs.pendingAmount)}          hint={`${cs.pendingCount} awaiting verification`}                     accent={C.amber}   />
          <Kpi label="Stock Alerts"      value={(cs.lowStockCount + cs.outOfStockCount).toLocaleString()} hint={`${cs.outOfStockCount} out · ${cs.lowStockCount} low`}    accent={C.rose}    />
        </View>

        <View style={s.sectionHeader}>
          <View style={s.sectionAccent} />
          <Text style={s.sectionTitle}>Insights</Text>
        </View>

        <View style={s.insightGrid}>
          {data.insights.map((ins) => (
            <View key={ins.label} style={s.insightCard}>
              <Text style={s.insightLabel}>{ins.label.toUpperCase()}</Text>
              <Text style={s.insightValue}>{ins.value}</Text>
              <Text style={s.insightSub}>{ins.sub}</Text>
            </View>
          ))}
        </View>

        <PageFooter />
      </Page>

      {/* ─────────── Page 3 — Revenue & Peak Hours ─────────── */}
      <Page size="A4" style={s.page}>
        <PageChrome generatedAt={generatedAt} periodLabel={periodLabel} />

        <Text style={s.pageTitle}>Revenue Performance</Text>
        <Text style={s.pageSubtitle}>How sales and orders trended across the period.</Text>

        <View style={s.sectionHeader}>
          <View style={s.sectionAccent} />
          <Text style={s.sectionTitle}>Revenue Trend</Text>
        </View>
        <RevenueAreaChart data={data.dailyRevenue} />

        <View style={s.sectionHeader}>
          <View style={s.sectionAccent} />
          <Text style={s.sectionTitle}>Peak Shopping Hours</Text>
        </View>
        <DonutChart title="Orders by Time of Day" data={data.peakHours} height={250} />

        <PageFooter />
      </Page>

      {/* ─────────── Page 4 — Products & Stock ─────────── */}
      <Page size="A4" style={s.page}>
        <PageChrome generatedAt={generatedAt} periodLabel={periodLabel} />

        <Text style={s.pageTitle}>Product & Inventory</Text>
        <Text style={s.pageSubtitle}>Bestsellers and stock distribution by category.</Text>

        <View style={s.sectionHeader}>
          <View style={s.sectionAccent} />
          <Text style={s.sectionTitle}>Best Selling Products</Text>
        </View>
        <TopProductsBarChart data={data.topProducts} />

        <View style={s.sectionHeader}>
          <View style={s.sectionAccent} />
          <Text style={s.sectionTitle}>Stock Status by Category</Text>
        </View>
        <StockBarChart data={data.stockBar} />

        <PageFooter />
      </Page>

      {/* ─────────── Page 5 — Recent payments table + product detail ─────────── */}
      <Page size="A4" style={s.page}>
        <PageChrome generatedAt={generatedAt} periodLabel={periodLabel} />

        <Text style={s.pageTitle}>Transaction Log</Text>
        <Text style={s.pageSubtitle}>The most recent payment activity in this period.</Text>

        <View style={s.sectionHeader}>
          <View style={s.sectionAccent} />
          <Text style={s.sectionTitle}>Recent Payments</Text>
        </View>

        {data.recentPayments.length === 0 ? (
          <View style={[s.chartCard, { height: 80, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={{ color: C.textMute, fontSize: 10 }}>No payments in this period.</Text>
          </View>
        ) : (
          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, { flex: 1.6 }]}>PAYMENT ID</Text>
              <Text style={[s.th, { flex: 1.2 }]}>AMOUNT</Text>
              <Text style={[s.th, { flex: 0.9 }]}>STATUS</Text>
              <Text style={[s.th, { flex: 1.4 }]}>DATE</Text>
            </View>
            {data.recentPayments.map((p, i) => (
              <View key={p.id} style={i % 2 === 1 ? [s.tableRow, s.tableRowAlt] : [s.tableRow]}>
                <Text style={[s.tdMono, { flex: 1.6 }]}>{p.id.slice(-12).toUpperCase()}</Text>
                <Text style={[s.td,     { flex: 1.2, fontFamily: 'Helvetica-Bold' }]}>{fmtMoney(p.amount)}</Text>
                <View style={{ flex: 0.9, paddingLeft: 10, paddingTop: 9 }}>
                  <StatusPill status={p.status} />
                </View>
                <Text style={[s.tdMute, { flex: 1.4 }]}>{fmtDateShort(p.createdAt)}</Text>
              </View>
            ))}
          </View>
        )}

        {data.topProducts.length > 0 && (
          <>
            <View style={[s.sectionHeader, { marginTop: 24 }]}>
              <View style={s.sectionAccent} />
              <Text style={s.sectionTitle}>Top Products — Detailed</Text>
            </View>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.th, { flex: 2 }]}>PRODUCT</Text>
                <Text style={[s.th, { flex: 1 }]}>CATEGORY</Text>
                <Text style={[s.th, { flex: 1 }]}>SOLD</Text>
                <Text style={[s.th, { flex: 1 }]}>IN STOCK</Text>
              </View>
              {data.topProducts.map((p, i) => (
                <View key={p.name} style={i % 2 === 1 ? [s.tableRow, s.tableRowAlt] : [s.tableRow]}>
                  <Text style={[s.td,     { flex: 2 }]}>{p.name}</Text>
                  <Text style={[s.tdMute, { flex: 1 }]}>{p.category || '—'}</Text>
                  <Text style={[s.td,     { flex: 1, color: C.accent, fontFamily: 'Helvetica-Bold' }]}>{p.salesCount}</Text>
                  <Text style={[s.tdMute, { flex: 1 }]}>{p.stockQuantity}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <PageFooter />
      </Page>
    </Document>
  )
}
