# SESSION — estado vivo (actualizar con /handoff)

## Última actualización
2026-09-20 — **contratos desplegados en HSK testnet (133)** y verificados leyendo la cadena. Hubo que
desplegar dos veces: el primer intento quedó con los roles en una dirección sin clave privada (ver
Decisiones). Scripts arreglados, `develop` pusheado a `origin`. Detalle del incidente en `DECISIONS.md` 31-36.
Ver también `SUMMARY.md`, `PROGRESS.md`, `BLOCKERS.md`.

2026-09-20 (Santiago) — **el código de contratos cambió tras el deploy: las direcciones de abajo son de la
versión vieja.** Se cerraron M1 (`revokeVerification`, campo `revokedAt`), M2 (`mintPassport` exige
`ipfs://`) y `Ownable2Step` en el Passport (`DECISIONS.md` 37-38). **47 tests**, 0 avisos del linter.
Falta redesplegar (Juan, dueño de la wallet `bootstrap-deployer`). Backend: x402 solo paga USDC de Base
Sepolia; `chain.ts` valida chain id 133 y lee los últimos 50 hitos (`milestoneTotal`).
**Supabase conectado**: tabla `opportunities` con RLS de solo lectura, verificada con
`web/scripts/check-supabase.mjs`. La tabla tiene **0 filas** (el agente usa las 3 filas DEMO locales).
El backend lee con `SUPABASE_PUBLISHABLE_KEY` (o `SUPABASE_SERVICE_KEY` si existe); `SUPABASE_URL` debe ser
solo el dominio, sin `/rest/v1/`.

2026-09-20 (Santiago) — **REDEPLOY v2 HECHO** con el código final, desde la wallet de Santiago
(`0x2629…27C9`, owner = admin = validator). Comprobado contra la cadena con `cast call`: roles, cableado y
comportamiento de M1/M2. Las direcciones v1 de Juan quedaron en `deployments/133.json` como `superseded`.
Costó 0.0037 HSK. Falta poner las direcciones en `web/.env.local` y probar el flujo en el navegador.

## Desplegado — HSK testnet, chain 133 (sin verificar en Blockscout)
```
PASSPORT_ADDRESS=0xC32499C88Df7360198Da98DeE609E94a5919ce64
MILESTONES_ADDRESS=0xf87fF4857Ac6DDDC9Dc3F8509D0eEEAc96532562
FUNDING_REGISTRY_ADDRESS=0x19476c05664ec397934AEfe6220F2653c1020a24
```
RPC confirmado `https://testnet.hsk.xyz`. Deployer = owner = admin = validator `0x2629091D43cbB07dAaEFbca71Bc643785b5427C9`
(wallet `bootstrap-deployer` en el equipo de Santiago; el deploy v1 de Juan quedó en `superseded`).
Todo en `deployments/133.json`, incluidas las direcciones de los deploys anteriores marcadas `NO USAR`.

## Hecho (además del deploy)
- **Contratos**: ProjectPassport (soulbound + ERC-5192), Milestones (`VALIDATOR_ROLE`), FundingRegistry
  (`RECORDER_ROLE`, historial en storage, `recordFundingReceived`). 40 tests, 100% coverage en `src/`.
  Solc 0.8.28, evm `paris`, OZ 5.4.0 vendorizado. 4 scripts de deploy, todos sobre `script/DeployBase.sol`.
- **Backend** (`web/lib/agent`): research (Claude + web search), matching (Supabase o demo), pitch,
  `lib/evidence.ts` (keccak256 en el CLIENTE), rate limiting en memoria (fuera de Vercel requiere
  `TRUST_PROXY_HEADERS=1`).
- **x402**: cliente con caps por tx/día y allowlist (sin probar con pago real); servidor
  `/api/report/[tokenId]` devuelve 402 ($0.01 USDC, Base Sepolia), probado en anvil.
- Foundry **1.5.1-stable** en `%USERPROFILE%\.foundry\bin`, fuera del PATH:
  `$env:PATH = "$env:USERPROFILE\.foundry\bin;$env:PATH"`.
- Git: `JuanMancilla7` ya tiene escritura en `simplysanticamp/App-Hackaton`. `develop` sincronizado.

## Decisiones
- **`OWNER` es obligatoria en los scripts y `DeployBase.sol` rechaza `0x1804c8AB…`** (el caller por defecto
  de forge, sin clave privada). El default `msg.sender` dejó el primer deploy con owner y
  `DEFAULT_ADMIN_ROLE` irrecuperables: sin rotación a multisig, que es lo que justifica usar `AccessControl`.
- **Verificar deploys contra la cadena (`cast call`), no contra los logs del script**: los logs salen de la
  simulación y en el incidente imprimieron las direcciones correctas mientras el estado real era otro.
- **owner, admin y validator comparten EOA en la demo**, contra la recomendación de separarlos. Deliberado
  (una sola wallet con fondos) y hay que decirlo en el pitch. El founder será otra wallet, así que "un
  validator no verifica su propio hito" se sostiene.
- Chain: contratos en HSK 133 (mirror a 177 solo si sobra tiempo); x402 en Base Sepolia (opción A).
- Exactamente 3 contratos; FundingRegistry es el recortable.
- Passport: el founder mintea el suyo; el owner puede mintear en su nombre.
- Milestones: agrega el dueño del passport o un `VALIDATOR_ROLE`; solo `VALIDATOR_ROLE` verifica y no puede
  verificar un hito propio. El `author` va en storage para que quede auditable quién declaró qué.
- Registros inmutables: un cambio de estado es una entrada nueva, no un update.
- El frontend nunca toca el LLM: todo por `/api/agent`.

## Próximos pasos
0. ~~Redesplegar contratos~~ HECHO (v2). Siguiente: direcciones en `web/.env.local` y probar el flujo en el navegador (mint, hito, verificar, revocar, reporte x402).
1. Verificar los 3 contratos en Blockscout. **Bloqueado**: `testnet-explorer.hsk.xyz` no resuelve en
   ningún resolver; hay que confirmar la URL real con los organizadores. Detalle en `BLOCKERS.md` §1.
2. Exportar ABIs al front e integrar `FundingRegistry`, que todavía no está conectado y ya tiene lecturas
   útiles para el dashboard (`getApplications`, `getAllFundingReceived`).
3. Probar el pipeline del agente con `ANTHROPIC_API_KEY` real (hoy solo probado con LLM simulado).
4. Curar 2-3 convocatorias reales en Supabase (la tabla existe y está vacía; cargar con `is_demo=false` solo si el enlace es el oficial). Sugerencia: una colombiana (iNNpulsa/MinCiencias/Ruta N) y una web3 (EF/Gitcoin/Optimism).
5. Frontend (dashboard, chat, wallet) — el usuario lo dejó para después. Definir fuente premium para
   agent-pays-for-data. Opcional: 2ª dirección con `VALIDATOR_ROLE` para demostrar rotación en vivo.
6. Pendientes bajos de la auditoría: lectura acotada de la fuente premium, `.gitignore` con `!.env.example`, slither y tope de gasto en Anthropic antes de mainnet.

## Bloqueos / pendientes del usuario
- Deadline real. URL real del **explorer de HSK testnet**: la del doc del hackathon no resuelve (§1).
- `ANTHROPIC_API_KEY` en `web/.env.local`.
- Wallet del agente para x402: fondos mínimos en Base Sepolia.
- Crear a mano (mis permisos bloquean esas rutas) `contracts/.env.example` y actualizar `web/.env.example`.
  Contenido exacto en `BLOCKERS.md` §2; tabla de variables en `contracts/README.md`.
