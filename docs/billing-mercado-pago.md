# Billing Mercado Pago

Data: 2026-05-26

## Objetivo

O AutoDriv usa o Mercado Pago para processar assinatura recorrente, mas a decisao de liberar ou bloquear recursos fica no backend do AutoDriv, em uma camada propria de billing e entitlements.

Login autentica identidade. Billing autoriza uso de funcionalidades pagas.

## Documentacao oficial consultada

- API base/autenticacao: `https://www.mercadopago.com.br/developers/en/reference`
- Criar assinatura: `https://www.mercadopago.com.br/developers/en/reference/online-payments/subscriptions/create-preapproval/post`
- Consultar assinatura: `https://www.mercadopago.com.br/developers/en/reference/online-payments/subscriptions/get-preapproval/get`
- Atualizar assinatura: `https://www.mercadopago.com.br/developers/en/reference/online-payments/subscriptions/update-preapproval/put`
- Consultar invoice/pagamento autorizado: `https://www.mercadopago.com.br/developers/en/reference/online-payments/subscriptions/get-authorized-payment/get`
- Buscar invoices: `https://www.mercadopago.com.br/developers/en/reference/online-payments/subscriptions/authorized-payment-search/get`
- Validar webhook: `https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/payment-notifications`

## Variaveis de ambiente

- `MERCADO_PAGO_ACCESS_TOKEN`: token privado usado somente no backend.
- `MERCADO_PAGO_PUBLIC_KEY`: chave publica, caso o frontend precise iniciar fluxo do Mercado Pago no futuro.
- `MERCADO_PAGO_WEBHOOK_SECRET`: chave secreta de Webhooks em "Suas integracoes".
- `MERCADO_PAGO_ENV`: `sandbox` ou `production`.
- `BILLING_GRACE_DAYS`: dias de tolerancia antes da suspensao total.
- `BILLING_PROVIDER`: `mercado_pago`.
- `BILLING_DEFAULT_PLAN_CODE`: plano padrao para checkout.
- `APP_PUBLIC_URL`: URL publica do frontend.
- `BILLING_SUCCESS_URL`, `BILLING_FAILURE_URL`, `BILLING_PENDING_URL`: URLs para retorno/regularizacao.

Nunca colocar `MERCADO_PAGO_ACCESS_TOKEN` no frontend.

## Tabelas criadas

- `billing_plans`: catalogo interno de planos.
- `account_subscriptions`: estado financeiro interno por loja.
- `billing_events`: eventos/webhooks recebidos, com idempotencia.
- `billing_payments`: invoices/pagamentos vinculados a assinatura.
- `plan_entitlements`: recursos habilitados por plano.

## Estados internos

- `trialing`
- `active`
- `payment_pending`
- `past_due`
- `grace_period`
- `suspended`
- `canceled`
- `manual_override_active`
- `manual_override_blocked`

## Fluxo de checkout

1. Usuario autenticado chama `POST /api/billing/checkout/subscription`.
2. Backend identifica a loja pelo token, nunca pelo payload do frontend.
3. Backend cria `external_reference` opaco com UUID e salva assinatura local como `payment_pending`.
4. Backend chama Mercado Pago em `POST /preapproval`.
5. Backend salva `provider_subscription_id`, `provider_status` e `checkout_url`.
6. Frontend redireciona o lojista para `checkout_url`.

## Fluxo de webhook

1. Mercado Pago chama `POST /api/webhooks/mercado-pago`.
2. Backend valida `x-signature` com HMAC SHA256 usando:
   - `data.id` da query string;
   - `x-request-id`;
   - `ts` do header `x-signature`.
3. Backend grava `billing_events` com `provider_event_id` unico.
4. Evento duplicado nao e processado novamente.
5. Backend consulta a API do Mercado Pago para confirmar o estado real.
6. Backend atualiza `account_subscriptions` e `billing_payments`.

Webhook invalido e registrado como `invalid_signature` e rejeitado.

## Rotas

Usuario/lojista:

- `GET /api/billing/my-subscription`
- `POST /api/billing/checkout/subscription`
- `POST /api/billing/subscription/cancel`
- `POST /api/billing/subscription/sync`
- `GET /api/billing/entitlements`

Admin plataforma:

- `GET /api/admin/billing/plans`
- `POST /api/admin/billing/plans`
- `PATCH /api/admin/billing/plans/:id`
- `GET /api/admin/subscriptions`
- `GET /api/admin/subscriptions/:id`
- `POST /api/admin/subscriptions/:id/sync`
- `POST /api/admin/subscriptions/:id/cancel`
- `POST /api/admin/subscriptions/:id/reactivate`
- `POST /api/admin/subscriptions/:id/manual-override`

Webhook publico:

- `POST /api/webhooks/mercado-pago`

## Guards de acesso

`requireBillingEntitlement(featureKey)` retorna `402 Payment Required` quando a loja nao pode usar recurso pago.

Payload:

```json
{
  "error": "PAYMENT_REQUIRED",
  "message": "Sua assinatura precisa ser regularizada para continuar usando este recurso.",
  "subscriptionStatus": "past_due",
  "canAccessBilling": true,
  "paymentUrl": "/configuracoes?tab=billing"
}
```

Aplicado inicialmente em:

- criar/editar/remover veiculo;
- gerar anuncio;
- upload de imagens;
- conectar WhatsApp.

## Como testar em sandbox

1. Configure `MERCADO_PAGO_ENV=sandbox`.
2. Configure `MERCADO_PAGO_ACCESS_TOKEN` de teste.
3. Configure `MERCADO_PAGO_WEBHOOK_SECRET` da aplicacao em Suas Integracoes.
4. Rode `npm run migrate`.
5. Configure valor real dos planos em `billing_plans`, pois a migration cria planos sem preco final de negocio.
6. Chame `POST /api/billing/checkout/subscription` autenticado.
7. Use o `checkout_url` retornado.
8. Simule pagamentos pelo ambiente de teste do Mercado Pago.
9. Confira `billing_events`, `account_subscriptions` e `billing_payments`.

## Pendencias conhecidas

- Reativacao direta via `PUT /preapproval/{id}` foi deixada como `501` ate validacao de sandbox com metodo de pagamento real; o caminho seguro hoje e novo checkout ou `manual_override`.
- O frontend ainda precisa de tela de billing para exibir `my-subscription`, abrir `checkout_url` e mostrar status.
- A sessao frontend ainda usa `localStorage`; migrar para cookie `HttpOnly` em uma fase dedicada.
- Criar lock temporario por tentativas invalidas de login.
