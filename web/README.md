This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deploy en Vercel

1. Importar el repo en Vercel con **Root Directory = `web`** (framework Next.js, se detecta solo).
2. Variables de entorno (Project Settings → Environment Variables):

| Variable | Expuesta al navegador | Para qué |
|---|---|---|
| `NEXT_PUBLIC_PASSPORT_ADDRESS` | sí | ProjectPassport en HSK 133 |
| `NEXT_PUBLIC_MILESTONES_ADDRESS` | sí | Milestones |
| `NEXT_PUBLIC_FUNDING_REGISTRY_ADDRESS` | sí | FundingRegistry (opcional) |
| `NEXT_PUBLIC_HSK_TESTNET_RPC` | sí | RPC (por defecto `https://testnet.hsk.xyz`) |
| `NEXT_PUBLIC_HSK_TESTNET_EXPLORER` | sí | Explorer, para links a tx (opcional) |
| `ANTHROPIC_API_KEY` | **no** | `/api/agent` |
| `PASSPORT_ADDRESS`, `MILESTONES_ADDRESS` | no | lecturas de `/api/report/[tokenId]` |
| `PINATA_JWT` | **no** | `/api/pin`: sube la metadata del Passport a IPFS |
| `X402_PAY_TO` | no | payee del reporte (x402, Base Sepolia) |
| Supabase (URL + clave publicable) | ver `.env.example` | convocatorias |

Las direcciones `NEXT_PUBLIC_*` se inlinean en el build: tras cambiarlas hay que **redesplegar**.
`/api/agent` declara `maxDuration = 60`; el plan Hobby puede recortarlo.
