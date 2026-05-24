# AutoDriv Frontend/Backend Map

## Atualizacao Sprint 1

- `GET /api/auth/me` foi implementado em `src/modules/auth/auth.controller.js` para retornar `user`, `dealership`, `subscription` e `permissions`.
- `GET /api/contracts` foi implementado em `src/modules/contracts/contracts.controller.js` para listar contratos da loja autenticada com cliente, veiculo, valor e responsavel.
- `GET /api/contracts/:id` foi implementado para detalhe basico de contrato com escopo por `dealership_id`.
- `PATCH /api/intelligence/actions/:id/feedback` ja existia no backend e agora esta ligado no frontend para aceitar/ignorar recomendacoes.
- `POST /api/intelligence/actions/:id/outcome` foi criado para registrar se uma acao aceita gerou venda, resposta, proposta, agendamento, recompra ou nenhum resultado.
- `GET /api/intelligence/learning-metrics` foi criado para medir aceitacao, resultado, conversao por vendedor, conversao por tipo de acao e ROI proxy.
- Pendencias restantes: criar/editar contrato por API dedicada, gestao de usuarios/equipe e permissao dinamica caso a regra deixe de ser fixa por papel.

Auditoria feita para criação do frontend isolado em `frontend/`. O backend atual continua na raiz, com entrada em `src/server.js` e aplicação Express em `src/app.js`.

## Visão Geral

- Runtime backend: Node.js/Express.
- Entrada: `src/server.js`.
- App principal: `src/app.js`.
- Autenticação: JWT Bearer emitido por `POST /api/auth/login` e validado em `src/middlewares/auth.js`.
- Tenant: `req.user.dealership_id`, sempre recarregado da tabela `users`.
- Assinatura: a maioria das rotas montadas em `src/app.js` passa por `auth.withSubscription`; algumas rotas também chamam `auth` dentro do próprio router.
- Rotas públicas: `/health`, `/ready`, `/`, `/api`, `/api/auth/*`, `/api/public/*`, `/api/webhooks/leads/:sourceKey`.
- Segurança real: backend deve continuar validando autenticação, tenant, assinatura e papéis. O frontend apenas oculta navegação/ações por UX.

## Variáveis De Ambiente Do Backend Envolvidas

| Variável | Uso | Observação para frontend |
|---|---|---|
| `DATABASE_URL` | PostgreSQL backend | Nunca expor no frontend |
| `JWT_SECRET` | Assinatura de JWT | Nunca expor no frontend |
| `REDIS_URL` | Redis opcional para rate limit/filas | Nunca expor no frontend |
| `CORS_ORIGIN` | Liberação do domínio do frontend | Deve incluir a URL do `autodriv-frontend` |
| `OPENAI_API_KEY` | IA no backend | Nunca expor no frontend |
| `INTELLIGENCE_EXPLAIN_WITH_OPENAI` | Explicações de recomendações | Backend only |
| `CLOUDINARY_*` | Upload/imagens | Backend only |
| `CNC_API_URL`, `CNC_API_TOKEN` | Integração CarrosNaCidade | Backend only |
| `RATE_LIMIT_*`, `AUTH_RATE_LIMIT_MAX` | Limites de API | Backend only |

## Variáveis Do Frontend

| Variável | Uso | Obrigatória |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL da API backend | Sim |
| `NEXT_PUBLIC_APP_NAME` | Nome exibido | Sim |
| `NEXT_PUBLIC_ENVIRONMENT` | Ambiente | Sim |

## Autenticação, Permissões E Tenant

- `POST /api/auth/login` recebe `{ email, password }` e retorna `{ token }`.
- O token precisa ser enviado como `Authorization: Bearer <token>`.
- O backend recarrega `id`, `email`, `dealership_id` e `role` do banco a cada request autenticada.
- Papéis reais encontrados no backend: `admin`, `manager`, `seller`, `maintenance` em migrations antigas; contratos validam `seller`, `manager`, `admin`.
- Papéis desejados para frontend SaaS: `super_admin`, `admin`, `gestor`, `vendedor`, `financeiro`, `operador`, `cliente`, `auditor`, `ia_agent`. Eles são base de UI; o backend ainda precisa consolidar a regra final.
- `GET /api/auth/me` implementado para o frontend obter perfil, loja, assinatura e permissões sem depender apenas do JWT no cliente.

## Rotas Mapeadas

Status:
- pronto para uso: contrato claro e endpoint existente.
- precisa ajuste: endpoint existe, mas falta detalhe importante para tela profissional.
- ausente: necessário para frontend, mas não existe rota real.
- incerto: rota existe, mas contrato/consistência precisa ser validado em banco real.

| Método | Path | Arquivo responsável | Auth | Papel/permissão backend | Payload esperado | Resposta esperada | Status |
|---|---|---|---|---|---|---|---|
| GET | `/health` | `src/app.js` | Não | Não | - | `{ status, service }` | pronto para uso |
| GET | `/ready` | `src/app.js`, `src/health/readiness.js` | Não | Não | - | Readiness de Postgres/Redis | pronto para uso |
| POST | `/api/auth/login` | `src/modules/auth/auth.controller.js` | Não | Não | `{ email, password }` | `{ token }` | pronto para uso |
| POST | `/api/auth/register` | `src/modules/auth/auth.controller.js` | Não | Não | `{ dealership_name, name, email, password }` | `{ token, dealership, trial_ends_at }` | pronto para uso |
| GET | `/api/auth/me` | `src/modules/auth/auth.controller.js` | Bearer | Usuário autenticado | - | `{ user, dealership, subscription, permissions }` | pronto para uso |
| GET | `/api/dashboard` | `src/modules/dashboard/dashboard.controller.js` | Bearer + assinatura | Usuário autenticado | - | Métricas gerais | pronto para uso |
| GET | `/api/dashboard/operations` | `src/modules/dashboard/dashboard.controller.js` | Bearer + assinatura | Usuário autenticado | - | Cockpit com `summary_cards`, `intelligence`, `inbox`, `pipeline` | pronto para uso |
| GET | `/api/dashboard/intelligence-actions` | `src/modules/dashboard/dashboard.controller.js` | Bearer + assinatura | Usuário autenticado | - | Modelo pronto para tela de ações inteligentes | pronto para uso |
| GET | `/api/dashboard/alerts` | `src/modules/dashboard/dashboard.controller.js` | Bearer + assinatura | Usuário autenticado | - | Array de alertas | incerto |
| GET | `/api/dashboard/forecast` | `src/modules/dashboard/dashboard.controller.js` | Bearer + assinatura | Usuário autenticado | - | Previsão de vendas por estágio | pronto para uso |
| GET | `/api/clients` | `src/modules/clients/clients.controller.js` | Bearer + assinatura | Usuário autenticado | - | Array de clientes | pronto para uso |
| POST | `/api/clients` | `src/modules/clients/clients.controller.js` | Bearer + assinatura | Usuário autenticado | `{ name, phone?, email?, cpf_cnpj?, notes?, birth_date?, preferred_contact_channel?, tags? }` | Cliente criado | pronto para uso |
| PUT | `/api/clients/:id` | `src/modules/clients/clients.controller.js` | Bearer + assinatura | Usuário autenticado | Cliente completo/parcial conforme repository | Cliente atualizado | precisa ajuste |
| DELETE | `/api/clients/:id` | `src/modules/clients/clients.controller.js` | Bearer + assinatura | Usuário autenticado | - | `{ success: true }` | pronto para uso |
| GET | `/api/leads` | `src/modules/leads/leads.controller.js` | Bearer + assinatura | Usuário autenticado | Query `limit`, `offset` | Array de leads | pronto para uso |
| POST | `/api/leads` | `src/modules/leads/leads.controller.js` | Bearer + assinatura | Usuário autenticado | `{ name?, phone, email?, vehicle_id?, notes? }` | Lead criado ou duplicado encontrado | pronto para uso |
| PUT | `/api/leads/:id` | `src/modules/leads/leads.controller.js` | Bearer + assinatura | Usuário autenticado | Campos permitidos: `name`, `phone`, `email`, `vehicle_id`, `notes`, `status`, `source`, `assigned_user_id`, `score` | Lead atualizado | pronto para uso |
| DELETE | `/api/leads/:id` | `src/modules/leads/leads.controller.js` | Bearer + assinatura | Usuário autenticado | - | `{ success: true }` | pronto para uso |
| POST | `/api/leads/:id/reactivate` | `src/modules/leads/leads.controller.js` | Bearer + assinatura | Usuário autenticado | - | Lead reativado | pronto para uso |
| GET | `/api/leads/:id/score` | `src/modules/leads/leads.controller.js` | Bearer + assinatura | Usuário autenticado | - | `{ leadId, score, priorityScore, status, messageCount }` | pronto para uso |
| GET | `/api/vehicles` | `src/modules/vehicles/vehicles.controller.js` | Bearer + assinatura | Usuário autenticado | - | Array de veículos | pronto para uso |
| GET | `/api/vehicles/:id` | `src/modules/vehicles/vehicles.controller.js` | Bearer + assinatura | Usuário autenticado | - | Veículo | pronto para uso |
| POST | `/api/vehicles` | `src/modules/vehicles/vehicles.controller.js` | Bearer + assinatura | Usuário autenticado | `{ brand, model, year, price?, fipe_price?, status?, ...campos estoque }` | Veículo criado | pronto para uso |
| PUT | `/api/vehicles/:id` | `src/modules/vehicles/vehicles.controller.js` | Bearer + assinatura | Usuário autenticado | Campos de veículo; `brand`, `model`, `year` são obrigatórios após merge | Veículo atualizado | pronto para uso |
| DELETE | `/api/vehicles/:id` | `src/modules/vehicles/vehicles.controller.js` | Bearer + assinatura | Usuário autenticado | - | `{ success: true }` | pronto para uso |
| POST | `/api/vehicles/:id/apply-suggestion` | `src/modules/vehicles/vehicles.controller.js` | Bearer + assinatura | Usuário autenticado | - | Resultado de sugestão/publicação | incerto |
| GET | `/api/contracts` | `src/modules/contracts/contracts.controller.js` | Bearer + assinatura | Usuário autenticado | Query `status`, `limit` | Array de contratos com cliente, veículo, valor e responsável | pronto para uso |
| GET | `/api/contracts/:id` | `src/modules/contracts/contracts.controller.js` | Bearer + assinatura | Usuário autenticado | - | Contrato com cliente, veículo, valor e responsável | pronto para uso |
| POST | `/api/contracts/:id/send-approval` | `src/modules/contracts/contracts.controller.js` | Bearer + assinatura | Serviço valida fluxo | - | `{ success, result }` | pronto para uso |
| POST | `/api/contracts/:id/approve` | `src/modules/contracts/contracts.controller.js` | Bearer + assinatura | `manager` ou `admin` no service | - | `{ success, result }` | pronto para uso |
| POST | `/api/contracts/:id/reject` | `src/modules/contracts/contracts.controller.js` | Bearer + assinatura | `manager` ou `admin` no service | `{ reason }` | `{ success, result }` | pronto para uso |
| POST | `/api/contracts/:contractId/generate` | `src/modules/contracts/contracts.controller.js` | Bearer + assinatura | Contrato aprovado | - | `{ success, contract }` | pronto para uso |
| GET | `/api/inbox` | `src/modules/inbox/inbox.controller.js` | Bearer + assinatura | Usuário autenticado | Query `limit`, `offset`, `status`, `channel`, `assigned_user_id`, `sla` | Conversas | pronto para uso |
| GET | `/api/inbox/:threadId` | `src/modules/inbox/inbox.controller.js` | Bearer + assinatura | Usuário autenticado | - | `{ thread, messages }` | pronto para uso |
| PATCH | `/api/inbox/:threadId` | `src/modules/inbox/inbox.controller.js` | Bearer + assinatura | Usuário autenticado | `{ status?, assigned_user_id?, sla_due_at?, metadata? }` | Thread atualizada | pronto para uso |
| POST | `/api/inbox/:threadId/claim` | `src/modules/inbox/inbox.controller.js` | Bearer + assinatura | Usuário autenticado | - | Thread assumida | pronto para uso |
| POST | `/api/inbox/:threadId/send` | `src/modules/inbox/inbox.controller.js` | Bearer + assinatura | Usuário autenticado | `{ message }` | Mensagem enviada | pronto para uso |
| GET | `/api/inbox/templates` | `src/modules/inbox/inbox.controller.js` | Bearer + assinatura | Usuário autenticado | Query `channel` | Templates | pronto para uso |
| POST | `/api/inbox/templates` | `src/modules/inbox/inbox.controller.js` | Bearer + assinatura | Usuário autenticado | `{ name, body, channel?, category?, variables?, is_active? }` | Template criado/atualizado | pronto para uso |
| GET | `/api/pipeline` | `src/modules/pipeline/pipeline.controller.js` | Bearer + assinatura | Usuário autenticado | - | `{ stages, totals }` | pronto para uso |
| GET | `/api/pipeline/stages` | `src/modules/pipeline/pipeline.controller.js` | Bearer + assinatura | Usuário autenticado | - | Etapas | pronto para uso |
| POST | `/api/pipeline/stages` | `src/modules/pipeline/pipeline.controller.js` | Bearer + assinatura | Usuário autenticado | `{ key?, name, position?, color?, sla_hours?, is_won?, is_lost?, is_active? }` | Etapa criada/atualizada | pronto para uso |
| GET | `/api/pipeline/close-reasons` | `src/modules/pipeline/pipeline.controller.js` | Bearer + assinatura | Usuário autenticado | Query `type` | Motivos | pronto para uso |
| POST | `/api/pipeline/close-reasons` | `src/modules/pipeline/pipeline.controller.js` | Bearer + assinatura | Usuário autenticado | `{ type: "won"|"lost", name, is_active? }` | Motivo criado/atualizado | pronto para uso |
| PUT | `/api/pipeline/:id/stage` | `src/modules/pipeline/pipeline.controller.js` | Bearer + assinatura | Usuário autenticado | `{ stage_id? | stage_key?, close_reason_id?, close_reason_note?, next_action_at?, note? }` | Lead movido | pronto para uso |
| GET | `/api/pipeline/:id/activities` | `src/modules/pipeline/pipeline.controller.js` | Bearer + assinatura | Usuário autenticado | - | Atividades | pronto para uso |
| POST | `/api/pipeline/:id/activities` | `src/modules/pipeline/pipeline.controller.js` | Bearer + assinatura | Usuário autenticado | `{ type?, title?, description?, next_action_at?, metadata? }` | Atividade criada | pronto para uso |
| GET | `/api/intelligence/today` | `src/modules/intelligence/intelligence.controller.js` | Bearer + assinatura | Usuário autenticado | - | Recomendações do dia | pronto para uso |
| GET | `/api/intelligence/learning-metrics` | `src/modules/intelligence/intelligence.controller.js` | Bearer + assinatura | Usuário autenticado | Query `days` | Métricas de aprendizado e ROI proxy | pronto para uso |
| PATCH | `/api/intelligence/actions/:id/feedback` | `src/modules/intelligence/intelligence.controller.js` | Bearer + assinatura | Usuário autenticado | `{ status: "accepted"|"ignored" }` | Ação atualizada | pronto para uso |
| POST | `/api/intelligence/actions/:id/outcome` | `src/modules/intelligence/intelligence.controller.js` | Bearer + assinatura | Ação aceita da mesma loja | `{ outcome_type, outcome_value?, notes?, occurred_at?, metadata? }` | Resultado da ação salvo | pronto para uso |
| POST | `/api/ai-seller/message` | `src/modules/ai_seller/aiSeller.controller.js` | Bearer + assinatura | Usuário autenticado | `{ lead_id, message }` | Resposta/estado da IA | pronto para uso |
| GET | `/api/ai-settings` | `src/modules/ai_settings/aiSettings.controller.js` | Bearer + assinatura | Usuário autenticado | - | Configuração de IA | pronto para uso |
| PUT | `/api/ai-settings` | `src/modules/ai_settings/aiSettings.controller.js` | Bearer + assinatura | Usuário autenticado | Configuração de IA | Configuração atualizada | incerto |
| GET | `/api/lead-sources` | `src/modules/lead_sources/leadSources.controller.js` | Bearer + assinatura | Usuário autenticado | - | Fontes | pronto para uso |
| POST | `/api/lead-sources` | `src/modules/lead_sources/leadSources.controller.js` | Bearer + assinatura | Usuário autenticado | `{ key?, name, provider, channel?, status?, auth_token?, config? }` | Fonte criada | pronto para uso |
| PUT | `/api/lead-sources/:id` | `src/modules/lead_sources/leadSources.controller.js` | Bearer + assinatura | Usuário autenticado | Campos da fonte | Fonte atualizada | pronto para uso |
| POST | `/api/webhooks/leads/:sourceKey` | `src/modules/lead_sources/webhook.routes.js` | Token da fonte | Header `x-autodriv-webhook-token` ou query `token` | Payload externo normalizado | Lead + thread processados | pronto para uso |
| GET | `/api/after-sales/opportunities` | `src/modules/after_sales/afterSales.controller.js` | Bearer + assinatura | Usuário autenticado | Query `status`, `type` | Oportunidades | pronto para uso |
| POST | `/api/after-sales/opportunities/generate` | `src/modules/after_sales/afterSales.controller.js` | Bearer + assinatura | Usuário autenticado | - | Oportunidades geradas | pronto para uso |
| PATCH | `/api/after-sales/opportunities/:id` | `src/modules/after_sales/afterSales.controller.js` | Bearer + assinatura | Usuário autenticado | `{ status }` | Oportunidade atualizada | pronto para uso |
| GET | `/api/stock-intelligence` | `src/modules/stock_intelligence/stockIntelligence.controller.js` | Bearer + assinatura | Usuário autenticado | - | Estoque com sinais | pronto para uso |
| GET | `/api/stock-intelligence/:vehicleId` | `src/modules/stock_intelligence/stockIntelligence.controller.js` | Bearer + assinatura | Usuário autenticado | - | Inteligência do veículo | pronto para uso |
| PATCH | `/api/stock-intelligence/:vehicleId` | `src/modules/stock_intelligence/stockIntelligence.controller.js` | Bearer + assinatura | Usuário autenticado | Perfil/custos/status do estoque | Veículo + inteligência | pronto para uso |
| POST | `/api/stock-intelligence/:vehicleId/appraisals` | `src/modules/stock_intelligence/stockIntelligence.controller.js` | Bearer + assinatura | Usuário autenticado | Avaliação/checklist | Avaliação criada | pronto para uso |
| POST | `/api/stock-intelligence/:vehicleId/preparation-tasks` | `src/modules/stock_intelligence/stockIntelligence.controller.js` | Bearer + assinatura | Usuário autenticado | Tarefa de preparação | Tarefa criada/atualizada | pronto para uso |
| GET | `/api/finance` | `src/modules/finance/finance.controller.js` | Bearer + assinatura | Usuário autenticado | - | Lançamentos | pronto para uso |
| POST | `/api/finance` | `src/modules/finance/finance.controller.js` | Bearer + assinatura | Usuário autenticado | Transação | Transação criada | pronto para uso |
| PUT | `/api/finance/:id/pay` | `src/modules/finance/finance.controller.js` | Bearer + assinatura | Usuário autenticado | - | Pago | pronto para uso |
| GET | `/api/finance/summary` | `src/modules/finance/finance.controller.js` | Bearer + assinatura | Usuário autenticado | - | Resumo financeiro | pronto para uso |
| GET | `/api/proposals` | `src/modules/proposals/proposals.controller.js` | Bearer + assinatura | Usuário autenticado | - | Propostas | pronto para uso |
| POST | `/api/proposals` | `src/modules/proposals/proposals.controller.js` | Bearer + assinatura | Usuário autenticado | Proposta | Proposta criada | pronto para uso |
| PUT | `/api/proposals/:id` | `src/modules/proposals/proposals.controller.js` | Bearer + assinatura | Usuário autenticado | Proposta | Proposta atualizada | pronto para uso |
| DELETE | `/api/proposals/:id` | `src/modules/proposals/proposals.controller.js` | Bearer + assinatura | Usuário autenticado | - | Remoção | pronto para uso |
| GET | `/api/tasks` | `src/modules/tasks/tasks.controller.js` | Bearer + assinatura | Usuário autenticado | - | Tarefas | pronto para uso |
| PATCH | `/api/tasks/:id/complete` | `src/modules/tasks/tasks.controller.js` | Bearer + assinatura | Usuário autenticado | - | Tarefa concluída | pronto para uso |
| GET | `/api/public/:slug` | `src/modules/public/public.controller.js` | Não | Público | - | Loja pública | pronto para uso |
| GET | `/api/public/:slug/:vehicleSlug` | `src/modules/public/public.controller.js` | Não | Público | - | Veículo público | pronto para uso |

## Endpoints Necessários Para O Frontend Que Estão Ausentes

| Necessidade | Endpoint sugerido | Motivo |
|---|---|---|
| Criar/editar contrato | `POST /api/contracts`, `PUT /api/contracts/:id` | Hoje há apenas ações de aprovação/geração |
| Usuários/equipe | `GET /api/users` | Configurações, permissões, atribuição de leads |
| Permissões backend dinâmicas | `GET /api/auth/permissions` opcional | `/api/auth/me` já retorna permissões iniciais; endpoint separado só será necessário se a regra virar dinâmica |

## Riscos Encontrados

- A raiz do repo é backend. O frontend deve ficar 100% em `frontend/` e usar serviço separado no Render.
- `CORS_ORIGIN` precisa incluir a URL real do frontend; caso contrário o browser será bloqueado.
- `GET /api/dashboard/alerts` consulta `financial_transactions`, mas o módulo financeiro atual usa `finance_entries`; rota marcada como incerta.
- Contratos agora têm listagem e detalhe básicos; ainda falta criar/editar contrato por API dedicada.
- Algumas permissões estão em services, não centralizadas. Exemplo: contratos validam `seller`, `manager`, `admin`.
- Login retorna `{ token }`; o frontend consulta `/api/auth/me` em seguida para salvar perfil e permissões reais da sessão.
- Alguns papéis desejados pelo SaaS ainda não existem no backend. O frontend inclui base expansível, mas backend precisa validar a regra final.
- IA nunca deve ser chamada diretamente pelo frontend. O fluxo correto é frontend -> backend -> serviço/fila/worker -> resultado salvo -> frontend consulta.
