# SESSION — estado vivo (actualizar con /handoff)

## Última actualización
2026-09-19 (sesión autónoma de contratos) — capa onchain ampliada al spec completo: roles, historial legible y financiación reportada. 35 tests, 100% coverage en `src/`. Nada desplegado todavía. Ver `SUMMARY.md`, `PROGRESS.md`, `DECISIONS.md`, `BLOCKERS.md`.

## Hecho
- `.claude/` completo, CLAUDE.md, AGENTS.md, .mcp.json.
- **Contratos** (`contracts/`): ProjectPassport (soulbound + ERC-5192), Milestones (AccessControl + `VALIDATOR_ROLE`), FundingRegistry (AccessControl + `RECORDER_ROLE`, historial en storage, `recordFundingReceived`). **35 tests** (unit + fuzz + integración) pasan, **100% coverage** de líneas/ramas/funciones en `src/`. 4 scripts de deploy (uno por contrato + combinado), simulados OK. `contracts/README.md` propio. Solc 0.8.28, evm `paris`, OZ 5.4.0 vendorizado en `lib/`.
- **Backend** (`web/lib/agent`): research (Claude + web search), matching (Supabase o demo), pitch, `lib/evidence.ts` (keccak256 en el CLIENTE; se eliminó `/api/evidence`), rate limiting en memoria (IP solo de x-vercel-forwarded-for; fuera de Vercel requiere TRUST_PROXY_HEADERS=1).
- **x402 cliente** (`lib/agent/x402.ts`) con caps por tx/día y allowlist de payees. Sin probar con pago real.
- **x402 servidor**: `/api/report/[tokenId]` responde 402 ($0.01 USDC, Base Sepolia). El reporte lee Passport/Milestones vía `lib/chain.ts` si están PASSPORT_ADDRESS, MILESTONES_ADDRESS y el RPC; si no, devuelve demo. Probado en anvil local (lectura + token inexistente).
- Foundry **1.5.1-stable** instalado en `%USERPROFILE%\.foundry\bin` (no está en PATH permanente). PowerShell: `$env:PATH = "$env:USERPROFILE\.foundry\bin;$env:PATH"`. (La nota anterior de "1.8.3 en `~/.foundry/bin`" era de otro entorno: esa ruta no existía en esta máquina.)

## Decisiones
- Chain: contratos en HSK testnet 133 (mirror a 177 solo si sobra tiempo); x402 en Base Sepolia (opción A). Spike de "todo en HSK" solo si sobra tiempo.
- Exactamente 3 contratos; FundingRegistry es el recortable. ~~`recordFundingReceived` fuera del MVP~~ → **implementado** (lo pedía el spec; no mueve dinero, solo registra).
- Passport: el founder mintea el suyo; el owner puede mintear en su nombre.
- Milestones: el dueño del passport **o un `VALIDATOR_ROLE`** agrega (cambió: antes solo el dueño); solo `VALIDATOR_ROLE` verifica. El evento `MilestoneAdded` lleva `author` para que quede auditable quién escribió. **Revisar si querés volver al modelo estricto antes de desplegar** (ver `SUMMARY.md`).
- `AccessControl` en vez de `Ownable` donde hay verificación: los roles pasan a multisig en producción sin redesplegar.
- Registros inmutables: un cambio de estado de una aplicación es una entrada nueva, no un update.
- El frontend nunca toca el LLM: todo por `/api/agent`.

## Próximos pasos
1. Auditoría hecha (apto testnet, no mainnet). Corregidos M1 (503 sin contratos, antes del paywall), M2 (IP confiable), M3 (hash en cliente), M4 (escape de <>). Pendientes bajos: abortar pago x402 si asset != USDC, lectura acotada de fuente premium, Ownable2Step, `.gitignore` con `!.env.example`, slither antes de mainnet, tope de gasto duro en el panel de Anthropic.
2. Deploy testnet 133: keystore (`cast wallet import`), `VALIDATOR`, RPC en env. Guardar direcciones en `deployments/133.json`.
3. Exportar ABIs al front. `FundingRegistry` todavía no está integrado en el frontend y ahora tiene lecturas útiles para el dashboard (`getApplications`, `getAllFundingReceived`). Pipeline del agente probado end-to-end SOLO con LLM simulado (falta prueba con API key real).
4. Curar 2-3 convocatorias reales en Supabase (hoy son 3 filas DEMO).
5. Definir fuente premium para el caso agent-pays-for-data.
6. Frontend (dashboard, chat, wallet): el usuario pidió dejarlo para después.

## Bloqueos / pendientes del usuario
- Deadline real; URLs RPC y explorer de HSK (van en `.env`).
- `ANTHROPIC_API_KEY` en `web/.env.local` para probar el LLM de punta a punta.
- Actualizar `web/.env.example` a mano (mi permiso lo bloquea): `ANTHROPIC_API_KEY`, `LLM_MODEL`, `AGENT_RATE_PER_IP_HOUR=5`, `AGENT_RATE_GLOBAL_DAY=200`, `AGENT_MAX_PER_TX_USD`, `AGENT_MAX_PER_DAY_USD`, `AGENT_ALLOWED_PAYEES`, `PREMIUM_SOURCE_URL`, `X402_PAY_TO`, `X402_FACILITATOR_URL`, `X402_REPORT_PRICE`, `PASSPORT_ADDRESS`, `MILESTONES_ADDRESS`, `TRUST_PROXY_HEADERS` (solo si hay proxy propio).
- Wallet del agente para x402: fondos mínimos en Base Sepolia.
- Crear `contracts/.env.example` a mano (mi permiso bloquea esa ruta): `HSK_TESTNET_RPC`, `HSK_MAINNET_RPC`, `HSK_TESTNET_EXPLORER`, `VALIDATOR`, `OWNER`, `PASSPORT_ADDRESS`. Contenido exacto en `BLOCKERS.md` §2; tabla explicada en `contracts/README.md`.

