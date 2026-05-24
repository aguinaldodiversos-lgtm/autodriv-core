# Operacao, readiness e limites (API)

## Readiness: `GET /ready`

- Valida Postgres (`SELECT 1`) e, quando exigido, Redis (`PING`).
- Producao (`NODE_ENV=production`): Postgres e obrigatorio. Redis e opcional por padrao; se `REDIS_REQUIRED=true` ou `REDIS_URL` existir, o check Redis tambem deve passar. Se a instancia Redis estiver inacessivel quando exigida, a resposta e 503 com JSON estruturado em `checks`.
- Resposta: `status` `ready` ou `not_ready`, `checks.database`, `checks.redis` com `ok`, `required` e campos opcionais como `latency_ms`, `skipped` e `error`.

O load balancer orquestrador deve usar um endpoint separado para liveness (`GET /health`) e readiness (`GET /ready`), conforme a politica de deploy.

## Variaveis: proxy, CORS e rate limit

| Variavel | Uso |
|----------|-----|
| `TRUST_PROXY` | `true` ou `1` para confiar no primeiro proxy (Nginx, Cloudflare, Render, etc.) e preencher `req.ip` a partir de `X-Forwarded-For`, necessario para o `express-rate-limit` separar clientes reais. |
| `TRUST_PROXY_HOPS` | Opcional, numero de proxies. Default: `1`. |
| `REDIS_URL` | Opcional para a API web. Quando definido, habilita store distribuido do `express-rate-limit` e readiness Redis. Exigido para workers BullMQ. |
| `REDIS_REQUIRED` | Use `true` somente quando quiser bloquear readiness se Redis estiver ausente. Default: Redis opcional. |
| `CORS_ORIGIN` | Lista de origens web permitidas, separadas por virgula. Para o frontend oficial, use `https://autodriv-frontend.onrender.com`. Se omitida em producao, o backend libera essa origem padrao. Para API apenas servidor-a-servidor, use `server-to-server`, `private`, `none`, `disabled` ou `false`. |
| `RATE_LIMIT_*` | Janela e limites; ver configuracao em `src/app.js`. |

Sem `TRUST_PROXY` atras de um reverse proxy, todos os clientes podem partilhar o mesmo `req.ip` e o bucket de rate limit colapsa num unico contador. Em producao a aplicacao regista um aviso de arranque se `TRUST_PROXY` nao estiver ativo.

## Rotas de desenvolvimento: `/api/dev`

- Nunca se montam com `NODE_ENV=production`.
- Fora de producao, so se montam se `ENABLE_DEV_ROUTES=true` e `DEV_ROUTES_SECRET` tiver 16 ou mais caracteres.
- Cada pedido a `/api/*` nesse prefixo precisa do header `X-Dev-Routes-Secret`.

Isto evita expor rotas de desenvolvimento em staging por engano.

## Fila `default` (BullMQ)

- A fila com nome `default` trata, no worker, o job de exemplo `ping` e devolve `skipped` para os restantes.
- O queue define `defaultJobOptions` minimo para enfileiramento futuro; documente alteracoes de produto antes de depender disto em trafego real.

## Ordem de deploy

1. Garantir `DATABASE_URL`, `JWT_SECRET` e, atras de proxy, `TRUST_PROXY=true`.
2. Definir `CORS_ORIGIN=https://autodriv-frontend.onrender.com` quando o frontend web consumir a API. Se a variavel for omitida, essa origem padrao sera liberada em producao; para API privada/servidor-a-servidor, usar um sentinela como `server-to-server`.
3. Rodar `npm run migrate`, se aplicavel.
4. Arrancar a API.
5. O orquestrador so deve marcar a replica como pronta quando `GET /ready` devolver 200.
