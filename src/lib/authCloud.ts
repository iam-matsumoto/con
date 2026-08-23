import { getSupabaseConfig } from './supabaseConfig'

const AUTH_STORAGE_KEY = 'company-schedule-supabase-auth-v1'

export type AuthSession = {
  access_token: string
  refresh_token: string
  expires_at?: number
  user: { id: string; email?: string }
}

export type AuthProfile = {
  id: string
  email: string
  displayName: string
  role: 'admin' | 'employee'
  active: boolean
}

const saveSession = (session: AuthSession | null) => {
  if (session) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  else localStorage.removeItem(AUTH_STORAGE_KEY)
}

const readStoredSession = (): AuthSession | null => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) as AuthSession : null
  } catch {
    return null
  }
}

export const getAccessToken = () => readStoredSession()?.access_token ?? null

const authRequest = async (path: string, init: RequestInit = {}) => {
  const config = getSupabaseConfig()
  if (!config.configured) throw new Error('Supabaseの接続情報が設定されていません。')
  const response = await fetch(`${config.url}/auth/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.publishableKey,
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    },
  })
  const text = await response.text()
  const body = text ? JSON.parse(text) : null
  if (!response.ok) throw new Error(body?.msg || body?.error_description || body?.message || `認証エラー（HTTP ${response.status}）`)
  return body
}

const refreshSession = async (refreshToken: string): Promise<AuthSession> => {
  const body = await authRequest('token?grant_type=refresh_token', {
    method: 'POST',
    body: JSON.stringify({ refresh_token: refreshToken }),
  }) as AuthSession
  saveSession(body)
  return body
}

export const restoreAuthSession = async (): Promise<AuthSession | null> => {
  const stored = readStoredSession()
  if (!stored) return null
  const now = Math.floor(Date.now() / 1000)
  if (stored.expires_at && stored.expires_at <= now + 60) {
    try { return await refreshSession(stored.refresh_token) }
    catch { saveSession(null); return null }
  }
  return stored
}

export const signInWithEmail = async (email: string, password: string): Promise<AuthSession> => {
  const session = await authRequest('token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }) as AuthSession
  saveSession(session)
  return session
}

export const signOutCloud = async () => {
  const config = getSupabaseConfig()
  const token = getAccessToken()
  if (token && config.configured) {
    try {
      await fetch(`${config.url}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}` },
      })
    } catch { /* local logout still succeeds */ }
  }
  saveSession(null)
}

export const fetchAuthProfile = async (userId: string, fallbackEmail = ''): Promise<AuthProfile> => {
  const config = getSupabaseConfig()
  const token = getAccessToken()
  if (!config.configured || !token) throw new Error('ログイン情報を確認できませんでした。')
  const response = await fetch(`${config.url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,email,display_name,role,active`, {
    headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}` },
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`プロフィール取得エラー（HTTP ${response.status}）${text ? `: ${text}` : ''}`)
  const rows = text ? JSON.parse(text) : []
  const row = rows[0]
  if (!row) throw new Error('このアカウントは会社システムに登録されていません。管理者に連絡してください。')
  if (!row.active) throw new Error('このアカウントは無効化されています。')
  return {
    id: row.id,
    email: row.email || fallbackEmail,
    displayName: row.display_name,
    role: row.role,
    active: row.active,
  }
}
