# Operacao, escala e processos

Este documento resume variaveis e processos uteis em producao.

- **Ficheiros de entrada da API (npm start) e lista de rotas ativas:** ver [ENTRYPOINTS.md](./ENTRYPOINTS.md) e `npm run start:info`.
- **Motores `src/brain` (ligados vs. arquivo/ideia):** [BRAIN-INVENTORY.md](./BRAIN-INVENTORY.md), `npm run brain:scan`.

## Processos

- **API web:** `npm start` - Express em `src/server.js`. O processo web nao roda migrations, WhatsApp ou aquecimento de IA no boot.
- **Migrations:** `npm run migrate` - execute como job/release step antes de subir a API.
- **WhatsApp:** `npm run worker:whatsapp` - processo separado para sessoes Baileys; exige `WHATSAPP_DEALERSHIP_IDS` ou `WHATSAPP_DEALERSHIP_ID`.
- **Workers BullMQ:** `npm run worker:queue` - exige `REDIS_URL`.
- **Follow-up:** `npm run worker:followup` - consome `lead_followups`.
- **IA local:** `npm run ai:warmup` - carrega modelos localmente para validar/cachear dependencias. A API carrega IA local sob demanda.
- **Plataforma TS experimental:** `npm run start:platform` esta congelado ate existir paridade real de rotas, auth e testes com a API Express.

## Redis

- **`REDIS_URL`:** opcional para a API web. Habilita store distribuido do `express-rate-limit`, fila BullMQ (`default`) e readiness Redis quando configurado.
- Sem Redis, o rate limit continua em memoria, adequado para uma unica instancia e baixo volume. Workers BullMQ continuam exigindo `REDIS_URL`.
- **`REDIS_REQUIRED=true`:** use somente quando quiser impedir readiness sem Redis.

## Postgres

- **`PG_STATEMENT_TIMEOUT_MS`:** opcional; aplica `SET statement_timeout` em cada conexao nova do pool.
- **`PG_POOL_MAX`**, **`PG_POOL_IDLE_MS`**, **`PG_POOL_CONNECT_TIMEOUT_MS`:** tuning do pool.

## Observabilidade

- Logs estruturados com **pino** (`pino-http` nas requisicoes). Nivel: **`LOG_LEVEL`**.
- **`X-Request-Id`:** repassado se o cliente enviar; caso contrario e gerado e devolvido na resposta.
- **`GET /health`:** liveness.
- **`GET /ready`:** readiness real. Valida `SELECT 1` no Postgres e, quando `REDIS_URL` existir ou `REDIS_REQUIRED=true`, exige `PING/PONG` do Redis. Retorna 503 com `checks` quando algum requisito falha.

## Qualidade

- **`npm run check:js`:** valida sintaxe dos arquivos JS em `src`, `scripts` e `test`.
- **CI:** roda `check:js`, `typecheck`, migrations/tenant SQL e testes Node com Postgres + Redis de servico.

## Desenvolvimento

- Com Redis, `ENABLE_DEV_ROUTES=true` e `DEV_ROUTES_SECRET` (≥16): `POST /api/dev/queue/ping` com header `X-Dev-Routes-Secret` enfileira um job `ping` (ver [OPERATIONS.md](./OPERATIONS.md)).
