# Bootstrap — EAG Global Buildathon (Colombia)

> Tesis (repetir en código, README y pitch): "No buscamos financiación para startups que ya existen. Convertimos ideas en proyectos financiables, y certificamos cada paso onchain para que cualquier financiador pueda verificarlo sin confiar en la palabra del founder."

Agente de IA que toma una IDEA, la investiga, la cruza contra fuentes reales de financiación, redacta MVP/budget/pitch por oportunidad y certifica cada paso onchain en un **Project Passport** (NFT soulbound).

## Hackathon
- Track principal: AI x Ethereum & Agent Economy. Secundario: Real-World Ethereum Applications. Opcional: HSK Chain Track (AI Agents / Payment).
- Deadline: sin fecha confirmada. Asumir 48-72h. **Un flujo completo real > 9 features a medias.**

## Chains
| Red | Chain ID | Uso |
|---|---|---|
| HSK Chain testnet | 133 | Demo principal |
| HSK Chain mainnet | 177 | Deploy espejo SOLO si sobran 1-2h (cambiar RPC en script Foundry) |

RPC, explorer y API keys viven en `.env` (nunca en el repo). Verificación y lecturas onchain vía Blockscout API del explorer de HSK.

## Stack
Foundry + OpenZeppelin (contratos) · Next.js + wagmi/viem (front) · Supabase/Postgres (convocatorias curadas) · x402 (Coinbase) + MPP (mppx) para agent payments.

## Alcance (defendible en 48-72h)
Input de idea (chat/form) → agente de research (1-2 fuentes reales) → matching (3-5 resultados de datos curados) → Passport soulbound → 1 milestone onchain (hash + descripción) → dashboard (passport, research, oportunidades, estado onchain).

**Fuera de alcance:** más de 2-3 fuentes reales (resto = demo data ETIQUETADO como tal) · aplicaciones enviables (solo borradores) · mover dinero real salvo micropago x402 · KYC (el passport certifica evidencia, no identidad) · el agente NUNCA afirma "cumples/no cumples" sin aclarar que es una estimación.

## Contratos (máx. 3)
1. `ProjectPassport.sol` — ERC-721 soulbound. `mintPassport(address founder, string metadataURI)`; transfers revierten.
2. `Milestones.sol` — `addMilestone(tokenId, description, bytes32 evidenceHash)` (solo hash, nunca el archivo); `verifyMilestone(tokenId, milestoneId)` restringido a un validator único (prod: multisig).
3. `FundingRegistry.sol` — `recordFundingApplication(tokenId, opportunityName, uint8 status)`; `recordFundingReceived(...)` opcional.

Deploy con scripts Foundry, verificación en Blockscout de HSK.

## Arquitectura
```
Usuario → Frontend Next.js (Vercel)
├─ wagmi/viem + wallet → Smart Contracts (HSK Chain)
└─ /api/agent (serverless) → Orquestador del agente
   ├─ LLM (research, matching, pitch)
   ├─ Supabase/Postgres (convocatorias curadas)
   ├─ Web search (contexto de mercado)
   └─ x402/MPP client (pago por llamada a fuentes premium)
```
- El backend es serverless (`/api/agent` en Next.js/Vercel): sin servidor propio ni indexer.
- x402/MPP se usa como CLIENTE: el agente paga por llamada a fuentes premium. Es un rail aparte, no necesariamente en HSK Chain.
- Solo el frontend (wallet del usuario) escribe en los contratos; el agente no firma transacciones onchain.
- Vercel serverless tiene límite de duración por request: el orquestador debe responder por etapas/streaming.

## Reglas duras
- Skill `ship` (ethskills.com/ship): CROPS → split onchain/offchain → contar contratos → auditar transiciones de estado → OZ → tests → auditoría con contexto fresco → front → multisig.
- Nunca leer/escribir `.env` ni claves privadas (hook lo bloquea). Nunca commitear secretos.
- Solo bases OpenZeppelin; no reescribir primitivas auditadas. Verificar direcciones externas antes de usarlas.
- Nada de imágenes/metadata pesada onchain: IPFS/URI.
- Deploy a mainnet solo con confirmación explícita del usuario.

## Fase 0 (ship) — onchain vs offchain
| Onchain (HSK) | Offchain |
|---|---|
| Passport soulbound (ownership no transferible) | Research, matching, pitch/MVP/budget (LLM) |
| Hash de evidencia + descripción del milestone | Archivos de evidencia, metadata pesada (IPFS/URI) |
| Verificación por validator | Convocatorias curadas (Supabase), web search |
| Registro de aplicación a fondos (status) | Perfil/UX, caché, prompts |

Contratos: exactamente 3 y ninguno más. `FundingRegistry` es el más recortable: orden de build Passport → Milestones → FundingRegistry (solo si sobra tiempo).

## Regla dura de la API
El frontend NUNCA llama al LLM ni expone keys: todo pasa por la API route serverless `/api/agent`.

## Agent payments: x402 / MPP (diferenciador, no opcional)
Convierte el "success fee" en una transacción demoable en vivo.
- **x402** (Coinbase): `GET /resource` → `402 + PAYMENT-REQUIRED` (amount, payee, network, expiry) → reintento con `PAYMENT-SIGNATURE` (EIP-3009 `transferWithAuthorization`) → verificación vía Facilitator → settle onchain → `200 + PAYMENT-RESPONSE`. Sin cuentas ni API keys. Nació en Base + USDC; agnóstico de chain/asset. Esquemas: `exact`, `upto`, `batch-settlement`.
- **MPP** (Tempo Labs/Wevm, draft IETF): auth HTTP agnóstica al método de pago. `WWW-Authenticate: Payment` → `Authorization: Payment` → `Payment-Receipt`. Intents: `charge`, `session`, `subscription`. `mppx` sirve ambos protocolos en el mismo endpoint (`mppx/x402/express`).
- **Casos de uso:** (1) agent-pays-for-data: el research agent paga por llamada a una fuente premium. (2) grantor-pays-for-verification: un financiador paga un micropago para desbloquear el reporte de verificación de un Passport, sin login.
- Ejemplo servidor: `createX402Server({ environment: "development", payToConfig: { type: "address", evm: process.env.X402_PAY_TO }, routes: { "GET /report": { price: "$0.01", networks: ["eip155:84532"] } } })` (Base Sepolia).
- **Seguridad del agente:** cap por transacción, límite diario, allowlist de payees. Nunca custodia abierta de fondos.
- **DECIDIDO (opción A):** x402 corre en Base Sepolia (`eip155:84532`, USDC testnet); Passport/Milestones/FundingRegistry en HSK testnet (133). Dos chains: el agente paga con wallet del servidor (el usuario no cambia de red); solo el caso 2 (grantor-pays) pide al financiador estar en Base Sepolia. Opcional: guardar el recibo del pago como `evidenceHash`.

## Fuentes de datos (acceso real, no inventar integraciones)
| Fuente | Acceso |
|---|---|
| Grants.gov | API REST oficial (key vía Help Desk) |
| Gitcoin / Ethereum Foundation / Optimism RetroPGF | API-accesible, web3-nativo |
| iNNpulsa, MinCiencias, Ruta N, Bancoldex, Fondo Emprender SENA, Cámaras de Comercio | Sin API pública: PDFs/web, curado manual |
| Web search general | API, contexto de mercado |

Framing honesto: 2-3 convocatorias reales curadas a mano, resto etiquetado "demo data". Es roadmap, no se oculta.

## Modelo de negocio
1. Success fee 2-5% sobre financiación no dilutiva. 2. Freemium: 1 research+match gratis. 3. B2B: financiadores pagan acceso al Passport verificado (ángulo más defendible). 4. Datos agregados anonimizados.

## Riesgos a reconocer en el pitch
Curación manual (→ roadmap scraping/partnerships) · el agente puede alucinar requisitos (→ link oficial + "estimación, no garantía") · sin KYC · validator único en demo (→ multisig/attestation).

## Equipo
Jose Oñate, Santiago Campo, Juan Mancilla.

## Comandos
`forge build` · `forge test -vvv` · `forge fmt` · `forge script script/Deploy.s.sol --rpc-url $HSK_TESTNET_RPC --broadcast` · `npm run dev` (front)

## Flujo de sesiones
Al iniciar se carga `SESSION.md` (hook). Usa `/resume` para retomar y `/handoff` antes de cerrar. Reglas detalladas en `.claude/rules/`; subagentes en `.claude/agents/`.
