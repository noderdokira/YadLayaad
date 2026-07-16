-- ============================================================
-- יד ליעד · סבב 5: התראות דחיפה + ליגת חברים
-- להרצה ב־Supabase Dashboard ← SQL Editor ← New query ← Run
-- ============================================================

-- ---------- 1. מנויי התראות דחיפה ----------
create table if not exists public.push_subscriptions (
  endpoint   text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "own subs select" on public.push_subscriptions;
create policy "own subs select" on public.push_subscriptions
  for select using (auth.uid() = user_id);

drop policy if exists "own subs insert" on public.push_subscriptions;
create policy "own subs insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

drop policy if exists "own subs update" on public.push_subscriptions;
create policy "own subs update" on public.push_subscriptions
  for update using (auth.uid() = user_id);

drop policy if exists "own subs delete" on public.push_subscriptions;
create policy "own subs delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- ---------- 2. ליגת חברים ----------
create table if not exists public.leagues (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.league_members (
  league_id    uuid not null references public.leagues(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  pct          numeric default 0,
  updated_at   timestamptz default now(),
  primary key (league_id, user_id)
);

alter table public.leagues enable row level security;
alter table public.league_members enable row level security;

-- פונקציית עזר שעוקפת רקורסיה של RLS: האם אני חבר בליגה
create or replace function public.is_league_member(l uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from league_members
    where league_id = l and user_id = auth.uid()
  )
$$;

drop policy if exists "create league" on public.leagues;
create policy "create league" on public.leagues
  for insert with check (auth.uid() = created_by);

drop policy if exists "read my leagues" on public.leagues;
create policy "read my leagues" on public.leagues
  for select using (public.is_league_member(id) or created_by = auth.uid());

drop policy if exists "read members of my leagues" on public.league_members;
create policy "read members of my leagues" on public.league_members
  for select using (public.is_league_member(league_id));

drop policy if exists "insert own membership" on public.league_members;
create policy "insert own membership" on public.league_members
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own row" on public.league_members;
create policy "update own row" on public.league_members
  for update using (auth.uid() = user_id);

drop policy if exists "leave league" on public.league_members;
create policy "leave league" on public.league_members
  for delete using (auth.uid() = user_id);

-- הצטרפות לפי קוד: security definer כדי לאתר את הליגה בלי לחשוף ליגות זרות
create or replace function public.join_league(join_code text, disp text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  lid uuid;
begin
  select id into lid from leagues where code = upper(join_code);
  if lid is null then
    raise exception 'league not found';
  end if;
  insert into league_members (league_id, user_id, display_name)
  values (lid, auth.uid(), disp)
  on conflict (league_id, user_id) do update set display_name = excluded.display_name;
  return lid;
end;
$$;

grant execute on function public.is_league_member(uuid) to authenticated;
grant execute on function public.join_league(text, text) to authenticated;
