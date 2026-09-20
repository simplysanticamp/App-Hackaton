# Bootstrap — capa de contratos

> No buscamos financiación para startups que ya existen. Convertimos ideas en proyectos financiables, y
> certificamos cada paso onchain para que cualquier financiador pueda verificarlo sin confiar en la palabra
> del founder.

Tres contratos, ninguno más. Lo que va onchain es lo que un tercero necesita para **verificar sin confiar**:
identidad del proyecto, hitos con hash de evidencia, y a qué fondos se aplicó. Todo lo demás (research,
matching, pitch, archivos de evidencia, metadata pesada) vive offchain.

| Contrato | Qué certifica | Quién escribe |
|---|---|---|
| `ProjectPassport.sol` | Identidad del proyecto: un NFT **soulbound** (ERC-721 + ERC-5192) por proyecto | El founder o el `owner` |
| `Milestones.sol` | Hitos alcanzados: descripción + `bytes32` del hash de la evidencia, y su verificación | Agrega: dueño del passport o `VALIDATOR_ROLE` · Verifica: solo `VALIDATOR_ROLE` |
| `FundingRegistry.sol` | Aplicaciones a convocatorias y financiación reportada | Dueño del passport o `RECORDER_ROLE` |

### Lo que estos contratos NO hacen

Importante para leerlos con las expectativas correctas:

- **No custodian ni mueven fondos.** `FundingRegistry` no es `payable`, no tiene `receive`/`fallback`, no
  transfiere ERC-20 y no tiene función de retiro. `recordFundingReceived` escribe un dato, nada más.
  (Matiz honesto: como cualquier dirección de la EVM *puede* recibir valor por vías que no controla —
  `selfdestruct` de un tercero, un ERC-20 transferido directo — y no hay rescate, ese valor quedaría
  atrapado. No se puede *pedir* ni *mover* valor, que es lo que importa; no es que sea imposible tener saldo.)
- **No hacen KYC.** El passport certifica evidencia de actividad, no identidad legal.
- **No guardan evidencia.** Solo el `keccak256` del archivo, calculado offchain. El archivo nunca toca la cadena.
- **No prueban que una aplicación exista o fuera aceptada.** `FundingRegistry` es un registro
  **auto-reportado**: certifica qué declaró el founder y cuándo. Un financiador debe contrastarlo con su fuente.
- **No indexan.** El historial se lee vía la API de Blockscout desde el frontend, o con las funciones `get*`.

## Requisitos

[Foundry](https://book.getfoundry.sh/getting-started/installation). En Windows, los binarios están en
`%USERPROFILE%\.foundry\bin` y hay que agregarlos al `PATH` de la sesión:

```powershell
$env:PATH = "$env:USERPROFILE\.foundry\bin;$env:PATH"
```

OpenZeppelin Contracts 5.4.0 y forge-std están vendorizados en `lib/`, así que no hace falta `forge install`.

## Tests

```bash
forge build
forge test -vvv          # 40 tests
forge coverage           # 100% de líneas, ramas y funciones en src/
forge fmt                # formato
```

Qué cubre la suite:

- **`test/Bootstrap.t.sol`** — unit + fuzz de cada función pública, éxito y revert: soulbound (todas las
  variantes de `transferFrom`/`safeTransferFrom` y las aprobaciones revierten), control de acceso por rol,
  rotación de `VALIDATOR_ROLE`, validación de inputs, y que **ninguna operación funciona sobre un tokenId
  inexistente**. Eventos verificados con `vm.expectEmit`.
- **`test/Integration.t.sol`** — el flujo completo de la demo: mintear passport → agregar hito con hash →
  verificarlo → registrar aplicación (enviada, luego aceptada) → reportar financiación → un financiador lee
  todo el historial. Más un test de que el script combinado conecta bien las tres direcciones.

## Deploy

**Nunca** pongas una clave privada en el repo ni en la línea de comandos. Importa la wallet a un keystore
cifrado una sola vez y refiérela con `--account`:

```bash
cast wallet import bootstrap-deployer --interactive
```

Variables de entorno (en `.env`, fuera del repo):

| Variable | Obligatoria | Para qué |
|---|---|---|
| `HSK_TESTNET_RPC` | sí | RPC de HSK Chain testnet (chain id **133**) |
| `HSK_MAINNET_RPC` | solo mainnet | RPC de HSK Chain mainnet (chain id **177**) |
| `VALIDATOR` | sí | Dirección que recibe `VALIDATOR_ROLE` en `Milestones` |
| `OWNER` | no | Owner del Passport (puede mintear); por defecto, el deployer |
| `ADMIN` | no | `DEFAULT_ADMIN_ROLE`: otorga y revoca roles; por defecto, `OWNER` |
| `PASSPORT_ADDRESS` | solo scripts individuales | Passport ya desplegado al que conectarse |

**Ninguna clave privada va en el `.env`.** Los scripts usan `vm.startBroadcast()` sin argumentos: el
firmante sale de `--account <keystore>` en la CLI.

> Separar `ADMIN` de `OWNER` y de `VALIDATOR` no es cosmético: `DEFAULT_ADMIN_ROLE` puede auto-otorgarse
> `VALIDATOR_ROLE` y `RECORDER_ROLE`, así que si las tres son la misma EOA, filtrar esa clave alcanza para
> fabricar un historial "verificado" de cero. El script avisa por consola si detecta que las comparten.

### Todo de una (recomendado)

```bash
forge script script/Deploy.s.sol --rpc-url hsk_testnet --account bootstrap-deployer --broadcast
```

Imprime al final las tres direcciones ya en formato `CLAVE=valor`, listas para pegar en el `.env` del
frontend (`PASSPORT_ADDRESS`, `MILESTONES_ADDRESS`, `FUNDING_REGISTRY_ADDRESS`).

### Uno por uno

```bash
forge script script/DeployProjectPassport.s.sol  --rpc-url hsk_testnet --account bootstrap-deployer --broadcast
# exportar PASSPORT_ADDRESS con la dirección impresa, luego:
forge script script/DeployMilestones.s.sol       --rpc-url hsk_testnet --account bootstrap-deployer --broadcast
forge script script/DeployFundingRegistry.s.sol  --rpc-url hsk_testnet --account bootstrap-deployer --broadcast
```

### Simular sin gastar gas

Quita `--broadcast`. Sin RPC configurado también corre: `forge script script/Deploy.s.sol` simula local.

### Verificación en Blockscout

```bash
forge verify-contract <direccion> src/ProjectPassport.sol:ProjectPassport \
  --verifier blockscout --verifier-url <explorer-hsk>/api --chain-id 133 \
  --constructor-args $(cast abi-encode "constructor(address)" <owner>)
```

`Milestones` usa `constructor(address,address,address)` (passport, validator, admin) y `FundingRegistry`
`constructor(address,address)` (passport, admin).

> Mainnet (177) **solo** con confirmación explícita del usuario, y antes de eso: `/audit` con contexto
> fresco, `slither`, y mover `DEFAULT_ADMIN_ROLE` / `owner` a un multisig.

## Notas de diseño

- **Soulbound de verdad, no por convención.** El bloqueo está en `_update`, el punto único por el que pasan
  mint, transfer y burn en OpenZeppelin v5. No hay ruta alterna para mover el token. `approve` y
  `setApprovalForAll` también revierten, para que ningún marketplace pueda tomar control. Se implementa
  ERC-5192 (`locked`) para que las wallets lo muestren como intransferible.
- **`AccessControl`, no `Ownable`, donde hay verificación.** En la demo `VALIDATOR_ROLE` es una sola
  dirección — un riesgo que reconocemos en el pitch. En producción ese rol se otorga a un multisig sin tener
  que migrar el contrato ni redesplegar.
- **El `author` de cada entrada vive en storage, no solo en el evento.** Como un `VALIDATOR_ROLE` puede
  registrar hitos en nombre de un founder, quien lee el historial necesita saber de quién es cada
  declaración sin tener que reconstruir logs.
- **Separación de funciones en la verificación.** Un validator no puede verificar un hito que él mismo
  registró (`SelfVerification`). Sin eso, una sola dirección con el rol podría registrar y atestiguar en el
  mismo bloque, y onchain sería indistinguible de una verificación independiente — justo la propiedad que
  el producto certifica.
- **Los constructores rechazan una dirección de Passport sin código** (`NotAContract`): un typo en
  `PASSPORT_ADDRESS` dejaría el contrato `immutable` apuntando a una dirección muerta, con toda escritura
  revirtiendo para siempre y sin forma de arreglarlo salvo redesplegar.
- **Los getters no prueban existencia.** Un tokenId inexistente y uno existente sin registros devuelven lo
  mismo (`0` / array vacío). Quien lea debe consultar `passport.ownerOf` primero si necesita distinguirlos
  — el frontend ya lo hace.
- **Errores custom en vez de `require` con strings**: menos gas y mejor diagnóstico en el frontend.
- **Registros inmutables.** Un cambio de estado de una aplicación se registra como una entrada nueva, no
  sobrescribe: así el historial completo queda auditable.
- **`evm_version = "paris"`** en `foundry.toml`: no está confirmado qué hardforks soporta HSK Chain, así que
  se evitan opcodes nuevos (`PUSH0`, `MCOPY`).
- **Las funciones `get*Milestones` / `getApplications` devuelven arrays sin tope**: son para `eth_call`
  desde el frontend, no para llamarse desde otro contrato. Para paginar existe `count` + getter indexado.
