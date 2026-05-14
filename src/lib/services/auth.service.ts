type Unsubscribe = () => void

export type AdminRole = 'SUPER_ADMIN' | 'STAFF'

export interface AdminUser {
  uid: string
  fullName: string
  email: string
  role: AdminRole
  isActive: boolean
  createdAt?: number
  updatedAt?: number
}

export type CreateAdminAccountData = {
  fullName: string
  email: string
  password: string
  role: AdminRole
}

export type CreateAdminAccountSuccess = {
  success: true
  message: string
  data: {
    uid: string
    email: string
    fullName: string
    role: AdminRole
  }
}

export type CreateAdminAccountFailure = {
  success: false
  message: string
}

export type CreateAdminAccountResult = CreateAdminAccountSuccess | CreateAdminAccountFailure

import { adminApi, getAdminToken, setAdminToken } from '../api/adminApi'

type BackendAdmin = {
  id: string
  fullName: string
  email: string
  role: AdminRole
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

function mapAdmin(a: BackendAdmin): AdminUser {
  return {
    uid: a.id,
    fullName: a.fullName,
    email: a.email,
    role: a.role,
    isActive: a.isActive,
    createdAt: a.createdAt ? Date.parse(a.createdAt) : undefined,
    updatedAt: a.updatedAt ? Date.parse(a.updatedAt) : undefined,
  }
}

export async function loginAdmin(email: string, password: string): Promise<AdminUser> {
  const e = email.trim()
  if (!e) throw new Error('Email is required.')
  if (!password) throw new Error('Password is required.')
  const res = await adminApi<{ token: string; admin: BackendAdmin }>('/api/admin/auth/login', {
    method: 'POST',
    body: { email: e, password },
    token: null,
  })
  setAdminToken(res.token)
  return mapAdmin(res.admin)
}

export async function logoutAdmin(): Promise<void> {
  setAdminToken(null)
}

export function subscribeToAuthState(callback: (admin: AdminUser | null) => void): Unsubscribe {
  const token = getAdminToken()
  if (!token) {
    callback(null)
    return () => {}
  }

  ;(async () => {
    try {
      const res = await adminApi<{ admin: BackendAdmin }>('/api/admin/auth/me', { token })
      callback(mapAdmin(res.admin))
    } catch {
      // Token invalid/expired
      setAdminToken(null)
      callback(null)
    }
  })()
  return () => {}
}

export async function createAdminAccount(data: CreateAdminAccountData): Promise<CreateAdminAccountResult> {
  try {
    const res = await adminApi<{ admin: BackendAdmin }>('/api/admin/auth/register', {
      method: 'POST',
      body: {
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        role: data.role,
      },
      token: null,
    })
    return {
      success: true,
      message: 'Account created successfully.',
      data: {
        uid: res.admin.id,
        email: res.admin.email,
        fullName: res.admin.fullName,
        role: res.admin.role,
      },
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : 'Could not create account.' }
  }
}

export async function getAdminRole(uid: string): Promise<AdminRole | null> {
  // Not used in API mode; keep for compatibility
  return uid ? null : null
}

export async function listAdmins(): Promise<AdminUser[]> {
  const token = getAdminToken()
  if (!token) return []
  const res = await adminApi<{ employees: BackendAdmin[] }>('/api/admin/employees', { token })
  return res.employees.map(mapAdmin)
}

export async function setAdminActive(uid: string, isActive: boolean): Promise<void> {
  const token = getAdminToken()
  if (!token) throw new Error('Not authenticated.')
  await adminApi(`/api/admin/employees/${encodeURIComponent(uid)}`, {
    method: 'PUT',
    body: { isActive },
    token,
  })
}

export async function updateAdminPassword(uid: string, password: string): Promise<void> {
  const token = getAdminToken()
  if (!token) throw new Error('Not authenticated.')
  await adminApi(`/api/admin/employees/${encodeURIComponent(uid)}/password`, {
    method: 'PUT',
    body: { password },
    token,
  })
}

export async function updateOwnProfile(patch: { fullName?: string; email?: string }): Promise<AdminUser> {
  const token = getAdminToken()
  if (!token) throw new Error('Not authenticated.')
  const res = await adminApi<{ admin: BackendAdmin }>('/api/admin/profile', {
    method: 'PUT',
    body: patch,
    token,
  })
  return mapAdmin(res.admin)
}

export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  const token = getAdminToken()
  if (!token) throw new Error('Not authenticated.')
  await adminApi('/api/admin/profile/change-password', {
    method: 'PUT',
    body: { currentPassword, newPassword },
    token,
  })
}
