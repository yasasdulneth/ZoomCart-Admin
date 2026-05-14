import { adminApi } from '../api/adminApi'
import { getProducts, updateProduct } from './product.service'

/** Inventory reads/writes the same Firestore collection as products (`Products` — see `product.service.ts`). */

/** Default when `lowStockThreshold` is missing on a document. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 10

export type InventoryProduct = {
  id: string
  name: string
  barcode: string
  category: string
  stockQuantity: number
  lowStockThreshold: number
  isActive: boolean
  updatedAt?: number
}

export type StockStatus = 'Out of Stock' | 'Low Stock' | 'In Stock'

export function getStockStatus(stockQuantity: number, lowStockThreshold: number): StockStatus {
  if (stockQuantity === 0) return 'Out of Stock'
  if (stockQuantity <= lowStockThreshold) return 'Low Stock'
  return 'In Stock'
}

function toInventoryProduct(p: {
  id: string
  name: string
  barcode: string
  category: string
  stockQuantity: number
  lowStockThreshold?: number
  isActive: boolean
  updatedAt?: number
}): InventoryProduct {
  const lowStockThreshold = p.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD
  return {
    id: p.id,
    name: p.name,
    barcode: p.barcode,
    category: p.category,
    stockQuantity: p.stockQuantity,
    lowStockThreshold,
    isActive: p.isActive,
    updatedAt: p.updatedAt,
  }
}

/**
 * Active products only, inventory-focused fields.
 * Uses the same `Products` collection as `getProducts({ includeInactive: false })`.
 */
export async function getInventoryProducts(): Promise<InventoryProduct[]> {
  try {
    const res = await adminApi<{ inventory: any[] }>('/api/admin/inventory')
    return res.inventory.map((p) =>
      toInventoryProduct({
        id: String(p.id ?? p._id),
        name: String(p.name ?? ''),
        barcode: String(p.barcode ?? ''),
        category: String(p.category ?? 'General'),
        stockQuantity: Number(p.stockQuantity ?? 0),
        lowStockThreshold: typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : DEFAULT_LOW_STOCK_THRESHOLD,
        isActive: p.isActive !== false,
        updatedAt: p.updatedAt ? Date.parse(String(p.updatedAt)) : undefined,
      }),
    )
  } catch {
    const products = await getProducts({ includeInactive: false })
    return products.map((p) =>
      toInventoryProduct({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        category: p.category,
        stockQuantity: p.stockQuantity ?? p.stock ?? 0,
        lowStockThreshold: p.lowStockThreshold,
        isActive: p.isActive,
        updatedAt: p.updatedAt,
      }),
    )
  }
}

export async function updateProductStock(productId: string, stockQuantity: number): Promise<void> {
  if (!productId.trim()) throw new Error('Product id is required.')
  if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
    throw new Error('Stock quantity must be a non-negative number.')
  }
  try {
    await adminApi(`/api/admin/inventory/${encodeURIComponent(productId.trim())}/stock`, {
      method: 'PUT',
      body: { stockQuantity },
    })
    return
  } catch {
    await updateProduct(productId, { stockQuantity })
  }
}

export async function updateLowStockThreshold(
  productId: string,
  lowStockThreshold: number,
): Promise<void> {
  if (!productId.trim()) throw new Error('Product id is required.')
  if (Number.isNaN(lowStockThreshold) || lowStockThreshold < 0) {
    throw new Error('Low stock threshold must be a non-negative number.')
  }
  try {
    await adminApi(`/api/admin/inventory/${encodeURIComponent(productId.trim())}/threshold`, {
      method: 'PUT',
      body: { lowStockThreshold },
    })
    return
  } catch {
    await updateProduct(productId, { lowStockThreshold })
  }
}
