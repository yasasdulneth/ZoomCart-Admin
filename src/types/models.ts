export type Product = {
  id: string
  name: string
  /** Primary code used at checkout / scanning. */
  barcode: string
  /** Legacy alias for barcode (kept for backwards-compat). */
  sku?: string
  price: number
  /** Normal/base price before any discount is applied. */
  originalPrice: number
  /** Percentage off, between 0 and 100. */
  discountPercentage: number
  /** Final price after discount is applied. */
  discountedPrice: number
  /** True when a valid discount exists (discountPercentage > 0 and discountedPrice < originalPrice). */
  hasDiscount: boolean
  /** Primary stock count. */
  stockQuantity: number
  /** Legacy alias for stockQuantity (kept for backwards-compat). */
  stock?: number
  category: string
  aisle: string
  shelfSection: string
  nutritionInfo: string
  cheaperAlternativeId?: string
  imageUrl?: string
  /** Soft-delete flag; false means "deleted". */
  isActive: boolean
  /** Legacy alias for isActive (kept for backwards-compat). */
  active?: boolean
  /** When stockQuantity is at or below this, inventory shows "Low Stock". */
  lowStockThreshold?: number
  createdAt?: number
  updatedAt?: number
}

export type UserProfile = {
  id: string
  email: string
  displayName?: string
  role?: string
  isActive?: boolean
  createdAt?: number
}

export type PaymentStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'REFUNDED' | 'EXPIRED'

export type Payment = {
  id: string
  amount: number
  currency: string
  status: PaymentStatus
  reference?: string
  createdAt?: number
}

export type InventoryRow = {
  productId: string
  name: string
  sku?: string
  stock: number
  lowStock: boolean
}

export type NotificationTargetRole = 'SUPER_ADMIN' | 'STAFF' | 'ALL'

/** Who the notification is addressed to (Firestore + admin composer). */
export type NotificationTargetAudience =
  | 'STAFF'
  | 'APP_USER'
  | 'ALL_ADMINS'
  | 'ALL_USERS'
  | 'BROADCAST'

/** Firestore `notifications` document shape (admin panel + app). */
export type AdminNotification = {
  id: string
  title: string
  message: string
  /** Notification category / channel (e.g. "system", "order"). */
  type: string
  isRead: boolean
  createdAt?: number
  targetAudience?: NotificationTargetAudience | string
  targetRole?: NotificationTargetRole | string | null
  targetUid?: string | null
  targetUserId?: string | null
  sentByUid?: string
  sentByName?: string
  /** When false, hidden from lists (soft-off). Missing treats as active. */
  isActive?: boolean
  /** Legacy field from older docs; prefer `isRead`. */
  read?: boolean
}

export type AdminUser = {
  uid: string
  email: string | null
  displayName: string | null
}
