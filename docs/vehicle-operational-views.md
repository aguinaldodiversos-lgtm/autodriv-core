# Regras das Views Operacionais de Veiculos

## Estoque

Inclui veiculos da loja que ainda fazem parte do inventario operacional:

- status diferente de `sold`;
- sem `sold_at`;
- nao arquivado/removido/deletado;
- com ou sem anuncio publicado;
- com ou sem pendencias.

## Showroom

Inclui veiculos prontos para venda ou publicacao:

- `canPublish=true` vindo do modulo de preparacao; ou
- `ad_status` em `published`, `ready_to_publish`, `active` ou `approved`.

O botao de publicar continua chamando o guard real de publicacao no backend. Estar no showroom nao libera publicacao por si so.

## Preparacao

Inclui veiculos que precisam de acao antes de vender:

- sem fotos minimas;
- sem FIPE;
- sem preco;
- sem margem calculada;
- margem negativa;
- sem descricao;
- documentacao pendente;
- preparacao pendente;
- score baixo;
- bloqueios de publicacao.

## Vendidos no mes

Inclui veiculos vendidos no mes corrente:

- `vehicles.status='sold'` ou `vehicles.sold_at` preenchido; ou
- venda em `sales` com `approval_status='approved'`.

A data considerada e `sold_at`, depois `approved_at`, depois `created_at` da venda.

## Recomendacoes

- `fix_today`: faltam fotos, FIPE ou preco.
- `publish_now`: veiculo pode publicar.
- `prioritize_sale`: pronto, score bom, margem positiva e preco competitivo.
- `stagnant_stock`: muitos dias em estoque.
- `delayed_preparation`: preparacao aberta por muito tempo.
- `margin_risk`: margem baixa ou negativa.
- `sold_result`: venda registrada e resultado comercial do mes.
