# AutoDriv Frontend

Frontend SaaS do AutoDriv criado como aplicação isolada em Next.js App Router. Este serviço deve ser publicado separado do backend atual `autodriv-core`.

## Stack

- Next.js com App Router
- TypeScript
- Tailwind CSS
- Componentização por módulos
- Cliente HTTP centralizado em `lib/api/client.ts`
- Base inicial de sessão, papéis e permissões

## Rodar localmente

```bash
npm install
npm run dev
```

Crie um `.env.local` a partir de `.env.example` quando precisar apontar para outro backend.

## Variáveis de ambiente

```bash
NEXT_PUBLIC_API_URL=https://autodriv-core.onrender.com
NEXT_PUBLIC_APP_NAME=AutoDriv
NEXT_PUBLIC_ENVIRONMENT=production
```

Não coloque segredos neste frontend. Chaves como `DATABASE_URL`, `JWT_SECRET`, `OPENAI_API_KEY`, `CLOUDINARY_API_SECRET`, `REDIS_URL` e equivalentes pertencem somente ao backend.

## Render

Service type:
Web Service

Name:
autodriv-frontend

Repository:
aguinaldodiversos-lgtm/autodriv-core

Branch:
principal-(main)

Root Directory:
frontend

Runtime:
Node

Build Command:
npm ci && npm run build

Start Command:
npm run start

Environment Variables:

```bash
NODE_VERSION=20.20.2
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://autodriv-core.onrender.com
NEXT_PUBLIC_APP_NAME=AutoDriv
NEXT_PUBLIC_ENVIRONMENT=production
```

## Segurança

- O frontend usa permissões apenas para controlar experiência visual.
- Toda autorização real precisa continuar no backend.
- A IA não deve ser chamada diretamente do navegador.
- A arquitetura correta é: Frontend -> Backend API -> Worker/serviço de IA -> Resultado salvo -> Frontend consulta resultado.

## Endpoints pendentes no backend

Consulte `docs/frontend-backend-map.md` na raiz do repositório. Pontos importantes para evoluir a integração:

- `GET /api/auth/me`
- Listagem CRUD de contratos
- Gestão de usuários e permissões
- Endpoints de aceite/ignore para recomendações inteligentes, se ainda não estiverem expostos no ambiente de produção
