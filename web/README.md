# Bootstrap: frontend y agente

Next.js + wagmi/viem. El agente corre en rutas serverless (`/api/agent`); el frontend nunca llama al LLM.

## Correrlo en tu computador

```powershell
cd web
npm install
# crea web/.env.local con las variables de abajo (este archivo NO se sube a git)
npm run dev        # http://localhost:3000
```

Sin ninguna variable, la sección **/demo** funciona con datos de ejemplo. Para el flujo real necesitas `.env.local`.

## Variables de entorno (`web/.env.local`)

Cada persona crea su propio `.env.local`. Nunca se commitea. Hay dos tipos:

**Se pueden compartir entre el equipo (por un canal privado)**: no son secretas.

| Variable | Qué es | Dónde se obtiene |
|---|---|---|
| `SUPABASE_URL` | URL del proyecto, **solo el dominio** (`https://xxxx.supabase.co`, sin `/rest/v1/`) | Supabase → Project Settings → API → Project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Clave publicable (`sb_publishable_…`), solo lectura por RLS | Supabase → Project Settings → API |
| `NEXT_PUBLIC_HSK_TESTNET_RPC` | RPC de HSK testnet (133) | `https://testnet.hsk.xyz` |
| `NEXT_PUBLIC_PASSPORT_ADDRESS`, `NEXT_PUBLIC_MILESTONES_ADDRESS`, `NEXT_PUBLIC_FUNDING_REGISTRY_ADDRESS` | Contratos desplegados (front) | `deployments/133.json` |
| `PASSPORT_ADDRESS`, `MILESTONES_ADDRESS` | Los mismos contratos, para las rutas del servidor | `deployments/133.json` |
| `X402_PAY_TO` | Dirección pública que **cobra** los pagos x402 | Wallet de cobro (MetaMask) |
| `AGENT_ALLOWED_PAYEES` | Direcciones a las que el agente puede pagar; incluye `X402_PAY_TO` | La misma dirección |
| `PREMIUM_SOURCE_URL` | Fuente premium que paga el agente | `http://localhost:3000/api/premium/market` |

**Personales y SECRETAS**: cada quien las suyas, nunca por chat ni git.

| Variable | Qué es | Dónde se obtiene |
|---|---|---|
| `ANTHROPIC_API_KEY` | Clave del LLM. Pon un tope de gasto | console.anthropic.com → API Keys |
| `PINATA_JWT` | Sube la metadata del Passport a IPFS | app.pinata.cloud → API Keys (JWT) |
| `AGENT_WALLET_PRIVATE_KEY` | Clave de la wallet que paga por x402 (`0x` + 64 hex). Solo testnet, con USDC de prueba de Base Sepolia | Wallet nueva en MetaMask; no la del cobro |

Opcionales: `AGENT_MAX_PER_TX_USD`, `AGENT_MAX_PER_DAY_USD`, `X402_PREMIUM_PRICE`, `X402_REPORT_PRICE`, `LLM_MODEL`,
`NEXT_PUBLIC_HSK_TESTNET_EXPLORER` (sin explorer confirmado, los enlaces onchain se ocultan).

## Comprobar la configuración (no imprimen claves)

```powershell
node --env-file=.env.local scripts/check-supabase.mjs       # Supabase y convocatorias
node --env-file=.env.local scripts/check-pinata.mjs         # PINATA_JWT
node --env-file=.env.local scripts/check-agent-wallet.mjs   # wallet x402 y saldo USDC
node --env-file=.env.local scripts/test-x402-payment.mjs    # pago real de 0.005 USDC (con `npm run dev` corriendo)
```

Reglas: el agente nunca firma transacciones onchain; la clave privada del agente es solo de testnet.
Si algo falla con `ENOTFOUND`, es el DNS de tu red: reintenta o cambia a `1.1.1.1` / `8.8.8.8`.
