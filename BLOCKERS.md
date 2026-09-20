# BLOCKERS

Sesión del 2026-09-19. **Ningún paso del work order quedó bloqueado**: (a)-(f) están completos y en verde.
Lo que sigue son cosas que no puedo resolver yo, ordenadas por urgencia.

---

## 1. No se puede desplegar: falta el RPC de HSK Chain

**Bloqueante para la demo.**

`foundry.toml` ya lee `${HSK_TESTNET_RPC}` y `${HSK_MAINNET_RPC}`, y los scripts leen `VALIDATOR` y `OWNER`
del entorno. No hay nada más que codear: falta el dato.

Lo que necesito de ti, en `contracts/.env`:

- `HSK_TESTNET_RPC` — URL del RPC de HSK Chain testnet (chain id 133).
- `HSK_TESTNET_EXPLORER` — URL del Blockscout de HSK, para `forge verify-contract`.
- `VALIDATOR` — dirección que verificará hitos en la demo.
- Una wallet con fondos de testnet, importada a keystore:
  `cast wallet import bootstrap-deployer --interactive`.

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
PASSPORT_ADDRESS=
# La clave privada NO va aqui: usar `cast wallet import bootstrap-deployer --interactive`
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

Mitigación parcial ya aplicada: 100% de coverage en `src/` y la auditoría con contexto fresco (`/audit`)
de la sesión anterior, cuyas correcciones M1-M4 siguen en su lugar.

---

## 4. Pendientes menores heredados de la auditoría anterior

Siguen abiertos, no los toqué en esta sesión porque son del lado backend/x402, no de contratos:

- Abortar el pago x402 si el asset no es USDC.
- Lectura acotada de la fuente premium.
- `Ownable2Step` en `ProjectPassport` (hoy `Ownable` simple; el riesgo es transferir el ownership a una
  dirección equivocada y perderlo).
- Tope de gasto duro en el panel de Anthropic.

---

## 5. Decisiones de producto que siguen esperándote

Ya estaban en `SESSION.md`; las repito porque son las que más afectan al pitch:

- Deadline real del hackathon.
- `ANTHROPIC_API_KEY` en `web/.env.local` para probar el agente de punta a punta (hoy solo probado con LLM
  simulado).
- Curar 2-3 convocatorias reales en Supabase (hoy hay 3 filas etiquetadas DEMO).
- Definir la fuente premium para el caso agent-pays-for-data.
- Wallet del agente para x402 con fondos mínimos en Base Sepolia.
