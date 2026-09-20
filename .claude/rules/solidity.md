---
paths: ["**/*.sol", "script/**", "test/**"]
---
# Reglas Solidity
- Solidity fijo (pragma exacto), OpenZeppelin para ERC-721/Ownable/AccessControl.
- CEI; sin loops sin límite; errores custom en vez de strings.
- Eventos en todo cambio de estado (`PassportMinted`, `MilestoneAdded`, `MilestoneVerified`, `FundingApplicationRecorded`).
- Soulbound: override de `_update` (OZ v5) que revierte salvo mint.
- Solo `bytes32` de evidencia; nada de archivos ni metadata pesada onchain.
- Cada función pública con test de éxito y de revert; fuzz donde haya aritmética.
- Direcciones externas: verificarlas antes de usar, nunca de memoria.
