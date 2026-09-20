---
name: ship
description: Flujo de ethskills.com/ship adaptado a Bootstrap. Úsalo antes de escribir Solidity o desplegar algo onchain.
---
Fuente: https://ethskills.com/ship/SKILL.md (re-fetch si hay dudas).

Fases:
0. **Plan:** CROPS (censura, open source, privacidad, seguridad) → split onchain/offchain → contar contratos (máx. 3 aquí) → chain → auditar transiciones de estado (quién llama qué y por qué).
1. **Contratos:** OpenZeppelin, CEI, eventos, direcciones verificadas.
2. **Test:** unit, fuzz, fork si hay integraciones, análisis estático.
3. **Frontend:** approvals, loading states, formato legible.
4. **Producción:** deploy, verificar en Blockscout, ownership a multisig, monitoreo.

Errores a evitar: codear sin planear, sobreconstruir, meter lógica de base de datos onchain, imágenes/metadata onchain, multi-chain antes de probar una, reescribir primitivas de OZ.

Antes de un deploy: correr `/audit` (contexto fresco) y `/test`.
