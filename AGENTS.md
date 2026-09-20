# AGENTS.md

Fuente de verdad del proyecto: [CLAUDE.md](./CLAUDE.md). Estado vivo: [SESSION.md](./SESSION.md).

- Proyecto: Bootstrap (idea → research → matching de financiación → Project Passport soulbound onchain).
- Stack: Foundry + OpenZeppelin, Next.js + wagmi/viem, Supabase, x402/MPP. Chain: HSK testnet (133).
- Máx. 3 contratos. Alcance mínimo, un flujo completo real.
- Nunca tocar `.env` ni claves. No deploy a mainnet sin confirmación.
- Antes de terminar una tarea: `forge test` (contratos) y build del front en verde; actualizar `SESSION.md`.
- Roles: frontend, backend, contract-deployer, security-auditor (ver `.claude/agents/`).
