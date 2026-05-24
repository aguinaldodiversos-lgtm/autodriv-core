# Inventário de `src/brain`

Ficheiros em `src/brain` crescem depressa; estes sinais evitam **volume sem entrada** no produto.

## O que significa "ligado"

**Ligado** a uma **entrada** = existe um caminho de `import`/`require` (só ficheiros em `src/brain`) a partir de:

1. `general-manager.ai.js` — usado em `src/modules/dashboard_intelligence/dashboard.routes.js` (tráfego `npm start`).
2. `executive-report.engine.js` — usado em `src/workers/daily-alert.worker.js` e internamente por `stock.engine.js` + `acquisition.engine.js` (CJS).
3. `src/app/bootstrap.ts` — imports `@/brain/*` e `require("../brain/marketing-super.engine")` / `visit-pipeline.engine` (runtime TS experimental, **não** é o mesmo que `npm start`).

Ficheiros **não** alcançáveis a partir desse fecho são tratados como **arquivo/ideia** (protótipos, motores ainda não integrados, ou cadeias mortas, e.g. `marketing-autonomous` → `campaign-generator` → `creative-ai` sem qualquer `require` externo a `src/brain`).

Sempre que existam **dois ficheiros** com o mesmo nome (`.ts` e `.js` legado), o Node em `require("./foo")` a partir de `.js` resolve para **`.js`**. O orquestrador TS importa o **`.ts`**. Cada par pode aparecer de forma distinta no grafo de análise estática; o comportamento em runtime está documentado em `revenue-intelligence.core.*`.

## Atualizar o inventário

```bash
npm run brain:scan
```

Isto listed **órfãos** (caminho de grafo, preferência de extensão alinhada com `require` a partir de `.js`). A lista não substitui julgamento humano: requires dinâmicos não aparecem.

## Antes de adicionar um ficheiro novo em `src/brain/`

- Ligue-o a **pelo menos uma** entrada (por exemplo, exporte a partir de `general-manager`, de um `require` já existente, ou de `bootstrap` se a feature for do stack TS).
- Se for **só** experimentação, prefira `docs/`, `test/` ou um ramo até existir `require` real; evite ficheiros soltos com nomes de “engine” se não houver ligação.

Ligação com entradas globais: [ENTRYPOINTS.md](./ENTRYPOINTS.md), `npm run start:info`.
