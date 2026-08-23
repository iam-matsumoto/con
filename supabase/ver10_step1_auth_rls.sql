-- Ver.10 Step1: Supabase Auth + profiles + RLS
-- 既存データは削除しません。

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null default 'employee' check (role in ('admin', 'employee')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.sites enable row level security;
alter table public.notices enable row level security;
alter table public.schedules enable row level security;

create or replace function public.is_company_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active = true and role = 'admin'
  );
$$;

revoke all on function public.is_company_admin() from public;
grant execute on function public.is_company_admin() to authenticated;

-- 古いポリシーがあっても安全に作り直す
drop policy if exists "profiles_self_read" on public.profiles;
drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_self_read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_admin_all" on public.profiles for all to authenticated using (public.is_company_admin()) with check (public.is_company_admin());

-- 全社員は閲覧可能、管理者だけ変更可能
do $$
declare t text;
begin
  foreach t in array array['employees','sites','notices','schedules'] loop
    execute format('drop policy if exists %I on public.%I', t || '_authenticated_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_authenticated_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_company_admin()) with check (public.is_company_admin())', t || '_admin_write', t);
  end loop;
end $$;

-- Realtime対象（既に追加済みでもエラーにならない）
do $$
begin
  begin alter publication supabase_realtime add table public.employees; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.sites; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.notices; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.schedules; exception when duplicate_object then null; end;
end $$;
