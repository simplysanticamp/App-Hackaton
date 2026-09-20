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
