-- Convocatorias REALES curadas a mano (is_demo = false). Fuente: cada official_url, leída el 2026-09-20.
-- Regla: solo se escribe lo que la página oficial dice; lo que no dice, se declara como no especificado.
-- Cargar en Supabase: SQL Editor -> pegar -> Run. Es idempotente (upsert por id).
-- Volver a verificar fechas y requisitos en el link oficial antes de la demo.

insert into opportunities (id, name, funder, type, region, focus, eligibility_summary, official_url, is_demo) values
(
  'tecprize-2026',
  'TecPrize 2026',
  'Instituto para el Futuro de la Educación (IFE), Tecnológico de Monterrey',
  'premio',
  'América Latina y el Caribe',
  'Educación y futuro del trabajo. Reto 2026: cómo las organizaciones pueden desarrollar una fuerza laboral más adaptable, resiliente y preparada para prosperar en un futuro del trabajo impulsado por la Inteligencia Artificial.',
  'Reto de innovación abierta. Premio: US$10,000 en equity-free grants para cada una de las 3 soluciones ganadoras, más vuelo y entrada al evento para los founders finalistas, mentoría y acceso a bootcamp y programa de aceleración. Postulaciones del 19 de agosto al 30 de septiembre de 2026; evento final del 26 al 28 de enero de 2027. Requisitos de elegibilidad: no especificados en la página; revisar el link oficial.',
  'https://tecprize.tec.mx/es',
  false
),
(
  'emprelatam-aceleracion',
  'Emprelatam: programas de aceleración',
  'Emprelatam',
  'aceleradora',
  'Latinoamérica',
  'Sector no especificado en el sitio.',
  'Aceleradora sin equity con cuatro programas según etapa: Exploración (founders con MVP o primeras ventas; beneficios por $35,000), Aceleración (pre-seed con ingresos, trabajando en product-market fit; perks por $150,000+), Grow & Scale (seed con ingresos mensuales >$20,000, financiación >$750,000 o proyección de ARR >$400,000; beneficios por $180,000+) e Internacionalización (expansión a México, Colombia, Argentina, Chile, Perú, Estados Unidos o Brasil; perks por $40,000+). Son beneficios, no capital directo; el sitio no indica la moneda. Inicios en octubre de 2026 y postulaciones tardías abiertas.',
  'https://emprelatam.com/aplica',
  false
)
on conflict (id) do update set
  name = excluded.name,
  funder = excluded.funder,
  type = excluded.type,
  region = excluded.region,
  focus = excluded.focus,
  eligibility_summary = excluded.eligibility_summary,
  official_url = excluded.official_url,
  is_demo = excluded.is_demo;

-- ---------------------------------------------------------------------------------------------
-- NO cargadas a propósito (fecha de cierre ya pasada al 2026-09-20, o página ilegible). El matching
-- las recomendaría y nadie podría postular. Reactivar solo si abren una nueva cohorte.
--
-- potencia-up-latam  https://lp.potenciaventures.net/potencia-up-latam
--   Potencia Ventures + Artemisia. Educación y futuro del trabajo, LatAm hispanohablante, empresas de
--   impacto con fines de lucro que buscan levantar capital en 12 meses. Inscripciones del 20 de julio al
--   30 de agosto (la página indica que están cerradas). Fase 3: "potencial de recibir entre USD $100,000
--   y USD $500,000". La página no indica el año.
--
-- innpulsa-mujeres  https://www.innpulsacolombia.com/innpulsa-mujeres/
--   Mujeres de la economía popular o poblaciones vulnerables, migrantes, retornados y comunidades de
--   acogida. Asistencia técnica y acompañamiento; monto no especificado. Cerró el 25 de mayo de 2026.
--
-- innpulsa-oportunidades-para-emprender  https://www.innpulsacolombia.com/oportunidades-para-emprender/
--   Migrantes venezolanos, retornados y comunidades de acogida con unidad productiva de mínimo 6 meses y
--   ventas documentadas; Arauca, Casanare, Meta, Boyacá, Bogotá, Cundinamarca, Santander y Norte de
--   Santander. Cerró el 27 de febrero de 2026.
--
-- whale-tank-2026 (Parquetec)  https://gust.com/programs/whale-tank-2026-powered-by-parquetec
--   No se pudo leer: Gust respondió 403. Falta el texto de la página para poder curarla.
-- ---------------------------------------------------------------------------------------------
