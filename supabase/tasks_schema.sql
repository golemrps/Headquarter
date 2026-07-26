-- ============================================================
-- Aufgabenverwaltung (Cockpit) - Tabelle + RLS
-- Im Supabase SQL Editor ausfuehren (Projekt -> SQL Editor -> Neue Query)
-- ============================================================

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (category in ('arbeit', 'privat')),
  priority text not null default 'normal' check (priority in ('niedrig', 'normal', 'hoch', 'sehr_hoch')),
  effort text not null default 'mittel' check (effort in ('leicht', 'mittel', 'schwer')),
  due_date date,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.tasks enable row level security;

create policy "Eingeloggte Nutzer koennen Aufgaben lesen"
  on public.tasks
  for select
  to authenticated
  using (true);

create policy "Eingeloggte Nutzer koennen Aufgaben anlegen"
  on public.tasks
  for insert
  to authenticated
  with check (true);

create policy "Eingeloggte Nutzer koennen Aufgaben aktualisieren"
  on public.tasks
  for update
  to authenticated
  using (true)
  with check (true);
