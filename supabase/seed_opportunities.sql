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
),
(
  'lan-accelerator-v5',
  'LAN Accelerator V5',
  'LAN Accelerator',
  'aceleradora',
  'Latinoamérica (startups con base en LatAm o con al menos un founder de nacionalidad latina)',
  'Empresas de base tecnológica de cualquier sector, excepto alcohol, apuestas, armas, bienes raíces, criptomonedas y monedas digitales, y sustancias controladas.',
  'Exige: operar en Latinoamérica o planear hacerlo pronto, estar en validación de mercado con ventas o usuarios activos, al menos una persona del equipo con inglés avanzado y al menos un founder técnico. No acepta startups en ideación o prototipo. El costo del programa es USD 15,000, cubierto mediante un SAFE a la valuación actual; las 3 mejores startups pueden recibir una inversión de USD 25,000 a 50,000 en efectivo; se cubre alojamiento para un founder en Chile y un voucher de vuelo. Postulaciones hasta el 28 de septiembre de 2026; fase online del 12 de octubre al 6 de noviembre y fase presencial en Chile del 9 al 21 de noviembre de 2026.',
  'https://lanaccelerator.com/aplica',
  false
),
(
  'powertrain-ignition-viii',
  'IGNITION (Batch VIII)',
  'Powertrain Ventures',
  'aceleradora',
  'Latinoamérica',
  'Startups B2B que resuelven problemas de alto impacto en industrias tradicionales, con estrategias impulsadas por IA.',
  'Aceleradora libre de equity. Exige: modelo de negocio escalable de forma exponencial, preferiblemente basado en software; dos o más cofounders a tiempo completo, al menos uno técnico; experiencia significativa en la industria; empresa legalmente constituida y con dedicación total; producto existente (MVP) obligatorio para ingresar y tracción inicial. Ofrece acceso a un equipo de expertos, conexión con fondos de venture capital y ángeles regionales y globales, y una red de más de 1,000 founders e inversionistas; 10 sesiones semanales online y Demo Day virtual. Cierre de postulaciones: miércoles 30 de septiembre (la página no indica el año); el lote empieza el 13 de octubre de 2026.',
  'https://powertrain-ventures.com/es/programas/aceleradora/',
  false
),
(
  'monad-blitz-medellin-v2',
  'Monad Blitz Medellín V2',
  'Medellín Blockchain Community y Monad Foundation',
  'hackathon',
  'Medellín, Colombia (presencial)',
  'Blockchain y desarrollo web3 sobre la blockchain Monad.',
  'Hackathon de un día, el 26 de septiembre de 2026, de 9:00 a. m. a 11:00 p. m., en Indie Universe (Laureles, Medellín). Entrada gratuita. Se forma equipo, se define la idea y se construye desde cero para presentar ante jueces al final del día. Premios, requisitos y región de elegibilidad: no especificados en la página. El registro se hace en Luma desde el botón "Ir a página oficial"; el link de abajo es el listado del evento en Netwoo.',
  'https://netwoo.co/eventos/monad-blitz-medellin-v2',
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
-- masschallenge-security-resiliency-2026  https://masschallenge.org/security-and-resiliency-traction-2026/
--   Aceleradora sin costo ni equity, Pre-Seed a Serie A+, sectores de seguridad y resiliencia; la empresa
--   debe poder viajar a EE. UU. Postulaciones del 11 de junio al 9 de julio (la página no indica el año).
--   Cerrada. Kick-off en septiembre en Boston.
--
-- caribe-ia-2026  https://caribe-ia.com/
--   Fundación Código Abierto + Caribe Ventures, Caribe colombiano, IA. El hackathon fue del 22 al 24 de
--   mayo de 2026 (terminado; premios "+$20M COP"). La aceleración va de junio a septiembre de 2026 y el
--   Demo Day es en octubre; la página NO indica si la aceleración sigue recibiendo postulaciones ni hasta
--   cuándo. Confirmar en /aceleracion antes de cargarla.
--
-- colombiahackathons.com  (directorio, no una convocatoria)
--   Lista hackathones de Colombia sin premios ni requisitos. Cada evento se cura por separado si interesa.
--
-- whale-tank-2026 (Parquetec)  https://gust.com/programs/whale-tank-2026-powered-by-parquetec
--   No se pudo leer: Gust respondió 403. Falta el texto de la página para poder curarla.
-- ---------------------------------------------------------------------------------------------
