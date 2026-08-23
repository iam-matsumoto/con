-- Ver.11 Step1（profiles対応のみ）
-- Supabase SQL Editorで1回実行してください。

-- 予定に社内メンバーのprofile UUIDを保存する列だけ追加します。
alter table public.schedules
  add column if not exists profile_ids uuid[] not null default '{}';

-- ログイン済みユーザーが有効なprofilesを閲覧できるようにします。
drop policy if exists "profiles_authenticated_read" on public.profiles;
create policy "profiles_authenticated_read"
on public.profiles
for select
to authenticated
using (active = true or id = auth.uid() or public.is_company_admin());

-- schedulesの既存RLSはVer.10の設定をそのまま使用します。
