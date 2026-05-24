# Entrada da API (produção) vs rasto TypeScript

## Autoritário para tráfego HTTP: `npm start`

| Passo | Ficheiro | Nota |
|-------|----------|------|
| 1 | `package.json` → `"start": "node src/server.js"` | Único processo web documentado. |
| 2 | `src/server.js` | Carrega `dotenv`, com `app` de `src/app.js`, `listen` na porta. |
| 3 | `src/app.js` | Express, middlewares, health/ready, **registo de rotas** (`mountRoutes` + `authRoutes`). |
| 4 | `src/config/*` | `db.js`, `redis.js`, `env.js`, `logger.js` — partilhados com workers. |

A superfície HTTP pública (prefixos `/api/...`, exceto `dev` em produção) está definida em `src/app.js` nas linhas do array `mountRoutes` e `app.use("/api/auth", ...)`. Para uma lista resolvida a partir do ficheiro, use `npm run start:info`.

Nada em `src/**/*.ts` é executado por `npm start` a menos que seja feita explicitamente com `npx tsx`/`tsc`+build — ver secção abaixo. Operação (readiness, `TRUST_PROXY`, rotas dev, fila): [OPERATIONS.md](./OPERATIONS.md).

## TypeScript no repositório

- `tsc --noEmit` (script `typecheck`) valida ficheiros em `include` do `tsconfig.json` (principalmente `src/**/*.ts`). Isso **não** inicia o servidor; serve qualidade/IDE.
- Rotas e bootstrap alternativos em `src/app/server.ts` e `src/app/bootstrap.ts` são o **rasto “plataforma TS”** referido no `package.json` e em `start:platform` (hoje congelado). Não confundir com a API Express de produção.

## Workers e outros processos

| Comando | Entrada | Função resumida |
|---------|---------|-----------------|
| `npm run worker:followup` | `src/workers/followup.worker.js` | Filas de follow-up |
| `npm run worker:whatsapp` | `src/workers/whatsapp.worker.js` | Baileys |
| `npm run worker:queue` | `src/workers/queue.worker.js` | BullMQ |
| `npm run daily-alert` / worker equivalente | `src/workers/daily-alert.worker.js` | Alertas (usa brain `executive-report`) |
| `npm run ai:warmup` | `src/workers/local-ai.worker.js` | Pré-aquecimento de modelos locais |
| `npm run migrate` | `src/database/migrate.js` | Aplica pendentes (ledger `schema_migrations`); [MIGRATIONS.md](./MIGRATIONS.md) |
| `npm run migrate:baseline` | `scripts/migrate-baseline.js` | Registar manifest no ledger sem executar `up` (só com critério; ver [MIGRATIONS.md](./MIGRATIONS.md)) |

## Regra prática

- **Alteração de produto na API pública** → `src/app.js` + ficheiro de rota em `src/modules/...` (CommonJS) **a não ser** que o projeto mude o contrato de entrada.
- **IA local (classificação/embed):** fonte única de comportamento: `src/infrastructure/ai/localAI.service.js` (tipos em `localAI.service.d.ts`).
- **Cérebro / motores `src/brain`:** ligação a entradas e lista de **órfãos** (análise estática): [BRAIN-INVENTORY.md](./BRAIN-INVENTORY.md) e `npm run brain:scan`.
