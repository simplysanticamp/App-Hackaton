# PROGRESS — capa de contratos

Sesión autónoma del **2026-09-19**. Estado al cerrar: **todo lo pedido está hecho y en verde.**
Ver `DECISIONS.md` para el porqué de cada decisión y `BLOCKERS.md` para lo que quedó pendiente de ti.

Punto de partida: el repo ya tenía los tres contratos commiteados con 24 tests pasando. El spec pedido
resultó ser un superconjunto, así que extendí lo que había en vez de reescribirlo.

## Estado global

| | |
|---|---|
| Tests | **40 pasan, 0 fallan** (antes: 24) |
| Coverage `src/` | **100%** de líneas (87/87), statements (107/107), ramas (22/22) y funciones (22/22) |
| `forge build` | OK — solc 0.8.28, evm `paris`, optimizer 200 runs |
| `forge fmt` | aplicado |
| Auditoría | `/audit` con contexto fresco: **apto testnet, no mainnet**. A1/A2/A3/B1 corregidos; el resto documentado en `BLOCKERS.md` §4 |
| Desplegado | **nada** — falta la URL del RPC de HSK |
| Commits | `4c7d926`, `0eb133a`, `e88cceb` y la corrección post-auditoría, sobre `develop` |

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

## Tarea (g) — Auditoría con contexto fresco y correcciones

**Hecha**, fuera del work order: `CLAUDE.md` la exige como fase del skill `ship`, y la hice antes de que
despliegues en vez de después. Veredicto: **apto para HSK testnet como demo, no apto para mainnet**.

Confirmó como sólido (leyendo el código de OZ 5.4.0, no de memoria): el soulbound no tiene fugas — incluida
la ruta de `transferFrom` sobre un tokenId inexistente, que es la única que evadiría el guard de `_update`
y termina en `ERC721NonexistentToken`; la ausencia de custodia de valor; la validación de existencia del
tokenId en **todas** las escrituras; y la higiene de secretos (ningún `PRIVATE_KEY` ni dirección hardcodeada
en `script/`).

Corregido en esta sesión:

| # | Hallazgo | Corrección |
|---|---|---|
| A1 | Una sola EOA concentraba minteo, admin y verificación | `ADMIN` separado de `OWNER` en los 3 scripts + aviso por consola si comparten dirección |
| A2 | El `author` solo estaba en los eventos; los getters no decían quién escribió | `address author` a storage en los tres structs |
| A3 | Un validator podía registrar y verificar su propio hito | `SelfVerification`: `m.author != msg.sender` |
| B1 | Los constructores no validaban que el Passport tuviera código | `NotAContract` (`passport_.code.length == 0`) |

Tests nuevos a raíz de los huecos que señaló: `transferFrom` sobre token inexistente, que
`FundingRegistry` rechaza ETH (era la afirmación titular del contrato y no estaba probada), selector
concreto en el fuzz de soulbound cuando el llamante es el dueño, autoría persistida, auto-verificación
y constructor con una EOA como Passport.

**Archivos:** `contracts/src/Milestones.sol`, `contracts/src/FundingRegistry.sol`,
`contracts/script/*.s.sol`, `contracts/test/*.t.sol`, `web/lib/chain.ts`, `contracts/README.md`.

## Fuera del work order, pero hecho

- **Instalé Foundry** (1.5.1-stable, binario oficial de Windows) en `%USERPROFILE%\.foundry\bin`. No estaba
  instalado en esta máquina pese a lo que decía `SESSION.md`. Para usarlo:
  `$env:PATH = "$env:USERPROFILE\.foundry\bin;$env:PATH"`.
- **Actualicé `web/lib/chain.ts`**, la única pieza del frontend acoplada al ABI: usa `ownerOf`, `tokenURI`,
  `milestoneCount` y `getMilestone`. Las firmas no cambiaron, pero el struct `Milestone` ganó el campo
  `author` en la corrección post-auditoría, así que ajusté el `parseAbi`, el tipo `PassportReport` y el
  mapeo. El `FundingRegistry` todavía no está integrado en el front.
