-- Convocatorias curadas. Datos públicos: lectura abierta con la clave publicable, escritura solo con la de servicio.
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
-- Solo SELECT para anon/authenticated. Sin políticas de insert/update/delete: nadie escribe con la clave
-- publicable. Las filas se cargan desde el panel de Supabase o con la clave de servicio.
drop policy if exists "opportunities_public_read" on opportunities;
create policy "opportunities_public_read" on opportunities
  for select to anon, authenticated using (true);

-- Al curar una convocatoria REAL: is_demo = false y official_url debe ser el link oficial.
