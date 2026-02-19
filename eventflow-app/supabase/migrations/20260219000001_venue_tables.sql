-- venue_tables: stores per-event table configuration and floor plan positions
create table if not exists public.venue_tables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  table_number integer not null,
  name text not null default '',
  shape text not null default 'round' check (shape in ('round', 'rect')),
  capacity integer not null default 8,
  x float not null default 0,
  y float not null default 0,
  rotation float not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, table_number)
);

create index if not exists venue_tables_event_id_idx on public.venue_tables(event_id);

alter table public.venue_tables enable row level security;

create policy "Users can manage venue tables for their events"
  on public.venue_tables
  for all
  using (
    event_id in (
      select id from public.events where organization_id in (
        select organization_id from public.user_profiles where id = auth.uid()
      )
    )
  );
