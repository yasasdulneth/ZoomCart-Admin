type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

const DEFAULT_BASE_URL = 'http://localhost:5000'

function getBaseUrl(): string {
  const raw = (import.meta.env as any).VITE_API_URL
  if (typeof raw === 'string' && raw.trim()) return raw.trim().replace(/\/+$/, '')
  // Dev: relative `/api/...` is proxied by Vite to the API (see vite.config.ts).
  if (import.meta.env.DEV) return ''
  return DEFAULT_BASE_URL
}

function parseJsonBody(text: string, res: Response): unknown {
  const trimmed = text.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('<') || trimmed.startsWith('<!')) {
    const hint =
      ' Start the Node API with `npm run server:dev` (or `npm run dev:all` for API + Vite). '
      + '`PORT` in `.env` is the Express HTTP port, not MongoDB. MongoDB uses `MONGO_URI` (often :27017). '
      + 'In dev, the Vite dev server proxies `/api` to `http://127.0.0.1:$PORT`.'
    throw new Error(`Server returned a page, not JSON.${hint}`)
  }
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    const preview = trimmed.slice(0, 80).replace(/\s+/g, ' ')
    throw new Error(`Invalid JSON in response (${res.status}): ${preview}${trimmed.length > 80 ? '…' : ''}`)
  }
}

export const ADMIN_TOKEN_KEY = 'zoomcart_admin_token'

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null
  const t = window.localStorage.getItem(ADMIN_TOKEN_KEY)
  return t && t.trim() ? t.trim() : null
}

export function setAdminToken(token: string | null): void {
  if (typeof window === 'undefined') return
  if (!token) {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY)
  } else {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token)
  }
  // Let the app react immediately (logout / refresh auth) without relying on a reload.
  window.dispatchEvent(new Event('zoomcart:auth-changed'))
}

export async function adminApi<T>(
  path: string,
  options: { method?: HttpMethod; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const method = options.method ?? 'GET'
  const url = `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const token = options.token ?? getAdminToken()

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(url, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const text = await res.text()
  const data = parseJsonBody(text, res) as any

  if (!res.ok) {
    const message = (data && typeof data.message === 'string' && data.message) || `Request failed (${res.status})`
    if (res.status === 401) {
      // Token is missing/expired/invalid; force a clean auth state.
      setAdminToken(null)
    }
    const err = new Error(message) as Error & { status?: number }
    err.status = res.status
    throw err
  }

  return data as T
}

