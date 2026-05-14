import { adminApi, getAdminToken } from '../lib/api/adminApi'
import type { Payment } from '../types/models'

interface BackendPayment {
  _id: string
  amount: number
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED'
  createdAt: string
}

export async function listPayments(): Promise<Payment[]> {
  const token = getAdminToken()
  if (!token) return []
  const res = await adminApi<{ payments: BackendPayment[] }>('/api/admin/payments', { token })
  
  return res.payments.map((p) => ({
    id: p._id,
    amount: p.amount,
    currency: 'LKR',
    status: p.status,
    reference: p._id,
    createdAt: new Date(p.createdAt).getTime(),
  }))
}

export async function getPayment(paymentId: string): Promise<Payment> {
  const token = getAdminToken()
  if (!token) throw new Error('Not authenticated.')
  const res = await adminApi<{ payment: BackendPayment }>(`/api/admin/payments/${encodeURIComponent(paymentId)}`, { token })
  
  const p = res.payment
  return {
    id: p._id,
    amount: p.amount,
    currency: 'LKR',
    status: p.status,
    reference: p._id,
    createdAt: new Date(p.createdAt).getTime(),
  }
}

export async function verifyPayment(paymentId: string): Promise<void> {
  const token = getAdminToken()
  if (!token) throw new Error('Not authenticated.')
  await adminApi(`/api/admin/payments/${encodeURIComponent(paymentId)}/verify`, {
    method: 'PUT',
    token,
  })
}

export async function deletePayment(paymentId: string): Promise<void> {
  const token = getAdminToken()
  if (!token) throw new Error('Not authenticated.')
  await adminApi(`/api/admin/payments/${encodeURIComponent(paymentId)}`, {
    method: 'DELETE',
    token,
  })
}


/**
 * Polls the payments collection.
 */
export function subscribePayments(
  onNext: (payments: Payment[]) => void,
  onError?: (err: Error) => void,
): () => void {
  let active = true

  const fetch = async () => {
    try {
      const list = await listPayments()
      if (active) onNext(list)
    } catch (err) {
      if (active && onError) onError(err as Error)
    }
  }

  fetch()
  const intervalId = setInterval(fetch, 5000)

  return () => {
    active = false
    clearInterval(intervalId)
  }
}
