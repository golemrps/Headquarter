-- ============================================================
-- Headquarter / harmony&aesthetic Land - Basis-Schema
-- Im Supabase SQL Editor ausfuehren (Projekt -> SQL Editor -> Neue Query)
-- ============================================================

-- Tabelle fuer die Dashboard-Daten.
-- "key" ist eindeutig, darueber wird spaeter jeder Datensatz identifiziert.
-- Aktuell nur fuer den Platzhalter-Testwert genutzt.
create table if not exists public.dashboard_data (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- Row Level Security aktivieren: ohne passende Policy darf NIEMAND
-- lesen oder schreiben, auch nicht mit dem anon Key.
alter table public.dashboard_data enable row level security;

-- Nur eingeloggte Nutzer duerfen Daten lesen
create policy "Eingeloggte Nutzer koennen lesen"
  on public.dashboard_data
  for select
  to authenticated
  using (true);

-- Nur eingeloggte Nutzer duerfen Daten einfuegen
create policy "Eingeloggte Nutzer koennen einfuegen"
  on public.dashboard_data
  for insert
  to authenticated
  with check (true);

-- Nur eingeloggte Nutzer duerfen Daten aktualisieren
create policy "Eingeloggte Nutzer koennen aktualisieren"
  on public.dashboard_data
  for update
  to authenticated
  using (true)
  with check (true);
