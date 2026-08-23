-- Ver.11 Step2.2: 予定ごとの図面添付
-- Supabase SQL Editorで1回だけ実行してください。

create extension if not exists pgcrypto;

create table if not exists public.schedule_attachments (
  id uuid primary key default gen_random_uuid(),
  schedule_id bigint not null references public.schedules(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint not null default 0,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index if not exists schedule_attachments_schedule_id_idx
  on public.schedule_attachments(schedule_id);

alter table public.schedule_attachments enable row level security;

drop policy if exists "authenticated can read schedule attachments" on public.schedule_attachments;
create policy "authenticated can read schedule attachments"
on public.schedule_attachments for select
to authenticated
using (true);

drop policy if exists "admins can insert schedule attachments" on public.schedule_attachments;
create policy "admins can insert schedule attachments"
on public.schedule_attachments for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.active = true
  )
);

drop policy if exists "admins can delete schedule attachments" on public.schedule_attachments;
create policy "admins can delete schedule attachments"
on public.schedule_attachments for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.active = true
  )
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'schedule-drawings',
  'schedule-drawings',
  false,
  20971520,
  array['application/pdf','image/jpeg','image/png','application/octet-stream']
)
on conflict (id) do update
set public = false,
    file_size_limit = 20971520;

drop policy if exists "authenticated can read schedule drawings" on storage.objects;
create policy "authenticated can read schedule drawings"
on storage.objects for select
to authenticated
using (bucket_id = 'schedule-drawings');

drop policy if exists "admins can upload schedule drawings" on storage.objects;
create policy "admins can upload schedule drawings"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'schedule-drawings'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.active = true
  )
);

drop policy if exists "admins can delete schedule drawings" on storage.objects;
create policy "admins can delete schedule drawings"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'schedule-drawings'
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.active = true
  )
);
