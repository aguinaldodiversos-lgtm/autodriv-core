# Painel Operacional de Veiculos

## Finalidade

O painel operacional transforma a tela de veiculos em uma central diaria para o lojista decidir o que cadastrar, preparar, publicar, corrigir e vender.

O backend e a fonte da verdade para as abas. O frontend apenas consome `GET /api/vehicles?view=...`.

## Views

- `stock`: veiculos da loja que ainda nao foram vendidos, arquivados ou removidos.
- `showroom`: veiculos prontos para venda/publicacao, com score, fotos, preco, FIPE, margem e preparacao em condicao aceitavel.
- `preparation`: veiculos com pendencias de foto, FIPE, preco, margem, descricao, documentacao ou preparacao.
- `sold-month`: veiculos vendidos no mes corrente, considerando `sold_at` do veiculo ou venda aprovada em `sales`.

## Endpoint

`GET /api/vehicles`

Query params:

- `view=stock|showroom|preparation|sold-month`
- `search`
- `status`
- `brand`
- `model`
- `minPrice`
- `maxPrice`
- `minScore`
- `maxScore`
- `sort`
- `page`
- `limit`

Sorts:

- `newest`
- `oldest`
- `price_asc`
- `price_desc`
- `margin_desc`
- `score_asc`
- `score_desc`
- `days_in_stock_desc`
- `priority_desc`
- `sold_at_desc`

Sem `view`, o endpoint mantem compatibilidade e retorna o array antigo de veiculos.

## Baixa de venda

`POST /api/vehicles/:id/sell`

Payload:

```json
{
  "sold_price": 89900,
  "sold_at": "2026-05-30",
  "notes": "Venda a vista"
}
```

Efeitos:

- valida que o veiculo pertence a loja do usuario autenticado;
- impede vender o mesmo veiculo duas vezes;
- marca `vehicles.status='sold'`;
- grava `sold_at`, `sold_price`, `sold_by_user_id`, `sale_status='completed'`;
- pausa o anuncio publicado quando aplicavel;
- cria registro aprovado em `sales` para alimentar vendidos do mes.

## Retorno

Com `view`, o retorno e:

```json
{
  "data": [],
  "summary": {
    "view": "stock",
    "stockCount": 0,
    "showroomCount": 0,
    "preparationCount": 0,
    "soldMonthCount": 0,
    "attentionCount": 0,
    "blockedCount": 0,
    "readyToPublishCount": 0,
    "averageScore": 0,
    "totalExpectedMargin": 0,
    "totalRealizedMarginMonth": 0
  },
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 1
  }
}
```

## Margem

Margem prevista:

`preco - preco_compra - custos_estimados`

Custos estimados incluem:

- custo de aquisicao;
- preparacao;
- documentacao;
- transporte;
- comissao;
- outros custos.

Se preco de compra ou preco de venda estiver ausente, a margem retorna `null`.

## Dias em estoque

Para veiculos nao vendidos:

`hoje - entry_date`

Para vendidos:

`sold_at - entry_date`

Se `entry_date` nao existir, usa `created_at`.

## Recomendacoes

Tipos retornados:

- `fix_today`
- `publish_now`
- `prioritize_sale`
- `stagnant_stock`
- `delayed_preparation`
- `margin_risk`
- `sold_result`

Essas recomendacoes sao operacionais e auditaveis. Elas nao substituem o bloqueio real de publicacao, que continua no modulo `ad_preparation`.

## Segurança

- O backend sempre usa `req.user.dealership_id`.
- `dealership_id` vindo do frontend nao e aceito para filtrar a loja.
- O endpoint exige autenticacao e assinatura ativa pelas rotas de veiculos.
- A publicacao continua protegida por `POST /api/vehicles/:vehicleId/publish`.

## Limitacoes conhecidas

- A origem do lead vendido ainda depende da evolucao do fluxo de vendas/contratos.
- Exportacao de vendidos do mes ainda nao foi implementada.
