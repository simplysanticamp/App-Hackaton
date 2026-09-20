# DECISIONS

Decisiones tomadas sin consultar durante la sesión autónoma del 2026-09-19 (capa de contratos).
Una línea de justificación cada una. Si alguna no te convence, es reversible.

## Sobre el punto de partida

1. **Extendí los contratos existentes en vez de reescribirlos desde cero.** El spec pedía un proyecto
   Foundry completo, pero ya existía uno commiteado con los tres contratos y 24 tests en verde; rehacerlo
   habría tirado trabajo válido y el spec resultó ser un superconjunto de lo que había.
2. **Instalé Foundry 1.5.1-stable (binario oficial de Windows) en `%USERPROFILE%\.foundry\bin`.** `SESSION.md`
   afirmaba que había Foundry 1.8.3 en `~/.foundry/bin`, pero esa ruta no existe en esta máquina (era de
   otro entorno); sin `forge` no había forma de verificar nada.
3. **Mantuve `pragma solidity 0.8.28` (exacto) en vez del `^0.8.24` del spec.** La regla del proyecto
   (`.claude/rules/solidity.md`) pide pragma fijo, y 0.8.28 satisface `^0.8.24`.

## ProjectPassport

4. **El founder puede mintear su propio passport, además del `owner`.** El spec decía "solo el owner (o un
   rol autorizado)"; el flujo de la demo es que el usuario mintea desde su wallet, y romperlo obligaría al
   backend a firmar transacciones, cosa que `CLAUDE.md` prohíbe explícitamente.
5. **`_mint` y no `_safeMint`.** El token no se puede transferir, así que no importa si el destinatario
   implementa `onERC721Received`; `_safeMint` solo añadiría una llamada externa innecesaria.

## Milestones

6. **`Ownable` → `AccessControl` con `VALIDATOR_ROLE`**, como pedía el spec: el rol se puede otorgar a un
   multisig en producción sin redesplegar.
7. **Eliminé `validator()` y `setValidator()`.** Con `AccessControl` puede haber varios validators, así que
   un único getter de dirección mentiría; la rotación se hace con `grantRole`/`revokeRole`.
8. **`VALIDATOR_ROLE` ahora también puede *agregar* hitos, no solo verificarlos.** Lo pedía el spec
   explícitamente. Es una ampliación de confianza respecto a la sesión anterior (antes solo el dueño del
   passport agregaba), pero el evento `MilestoneAdded` ahora incluye `author`, así que queda auditable quién
   registró cada hito.
9. **`verifyMilestone` no re-consulta `passport.ownerOf`.** Un hito solo puede existir si el passport existía
   al registrarlo, y el passport es soulbound y no se puede quemar: el check sería una llamada externa
   provablemente redundante. Si el tokenId no existe, revierte igual con `MilestoneNotFound`. Está
   documentado en el `@dev` de la función.
10. **Agregué `getMilestones(tokenId)` devolviendo el array completo**, además del `count` + getter indexado
    que ya existía; el spec aceptaba cualquiera de las dos, tener ambas simplifica el frontend.

## FundingRegistry

11. **El enum `Status` es `Pending, Submitted, UnderReview, Accepted, Rejected`** (5 valores) en vez de los
    3 del spec (`Pending/Accepted/Rejected`). Los tres nombres del spec existen; los dos extra son la
    granularidad que ya tenía el contrato y que el frontend necesita para mostrar el estado real.
12. **`status` pasó de `uint8` a `Status` en la firma pública**, como pedía el spec. Efecto secundario: el
    decodificador del ABI rechaza valores fuera de rango antes de entrar a la función, así que borré el
    error `InvalidStatus` por inalcanzable (hay un fuzz test que lo demuestra).
13. **Las aplicaciones ahora van a storage, no solo a eventos.** El spec exige poder leer el historial de un
    tokenId; con solo eventos habría hecho falta un indexer, que está explícitamente fuera de alcance.
14. **Implementé `recordFundingReceived(tokenId, amount, token)`**, que la sesión anterior había dejado fuera
    del MVP, porque el spec lo pide con nombre y firma.
15. **`token == address(0)` significa moneda nativa de la red**, la convención habitual, en vez de rechazarlo.
16. **`recordFundingReceived` lleva `nonReentrant`** aunque hoy no mueva dinero: es el punto exacto donde
    entraría una integración futura de escrow, y el spec pedía considerar reentrancy de forma defensiva.
17. **Agregué `RECORDER_ROLE`** (análogo a `VALIDATOR_ROLE`) porque el spec pedía "el dueño del passport o un
    rol autorizado". Nace sin ninguna dirección asignada: hoy solo escribe el founder.
18. **Los registros son inmutables: no hay función de update.** Un cambio de estado se registra como entrada
    nueva, así el historial completo queda auditable en vez de sobrescribible.
19. **El constructor ahora toma `(passport, admin)` en vez de solo `(passport)`**, necesario para `AccessControl`.

## Tests y scripts

20. **Dejé el nombre `passport` (minúscula) en los `immutable`** pese al warning de `forge lint`
    (`screaming-snake-case-immutable`): es un getter público que el frontend puede leer, y renombrarlo a
    `PASSPORT` cambiaría el ABI por una cuestión cosmética.
21. **Los roles se cachean en `setUp()` de los tests.** Leer `milestones.VALIDATOR_ROLE()` dentro del
    argumento de `vm.expectRevert` consume el `vm.prank` pendiente — fue la causa de 4 fallos.
22. **El test de integración incluye un test del script combinado** (`test_DeployScriptWiresContracts`), para
    que un error de cableado entre contratos falle en CI y no en el deploy.
23. **Cuatro scripts de deploy**: uno por contrato más el combinado, como pedía el spec. El combinado imprime
    las direcciones en formato `CLAVE=valor` para pegar directo en el `.env` del frontend.
24. **No creé `contracts/.env.example`**: mis permisos bloquean escribir en esa ruta. Las variables quedaron
    documentadas en una tabla en `contracts/README.md`. Ver `BLOCKERS.md`.

## Correcciones tras la auditoría con contexto fresco

Corrí `/audit` sobre los contratos ya terminados. Veredicto: apto para testnet, no para mainnet. Estas son
las correcciones que apliqué; las que decidí **no** aplicar están en `BLOCKERS.md` §4 con su justificación.

25. **`address author` ahora vive en storage, no solo en el evento** (`Milestone`, `Application`,
    `FundingReceived`). Como un `VALIDATOR_ROLE` puede escribir en el historial de un proyecto ajeno
    (decisión 8), sin esto los getters que consume el frontend devolvían la entrada sin decir de quién era
    la declaración. Costo: un slot extra por hito. Mantuve los timestamps en `uint64` en vez de bajarlos a
    `uint48` para que el struct empaque en un solo slot — el ahorro de gas no compensa usar un tipo raro en
    una demo de testnet.
26. **Un validator no puede verificar un hito que él mismo registró** (`SelfVerification`). Sin esto, una
    sola dirección con el rol podía registrar y atestiguar en el mismo bloque, y onchain era indistinguible
    de una verificación independiente — que es exactamente la propiedad que el producto vende. Si hace
    falta que uno registre y otro verifique, se otorga el rol a dos direcciones.
27. **Separé `ADMIN` de `OWNER` en los scripts de deploy** (`ADMIN` por defecto = `OWNER`, para no romper
    nada). `DEFAULT_ADMIN_ROLE` puede auto-otorgarse `VALIDATOR_ROLE` y `RECORDER_ROLE`: con las tres
    claves en la misma EOA, filtrarla alcanza para fabricar un historial "verificado" en cuatro
    transacciones. El script combinado ahora avisa por consola si detecta que comparten dirección.
28. **Los constructores rechazan un Passport sin código** (`NotAContract`). Un typo en `PASSPORT_ADDRESS`
    al desplegar uno por uno dejaba el contrato `immutable` apuntando a una dirección muerta, con toda
    escritura revirtiendo para siempre.
29. **Mantuve `nonReentrant` en `recordFundingReceived`** pese a que el auditor lo marcó como innecesario
    (no hay llamada externa después de los efectos) e inconsistente. Tu spec lo pedía explícitamente:
    "considerar reentrancy... defensivo, no over-engineering". No es una vulnerabilidad, solo gas.
30. **Actualicé `web/lib/chain.ts`** al nuevo struct `Milestone` (campo `author`), que era la única pieza
    del frontend acoplada al ABI de los contratos.

## Primer deploy a HSK testnet (2026-09-20)

El primer deploy a la chain 133 salió mal y hubo que redesplegar. Vale la pena dejar escrito qué pasó,
porque el error no da ninguna señal en el momento: la transacción tiene éxito, el script imprime las
direcciones correctas, y el daño solo aparece si alguien lee el estado onchain.

31. **El deploy quedó con `owner` y `DEFAULT_ADMIN_ROLE` en `0x1804c8AB1F12E6bbf3894d4083f33e07309d1f38`.**
    Los cuatro scripts hacían `vm.envOr("OWNER", msg.sender)`. Dentro del frame de un script, `msg.sender`
    es el caller por defecto de forge, **no** el firmante que sale de `--account`; solo coinciden si se pasa
    `--sender`. Esa dirección es `keccak256("foundry default caller")` y no tiene clave privada: el `owner`
    del Passport y el `DEFAULT_ADMIN_ROLE` de Milestones y FundingRegistry quedaron inalcanzables para
    siempre. Imposible otorgar `RECORDER_ROLE` ni rotar el validator a un multisig — justo el argumento que
    justifica haber elegido `AccessControl` sobre `Ownable` (decisión 6). Contratos abandonados, anotados
    como `NO USAR` en `deployments/133.json`.
32. **La simulación previa no lo detectó porque la corrí con `--sender`.** Eso sobreescribe el caller por
    defecto, así que el dry run mostró la dirección correcta y el broadcast real (con `--account` solo) no.
    Una simulación que no usa exactamente las mismas flags que el broadcast no prueba lo que parece probar.
33. **`OWNER` pasó a obligatoria y `DeployBase.sol` rechaza explícitamente el default caller.** Preferí
    reventar el deploy antes que aceptar un default silencioso: el modo de fallo es irreversible y no
    produce ningún error en el momento. Los tres scripts individuales heredan el mismo guard; en ellos
    `OWNER` solo hace falta si no se pasa `ADMIN`.
34. **El test del guard vive dentro de `test_DeployScriptWiresContracts`, no en funciones aparte.**
    `vm.setEnv` escribe en el entorno del proceso, que es compartido, y forge corre en paralelo los tests de
    un mismo contrato: separarlos los hacía competir por la variable `OWNER` y el resultado era un fallo
    intermitente.
35. **Verificar el deploy leyendo la cadena, no la salida del script.** Los logs de `forge script` salen de
    la simulación; en este caso imprimieron las mismas direcciones para dos senders distintos. La
    comprobación buena es `cast call <passport> "owner()(address)"` y `hasRole(...)` contra el RPC.
36. **`owner`, `admin` y `validator` comparten EOA en la demo**, contra lo que recomienda la decisión 27.
    Es deliberado para el hackathon (una sola wallet con fondos) y el script avisa por consola. El founder
    va a ser otra wallet, así que la separación de funciones en la verificación (decisión 26) se sostiene.
    Queda como riesgo a mencionar en el pitch.
37. **M1 resuelto: `revokeVerification(tokenId, milestoneId)` para `VALIDATOR_ROLE`.** La revocación no borra
    `verifiedAt`; agrega `revokedAt` al struct (campo nuevo, ABI cambia) y emite `VerificationRevoked`. Un hito
    cuenta como verificado solo si `verifiedAt != 0 && revokedAt == 0`. Es definitiva: no se re-verifica el
    mismo hito (un hito corregido se registra como hito nuevo), coherente con "registros inmutables". Solo
    un hito verificado se puede revocar; cualquier validator puede hacerlo, el founder no.
38. **M2 resuelto con prefijo `ipfs://` obligatorio en `mintPassport`, no con `bytes32 metadataHash`.**
    Mantiene la firma `mintPassport(address, string)` del spec y el CID ya es el hash del contenido. Rechaza
    `https://`, `http://`, `ipns://` (mutable) y `ipfs://` vacío con `MetadataURINotIPFS`. No valida que el
    CID esté bien formado: eso es offchain. **Estas dos correcciones cambian bytecode: los contratos de
    `deployments/133.json` quedan obsoletos y hay que redesplegar.**
