create table if not exists public.serie_a_players (
  provider_id bigint primary key,
  name text not null,
  firstname text,
  lastname text,
  age integer,
  birth_date date,
  nationality text,
  height text,
  weight text,
  photo_url text,
  role text not null check (role in ('P', 'D', 'C', 'A')),
  position text,
  shirt_number integer,
  team_id bigint not null,
  team_name text not null,
  team_code text,
  team_logo text,
  stats_season integer,
  appearances integer,
  starts integer,
  minutes integer,
  rating numeric,
  goals integer,
  assists integer,
  shots_total integer,
  shots_on integer,
  passes_total integer,
  key_passes integer,
  pass_accuracy numeric,
  dribbles_attempts integer,
  dribbles_success integer,
  tackles integer,
  current_injured boolean default false,
  injuries_count integer default 0,
  injury_note text,
  quote_estimate numeric not null default 1,
  official_quote numeric,
  official_fvm numeric,
  official_role text,
  ds_score numeric not null default 0,
  potential_score numeric not null default 0,
  raw jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists serie_a_players_team_idx on public.serie_a_players (team_name);
create index if not exists serie_a_players_role_idx on public.serie_a_players (role);
create index if not exists serie_a_players_age_idx on public.serie_a_players (age);
create index if not exists serie_a_players_score_idx on public.serie_a_players (ds_score desc);

alter table public.serie_a_players enable row level security;
revoke all on table public.serie_a_players from anon, authenticated;
grant select, insert, update on table public.serie_a_players to service_role;

