-- ============================================================
-- Felix' Mathe-Trainer — Supabase-Schema (Abschnitt 7.2)
-- Im Supabase SQL-Editor ausführen. Projekt ist leer -> Drops unkritisch.
-- ============================================================

-- 1) Altobjekte aufräumen (frühere Familien-Code-Tabelle / RPC-Ansatz)
drop table if exists app_state cascade;
drop function if exists load_state;
drop function if exists save_state;

-- 2) Zustands-Tabelle: ein Dokument pro (owner, app, doc_key)
--    doc_key = 'config' | 'progress:<childId>'   (siehe 7.4)
create table app_state (
  owner_id   uuid not null references auth.users on delete cascade,
  app_id     text not null default 'zahlenheld',
  doc_key    text not null,
  data       jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (owner_id, app_id, doc_key)
);

-- 3) Row-Level-Security: jede Familie sieht/ändert nur ihre eigenen Zeilen
alter table app_state enable row level security;

create policy "select own" on app_state
  for select using (auth.uid() = owner_id);
create policy "insert own" on app_state
  for insert with check (auth.uid() = owner_id);
create policy "update own" on app_state
  for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "delete own" on app_state
  for delete using (auth.uid() = owner_id);

-- 4) updated_at zuverlässig pflegen (Backstop für Last-Write-Wins):
--    setzt den Zeitstempel bei JEDEM Update server-seitig auf now(),
--    auch wenn ein Client das Feld nicht mitschickt.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_app_state_updated_at on app_state;
create trigger trg_app_state_updated_at
  before update on app_state
  for each row execute function set_updated_at();

-- ============================================================
-- Auth-Konfiguration (im Supabase-Dashboard, nicht via SQL):
--   Authentication -> Providers -> Email: aktivieren (E-Mail + Passwort).
--   Default-Mailer genügt, solange nur die eigene (Projekt-)Adresse zugelassen ist.
--   Öffnen für Fremdfamilien später: zusätzlich Google-OAuth oder Gratis-SMTP (7.3).
-- ============================================================
