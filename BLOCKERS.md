# BLOCKERS

Actualizado 2026-09-20. Los contratos **ya están desplegados** en HSK testnet 133 (§1 resuelto: el RPC
`https://testnet.hsk.xyz` funciona). Lo que sigue son cosas que no puedo resolver yo, por urgencia.

---

## 1. No se puede verificar en Blockscout: el dominio del explorer no resuelve

**No bloquea la demo** — los contratos funcionan igual, solo no se ve el código fuente en el explorer. La
verificación se puede hacer en cualquier momento después del deploy, sin redesplegar nada.

La URL del doc del hackathon, `https://testnet-explorer.hsk.xyz`, **no tiene registro A/AAAA**. Comprobado
el 2026-09-20 contra tres resolvers (el del sistema, `1.1.1.1` y `8.8.8.8`): ninguno devuelve IP, solo el
SOA de `hsk.xyz`. No es un problema de red local — `testnet.hsk.xyz` (el RPC de la misma testnet) resuelve
y responde desde esta máquina.

Lo que sí averigüé, para no repetir el trabajo:

- **`explorer.hsk.xyz` existe** y es un Blockscout v11.3.0, pero es el de **mainnet (177)**: desconoce
  nuestro `ProjectPassport` (`is_contract: false`, balance 0) y va por el bloque 27.784.554 mientras la
  testnet está en 33.367.487.
- **`hashkeychain-testnet-explorer.alt.technology`** (la URL que citan chainlist y los docs de HashKey)
  tampoco resuelve.
- El **registro de chains de Blockscout** solo conoce HashKey mainnet (177), no la testnet 133.
- Una búsqueda web sigue indexando `testnet-explorer.hsk.xyz` como el Blockscout de la testnet, así que el
  nombre probablemente sea el correcto y el dominio esté caído o movido.

**Acción pendiente (del usuario):** confirmar la URL con los organizadores del hackathon. Una vez
confirmada, la verificación son tres comandos — direcciones y argumentos de constructor están en
`deployments/133.json`:

```bash
forge verify-contract 0x4aD904AD0a718e0bd61BF0006169e493D176Db88 src/ProjectPassport.sol:ProjectPassport \
  --verifier blockscout --verifier-url <explorer>/api --chain-id 133 \
  --constructor-args $(cast abi-encode "constructor(address)" 0x887dbD23Cbda1CcbB3218F8dfB9f8c351825E1fe)
# Milestones:      constructor(address,address,address) = passport, validator, admin
# FundingRegistry: constructor(address,address)         = passport, admin
```

**Riesgo asociado (ya descartado en la práctica):** no estaba confirmado qué hardforks soporta HSK Chain,
por eso `foundry.toml` usa `evm_version = "paris"`. El deploy pasó sin problemas con esa config.

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
