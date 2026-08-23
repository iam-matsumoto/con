import { getSupabaseConfig } from './supabaseConfig'
import { getAccessToken } from './authCloud'

export type NotificationType = 'schedule_created' | 'schedule_updated' | 'schedule_deleted'

export type PersonalNotification = {
  id: number
  targetProfileId: string
  notificationType: NotificationType
  title: string
  body: string
  scheduleId: number | null
  read: boolean
  createdAt: string
}

type NotificationRow = {
  id: number
  target_profile_id: string
  notification_type: NotificationType
  title: string
  body: string
  schedule_id: number | null
  is_read: boolean
  created_at: string
}

const request = async (path: string, init: RequestInit = {}) => {
  const config = getSupabaseConfig()
  const token = getAccessToken()
  if (!config.configured) throw new Error('Supabaseの接続情報が設定されていません。')
  if (!token) throw new Error('ログイン情報がありません。')

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.publishableKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    },
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`通知APIエラー（HTTP ${response.status}）${detail ? `: ${detail}` : ''}`)
  }

  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

const toNotification = (row: NotificationRow): PersonalNotification => ({
  id: Number(row.id),
  targetProfileId: row.target_profile_id,
  notificationType: row.notification_type,
  title: row.title,
  body: row.body,
  scheduleId: row.schedule_id == null ? null : Number(row.schedule_id),
  read: Boolean(row.is_read),
  createdAt: row.created_at,
})

export const fetchMyNotifications = async (profileId: string): Promise<PersonalNotification[]> => {
  const rows = await request(
    `schedule_notifications?target_profile_id=eq.${encodeURIComponent(profileId)}&select=id,target_profile_id,notification_type,title,body,schedule_id,is_read,created_at&order=created_at.desc`,
  ) as NotificationRow[]
  return rows.map(toNotification)
}

export const createScheduleNotifications = async (
  profileIds: string[],
  type: NotificationType,
  schedule: { id: number | null; date: string; title: string; place: string },
) => {
  const uniqueIds = [...new Set(profileIds.filter(Boolean))]
  if (uniqueIds.length === 0) return

  const title =
    type === 'schedule_created'
      ? '予定が追加されました'
      : type === 'schedule_updated'
        ? '予定が変更されました'
        : '予定が削除されました'

  const body = `${schedule.date}　${schedule.title}　${schedule.place}`
  await request('schedule_notifications', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(
      uniqueIds.map((targetProfileId) => ({
        target_profile_id: targetProfileId,
        notification_type: type,
        title,
        body,
        schedule_id: schedule.id,
      })),
    ),
  })
}

export const markNotificationRead = async (id: number) => {
  await request(`schedule_notifications?id=eq.${id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }),
  })
}

export const markAllNotificationsRead = async (profileId: string) => {
  await request(`schedule_notifications?target_profile_id=eq.${encodeURIComponent(profileId)}&is_read=eq.false`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ is_read: true, read_at: new Date().toISOString() }),
  })
}
