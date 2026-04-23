# Operação, escala e processos

Este documento resume variáveis e processos úteis em produção (ex.: Render).

## Processos

- **API web:** `npm start` — Express em `src/server.js`.
- **Plataforma TS (experimental):** `npm run start:platform` — não espelha todas as rotas Express; use para eventos/orquestração conforme o README do pacote.
- **Workers BullMQ (filas):** `npm run worker:queue` — exige `REDIS_URL`. Escale como processo separado da API.
- **Outros workers:** `worker:followup`, `worker:daily-alert`.

## Redis

- **`REDIS_URL`:** habilita store distribuído do `express-rate-limit` e a fila BullMQ (`default`).
- Sem Redis, o rate limit continua em memória (adequado só a uma instância).

## Postgres

- **`PG_STATEMENT_TIMEOUT_MS`:** opcional; aplica `SET statement_timeout` em cada conexão nova do pool.
- **`PG_POOL_MAX`**, **`PG_POOL_IDLE_MS`**, **`PG_POOL_CONNECT_TIMEOUT_MS`:** tuning do pool (ver `src/config/db.js`).

## API só HTTP (sem WhatsApp na mesma instância)

- **`API_SKIP_WHATSAPP=true`** — não chama o bootstrap Baileys no arranque; útil para réplicas “só API” ou ambientes sem sessão WhatsApp.

## Observabilidade

- Logs estruturados com **pino** (`pino-http` nas requisições). Nível: **`LOG_LEVEL`** (ex.: `info`, `debug`).
- **`X-Request-Id`:** repassado se o cliente enviar; caso contrário é gerado e devolvido na resposta.
- **`GET /health`:** liveness (processo vivo).
- **`GET /ready`:** readiness (`SELECT 1` no banco; 503 se indisponível).

## Desenvolvimento

- Com Redis: `POST /api/dev/queue/ping` (somente fora de `NODE_ENV=production`) enfileira um job `ping` para validar worker + fila.
