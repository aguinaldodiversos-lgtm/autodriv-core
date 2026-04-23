## Resumo

<!-- O que mudou e porquê (1–3 frases). -->

## Checklist de revisão

### Multi-tenant
- [ ] Leituras/escritas de dados de cliente usam `dealership_id` (ou equivalente) no `WHERE`/`JOIN`, não só `id`.
- [ ] Rotas testadas mentalmente (ou por teste) contra ID de outra loja → não deve vazar dados.

### Limites e performance
- [ ] Listagens novas ou alteradas têm `LIMIT` (e paginação `offset`/`cursor` quando aplicável).
- [ ] Evitar `SELECT *` em tabelas grandes sem necessidade (ou justificar no PR).

### Logs e segredos
- [ ] Sem `console.log` de tokens, passwords, `Authorization` ou payloads sensíveis.
- [ ] Erros tratados sem expor stack trace ao cliente em produção (mensagem genérica).

### Schema e deploy
- [ ] Alterações de BD só via `src/database/migrations/` (registadas em `migrate.js`).
- [ ] Variáveis novas documentadas para deploy (`env` obrigatórias em `src/config/env.js`).
- [ ] Antes do deploy: `npm run verify:env` com as mesmas variáveis do ambiente alvo (em **produção** é obrigatório `CORS_ORIGIN`; `JWT_SECRET` ≥ 32 caracteres).

### CI
- [ ] `npm run typecheck` passa localmente.
- [ ] Se tocou em SQL/migrations, considerar correr `node scripts/ci-migrate-and-tenant-check.js` com Postgres local.

## Operação (quando relevante)
- [ ] Workers em processo separado do HTTP quando possível (`npm run worker:followup`, `worker:daily-alert` + scheduler no host/orquestrador).
- [ ] WhatsApp ou jobs longos: impacto em deploy/restart descrito (idealmente fora do mesmo processo que `npm start`).
- [ ] Métricas/alertas (latência, erros, fila): N/A ou ticket de follow-up.
