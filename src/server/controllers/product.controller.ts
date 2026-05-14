import type { Request, Response } from 'express'
import { ProductModel } from '../models/product.model.ts'
import { computeDiscount } from '../utils/discount.ts'

export async function listProducts(_req: Request, res: Response) {
  const items = await ProductModel.find({ isActive: true }).sort({ createdAt: -1 })
  return res.json({ products: items })
}

export async function getProductById(req: Request, res: Response) {
  const product = await ProductModel.findById(req.params.id)
  if (!product || product.isActive === false) return res.status(404).json({ message: 'Product not found.' })
  return res.json({ product })
}

export async function createProduct(req: Request, res: Response) {
  const body = req.body as any
  const name = String(body.name ?? '').trim()
  const barcode = String(body.barcode ?? '').trim()
  const category = String(body.category ?? 'General').trim()
  const aisle = String(body.aisle ?? '').trim()
  const shelfSection = String(body.shelfSection ?? '').trim()
  const nutritionInfo = String(body.nutritionInfo ?? '').trim()

  const originalPrice = Number(body.originalPrice)
  const stockQuantity = Number(body.stockQuantity ?? 0)
  const lowStockThreshold = Number(body.lowStockThreshold ?? 10)

  if (!name) return res.status(400).json({ message: 'name is required.' })
  if (!barcode) return res.status(400).json({ message: 'barcode is required.' })
  if (Number.isNaN(originalPrice) || originalPrice < 0) return res.status(400).json({ message: 'originalPrice must be a non-negative number.' })
  if (Number.isNaN(stockQuantity) || stockQuantity < 0) return res.status(400).json({ message: 'stockQuantity must be a non-negative number.' })
  if (Number.isNaN(lowStockThreshold) || lowStockThreshold < 0) return res.status(400).json({ message: 'lowStockThreshold must be a non-negative number.' })

  const discount = computeDiscount({
    originalPrice,
    discountPercentage: body.discountPercentage != null ? Number(body.discountPercentage) : undefined,
    discountedPrice: body.discountedPrice != null ? Number(body.discountedPrice) : undefined,
  })

  try {
    const product = await ProductModel.create({
      name,
      barcode,
      category,
      aisle,
      shelfSection,
      nutritionInfo,
      originalPrice: discount.originalPrice,
      discountPercentage: discount.discountPercentage,
      discountedPrice: discount.discountedPrice,
      hasDiscount: discount.hasDiscount,
      stockQuantity,
      lowStockThreshold,
      cheaperAlternativeId: body.cheaperAlternativeId ?? undefined,
      imageUrl: body.imageUrl ?? undefined,
      isActive: body.isActive !== false,
      isComplete: body.isComplete !== false,
    })
    return res.status(201).json({ product })
  } catch (err: any) {
    if (err?.code === 11000) return res.status(409).json({ message: 'barcode must be unique.' })
    return res.status(500).json({ message: 'Could not create product.' })
  }
}

export async function updateProduct(req: Request, res: Response) {
  const body = req.body as any

  const patch: Record<string, any> = {}
  if (body.name !== undefined) patch.name = String(body.name).trim()
  if (body.barcode !== undefined) patch.barcode = String(body.barcode).trim()
  if (body.category !== undefined) patch.category = String(body.category).trim()
  if (body.aisle !== undefined) patch.aisle = String(body.aisle).trim()
  if (body.shelfSection !== undefined) patch.shelfSection = String(body.shelfSection).trim()
  if (body.nutritionInfo !== undefined) patch.nutritionInfo = String(body.nutritionInfo).trim()
  if (body.stockQuantity !== undefined) patch.stockQuantity = Number(body.stockQuantity)
  if (body.lowStockThreshold !== undefined) patch.lowStockThreshold = Number(body.lowStockThreshold)
  if (body.cheaperAlternativeId !== undefined) patch.cheaperAlternativeId = body.cheaperAlternativeId ?? undefined
  if (body.imageUrl !== undefined) patch.imageUrl = body.imageUrl ?? undefined
  if (body.isActive !== undefined) patch.isActive = Boolean(body.isActive)
  if (body.isComplete !== undefined) patch.isComplete = Boolean(body.isComplete)

  const touchesDiscount =
    body.originalPrice !== undefined ||
    body.discountPercentage !== undefined ||
    body.discountedPrice !== undefined

  if (touchesDiscount) {
    const current = await ProductModel.findById(req.params.id)
    if (!current) return res.status(404).json({ message: 'Product not found.' })
    const originalPrice =
      body.originalPrice !== undefined ? Number(body.originalPrice) : current.originalPrice
    const discount = computeDiscount({
      originalPrice,
      discountPercentage: body.discountPercentage !== undefined ? Number(body.discountPercentage) : current.discountPercentage,
      discountedPrice: body.discountedPrice !== undefined ? Number(body.discountedPrice) : current.discountedPrice,
    })
    patch.originalPrice = discount.originalPrice
    patch.discountPercentage = discount.discountPercentage
    patch.discountedPrice = discount.discountedPrice
    patch.hasDiscount = discount.hasDiscount
  }

  try {
    const product = await ProductModel.findByIdAndUpdate(req.params.id, patch, { new: true })
    if (!product) return res.status(404).json({ message: 'Product not found.' })
    return res.json({ product })
  } catch (err: any) {
    if (err?.code === 11000) return res.status(409).json({ message: 'barcode must be unique.' })
    return res.status(500).json({ message: 'Could not update product.' })
  }
}

export async function deleteProduct(req: Request, res: Response) {
  const product = await ProductModel.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true })
  if (!product) return res.status(404).json({ message: 'Product not found.' })
  return res.json({ message: 'Product deleted (soft).', product })
}

