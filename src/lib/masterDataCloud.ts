import { getSupabaseConfig } from './supabaseConfig'
import { getAccessToken } from './authCloud'

export type CloudEmployee = { id: string; name: string; email: string; role: 'admin' | 'employee'; active: boolean }
export type CloudSite = { id: number; name: string; active: boolean }
export type CloudNotice = { id: number; date: string; title: string; body: string; important: boolean }

const request = async (path: string, init: RequestInit = {}) => {
  const config = getSupabaseConfig()
  if (!config.configured) throw new Error('Supabaseの接続情報が設定されていません。')
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${getAccessToken() ?? config.publishableKey}`,
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    },
  })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Supabaseエラー（HTTP ${response.status}）${detail ? `: ${detail}` : ''}`)
  }
  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

export const fetchCloudEmployees = async (): Promise<CloudEmployee[]> => {
  const rows = await request('profiles?select=id,email,display_name,role,active&order=display_name.asc') as Array<{id:string;email:string;display_name:string;role:'admin'|'employee';active:boolean}>
  return rows.map(row => ({ id: row.id, name: row.display_name, email: row.email, role: row.role, active: row.active }))
}

export const fetchCloudSites = async (): Promise<CloudSite[]> =>
  (await request('sites?select=id,name,active&order=id.asc')) as CloudSite[]
export const createCloudSite = async (value: Omit<CloudSite, 'id'>): Promise<CloudSite> => {
  const rows = await request('sites?select=id,name,active', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(value) }) as CloudSite[]
  if (!rows[0]) throw new Error('現場の登録結果を取得できませんでした。')
  return rows[0]
}
export const updateCloudSite = async (value: CloudSite): Promise<CloudSite> => {
  const rows = await request(`sites?id=eq.${value.id}&select=id,name,active`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ name: value.name, active: value.active, updated_at: new Date().toISOString() }) }) as CloudSite[]
  if (!rows[0]) throw new Error('現場の更新対象が見つかりませんでした。')
  return rows[0]
}
export const deleteCloudSite = async (id: number) => request(`sites?id=eq.${id}`, { method: 'DELETE' })

export const fetchCloudNotices = async (): Promise<CloudNotice[]> => {
  const rows = await request('notices?select=id,notice_date,title,body,important&order=notice_date.desc,id.desc') as Array<{id:number;notice_date:string;title:string;body:string;important:boolean}>
  return rows.map(row => ({ id: row.id, date: row.notice_date, title: row.title, body: row.body, important: row.important }))
}
export const createCloudNotice = async (value: Omit<CloudNotice, 'id'>): Promise<CloudNotice> => {
  const rows = await request('notices?select=id,notice_date,title,body,important', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ notice_date: value.date, title: value.title, body: value.body, important: value.important }) }) as Array<{id:number;notice_date:string;title:string;body:string;important:boolean}>
  if (!rows[0]) throw new Error('お知らせの登録結果を取得できませんでした。')
  return { id: rows[0].id, date: rows[0].notice_date, title: rows[0].title, body: rows[0].body, important: rows[0].important }
}
export const updateCloudNotice = async (value: CloudNotice): Promise<CloudNotice> => {
  const rows = await request(`notices?id=eq.${value.id}&select=id,notice_date,title,body,important`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ notice_date: value.date, title: value.title, body: value.body, important: value.important, updated_at: new Date().toISOString() }) }) as Array<{id:number;notice_date:string;title:string;body:string;important:boolean}>
  if (!rows[0]) throw new Error('お知らせの更新対象が見つかりませんでした。')
  return { id: rows[0].id, date: rows[0].notice_date, title: rows[0].title, body: rows[0].body, important: rows[0].important }
}
export const deleteCloudNotice = async (id: number) => request(`notices?id=eq.${id}`, { method: 'DELETE' })

export const uploadMasterData = async (employees: CloudEmployee[], sites: CloudSite[], notices: CloudNotice[]) => {
  // profiles は Supabase Authentication と連動するため、この画面から一括送信しません。
  if (sites.length) await request('sites?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(sites) })
  if (notices.length) await request('notices?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(notices.map(n => ({ id:n.id, notice_date:n.date, title:n.title, body:n.body, important:n.important }))) })
}
