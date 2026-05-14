import { listAdmins } from '../lib/services/auth.service'
import type { UserProfile } from '../types/models'

const seedMock: UserProfile[] = [
  {
    id: 'mock-u1',
    email: 'customer@example.com',
    displayName: 'Sample Customer',
    role: 'STAFF',
    createdAt: Date.now(),
    isActive: true,
  },
  {
    id: 'mock-u2',
    email: 'staff@example.com',
    displayName: 'Staff Member',
    role: 'STAFF',
    createdAt: Date.now(),
    isActive: true,
  },
]

const mockUsers: UserProfile[] = seedMock.map((u) => ({ ...u }))
const mockListeners = new Set<(list: UserProfile[]) => void>()

function sortUsers(list: UserProfile[]): UserProfile[] {
  return [...list].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
}

/**
 * Realtime `users` collection or mock directory.
 */
export function subscribeUsers(
  onNext: (users: UserProfile[]) => void,
  onError?: (err: Error) => void,
): () => void {
  // Prefer the admin directory from backend (requires SUPER_ADMIN token).
  mockListeners.add(onNext)

  void (async () => {
    try {
      const admins = await listAdmins()
      const merged =
        admins.length > 0
          ? admins.map((a) => ({
              id: a.uid,
              email: a.email,
              displayName: a.fullName,
              role: a.role,
              isActive: a.isActive,
              createdAt: a.createdAt,
            }))
          : mockUsers
      onNext(sortUsers(merged.map((u) => ({ ...u }))))
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)))
      onNext(sortUsers(mockUsers.map((u) => ({ ...u }))))
    }
  })()

  return () => mockListeners.delete(onNext)
}
