import type { AdminRole } from './auth.service'
import { listAdmins } from './auth.service'
import type {
  AdminNotification,
  NotificationTargetAudience,
  NotificationTargetRole,
} from '../../types/models'
import { adminApi } from '../api/adminApi'

export type { NotificationTargetAudience }

type Unsubscribe = () => void

const DEBUG = import.meta.env.DEV
const NOTIFICATIONS_STORE_KEY = 'zoomcart_notifications'

/** Minimal fields needed to filter the admin notification inbox. */
export type NotificationAdminContext = { uid: string; role: AdminRole }

/** @deprecated Prefer `NotificationAdminContext`. */
export type NotificationViewer = NotificationAdminContext

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function readAll(): AdminNotification[] {
  if (typeof window === 'undefined') return []
  const parsed = safeParseJson<AdminNotification[]>(window.localStorage.getItem(NOTIFICATIONS_STORE_KEY))
  if (Array.isArray(parsed)) return parsed

  const seed: AdminNotification[] = [
    {
      id: 'n-1',
      title: 'Welcome',
      message: 'Firebase has been removed. This is a local-only notification feed.',
      type: 'system',
      isRead: false,
      createdAt: Date.now(),
      targetAudience: 'ALL_ADMINS',
      isActive: true,
    },
  ]
  window.localStorage.setItem(NOTIFICATIONS_STORE_KEY, JSON.stringify(seed))
  return seed
}

function writeAll(next: AdminNotification[]): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(NOTIFICATIONS_STORE_KEY, JSON.stringify(next))
}

const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((fn) => fn())
}

// Local storage already uses `AdminNotification` shape.

function legacyVisibleToAdmin(n: AdminNotification, admin: NotificationAdminContext): boolean {
  const uid = n.targetUid != null ? String(n.targetUid) : ''
  if (uid.length > 0) return admin.uid === uid
  const tr = n.targetRole
  if (!tr || tr === 'ALL') return true
  if (tr === 'SUPER_ADMIN') return admin.role === 'SUPER_ADMIN'
  if (tr === 'STAFF') return admin.role === 'STAFF'
  return true
}

/**
 * Admin panel inbox: show notifications meant for this admin.
 * - `targetAudience === "BROADCAST" | "ALL_ADMINS"`
 * - `targetAudience === currentAdmin.role` (e.g. staff-wide)
 * - `targetUid === currentAdmin.uid` (direct admin)
 * If `targetUid` is set, only that admin matches (narrow individual sends).
 * Docs without `targetAudience` use legacy `targetRole` / `targetUid` rules.
 */
export function isNotificationVisibleToAdmin(n: AdminNotification, admin: NotificationAdminContext): boolean {
  if (n.isActive === false) return false

  const audRaw = n.targetAudience
  if (audRaw == null || audRaw === '') {
    return legacyVisibleToAdmin(n, admin)
  }

  const uid = n.targetUid != null ? String(n.targetUid) : ''
  if (uid.length > 0) {
    return admin.uid === uid
  }

  const aud = audRaw as NotificationTargetAudience
  if (aud === 'BROADCAST') return true
  if (aud === 'ALL_ADMINS') return true
  if (aud === admin.role) return true

  return false
}

function toAdminContext(
  currentAdmin?: NotificationAdminContext | null,
): NotificationAdminContext | null {
  if (!currentAdmin) return null
  return { uid: currentAdmin.uid, role: currentAdmin.role }
}

function filterForAdmin(list: AdminNotification[], admin: NotificationAdminContext | null): AdminNotification[] {
  if (!admin) return []
  return list.filter((n) => isNotificationVisibleToAdmin(n, admin))
}

export async function getNotificationsForAdmin(
  currentAdmin: NotificationAdminContext,
): Promise<AdminNotification[]> {
  try {
    const res = await adminApi<{ notifications: any[] }>('/api/admin/notifications')
    const mapped: AdminNotification[] = (res.notifications ?? []).map((n) => ({
      id: String(n.id ?? n._id),
      title: String(n.title ?? ''),
      message: String(n.message ?? ''),
      type: String(n.type ?? 'SYSTEM'),
      isRead: Boolean(n.isRead),
      read: Boolean(n.isRead),
      createdAt: n.createdAt ? Date.parse(String(n.createdAt)) : undefined,
      targetAudience: n.targetAudience ? String(n.targetAudience) : undefined,
      targetUid: n.targetAdminId ? String(n.targetAdminId) : null,
      targetUserId: n.targetUserId ? String(n.targetUserId) : null,
      sentByUid: n.sentByAdminId ? String(n.sentByAdminId) : undefined,
      isActive: n.isActive !== false,
    }))
    return mapped
      .filter((n) => n.isActive !== false)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
  } catch (err) {
    const status = typeof (err as any)?.status === 'number' ? (err as any).status : null
    const msg = err instanceof Error ? err.message : String(err)
    if (status === 401 || status === 403 || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid token')) {
      throw err instanceof Error ? err : new Error('Unauthorized')
    }
    // Fallback: local mode (API down/unreachable)
    const list = readAll()
      .filter((n) => n.isActive !== false)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    return filterForAdmin(list, currentAdmin)
  }
}

export async function getUnreadNotificationsCount(currentAdmin: NotificationAdminContext): Promise<number> {
  const list = await getNotificationsForAdmin(currentAdmin)
  return list.filter((n) => !n.isRead).length
}

/** Realtime inbox for the signed-in admin. */
export function subscribeToNotifications(
  onNext: (items: AdminNotification[]) => void,
  onError?: (err: Error) => void,
  currentAdmin?: NotificationAdminContext | null,
): Unsubscribe {
  const admin = toAdminContext(currentAdmin ?? null)

  let alive = true

  const tick = async () => {
    if (!alive) return
    if (!admin) {
      onNext([])
      return
    }
    try {
      const list = await getNotificationsForAdmin(admin)
      onNext(list)
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)))
    }
  }

  void tick()
  const id = window.setInterval(() => void tick(), 5000)
  return () => {
    alive = false
    window.clearInterval(id)
  }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  if (!notificationId.trim()) throw new Error('Notification id is required.')
  try {
    await adminApi(`/api/admin/notifications/${encodeURIComponent(notificationId.trim())}/read`, {
      method: 'PUT',
    })
    return
  } catch (err) {
    const status = typeof (err as any)?.status === 'number' ? (err as any).status : null
    const msg = err instanceof Error ? err.message : String(err)
    if (status === 401 || status === 403 || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid token')) {
      throw err instanceof Error ? err : new Error('Unauthorized')
    }
    // local fallback
    const all = readAll()
    const idx = all.findIndex((n) => n.id === notificationId.trim())
    if (idx < 0) return
    all[idx] = { ...all[idx]!, isRead: true, read: true }
    writeAll(all)
    emit()
  }
}

export async function markAllNotificationsAsRead(currentAdmin: NotificationAdminContext): Promise<void> {
  const visibleUnread = (await getNotificationsForAdmin(currentAdmin)).filter((n) => !n.isRead)
  if (visibleUnread.length === 0) return
  // No backend "mark all" endpoint; update in parallel-ish.
  await Promise.allSettled(visibleUnread.map((n) => markNotificationAsRead(n.id)))
}

export type CreateNotificationInput = {
  title: string
  message: string
  type: string
  targetAudience: NotificationTargetAudience
  targetUid?: string | null
  targetUserId?: string | null
  targetRole?: NotificationTargetRole | null
  sentByUid: string
  sentByName: string
}

export async function createNotification(data: CreateNotificationInput): Promise<string> {
  const targetUid = data.targetUid?.trim() ? data.targetUid.trim() : null
  const targetUserId = data.targetUserId?.trim() ? data.targetUserId.trim() : null

  const id = (() => {
    try {
      return `n-${crypto.randomUUID().slice(0, 8)}`
    } catch {
      return `n-${Math.random().toString(16).slice(2, 10)}`
    }
  })()

  const backendType = (() => {
    const raw = String(data.type ?? '').trim().toUpperCase()
    const allowed = new Set(['SYSTEM', 'PAYMENT', 'LOW_STOCK', 'PRODUCT', 'EMPLOYEE'])
    return allowed.has(raw) ? raw : 'SYSTEM'
  })()

  try {
    const res = await adminApi<{ notification: any }>('/api/admin/notifications', {
      method: 'POST',
      body: {
        title: data.title.trim(),
        message: data.message.trim(),
        type: backendType,
        targetAudience: data.targetAudience,
        targetUserId: targetUserId ?? undefined,
        targetAdminId: targetUid ?? undefined,
      },
    })
    return String(res.notification?.id ?? res.notification?._id ?? id)
  } catch (err) {
    const status = typeof (err as any)?.status === 'number' ? (err as any).status : null
    const msg = err instanceof Error ? err.message : String(err)
    if (status === 401 || status === 403 || msg.toLowerCase().includes('unauthorized') || msg.toLowerCase().includes('invalid token')) {
      throw err instanceof Error ? err : new Error('Unauthorized')
    }
    // local fallback
    const rec: AdminNotification = {
      id,
      title: data.title.trim(),
      message: data.message.trim(),
      type: data.type.trim() || 'system',
      isRead: false,
      read: false,
      isActive: true,
      createdAt: Date.now(),
      targetAudience: data.targetAudience,
      targetRole: data.targetRole ?? null,
      targetUid,
      targetUserId,
      sentByUid: data.sentByUid,
      sentByName: data.sentByName,
    }
    writeAll([rec, ...readAll()])
    emit()
    if (DEBUG) console.debug('[ZoomCart Notifications] created notification (local)', { id })
    return id
  }
}

export type AdminPickerRow = {
  uid: string
  fullName: string
  email: string
  role: string
}

export type AppUserPickerRow = {
  id: string
  email: string
  displayName: string
}

export async function getAdminsForNotificationPicker(): Promise<AdminPickerRow[]> {
  const admins = await listAdmins()
  const rows: AdminPickerRow[] = admins.map((a) => ({
    uid: a.uid,
    fullName: a.fullName || '—',
    email: a.email || '',
    role: a.role,
  }))
  return rows.sort((a, b) => a.fullName.localeCompare(b.fullName))
}

export async function getAppUsersForNotificationPicker(): Promise<AppUserPickerRow[]> {
  const seed: AppUserPickerRow[] = [
    { id: 'user-1', email: 'customer@example.com', displayName: 'Sample Customer' },
    { id: 'user-2', email: 'user@example.com', displayName: 'App User' },
  ]
  return seed.sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email))
}

/** @deprecated Use `isNotificationVisibleToAdmin` */
export function isNotificationVisibleForViewer(n: AdminNotification, viewer: NotificationViewer): boolean {
  return isNotificationVisibleToAdmin(n, viewer)
}

/** @deprecated Use `getNotificationsForAdmin` */
export async function getNotifications(viewer?: NotificationViewer): Promise<AdminNotification[]> {
  if (!viewer) return []
  return getNotificationsForAdmin(viewer)
}
