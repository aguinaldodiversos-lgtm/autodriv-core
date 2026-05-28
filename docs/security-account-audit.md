# Auditoria de segurança de contas, auth e billing

Data: 2026-05-26

## Escopo analisado

- `src/app.js`
- `src/config/env.js`
- `src/config/logger.js`
- `src/middlewares/auth.js`
- `src/middlewares/plan.middleware.js`
- `src/modules/auth/auth.controller.js`
- `src/modules/auth/auth.routes.js`
- `src/modules/subscriptions/trial.service.js`
- `src/modules/subscriptions/plan.validation.js`
- `src/modules/lead_sources/webhook.routes.js`
- `src/modules/lead_sources/leadSources.controller.js`
- `src/modules/vehicles/vehicles.routes.js`
- `src/modules/images/images.routes.js`
- `src/modules/whatsapp/whatsapp.routes.js`
- `frontend/lib/auth/session.ts`
- Migrations `003_subscriptions`, `019_fix_subscription_plan`, `020_normalize_subscriptions`

## Diagnóstico objetivo

O backend já tem boas bases: JWT com expiração de 7 dias, `JWT_SECRET` obrigatório e com tamanho mínimo, `helmet`, CORS com allowlist em produção, rate limit em `/api/auth` e demais rotas, logs estruturados com redaction de `authorization` e `cookie`, queries PostgreSQL parametrizadas nos pontos revisados, e isolamento por `dealership_id` em vários serviços.

Os principais riscos estão na mistura entre login e regra financeira, na ausência de módulo billing auditável, em respostas de auth que ajudam enumeração, no armazenamento duplicado do hash em uma coluna legada `password`, e na falta de uma camada de entitlement separada para decidir o que a loja pode usar quando o pagamento muda.

## Riscos encontrados

1. Login enumera credenciais.
   - Local: `src/modules/auth/auth.controller.js`
   - Evidência: respostas diferentes para usuário inexistente e senha inválida.
   - Risco: facilita descoberta de e-mails cadastrados e ataque direcionado.
   - Correção obrigatória: retornar mensagem uniforme para credenciais inválidas.

2. Cadastro expõe detalhes internos em erro 500.
   - Local: `src/modules/auth/auth.controller.js`
   - Evidência: resposta inclui `err.message`, `code`, `table`, `column`, `constraint`.
   - Risco: vazamento de schema, constraints e detalhes do banco.
   - Correção obrigatória: logar internamente e responder mensagem genérica.

3. Hash de senha é gravado também na coluna `password`.
   - Local: `src/modules/auth/auth.controller.js`
   - Evidência: insert usa `(password_hash, password)` com o mesmo hash.
   - Risco: confusão operacional e maior superfície de vazamento; a coluna legada deve ser lida apenas para compatibilidade.
   - Correção obrigatória: novas contas só devem gravar `password_hash`.

4. Política de senha insuficiente.
   - Local: `src/modules/auth/auth.controller.js`
   - Evidência: cadastro aceita qualquer `password` não vazio.
   - Risco: senhas fracas em contas administrativas de lojas.
   - Correção obrigatória: política mínima no backend.

5. Autenticação e billing estão acoplados.
   - Local: `src/middlewares/auth.js` e `src/app.js`
   - Evidência: `auth.withSubscription` bloqueia rotas autenticadas por status/trial antes do controller.
   - Risco: uma loja bloqueada pode perder acesso a rotas necessárias para regularizar assinatura; o login fica indiretamente acoplado a pagamento.
   - Correção obrigatória: criar `billing/access guard` separado de `auth`.

6. Billing atual é simples demais para assinatura recorrente.
   - Local: tabela `subscriptions` e `plan.middleware.js`.
   - Evidência: apenas `plan`, `status`, `current_period_end`, `mp_subscription_id`.
   - Risco: sem idempotência de webhook, sem eventos, sem pagamentos, sem status interno auditável, sem sync confirmatório com Mercado Pago.
   - Correção obrigatória: módulo `billing` com tabelas próprias e provider client.

7. Webhooks de leads aceitam token via query string.
   - Local: `src/modules/lead_sources/leadSources.controller.js`
   - Evidência: `req.query.token`.
   - Risco: token pode aparecer em logs, histórico e ferramentas de observabilidade.
   - Correção recomendada: manter compatibilidade por enquanto, mas migrar para header e expirar tokens antigos.

8. Sessão do frontend usa token em `localStorage` e cookie não `HttpOnly`.
   - Local: `frontend/lib/auth/session.ts`.
   - Evidência: `localStorage.setItem("autodriv_token", token)` e `document.cookie`.
   - Risco: XSS no frontend expõe token.
   - Correção recomendada: migrar para sessão server-side ou cookie `HttpOnly` emitido pelo backend/BFF.

9. Não há lock temporário por tentativas inválidas.
   - Local: fluxo de login.
   - Evidência: existe rate limit por IP, mas não por conta/e-mail.
   - Risco: ataques distribuídos contra a mesma conta não ficam bem contidos.
   - Correção recomendada: contador de falhas por usuário/e-mail normalizado.

## Documentação Mercado Pago confirmada

- API base e autenticação: `https://api.mercadopago.com`, com `Authorization: Bearer <ACCESS_TOKEN>` e chave privada nunca no cliente.
- Criação de assinatura: `POST /preapproval`.
- Consulta confirmatória de assinatura: `GET /preapproval/{id}`.
- Atualização/cancelamento de assinatura: `PUT /preapproval/{id}`.
- Consulta de invoices/pagamentos autorizados: `GET /authorized_payments/{id}` e `GET /authorized_payments/search`.
- Webhooks incluem `x-signature` e `x-request-id`; a validação oficial usa HMAC SHA256 no template `id:[data.id_url];request-id:[x-request-id_header];ts:[ts_header];`.

## Correções obrigatórias

- Normalizar e endurecer cadastro/login.
- Separar `auth` de `billing entitlement`.
- Criar módulo `billing` isolado com eventos idempotentes e sync confirmatório.
- Criar status internos: `trialing`, `active`, `payment_pending`, `past_due`, `grace_period`, `suspended`, `canceled`, `manual_override_active`, `manual_override_blocked`.
- Registrar webhook antes de processar e impedir processamento duplicado.
- Não ativar conta confiando apenas no payload do webhook.
- Não expor tokens Mercado Pago no frontend ou logs.

## Correções recomendadas

- Criar papel real de plataforma (`super_admin`/`support`) separado do `admin` da loja.
- Mudar o frontend para sessão `HttpOnly` em etapa futura.
- Remover gradualmente a coluna legada `users.password` após migração de dados.
- Criar lock por conta em login.
- Ampliar validação de payloads com schemas por rota.

## Plano de implementação

1. Hardening mínimo de auth: senha, erro genérico, hash só em `password_hash`, resposta uniforme de login.
2. Migration de billing: planos, assinaturas, eventos, pagamentos, entitlements e campos de status de usuário.
3. Módulo `src/modules/billing`: repository, service, controller, routes, Mercado Pago client, webhook e access guard.
4. Rotas:
   - usuário: `/api/billing/*`
   - admin plataforma: `/api/admin/billing/*`
   - webhook público: `/api/webhooks/mercado-pago`
5. Aplicar guard financeiro em ações pagas sem bloquear login, billing e leitura limitada.
6. Testes unitários/HTTP para auth, webhook idempotente, entitlement e status.
7. Documentar configuração de sandbox/produção em `docs/billing-mercado-pago.md`.
