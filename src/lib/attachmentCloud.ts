import { getSupabaseConfig } from './supabaseConfig'
import { getAccessToken } from './authCloud'

const BUCKET = 'schedule-drawings'

export type ScheduleAttachment = {
  id: string
  scheduleId: number
  fileName: string
  storagePath: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

type AttachmentRow = {
  id: string
  schedule_id: number
  file_name: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
}

const getAuthHeaders = () => {
  const config = getSupabaseConfig()
  const token = getAccessToken()
  if (!config.configured) throw new Error('Supabaseの接続情報が設定されていません。')
  if (!token) throw new Error('ログイン情報を確認できませんでした。')
  return { config, token, headers: { apikey: config.publishableKey, Authorization: `Bearer ${token}` } }
}

const toAttachment = (row: AttachmentRow): ScheduleAttachment => ({
  id: row.id,
  scheduleId: Number(row.schedule_id),
  fileName: row.file_name,
  storagePath: row.storage_path,
  mimeType: row.mime_type ?? 'application/octet-stream',
  sizeBytes: Number(row.size_bytes ?? 0),
  createdAt: row.created_at,
})

export const fetchScheduleAttachments = async (scheduleId: number): Promise<ScheduleAttachment[]> => {
  const { config, headers } = getAuthHeaders()
  const fields = 'id,schedule_id,file_name,storage_path,mime_type,size_bytes,created_at'
  const response = await fetch(`${config.url}/rest/v1/schedule_attachments?schedule_id=eq.${scheduleId}&select=${fields}&order=created_at.asc`, { headers })
  const text = await response.text()
  if (!response.ok) throw new Error(`図面一覧の取得に失敗しました（HTTP ${response.status}）${text ? `: ${text}` : ''}`)
  return (text ? JSON.parse(text) : []).map(toAttachment)
}

const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)

const createStorageId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export const uploadScheduleAttachment = async (scheduleId: number, file: File): Promise<ScheduleAttachment> => {
  const { config, headers } = getAuthHeaders()
  const storagePath = `${scheduleId}/${createStorageId()}-${safeFileName(file.name)}`
  const uploadResponse = await fetch(`${config.url}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'false' },
    body: file,
  })
  const uploadText = await uploadResponse.text()
  if (!uploadResponse.ok) throw new Error(`図面アップロードに失敗しました（HTTP ${uploadResponse.status}）${uploadText ? `: ${uploadText}` : ''}`)

  const response = await fetch(`${config.url}/rest/v1/schedule_attachments?select=id,schedule_id,file_name,storage_path,mime_type,size_bytes,created_at`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({
      schedule_id: scheduleId,
      file_name: file.name,
      storage_path: storagePath,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
    }),
  })
  const text = await response.text()
  if (!response.ok) {
    await fetch(`${config.url}/storage/v1/object/${BUCKET}/${storagePath}`, { method: 'DELETE', headers }).catch(() => undefined)
    throw new Error(`図面情報の保存に失敗しました（HTTP ${response.status}）${text ? `: ${text}` : ''}`)
  }
  const rows = text ? JSON.parse(text) as AttachmentRow[] : []
  if (!rows[0]) throw new Error('図面の登録結果を取得できませんでした。')
  return toAttachment(rows[0])
}

export const getScheduleAttachmentUrl = async (attachment: ScheduleAttachment): Promise<string> => {
  const { config, headers } = getAuthHeaders()
  const response = await fetch(`${config.url}/storage/v1/object/sign/${BUCKET}/${attachment.storagePath}`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 3600 }),
  })
  const text = await response.text()
  if (!response.ok) throw new Error(`図面を開けませんでした（HTTP ${response.status}）${text ? `: ${text}` : ''}`)
  const body = text ? JSON.parse(text) : null
  const signedURL = body?.signedURL ?? body?.signedUrl
  if (!signedURL) throw new Error('図面の一時URLを取得できませんでした。')
  return signedURL.startsWith('http') ? signedURL : `${config.url}/storage/v1${signedURL}`
}

export const deleteScheduleAttachment = async (attachment: ScheduleAttachment) => {
  const { config, headers } = getAuthHeaders()
  const storageResponse = await fetch(`${config.url}/storage/v1/object/${BUCKET}/${attachment.storagePath}`, { method: 'DELETE', headers })
  if (!storageResponse.ok && storageResponse.status !== 404) {
    const detail = await storageResponse.text()
    throw new Error(`図面ファイルの削除に失敗しました（HTTP ${storageResponse.status}）${detail ? `: ${detail}` : ''}`)
  }
  const response = await fetch(`${config.url}/rest/v1/schedule_attachments?id=eq.${attachment.id}`, { method: 'DELETE', headers })
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`図面情報の削除に失敗しました（HTTP ${response.status}）${detail ? `: ${detail}` : ''}`)
  }
}
