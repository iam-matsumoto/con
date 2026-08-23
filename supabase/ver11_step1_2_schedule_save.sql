-- Ver.11 Step1.2：予定保存 + profiles紐付け
-- Supabase SQL Editorで1回だけ実行してください。

-- 予定にSupabase profiles.id (UUID) を複数保存します。
alter table public.schedules
  add column if not exists profile_ids uuid[] not null default '{}';

alter table public.schedules enable row level security;

-- Ver.10で作成済みの会社認証ルールに合わせます。
-- ログイン済み社員は予定を閲覧可能。
drop policy if exists "schedules_authenticated_read" on public.schedules;
create policy "schedules_authenticated_read"
on public.schedules
for select
to authenticated
using (true);

-- 予定の追加・編集・削除は管理者のみ。
drop policy if exists "schedules_admin_write" on public.schedules;
create policy "schedules_admin_write"
on public.schedules
for all
to authenticated
using (public.is_company_admin())
with check (public.is_company_admin());

grant select, insert, update, delete on public.schedules to authenticated;
grant usage, select on all sequences in schema public to authenticated;
