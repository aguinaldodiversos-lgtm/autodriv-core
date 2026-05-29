# Modulo de Avaliacao e Troca

## Objetivo

O modulo `src/modules/trade_appraisals` cria a esteira de avaliacao do carro do cliente antes de ele virar estoque ou entrar como parte de pagamento em uma proposta.

Ele conecta:

- lead;
- vendedor;
- FIPE/mercado;
- custos de reparo;
- margem desejada;
- oferta sugerida;
- conversao para estoque.

## Rotas

Todas exigem autenticacao e assinatura ativa.

- `GET /api/trade-appraisals`
- `POST /api/trade-appraisals`
- `GET /api/trade-appraisals/:id`
- `PATCH /api/trade-appraisals/:id`
- `POST /api/trade-appraisals/:id/recalculate`
- `POST /api/trade-appraisals/:id/offer`
- `POST /api/trade-appraisals/:id/accept`
- `POST /api/trade-appraisals/:id/reject`
- `POST /api/trade-appraisals/:id/convert-to-stock`

## Status

- `pending`: avaliacao criada com dados minimos.
- `in_review`: vendedor/gestor esta avaliando.
- `offered`: oferta foi enviada/registrada.
- `accepted`: cliente aceitou a oferta.
- `rejected`: cliente recusou ou loja recusou.
- `converted`: virou veiculo no estoque.
- `archived`: encerrada sem acao.

## Calculo de Oferta

O calculo fica em `tradeAppraisals.pricing.js` e usa:

- FIPE;
- preco medio de mercado;
- preco esperado de revenda;
- nota de condicao;
- custo de reparo;
- custo documental;
- margem desejada.

O retorno salva `suggested_offer_price`, `min_offer_price`, `max_offer_price` e `pricing_breakdown`.

## Integracao com Vendedor

Ao criar uma avaliacao, o backend cria uma `seller_action` do tipo `trade_in_evaluation`, para o cockpit/inbox exibir que ha um carro de cliente para avaliar.

## Conversao Para Estoque

Somente avaliacao `accepted` pode ser convertida. A conversao cria um registro em `vehicles` com:

- origem `trade_in`;
- preco de compra como oferta final/sugerida;
- custos estimados de preparacao/documentacao;
- status de estoque `available`;
- anuncio ainda em `draft`.

## Limitacoes

- Ainda nao ha upload especifico de fotos da avaliacao de troca.
- Ainda nao ha aprovacao gerencial por faixa de valor.
- Ainda nao ha vinculo automatico com proposta/contrato de compra do carro novo.
- O modulo ainda nao consulta FIPE automaticamente; ele consome os valores informados pelo backend/frontend.
