import type { Request, Response } from 'express'
import { ProductModel } from '../models/product.model.ts'

export async function inventoryList(_req: Request, res: Response) {
  const items = await ProductModel.find({ isActive: true })
    .select('name barcode stockQuantity lowStockThreshold aisle shelfSection category')
    .sort({ name: 1 })
  return res.json({ inventory: items })
}

export async function updateStock(req: Request, res: Response) {
  const qty = Number((req.body as any).stockQuantity)
  if (Number.isNaN(qty) || qty < 0) return res.status(400).json({ message: 'stockQuantity must be a non-negative number.' })

  const existing = await ProductModel.findById(req.params.productId)
  if (!existing) return res.status(404).json({ message: 'Product not found.' })

  const sold = existing.stockQuantity - qty
  const updateOp: any = { $set: { stockQuantity: qty } }
  if (sold > 0) updateOp.$inc = { salesCount: sold }

  const product = await ProductModel.findByIdAndUpdate(req.params.productId, updateOp, { new: true })
  return res.json({ product })
}

export async function updateThreshold(req: Request, res: Response) {
  const t = Number((req.body as any).lowStockThreshold)
  if (Number.isNaN(t) || t < 0) return res.status(400).json({ message: 'lowStockThreshold must be a non-negative number.' })
  const product = await ProductModel.findByIdAndUpdate(req.params.productId, { lowStockThreshold: t }, { new: true })
  if (!product) return res.status(404).json({ message: 'Product not found.' })
  return res.json({ product })
}

export async function lowStock(_req: Request, res: Response) {
  const items = await ProductModel.find({
    isActive: true,
    $expr: { $lte: ['$stockQuantity', '$lowStockThreshold'] },
  }).sort({ stockQuantity: 1 })
  return res.json({ products: items })
}

