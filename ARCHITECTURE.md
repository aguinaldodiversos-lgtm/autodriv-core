# Arquitetura real — autodriv-core

Documento curto e **honesto** sobre o que este repositório executa em
produção. Se um diretório ou módulo não está aqui, é porque não está vivo
no runtime — ou foi apagado, ou é periférico.

## Stack

- Node.js 20 (declarado em `engines` do `package.json`).
- Express 4 como único framework HTTP.
- Postgres (biblioteca `pg`) como banco único.
- `@whiskeysockets/baileys` para integração com WhatsApp (não-oficial).
- `openai` SDK para IA conversacional (modelos gpt-4o-mini / gpt-4.1-mini).
- `pino` para log estruturado.
- `helmet`, `cors`, `express-rate-limit` para hardening.
- `bcryptjs`, `jsonwebtoken` para auth.
- `multer`, Cloudinary para upload de imagens de veículos.

Não usamos: TypeScript (foi removido — ver "Camadas removidas"), Redis, Knex,
BullMQ, microserviços, event bus, event sourcing, sagas, consensus PBFT/Raft.

## Entry point

- `src/server.js` — carrega env, roda migrations, sobe o Express e inicia
  WhatsApp Baileys. Opcionalmente liga `followup.worker` se
  `ENABLE_WORKERS=true`.
- `src/app.js` — define middlewares globais (helmet, CORS allowlist,
  rate-limit em auth, request-id + log), `GET /`, `GET /health` e monta as
  23 rotas do `src/routes/` e `src/modules/*/`.

## Rotas montadas (23)

Todas exigem Bearer JWT via `src/middlewares/auth.middleware.js`, exceto
`/api/auth/*`.

| Base path | Origem |
|---|---|
| `/api/auth` | `src/routes/auth/index.js` |
| `/api/vehicles` | `src/modules/vehicles/vehicles.routes.js` |
| `/api/leads` | `src/modules/leads/leads.routes.js` |
| `/api/dashboard` | `src/modules/dashboard/dashboard.routes.js` |
| `/api/ai-seller` | `src/modules/ai_seller/aiSeller.routes.js` |
| `/api/ai-settings` | `src/modules/ai_settings/aiSettings.routes.js` |
| `/api/pipeline` | `src/modules/pipeline/pipeline.routes.js` |
| `/api/leads-import` | `src/modules/leads_import/leadsImport.routes.js` |
| `/api/whatsapp` | `src/modules/whatsapp/whatsapp.routes.js` |
| `/api/inbox` | `src/modules/inbox/inbox.routes.js` |
| `/api/lead-distribution` | `src/modules/lead_distribution/distribution.routes.js` |
| `/api/forecast` | `src/modules/analytics/forecast.routes.js` |
| `/api/dashboard-intelligence` | `src/modules/dashboard_intelligence/dashboard.routes.js` |
| `/api/notifications` | `src/modules/notifications/rules/notification.routes.js` |
| `/api/goals` | `src/modules/goals/goal.routes.js` |
| `/api/funnel-analysis` | `src/modules/funnel_analysis/funnel.routes.js` |
| `/api/seller-ranking` | `src/modules/seller_ranking/ranking.routes.js` |
| `/api/ai-strategy` | `src/modules/ai_strategy/strategy.routes.js` |
| `/api/commission` | `src/modules/commission/commission.routes.js` |
| `/api/sales` | `src/modules/sales/sales.routes.js` |
| `/api/contracts` | `src/modules/contracts/contracts.routes.js` |
| `/api/sales-approval-panel` | `src/modules/sales_approval_panel/approvalPanel.routes.js` |
| `/api/approval-dashboard` | `src/modules/approval_dashboard/approvalDashboard.routes.js` |

## Módulos centrais (quentes)

- `leads/` — CRUD de leads + score + reativação + paginação.
- `vehicles/` — CRUD de veículos + sugestão de ação + FIPE.
- `inbox/` — conversas por lead (lista + detalhe + envio humano).
- `sales/` — fluxo draft → pending → approved/rejected.
- `contracts/` — versões, aprovação, PDF. **Atenção:** atualmente alguns
  endpoints ainda chamam métodos não implementados em `contracts.repository`
  (`findById`, `updateStatus`, etc.) — ver "Limitações".
- `whatsapp_baileys/` — sessão Baileys por dealership (disco em
  `sessions/{id}/`), handler inbound, integração com `ai_seller`.
- `ai_seller/` — prompt, engine OpenAI, detectores, fila `p-queue`.
- `dashboard/` e `dashboard_intelligence/` — agregações (COUNT/SUM) para o
  painel.
- `followups/` — agenda registros em `lead_followups`; o worker de disparo
  é opt-in (ver "Jobs").

Total: **33 módulos em `src/modules/`**, todos com rota montada.

## Banco

- Conexão: `src/config/db.js` — um único `pg.Pool` com `max`,
  `idleTimeoutMillis`, `connectionTimeoutMillis`, `statement_timeout`,
  `query_timeout` configuráveis por env.
- Isolamento multi-tenant: toda query de leitura/escrita sensível exige
  `WHERE dealership_id = $n`. Módulos auditados: `sales`, `inbox`,
  `integrations`, `lead_priority` (morto, removido), `leads`, `vehicles`.
  Outros módulos ainda carecem de revisão linha a linha.

### Migrations

- Runner em `src/database/migrate.js`. Descobre `.js` e `.sql` em
  `src/database/migrations/` (ordem alfanumérica), roda cada uma em
  transação e registra em `schema_migrations`.
- DB legado detectado via existência da tabela `dealerships`: o runner
  marca automaticamente as migrations em `LEGACY_BASELINE` como aplicadas
  sem reexecutar, evitando erros nas migrations antigas não-idempotentes.
- Toda migration nova adicionada à pasta **roda automaticamente** na
  próxima execução em qualquer ambiente.
- Fonte única de verdade do schema: **a pasta `migrations/`**. Não há
  `init.js` paralelo (removido).

### Índices quentes

Configurados via `033_composite_indexes.js`:
- `leads(dealership_id, status)`, `leads(dealership_id, created_at DESC)`
- `vehicles(dealership_id, status)`, `vehicles(dealership_id, created_at DESC)`
- `sales(dealership_id, created_at DESC)`
- `lead_conversations(dealership_id, lead_id, created_at DESC)`

## Auth

- Caminho único: `POST /api/auth/login` e `POST /api/auth/register` em
  `src/routes/auth/index.js`.
- Token: JWT HS256, 7 dias, payload
  `{id, user_id, dealership_id, role}`.
- Middleware único para rotas protegidas:
  `src/middlewares/auth.middleware.js`. Valida assinatura, confere que o
  usuário ainda existe no DB e normaliza `req.user`.
- `src/middlewares/plan.middleware.js` aplica limites do plano. Usado em:
  `POST /api/leads`, `POST /api/vehicles`, `POST /api/ai-seller/message`,
  `POST /api/whatsapp/connect`.
- Rate-limit: 20 requests/15 min por IP em `/api/auth`.

## WhatsApp

- `src/modules/whatsapp_baileys/` roda no mesmo processo HTTP.
- Sessões em disco (`sessions/{dealershipId}/`); sobrevivem a restart se
  o filesystem for persistente.
- O handler inbound chama `ai_seller` que responde via OpenAI.
- **Risco**: Baileys é reverse-engineering. Banimento do número é possível.

## Jobs

- `src/workers/followup.worker.js` — avança leads por cadência (20min →
  30 dias). **Só roda se `ENABLE_WORKERS=true`**. Intervalo configurável
  por `FOLLOWUP_INTERVAL_MS` (default 15 min). Disparo via `setInterval`
  em `server.js`.
- `src/workers/daily-alert.worker.js` — **desativado** (`DISABLED = true`)
  porque depende de engines TS removidas.
- Não há scheduler persistente (cron, BullMQ, pg-boss). Se o processo
  morre, jobs não retomam. Se houver 2 instâncias com `ENABLE_WORKERS=true`
  ambas rodam — não há lock.

## Observabilidade

- Logger Pino em `src/infrastructure/logger/logger.js` com redaction
  automática de `authorization`, `password`, `token`.
- Cada request recebe `x-request-id` (gerado se não vier do cliente) e
  gera um log `http_request` com `method/path/status/duration_ms`.
- `GET /health` pinga o banco via `SELECT 1` e retorna `uptime_s`.
  503 quando o DB falha.
- Ainda existem ~60 `console.log`/`console.error` espalhados em módulos
  menos quentes — substituição gradual.

## Env obrigatórias

- `JWT_SECRET` (≥32 chars) — boot aborta sem ela
- `DATABASE_URL` — boot aborta sem ela

## Env recomendadas

- `CORS_ORIGINS` — CSV de origens permitidas (obrigatório em produção)
- `OPENAI_API_KEY` — necessário para `ai_seller`
- `LOG_LEVEL` — default `info` em prod, `debug` fora
- `PG_POOL_MAX`, `PG_IDLE_TIMEOUT_MS`, `PG_CONNECTION_TIMEOUT_MS`,
  `PG_STATEMENT_TIMEOUT_MS`, `PG_QUERY_TIMEOUT_MS`
- `ENABLE_WORKERS=true`, `FOLLOWUP_INTERVAL_MS`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `CNC_API_URL`, `CNC_API_TOKEN` (integração Carros na Cidade)

## Camadas removidas (para referência histórica)

Foram apagadas por não serem executadas pelo runtime Node/Express (não
havia `tsconfig.json`, `ts-node`, nem build):

- `src/ai/`, `src/app/`, `src/application/`, `src/autonomous/`,
  `src/domain/`, `src/finance/` (root), `src/interfaces/`,
  `src/projections/`, `src/regulatory/`, `src/sagas/`, `src/shared/`
- `src/infrastructure/{cache, consensus, consistency, db, deployment,
  event-bus, event-sourcing, finance, governance, lock, metrics,
  observability, policy, portal, queue, replication, scaling,
  self-healing, snapshot, tenant}/`
- `src/infrastructure/ads/` (JS órfão)
- `src/brain/*.ts` (16 arquivos) e `src/brain/brain/`
- `src/workers/{event, projection}.worker.ts`
- `src/modules/{dev, maintenance, public, subscriptions, lead_priority}/`
- `src/modules/ai_seller/{services, scoring}/`
- `src/modules/leads/leadScore.service.js`
- `src/services/` (inteiro)
- `src/database/init.js`
- `src/brain/executive-report.engine.js` (apontava para TS removidos, só
  era consumido por `daily-alert.worker` desativado)

Contagem: **98 arquivos TS + 26 JS órfãos removidos** na fase de limpeza.

## Limitações atuais (honestas)

1. **`contracts`**: `contracts.service` invoca métodos que não existem em
   `contracts.repository` (`findById`, `updateStatus`, `findSaleById`,
   `getNextVersion`, `createContractRecord`, `createDraftFromPrevious`).
   Endpoints de aprovar/rejeitar/gerar contrato retornam 400 até
   reescrita do repository.
2. **Sem testes automatizados.** Zero `.test.js`, zero `.spec.js`.
3. **WhatsApp no mesmo processo**: memory leak no Baileys derruba a API.
4. **OpenAI sem retry nem circuit breaker**: um blip pausa o `ai_seller`.
5. **Sem fila persistente**: tudo in-memory (`p-queue`).
6. **Módulos além dos auditados** podem ter queries sem `dealership_id` —
   revisão ainda em andamento.
7. **brain/ contém 67 `.js`** que parecem "engines de IA". A maioria
   compõe serviços via require; comportamento real ainda é pouco
   testado. Candidatos a futura poda, mas não removidos nesta fase por
   falta de cross-check exaustivo.

## Pontos para onboard

- Quer entender o fluxo típico? Comece por
  `src/app.js` → `src/modules/leads/*` → `src/modules/whatsapp_baileys/*`.
- Quer rodar local? `npm install`, setar as 2 envs obrigatórias,
  `npm start`. O runner de migrations cria `schema_migrations`
  automaticamente.
- Quer adicionar uma migration? Crie `src/database/migrations/NNN_nome.{js,sql}`.
  O runner descobre e aplica no próximo boot.
- Quer adicionar rota nova? Monte em `src/modules/<feature>/*.routes.js`
  e registre em `src/app.js`.
