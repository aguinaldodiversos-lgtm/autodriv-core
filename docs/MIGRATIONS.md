# Migrations (Postgres) — ledger e operação

## Estratégia

- **Tabela** `schema_migrations` (ledger) regista o nome, checksum SHA-256 (conteúdo do ficheiro), `executed_at` e `execution_time_ms` por ficheiro aplicado.
- **Runner** (`npm run migrate`) percorre o manifest em **ordem fixa** (`src/database/migrationManifest.js`), aplica **apenas pendentes** e insere no ledger após sucesso, **numa transação por migration** (`BEGIN` / `COMMIT`); em erro faz `ROLLBACK` e a migration **não** fica registada, permitindo reexecução após correcção.
- **Reexecução segura**: a segunda (e seguintes) execução **não** corre `up()` para migrations já no ledger, desde que o checksum ficheiro coincida.
- **Alterar migrations antigas** (após aplicação) faz falhar a próxima `migrate` com checksum incompatível (comportamento desejado). Em desenvolvimento, pode desactivar: `MIGRATIONS_STRICT=0` (não recomendado em produção).
- Bases **já** migradas com o runner **antigo** (sem ledger): na primeira `migrate` o código corre os `up()`; como são em grande medida idempotentes (`IF NOT EXISTS`, etc.), o schema fica e as linhas são anexadas ao ledger. Alternativa: **baseline** (ver abaixo).

## Local

1. Garanta `DATABASE_URL` no `.env` (Postgres acessível).
2. `npm run migrate` — aplica pendentes e preenche `schema_migrations`.
3. Verificar o ledger:  
   `psql "$DATABASE_URL" -c "SELECT id, name, left(checksum,12) AS ck, executed_at, execution_time_ms FROM schema_migrations ORDER BY id;"`

## Produção (deploy)

- Correr **migrations antes** de pôr o novo código a servir tráfego (ou de forma a que a API e workers só levantem após a BD estar no rev pretendido; em deploy blue/green, alinhe a ordem com a estratégia de tráfego).
- Ordem sugerida: fazer **backup/restore** conforme a política do projeto → `npm run migrate` (com `DATABASE_URL` de produção) → arrancar API.
- Múltiplas instâncias da API: use um **único** job/lock (CI, script de release ou lock externo) para evitar concorrência em `migrate` embora, na prática, a segunda instância veja tudo “já aplicado” e no-op — o primeiro passo ainda abre risco mínimo de corrida no primeiro deploy; o ideal é serializar a migration no pipeline.

## Baseline (bases legadas a alinhar ao manifest sem reexecutar `up`)

O runner antigo corria o manifest inteiro sempre. Para marcar tudo como aplicado **sem** executar os ficheiros (apenas inserir no ledger, com checksums actuais dos ficheiros no repo):

```bash
# Despois de confirmar que o schema reflete a última evolução pretendida
npm run migrate:baseline
```

**Risco:** se o banco real não tiver tabelas/colunas que o manifest criaria, aplicações futuras podem assumir o schema e falhar. Só use se tiver a certeza (ou se puder alinhar com um `npm run migrate` completo noutro ambiente equivalente). Depois, `npm run migrate` aplica **só** ficheiros novos.

**Detecção:** um banco “antigo” sem `schema_migrations` e com `dealerships` (etc.) pode adoptar: (A) `npm run migrate` normal — corre todos os `up()` (idempotentes) e lenta a primeira vez; (B) `migrate:baseline` se estiver 100% alinhado e quiser pular a execução.

## Testes

- Unitários: `node --test test/migration-runner.test.js` (mocks, sem BD).
- Integração: Postgres **descartável**; `MIGRATION_TEST_URL=postgresql://.../db` (o teste usa `DROP SCHEMA public CASCADE` — **não** use a BD de desenvolvimento partilhada). Com URL definida, o teste de integração aplica o manifest, valida a segunda passagem e o ledger.

## Ficheiros

| Ficheiro | Papel |
|----------|--------|
| `src/database/migrationManifest.js` | Lista única de `require` das migrations |
| `src/database/migrationRunnerCore.js` | Ledger, transaccões, baseline |
| `src/database/migrate.js` | CLI: `node src/database/migrate.js` / `npm run migrate` |
| `scripts/migrate-baseline.js` | `npm run migrate:baseline` |

Não apagar migrations antigas; adicionar sempre novas com prefixo numérico sequencial no manifest.
