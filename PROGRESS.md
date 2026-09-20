# PROGRESS — capa de contratos

Sesión autónoma del **2026-09-19**. Estado al cerrar: **todo lo pedido está hecho y en verde.**
Ver `DECISIONS.md` para el porqué de cada decisión y `BLOCKERS.md` para lo que quedó pendiente de ti.

Punto de partida: el repo ya tenía los tres contratos commiteados con 24 tests pasando. El spec pedido
resultó ser un superconjunto, así que extendí lo que había en vez de reescribirlo.

## Estado global

| | |
|---|---|
| Tests | **35 pasan, 0 fallan** (antes: 24) |
| Coverage `src/` | **100%** de líneas (84/84), statements (101/101), ramas (19/19) y funciones (22/22) |
| `forge build` | OK — solc 0.8.28, evm `paris`, optimizer 200 runs |
| `forge fmt` | aplicado |
| Desplegado | **nada** — falta la URL del RPC de HSK |
| Commits | `4c7d926`, `0eb133a` sobre `develop` |

## Tarea (a) — ProjectPassport.sol

**Hecho.** Ya estaba correcto (soulbound vía `_update`, ERC-5192, evento propio `PassportMinted`,
errores custom). Lo que cambié:

- NatSpec completo `@notice`/`@param`/`@dev` en constructor, `mintPassport`, `locked`, `approve`,
  `setApprovalForAll`, `supportsInterface`, `_update`, todos los errores y eventos.
- Documentado el porqué de `_mint` en vez de `_safeMint`, y el porqué de bloquear en `_update`.

**Archivos:** `contracts/src/ProjectPassport.sol`.
**Tests:** 11 (mint por founder / por owner, revert de extraño, URI vacía, mint a `address(0)`, las tres
variantes de transfer, ambas aprobaciones, `locked` de token inexistente, ERC-165, fuzz de transfer).

## Tarea (b) — Milestones.sol

**Hecho.** Cambio de fondo: `Ownable` → `AccessControl`.

- `VALIDATOR_ROLE` (`keccak256("VALIDATOR_ROLE")`) y `DEFAULT_ADMIN_ROLE`; se otorgan en el constructor.
- Fuera `validator()` y `setValidator()`; la rotación va por `grantRole`/`revokeRole`.
- `addMilestone`: ahora lo puede llamar el dueño del passport **o** un `VALIDATOR_ROLE`. El evento
  `MilestoneAdded` incorpora `author` (indexado) para dejar rastro de quién escribió.
- `verifyMilestone`: `onlyRole(VALIDATOR_ROLE)`, idempotencia bloqueada (`AlreadyVerified`).
- Nuevo `getMilestones(tokenId)` → array completo, además de `milestoneCount` + `getMilestone`.
- Sigue guardando **solo** `bytes32 evidenceHash`, nunca el archivo. Sin cambios ahí, a propósito.

**Archivos:** `contracts/src/Milestones.sol`.
**Tests:** 13 (alta por founder, alta por validator, historial completo, no-autorizado, passport
inexistente para founder *y* para validator, los tres inputs inválidos, verificación con `vm.warp`,
founder no puede autoverificarse, doble verificación, hito inexistente, tokenId inexistente, rotación de
rol de punta a punta, no-admin no puede otorgar roles, constructor con las tres direcciones en cero, fuzz).

## Tarea (c) — FundingRegistry.sol

**Hecho.** Es el que más cambió.

- `AccessControl` + `RECORDER_ROLE` (nace vacío: hoy solo escribe el founder).
- `recordFundingApplication(uint256, string, Status)` — `status` ahora es el **enum** en la firma pública.
  Enum: `Pending, Submitted, UnderReview, Accepted, Rejected`.
- Las aplicaciones van a **storage**, no solo a eventos → historial legible sin indexer:
  `applicationCount`, `getApplication`, `getApplications`.
- **Nuevo** `recordFundingReceived(uint256 tokenId, uint256 amount, address token)` con `nonReentrant`,
  más `fundingReceivedCount`, `getFundingReceived`, `getAllFundingReceived`.
  `token == address(0)` = moneda nativa.
- NatSpec explícito, en el `@dev` del contrato y en el de la función, de que **no hay custodia**: no es
  `payable`, no tiene `receive`/`fallback`, no transfiere ERC-20 y no tiene retiro.
- Constructor pasó a `(passport, admin)`.

**Archivos:** `contracts/src/FundingRegistry.sol`.
**Tests:** 9 (registro + lectura de historial, `RECORDER_ROLE` en nombre de otro, financiación recibida en
ERC-20 y nativa, no-autorizado en ambas funciones, nombre vacío / demasiado largo, monto cero, lecturas
inexistentes, passport inexistente en ambas funciones, constructor en cero, y dos fuzz).

## Tarea (d) — Scripts de deploy

**Hecho.** Cuatro scripts en `contracts/script/`:

| Script | Lee del entorno |
|---|---|
| `DeployProjectPassport.s.sol` | `OWNER` (opcional) |
| `DeployMilestones.s.sol` | `PASSPORT_ADDRESS`, `VALIDATOR`, `OWNER` (opcional) |
| `DeployFundingRegistry.s.sol` | `PASSPORT_ADDRESS`, `OWNER` (opcional) |
| `Deploy.s.sol` (combinado) | `VALIDATOR`, `OWNER` (opcional) |

El combinado despliega los tres en orden, los cablea e imprime al final las direcciones en formato
`CLAVE=valor` para pegar directo en el `.env` del frontend. Nada hardcodeado. Simulado en local: OK.

## Tarea (e) — Test de integración

**Hecho.** `contracts/test/Integration.t.sol`, dos tests:

- `test_FullFlow_IdeaToFundedProject`: mintear passport → agregar hito con hash → `vm.warp` 3 días →
  verificar → registrar aplicación (`Submitted`) → `vm.warp` 30 días → registrarla `Accepted` →
  reportar 50.000 USDC recibidos → un tercero (`grantor`) lee todo el historial sin pedirle nada al
  founder → confirmar que el passport sigue siendo intransferible al final.
- `test_DeployScriptWiresContracts`: ejecuta el script combinado y verifica que las tres direcciones
  quedaron bien conectadas y los roles bien asignados. Así, un error de cableado falla en los tests y no
  durante el deploy real.

## Tarea (f) — README de /contracts

**Hecho.** `contracts/README.md` (reemplaza la plantilla por defecto de Foundry): tabla de los tres
contratos, sección **"lo que estos contratos NO hacen"** (sin custodia, sin KYC, sin evidencia onchain,
sin indexer, auto-reportado), cómo correr tests y coverage, tabla de variables de entorno, deploy con
keystore, verificación en Blockscout y notas de diseño.

## Fuera del work order, pero hecho

- **Instalé Foundry** (1.5.1-stable, binario oficial de Windows) en `%USERPROFILE%\.foundry\bin`. No estaba
  instalado en esta máquina pese a lo que decía `SESSION.md`. Para usarlo:
  `$env:PATH = "$env:USERPROFILE\.foundry\bin;$env:PATH"`.
- **Verifiqué que el frontend no se rompe:** `web/lib/chain.ts` solo usa `ownerOf`, `tokenURI`,
  `milestoneCount` y `getMilestone`, y el struct `Milestone` no cambió de forma. Ninguna de esas firmas se
  tocó. El `FundingRegistry` no estaba integrado todavía en el front.
