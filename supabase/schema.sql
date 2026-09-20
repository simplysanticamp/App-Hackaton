-- Convocatorias curadas. Solo el servidor (service key) lee esta tabla.
create table if not exists opportunities (
  id text primary key,
  name text not null,
  funder text not null,
  type text not null,
  region text not null,
  focus text not null,
  eligibility_summary text not null,
  official_url text not null,
  is_demo boolean not null default true,
  created_at timestamptz not null default now()
);

alter table opportunities enable row level security;
-- Sin políticas: el acceso público queda bloqueado; el backend usa la service key.

-- Al curar una convocatoria REAL: is_demo = false y official_url debe ser el link oficial.
