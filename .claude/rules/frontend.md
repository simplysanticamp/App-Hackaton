---
paths: ["app/**", "src/**", "components/**", "**/*.tsx"]
---
# Reglas Frontend
- wagmi/viem; tipos desde ABIs generadas, no a mano.
- Cada tx: estados idle/pending/confirmed/failed, con link a Blockscout.
- Formato legible: fechas, montos, hashes truncados.
- Datos demo etiquetados "demo"; outputs del agente marcados como estimación.
- Chain esperada 133 (testnet); si la wallet está en otra red, ofrecer cambio.
- Sin secretos en el cliente (`NEXT_PUBLIC_*` solo para valores públicos).
