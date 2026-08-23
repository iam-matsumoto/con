-- Ver.11 Step1.5: 予定・個人通知のRealtime同期
-- Supabase SQL Editorで1回だけ実行してください。

-- DELETE / UPDATE時にも変更イベントを安定して扱えるようにします。
alter table public.schedules replica identity full;
alter table public.schedule_notifications replica identity full;

-- Supabase Realtimeのpublicationへ対象テーブルを追加します。
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'schedules'
  ) then
    alter publication supabase_realtime add table public.schedules;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'schedule_notifications'
  ) then
    alter publication supabase_realtime add table public.schedule_notifications;
  end if;
end
$$;
