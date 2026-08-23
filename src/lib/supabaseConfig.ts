type SupabaseConfig = {
  url: string
  publishableKey: string
  configured: boolean
}

export const getSupabaseConfig = (): SupabaseConfig => {
  const url = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim().replace(/\/$/, '')
  const publishableKey = String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim()

  return {
    url,
    publishableKey,
    configured: Boolean(url && publishableKey),
  }
}

export const testSupabaseConnection = async (): Promise<{ ok: boolean; message: string }> => {
  const config = getSupabaseConfig()

  if (!config.configured) {
    return {
      ok: false,
      message: '.env.local にVITE_SUPABASE_URLとVITE_SUPABASE_PUBLISHABLE_KEYを設定してください。',
    }
  }

  try {
    const response = await fetch(`${config.url}/auth/v1/settings`, {
      headers: { apikey: config.publishableKey },
    })

    if (!response.ok) {
      const detail = await response.text()
      return {
        ok: false,
        message: `接続に失敗しました（HTTP ${response.status}）。${detail || 'URLまたはキーを確認してください。'}`,
      }
    }

    return {
      ok: true,
      message: 'Supabaseプロジェクトへの接続に成功しました。',
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? `接続エラー：${error.message}` : 'Supabaseへの接続中にエラーが発生しました。',
    }
  }
}
