-- ============================================================
-- Headquarter - Gesamtschema (Studium / Modemarke / TikTok)
-- Im Supabase SQL Editor ausfuehren (Projekt -> SQL Editor -> Neue Query)
--
-- Ersetzt die bisherigen Tabellen (dashboard_data, alte tasks-
-- Tabelle mit Arbeit/Privat). Bestehende Test-Eintraege gehen dabei
-- verloren - das ist hier bewusst so gewollt.
-- ============================================================

drop table if exists public.dashboard_data cascade;
drop table if exists public.tasks cascade;

-- ---- Aufgaben ----
-- erstellt_am und erledigt sind fuer Sortierung ("aelteste zuerst"),
-- die rote "alt"-Markierung und das Archiv (3 Tage nach Erledigung)
-- noetig und wurden deshalb ergaenzt. strang wird nur bei
-- bereich = 'mode' verwendet, bleibt bei studium/tiktok leer.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  bereich text not null check (bereich in ('studium', 'mode', 'tiktok')),
  titel text not null,
  dringlichkeit text not null default 'normal' check (dringlichkeit in ('niedrig', 'normal', 'hoch', 'sehr_hoch')),
  strang text check (strang in ('design', 'produktion', 'personal_brand', 'brand_account', 'admin')),
  deadline date,
  erstellt_am timestamptz not null default now(),
  erledigt timestamptz
);

alter table public.tasks enable row level security;

create policy "Eingeloggte Nutzer koennen Aufgaben lesen"
  on public.tasks for select to authenticated using (true);

create policy "Eingeloggte Nutzer koennen Aufgaben anlegen"
  on public.tasks for insert to authenticated with check (true);

create policy "Eingeloggte Nutzer koennen Aufgaben aktualisieren"
  on public.tasks for update to authenticated using (true) with check (true);

-- ---- Kanalzahlen (Modemarke + TikTok) ----
create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  bereich text not null check (bereich in ('mode', 'tiktok')),
  datum date not null,
  follower integer,
  views integer
);

alter table public.metrics enable row level security;

create policy "Eingeloggte Nutzer koennen Kanalzahlen lesen"
  on public.metrics for select to authenticated using (true);

create policy "Eingeloggte Nutzer koennen Kanalzahlen anlegen"
  on public.metrics for insert to authenticated with check (true);

-- ---- Format-Bibliothek (Hooks & Videoideen fuer TikTok) ----
-- Wird i.d.R. von aussen (z.B. per Supabase-Connector aus einem
-- Claude-Chat) befuellt, die Website zeigt sie nur an. Insert-Policy
-- ist trotzdem gesetzt, falls spaeter doch mal ueber die Seite
-- eingetragen werden soll.
create table public.format_library (
  id uuid primary key default gen_random_uuid(),
  typ text not null check (typ in ('hook', 'videoidee')),
  text text not null,
  notiz text,
  datum date not null default current_date
);

alter table public.format_library enable row level security;

create policy "Eingeloggte Nutzer koennen Format-Bibliothek lesen"
  on public.format_library for select to authenticated using (true);

create policy "Eingeloggte Nutzer koennen Format-Bibliothek anlegen"
  on public.format_library for insert to authenticated with check (true);
