# SESSION — estado vivo (actualizar con /handoff)

## Última actualización
2026-09-20 — **contratos desplegados en HSK testnet (133)** y verificados leyendo la cadena. Hubo que
desplegar dos veces: el primer intento quedó con los roles en una dirección sin clave privada (ver
Decisiones). Scripts arreglados, **40 tests** en verde, `develop` pusheado a `origin`. Detalle del
incidente en `DECISIONS.md` 31-36. Ver también `SUMMARY.md`, `PROGRESS.md`, `BLOCKERS.md`.

## Desplegado — HSK testnet, chain 133 (sin verificar en Blockscout)
```
PASSPORT_ADDRESS=0x4aD904AD0a718e0bd61BF0006169e493D176Db88
MILESTONES_ADDRESS=0xe4Cdb8C27DeEa738F17bb6BDB5E5E3024e9d9052
FUNDING_REGISTRY_ADDRESS=0x26478A32Fb854dB9f36b239fbd4C03B3df7049b4
```
RPC confirmado `https://testnet.hsk.xyz`. Deployer = owner = admin = validator
`0x887dbD23Cbda1CcbB3218F8dfB9f8c351825E1fe`, keystore `bootstrap-deployer` (contraseña local, nunca en el
repo), ~0.093 HSK de saldo. Todo en `deployments/133.json`, incluidas las 3 direcciones del deploy fallido
marcadas `NO USAR`.

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
0. **Redesplegar contratos** (M1 revocación + M2 `ipfs://` obligatorio ya en el código, 46 tests en verde). Las direcciones de `deployments/133.json` son de la versión anterior. Lo firma Juan, que tiene la wallet `bootstrap-deployer` en su equipo; Santiago no.
1. Verificar los 3 contratos en Blockscout. **Bloqueado**: `testnet-explorer.hsk.xyz` no resuelve en
   ningún resolver; hay que confirmar la URL real con los organizadores. Detalle en `BLOCKERS.md` §1.
2. Exportar ABIs al front e integrar `FundingRegistry`, que todavía no está conectado y ya tiene lecturas
   útiles para el dashboard (`getApplications`, `getAllFundingReceived`).
3. Probar el pipeline del agente con `ANTHROPIC_API_KEY` real (hoy solo probado con LLM simulado).
4. Curar 2-3 convocatorias reales en Supabase (hoy son 3 filas DEMO).
5. Frontend (dashboard, chat, wallet) — el usuario lo dejó para después. Definir fuente premium para
   agent-pays-for-data. Opcional: 2ª dirección con `VALIDATOR_ROLE` para demostrar rotación en vivo.
6. Pendientes bajos de la auditoría: abortar pago x402 si asset != USDC, lectura acotada de fuente premium,
   Ownable2Step, `.gitignore` con `!.env.example`, slither y tope de gasto en Anthropic antes de mainnet.

## Bloqueos / pendientes del usuario
- Deadline real. URL real del **explorer de HSK testnet**: la del doc del hackathon no resuelve (§1).
- `ANTHROPIC_API_KEY` en `web/.env.local`.
- Wallet del agente para x402: fondos mínimos en Base Sepolia.
- Crear a mano (mis permisos bloquean esas rutas) `contracts/.env.example` y actualizar `web/.env.example`.
  Contenido exacto en `BLOCKERS.md` §2; tabla de variables en `contracts/README.md`.
