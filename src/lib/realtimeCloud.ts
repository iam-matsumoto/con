import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from './supabaseConfig'

type RealtimeHandlers = {
  accessToken: string
  profileId: string
  onSchedulesChanged: () => void
  onNotificationsChanged: () => void
}

export const subscribeCompanyRealtime = async ({
  accessToken,
  profileId,
  onSchedulesChanged,
  onNotificationsChanged,
}: RealtimeHandlers): Promise<() => Promise<void>> => {
  const config = getSupabaseConfig()
  if (!config.configured) throw new Error('Supabaseの接続情報が設定されていません。')

  const client = createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  await client.realtime.setAuth(accessToken)

  const suffix = `${profileId}-${Date.now()}-${Math.random().toString(36).slice(2)}`

  const schedulesChannel = client
    .channel(`company-schedules-${suffix}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'schedules' },
      () => onSchedulesChanged(),
    )
    .subscribe()

  const notificationsChannel = client
    .channel(`personal-notifications-${suffix}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'schedule_notifications',
        filter: `target_profile_id=eq.${profileId}`,
      },
      () => onNotificationsChanged(),
    )
    .subscribe()

  return async () => {
    await Promise.all([
      client.removeChannel(schedulesChannel),
      client.removeChannel(notificationsChannel),
    ])
  }
}
