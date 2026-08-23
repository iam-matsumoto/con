-- Ver.8 Step2：予定データのクラウド同期
-- Supabaseの「SQL Editor」へ貼り付けて、Runを押してください。

alter table public.schedules
  add column if not exists employee_ids bigint[] not null default '{}';

-- 現在のアプリはSupabase Authへ切り替える前なので、
-- Step2では公開可能キー（anon）から予定だけを読み書きできる一時ポリシーを使います。
-- Ver.8の認証対応時に、この一時ポリシーは削除します。
drop policy if exists "temporary anon can read schedules" on public.schedules;
drop policy if exists "temporary anon can insert schedules" on public.schedules;
drop policy if exists "temporary anon can update schedules" on public.schedules;
drop policy if exists "temporary anon can delete schedules" on public.schedules;

create policy "temporary anon can read schedules"
  on public.schedules for select to anon using (true);
create policy "temporary anon can insert schedules"
  on public.schedules for insert to anon with check (true);
create policy "temporary anon can update schedules"
  on public.schedules for update to anon using (true) with check (true);
create policy "temporary anon can delete schedules"
  on public.schedules for delete to anon using (true);

grant select, insert, update, delete on public.schedules to anon;
grant usage, select on all sequences in schema public to anon;
