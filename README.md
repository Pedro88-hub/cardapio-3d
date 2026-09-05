# Cardápio WebAR (MVP Cliente)

Monorepo com Next.js (cliente) + NestJS (API) + PostgreSQL.

**Repositório:** https://github.com/Pedro88-hub/cardapio-3d

## Subir local

```bash
docker compose up -d
npm install
cp apps/api/.env.example apps/api/.env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev:api
# outro terminal
npm run dev:web
```

Postgres do Docker escuta em **5433** (evita conflito com Postgres local na 5432).

URL demo local: http://localhost:3000/r/casa-brasa/mesa/12

API: http://localhost:3001

## Teste no celular (túnel temporário)

Com a API e o web rodando na máquina, exponha via Cloudflare Tunnel (`cloudflared tunnel --url ...`). O PC precisa permanecer ligado.
