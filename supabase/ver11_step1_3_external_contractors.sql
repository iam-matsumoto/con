-- Ver.11 Step1.3: 予定ごとの外部業者（会社名＋人数）
-- 既存の schedules テーブルへ JSONB 列を1つだけ追加します。

alter table public.schedules
  add column if not exists external_contractors jsonb not null default '[]'::jsonb;

-- JSON配列以外が入らないようにする
alter table public.schedules
  drop constraint if exists schedules_external_contractors_is_array;

alter table public.schedules
  add constraint schedules_external_contractors_is_array
  check (jsonb_typeof(external_contractors) = 'array');
