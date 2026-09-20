# BLOCKERS

Sesión del 2026-09-19. **Ningún paso del work order quedó bloqueado**: (a)-(f) están completos y en verde.
Lo que sigue son cosas que no puedo resolver yo, ordenadas por urgencia.

---

## 1. No se puede desplegar: falta el RPC de HSK Chain

**Bloqueante para la demo.**

`foundry.toml` ya lee `${HSK_TESTNET_RPC}` y `${HSK_MAINNET_RPC}`, y los scripts leen `VALIDATOR`, `OWNER`
y `ADMIN` del entorno. No hay nada más que codear: falta el dato.

Lo que necesito de ti, en `contracts/.env`:

- `HSK_TESTNET_RPC` — URL del RPC de HSK Chain testnet (chain id 133).
- `HSK_TESTNET_EXPLORER` — URL del Blockscout de HSK, para `forge verify-contract`.
- `VALIDATOR` — dirección que verificará hitos en la demo.
- `ADMIN` (opcional pero recomendado) — dirección distinta de `OWNER` y `VALIDATOR` que tendrá
  `DEFAULT_ADMIN_ROLE`. Si las tres comparten clave, quien la filtre puede fabricar un historial
  "verificado" de cero. El script avisa por consola si detecta que las comparten.

**La clave privada NO va en el `.env`.** Los scripts usan `vm.startBroadcast()` sin argumentos, así que el
firmante sale del keystore que pases por CLI. Importalo una sola vez:

```powershell
cast wallet import bootstrap-deployer --interactive   # pide la clave privada y una contraseña
cast wallet address --account bootstrap-deployer      # confirma qué dirección quedó
```

y después, en cada deploy, `--account bootstrap-deployer`. Necesita fondos de testnet.

**Diagnóstico:** no es un fallo, es un dato que no existe en el repo. Verificado que el deploy funciona
simulándolo en local (`test_DeployScriptWiresContracts` en `contracts/test/Integration.t.sol` corre el
script combinado y comprueba el cableado y los roles). En cuanto pongas el RPC, el deploy es un comando.

**Riesgo asociado:** tampoco está confirmado qué hardforks soporta HSK Chain. Por eso `foundry.toml` usa
`evm_version = "paris"`, que evita `PUSH0` y `MCOPY`. Si el primer deploy revierte sin razón aparente,
mirá ahí primero.

---

## 2. No pude crear `contracts/.env.example`

**Menor, pero requiere que lo hagas a mano.**

**Error exacto:** `File is in a directory that is denied by your permission settings.`

**Diagnóstico:** mis permisos bloquean escribir en esa ruta (el mismo problema que ya figuraba en
`SESSION.md` para `web/.env.example`). No es el hook `block-secrets`: es la configuración de permisos.

**Workaround aplicado:** documenté todas las variables en una tabla en `contracts/README.md`, así que la
información no se perdió. Si querés el archivo, este es el contenido (solo nombres, sin valores):

```
HSK_TESTNET_RPC=
HSK_MAINNET_RPC=
HSK_TESTNET_EXPLORER=
VALIDATOR=
OWNER=
ADMIN=
PASSPORT_ADDRESS=
# La clave privada NO va aqui: usar `cast wallet import bootstrap-deployer --interactive`
# y pasar `--account bootstrap-deployer` a forge script.
```

---

## 3. `slither` no está instalado (análisis estático pendiente)

**No bloquea testnet. Sí bloquea mainnet.**

**Diagnóstico:** `slither` no está en el PATH y no hay un Python usable (`python.exe` apunta al stub de la
Microsoft Store, y `pip` no existe). Instalarlo implica instalar Python real primero; no me metí en eso
para no gastar la sesión en tooling, como dice la regla de los 3 intentos.

La fase 2 del skill `ship` pide análisis estático. Antes de cualquier deploy a mainnet (177):

```bash
pip install slither-analyzer
slither contracts/ --config-file slither.config.json
```

Mitigación parcial ya aplicada: 100% de coverage en `src/` y dos auditorías con contexto fresco — la de la
sesión anterior (correcciones M1-M4 del backend, siguen en su lugar) y la de esta sesión sobre los
contratos (ver §4).

---

## 4. Hallazgos de la auditoría que NO corregí (decisión consciente)

Corrí `/audit` con contexto fresco sobre los contratos. Veredicto: **apto para HSK testnet como demo, no
apto para mainnet ni para uso real con financiadores.** Corregí A1, A2, A3 y B1 (ver `DECISIONS.md` 25-28).
Estos quedaron abiertos porque son funcionalidad nueva, no defectos, y estaban fuera del alcance que pediste:

- **M1 — No hay revocación.** Una verificación errónea es permanente: no existe forma de desmarcar un hito
  ni de invalidar un registro. Un sistema de credenciales sin revocación no es del todo auditable.
  *Fix sugerido:* `revokeVerification(tokenId, milestoneId)` para `VALIDATOR_ROLE`, o un evento
  `MilestoneDisputed` que el frontend refleje.
- **M2 — El `metadataURI` no está comprometido a ningún hash.** Si el founder mintea con una URL `https://`
  mutable, puede cambiar el JSON (nombre, equipo, claims) después de que un financiador lo revisó, sin
  dejar rastro onchain. Ataca directamente la tesis del producto.
  *Fix sugerido:* exigir prefijo `ipfs://`, o guardar un `bytes32 metadataHash` junto al URI.
- **M3 — Spam de entradas en un token ajeno.** El frontend lee los **primeros** 50 hitos
  (`web/lib/chain.ts:57`); un `VALIDATOR_ROLE` podría empujar los reales fuera de esa ventana. Con el
  `author` ya en storage el abuso queda atribuido, pero no impedido.
  *Fix sugerido:* getter paginado y que el frontend lea los últimos N mostrando el total.
- **M4 — No se puede quemar un passport, y no hay tope ni deduplicación de minteos.** Un passport
  con metadata difamatoria minteado por el `owner` a un tercero queda adherido a esa dirección para
  siempre. Y cualquiera puede auto-mintear passports ilimitados con el mismo URI que un proyecto real.
  *Fix sugerido:* permitir al holder quemar el suyo (soulbound = intransferible, no indestructible;
  ver ERC-5484) y exigir firma EIP-712 del founder en el mint asistido.
- **B5 — `nonReentrant` es innecesario** en `recordFundingReceived` (no hay llamada externa después de los
  efectos) e inconsistente (`recordFundingApplication` no lo lleva). Lo dejé porque tu spec pedía
  explícitamente considerar reentrancy de forma defensiva ahí. Cuesta gas, no es una vulnerabilidad.
- **Privacidad — el hash de evidencia no lleva sal.** Si la evidencia es de baja entropía (un NIT, una
  cédula, un email), el `keccak256` es enumerable offline y el hash filtra el contenido. Y la `description`
  queda en claro para siempre: si alguien pega PII ahí, no hay remedio. Hay que advertirlo en la UI.
- **B4 — `createPublicClient` sin `chain`** en `web/lib/chain.ts:42`: no valida que el RPC sea realmente el
  de chain id 133. Es del lado frontend; lo dejo para cuando se arme el dashboard.

---

## 5. Pendientes menores heredados de la auditoría anterior

Siguen abiertos, no los toqué en esta sesión porque son del lado backend/x402, no de contratos:

- Abortar el pago x402 si el asset no es USDC.
- Lectura acotada de la fuente premium.
- `Ownable2Step` en `ProjectPassport` (hoy `Ownable` simple; el riesgo es transferir el ownership a una
  dirección equivocada y perderlo).
- Tope de gasto duro en el panel de Anthropic.

---

## 6. Decisiones de producto que siguen esperándote

Ya estaban en `SESSION.md`; las repito porque son las que más afectan al pitch:

- Deadline real del hackathon.
- `ANTHROPIC_API_KEY` en `web/.env.local` para probar el agente de punta a punta (hoy solo probado con LLM
  simulado).
- Curar 2-3 convocatorias reales en Supabase (hoy hay 3 filas etiquetadas DEMO).
- Definir la fuente premium para el caso agent-pays-for-data.
- Wallet del agente para x402 con fondos mínimos en Base Sepolia.
