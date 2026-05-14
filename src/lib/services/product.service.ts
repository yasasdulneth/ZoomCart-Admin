import type { Product } from '../../types/models'
import { adminApi } from '../api/adminApi'
const DEBUG = import.meta.env.DEV
const PRODUCTS_STORE_KEY = 'zoomcart_products'

function roundMoney(n: number): number {
  // Avoid float noise when persisting currency-like values.
  return Math.round(n * 100) / 100
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function readAll(): Product[] {
  if (typeof window === 'undefined') return []
  const parsed = safeParseJson<Product[]>(window.localStorage.getItem(PRODUCTS_STORE_KEY))
  if (Array.isArray(parsed)) {
    // Migrate older/local variants to the canonical shape so UI + inventory stay in sync.
    let changed = false
    const migrated = parsed.map((p) => {
      const next: Product = { ...(p as any) }

      if (next.barcode == null || String(next.barcode).trim() === '') {
        const legacyBarcode = (next as any).sku
        if (typeof legacyBarcode === 'string' && legacyBarcode.trim()) {
          next.barcode = legacyBarcode.trim()
          changed = true
        }
      }

      if (next.stockQuantity == null) {
        const legacyStock = (next as any).stock
        if (typeof legacyStock === 'number' && !Number.isNaN(legacyStock)) {
          next.stockQuantity = legacyStock
          changed = true
        } else {
          next.stockQuantity = 0
          changed = true
        }
      }
      ;(next as any).stock = next.stockQuantity

      if ((next as any).isActive == null) {
        const legacyActive = (next as any).active
        if (typeof legacyActive === 'boolean') {
          next.isActive = legacyActive
          changed = true
        } else {
          next.isActive = true
          changed = true
        }
      }
      ;(next as any).active = next.isActive

      // Ensure required strings exist (avoid UI crashes on older drafts)
      next.name = String(next.name ?? '').trim()
      ;(next as any).category = String((next as any).category ?? 'General')
      ;(next as any).aisle = String((next as any).aisle ?? '')
      ;(next as any).shelfSection = String((next as any).shelfSection ?? '')
      ;(next as any).nutritionInfo = String((next as any).nutritionInfo ?? '')

      return next
    })

    if (changed) writeAll(migrated)
    return migrated
  }

  // Seed a couple of products so the UI isn't empty after removing Firebase.
  const seed: Product[] = [
    {
      id: 'p-1',
      name: 'Sample product A',
      barcode: 'SKU-A1',
      sku: 'SKU-A1',
      price: 29.99,
      originalPrice: 29.99,
      discountPercentage: 0,
      discountedPrice: 29.99,
      hasDiscount: false,
      category: 'General',
      aisle: '1',
      shelfSection: 'A-1',
      stockQuantity: 120,
      stock: 120,
      nutritionInfo: '',
      isActive: true,
      active: true,
      lowStockThreshold: 10,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: 'p-2',
      name: 'Sample product B',
      barcode: 'SKU-B2',
      sku: 'SKU-B2',
      price: 49.5,
      originalPrice: 49.5,
      discountPercentage: 10,
      discountedPrice: 44.55,
      hasDiscount: true,
      category: 'General',
      aisle: '2',
      shelfSection: 'B-3',
      stockQuantity: 8,
      stock: 8,
      nutritionInfo: '',
      isActive: true,
      active: true,
      lowStockThreshold: 10,
      createdAt: Date.now() - 86_400_000,
      updatedAt: Date.now() - 86_400_000,
    },
  ]
  window.localStorage.setItem(PRODUCTS_STORE_KEY, JSON.stringify(seed))
  return seed
}

function writeAll(next: Product[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRODUCTS_STORE_KEY, JSON.stringify(next))
}

type DiscountDraft = {
  originalPrice: number
  discountPercentage: number
  discountedPrice: number
  hasDiscount: boolean
}

function validateDiscountFields(d: DiscountDraft): string[] {
  const errs: string[] = []
  if (Number.isNaN(d.originalPrice) || d.originalPrice < 0) errs.push('Original price must be a non-negative number.')
  if (
    Number.isNaN(d.discountPercentage) ||
    d.discountPercentage < 0 ||
    d.discountPercentage > 100
  ) {
    errs.push('Discount percentage must be between 0 and 100.')
  }
  if (Number.isNaN(d.discountedPrice) || d.discountedPrice < 0) errs.push('Discounted price must be a non-negative number.')
  if (!Number.isNaN(d.originalPrice) && !Number.isNaN(d.discountedPrice) && d.discountedPrice > d.originalPrice) {
    errs.push('Discounted price cannot be greater than original price.')
  }
  return errs
}

function normalizeDiscountFields(params: {
  originalPrice: number
  discountPercentage?: number
  discountedPrice?: number
}): DiscountDraft {
  const originalPrice = roundMoney(params.originalPrice)
  const discountPercentageRaw = params.discountPercentage
  const discountedPriceRaw = params.discountedPrice

  // If both are provided, keep discountedPrice authoritative and recompute percentage to match.
  if (typeof discountedPriceRaw === 'number' && !Number.isNaN(discountedPriceRaw)) {
    const discountedPrice = roundMoney(discountedPriceRaw)
    const discountPercentage =
      originalPrice > 0 ? ((originalPrice - discountedPrice) / originalPrice) * 100 : 0
    const discountPercentageSafe = roundMoney(discountPercentage)
    const hasDiscount = discountPercentageSafe > 0 && discountedPrice < originalPrice
    return {
      originalPrice,
      discountPercentage: hasDiscount ? discountPercentageSafe : 0,
      discountedPrice: hasDiscount ? discountedPrice : originalPrice,
      hasDiscount,
    }
  }

  const discountPercentageSafe =
    typeof discountPercentageRaw === 'number' && !Number.isNaN(discountPercentageRaw)
      ? roundMoney(discountPercentageRaw)
      : 0
  const discountedPrice = roundMoney(originalPrice - (originalPrice * discountPercentageSafe) / 100)
  const hasDiscount = discountPercentageSafe > 0 && discountedPrice < originalPrice
  return {
    originalPrice,
    discountPercentage: hasDiscount ? discountPercentageSafe : 0,
    discountedPrice: hasDiscount ? discountedPrice : originalPrice,
    hasDiscount,
  }
}

export async function getProducts(options: { includeInactive?: boolean } = {}): Promise<Product[]> {
  const { includeInactive = false } = options
  try {
    const qs = includeInactive ? '?includeInactive=true' : ''
    const res = await adminApi<{ products: any[] }>(`/api/admin/products${qs}`)
    return res.products.map((p) => ({
      id: String(p.id ?? p._id),
      name: String(p.name ?? ''),
      barcode: String(p.barcode ?? ''),
      sku: String(p.barcode ?? ''),
      price: Number(p.discountedPrice ?? p.price ?? 0),
      originalPrice: Number(p.originalPrice ?? 0),
      discountPercentage: Number(p.discountPercentage ?? 0),
      discountedPrice: Number(p.discountedPrice ?? p.originalPrice ?? 0),
      hasDiscount: Boolean(p.hasDiscount),
      category: String(p.category ?? 'General'),
      aisle: String(p.aisle ?? ''),
      shelfSection: String(p.shelfSection ?? ''),
      stockQuantity: Number(p.stockQuantity ?? 0),
      stock: Number(p.stockQuantity ?? 0),
      nutritionInfo: String(p.nutritionInfo ?? ''),
      cheaperAlternativeId: p.cheaperAlternativeId ? String(p.cheaperAlternativeId) : undefined,
      imageUrl: p.imageUrl ? String(p.imageUrl) : undefined,
      isActive: p.isActive !== false,
      active: p.isActive !== false,
      lowStockThreshold: typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : undefined,
      createdAt: p.createdAt ? Date.parse(String(p.createdAt)) : undefined,
      updatedAt: p.updatedAt ? Date.parse(String(p.updatedAt)) : undefined,
    }))
  } catch (err) {
    // If the API is reachable but rejects auth, do not silently fall back to local storage.
    const status = typeof (err as any)?.status === 'number' ? (err as any).status : null
    const msg = err instanceof Error ? err.message : String(err)
    if (status === 401 || status === 403 || msg.toLowerCase().includes('invalid token') || msg.toLowerCase().includes('unauthorized')) {
      throw err instanceof Error ? err : new Error('Unauthorized')
    }
    // Fallback: local mode (API down/unreachable)
    const list = readAll()
    const filtered = includeInactive ? list : list.filter((p) => p.isActive !== false)
    return [...filtered].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!id.trim()) throw new Error('Product id is required.')
  try {
    const res = await adminApi<{ product: any }>(`/api/admin/products/${encodeURIComponent(id.trim())}`)
    const p = res.product
    return {
      id: String(p.id ?? p._id),
      name: String(p.name ?? ''),
      barcode: String(p.barcode ?? ''),
      sku: String(p.barcode ?? ''),
      price: Number(p.discountedPrice ?? p.price ?? 0),
      originalPrice: Number(p.originalPrice ?? 0),
      discountPercentage: Number(p.discountPercentage ?? 0),
      discountedPrice: Number(p.discountedPrice ?? p.originalPrice ?? 0),
      hasDiscount: Boolean(p.hasDiscount),
      category: String(p.category ?? 'General'),
      aisle: String(p.aisle ?? ''),
      shelfSection: String(p.shelfSection ?? ''),
      stockQuantity: Number(p.stockQuantity ?? 0),
      stock: Number(p.stockQuantity ?? 0),
      nutritionInfo: String(p.nutritionInfo ?? ''),
      cheaperAlternativeId: p.cheaperAlternativeId ? String(p.cheaperAlternativeId) : undefined,
      imageUrl: p.imageUrl ? String(p.imageUrl) : undefined,
      isActive: p.isActive !== false,
      active: p.isActive !== false,
      lowStockThreshold: typeof p.lowStockThreshold === 'number' ? p.lowStockThreshold : undefined,
      createdAt: p.createdAt ? Date.parse(String(p.createdAt)) : undefined,
      updatedAt: p.updatedAt ? Date.parse(String(p.updatedAt)) : undefined,
    }
  } catch {
    const match = readAll().find((p) => p.id === id.trim())
    return match ?? null
  }
}

export type CreateProductInput = Omit<Product, 'id'> & { id?: string }

export async function createProduct(input: CreateProductInput): Promise<string> {
  // Try API first
  try {
    const res = await adminApi<{ product: any }>('/api/admin/products', {
      method: 'POST',
      body: {
        name: input.name,
        barcode: input.barcode,
        originalPrice: input.originalPrice ?? input.price,
        discountPercentage: input.discountPercentage,
        discountedPrice: input.discountedPrice,
        category: input.category,
        aisle: input.aisle,
        shelfSection: input.shelfSection,
        stockQuantity: input.stockQuantity,
        lowStockThreshold: input.lowStockThreshold,
        nutritionInfo: input.nutritionInfo,
        cheaperAlternativeId: input.cheaperAlternativeId,
        imageUrl: input.imageUrl,
        isActive: input.isActive,
        isComplete: true,
      },
    })
    return String(res.product.id ?? res.product._id)
  } catch (err) {
    // If the API is reachable but rejected the request (400/401/403/etc), do NOT silently fall back
    // to local storage because the UI reloads from API and the product "disappears".
    if (err instanceof Error) throw err
    throw new Error('Could not create product.')
  }
}

export type UpdateProductInput = Partial<
  Omit<
    Product,
    'id' | 'createdAt' | 'updatedAt' | 'stock' | 'active' | 'sku'
  >
>

export async function updateProduct(id: string, patch: UpdateProductInput): Promise<void> {
  if (!id.trim()) throw new Error('Product id is required.')
  try {
    await adminApi(`/api/admin/products/${encodeURIComponent(id.trim())}`, {
      method: 'PUT',
      body: patch,
    })
    return
  } catch (err) {
    const status = typeof (err as any)?.status === 'number' ? (err as any).status : null
    const msg = err instanceof Error ? err.message : String(err)
    if (status === 401 || status === 403 || msg.toLowerCase().includes('invalid token') || msg.toLowerCase().includes('unauthorized')) {
      throw err instanceof Error ? err : new Error('Unauthorized')
    }
    // local fallback (API down)
  }
  const all = readAll()
  const idx = all.findIndex((p) => p.id === id.trim())
  if (idx < 0) throw new Error('Product not found.')
  const current = all[idx]!

  const touchesDiscount =
    patch.originalPrice !== undefined ||
    patch.discountPercentage !== undefined ||
    patch.discountedPrice !== undefined ||
    patch.hasDiscount !== undefined ||
    patch.price !== undefined

  if (touchesDiscount) {
    const originalPrice =
      patch.originalPrice !== undefined ? patch.originalPrice : current.originalPrice

    const discount = normalizeDiscountFields({
      originalPrice,
      discountPercentage:
        patch.discountPercentage !== undefined ? patch.discountPercentage : current.discountPercentage,
      discountedPrice:
        patch.discountedPrice !== undefined
          ? patch.discountedPrice
          : patch.price !== undefined
            ? patch.price
            : current.discountedPrice,
    })
    const errs = validateDiscountFields(discount)
    if (errs.length > 0) throw new Error(errs[0]!)

    ;(patch as any).originalPrice = discount.originalPrice
    ;(patch as any).discountPercentage = discount.discountPercentage
    ;(patch as any).discountedPrice = discount.discountedPrice
    ;(patch as any).hasDiscount = discount.hasDiscount
    ;(patch as any).price = discount.discountedPrice
  }

  const next: Product = {
    ...current,
    ...patch,
    id: current.id,
    updatedAt: Date.now(),
  }

  ;(next as any).sku = next.barcode ?? (next as any).sku
  ;(next as any).stock = next.stockQuantity ?? (next as any).stock
  ;(next as any).active = next.isActive ?? (next as any).active

  all[idx] = next
  writeAll(all)
  if (DEBUG) console.debug('[ZoomCart Products] updated product (local)', { id })
}

export async function deleteProduct(id: string): Promise<void> {
  if (!id.trim()) throw new Error('Product id is required.')
  try {
    await adminApi(`/api/admin/products/${encodeURIComponent(id.trim())}`, { method: 'DELETE' })
    return
  } catch (err) {
    // Do not silently fall back; the UI reloads from the API and it will look like nothing happened.
    if (err instanceof Error) throw err
    throw new Error('Delete failed.')
  }
}

