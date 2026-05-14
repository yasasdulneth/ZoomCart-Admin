import type { Request, Response } from 'express'
import { ProductModel } from '../models/product.model.ts'
import { PaymentModel } from '../models/payment.model.ts'

const TIME_SLOTS = [
  { name: 'Early Morning', hours: [5, 6, 7, 8] },
  { name: 'Morning', hours: [9, 10, 11] },
  { name: 'Afternoon', hours: [12, 13, 14, 15, 16] },
  { name: 'Evening', hours: [17, 18, 19, 20] },
  { name: 'Night', hours: [21, 22, 23, 0, 1, 2, 3, 4] },
]

export async function getDashboardCharts(req: Request, res: Response) {
  const { from, to } = req.query as Record<string, string>

  const dateFilter: Record<string, Date> = {}
  if (from) dateFilter.$gte = new Date(from)
  if (to) dateFilter.$lte = new Date(to)
  const hasFilter = Object.keys(dateFilter).length > 0

  const [topProducts, payments] = await Promise.all([
    ProductModel.find()
      .sort({ salesCount: -1 })
      .limit(5)
      .select('name salesCount stockQuantity barcode category'),
    hasFilter
      ? PaymentModel.find({ createdAt: dateFilter }).select('createdAt amount status')
      : PaymentModel.find().select('createdAt amount status'),
  ])

  // Peak shopping hours — bucket payments by time-of-day slot
  const hourCounts = new Array(24).fill(0)
  for (const p of payments) {
    const h = new Date(p.createdAt).getHours()
    if (h >= 0 && h < 24) hourCounts[h]++
  }

  const peakHours = TIME_SLOTS.map((slot) => ({
    name: slot.name,
    value: slot.hours.reduce((sum, h) => sum + hourCounts[h], 0),
  })).filter((s) => s.value > 0)

  return res.json({
    topProducts: topProducts.map((p) => ({
      name: p.name,
      salesCount: (p as any).salesCount ?? 0,
      stockQuantity: p.stockQuantity,
      category: p.category,
    })),
    peakHours,
  })
}
