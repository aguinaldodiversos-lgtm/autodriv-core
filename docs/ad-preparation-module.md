# Modulo de Preparacao de Anuncios

## Finalidade

O modulo `src/modules/ad_preparation` responde a pergunta operacional:

> Este veiculo esta pronto para virar anuncio publico?

Ele separa cadastro bruto, preparacao do anuncio e publicacao. O veiculo pode existir no estoque incompleto, mas a publicacao passa por uma validacao de backend.

## Rotas

Todas exigem autenticacao e assinatura ativa pelo mount principal.

- `GET /api/vehicles/:vehicleId/preparation`
- `POST /api/vehicles/:vehicleId/preparation/recalculate`
- `POST /api/vehicles/:vehicleId/preparation/override`
- `GET /api/vehicles/:vehicleId/ad-score`
- `POST /api/vehicles/:vehicleId/ad-score/recalculate`
- `POST /api/vehicles/:vehicleId/suggestions/description`
- `POST /api/vehicles/:vehicleId/suggestions/price`
- `POST /api/vehicles/:vehicleId/suggestions/priority`
- `POST /api/vehicles/:vehicleId/suggestions/:suggestionId/accept`
- `POST /api/vehicles/:vehicleId/suggestions/:suggestionId/reject`
- `POST /api/vehicles/:vehicleId/publish`

## Tabelas

- `ad_preparation_checks`: checklist persistido por veiculo.
- `ad_preparation_scores`: score, grade, bloqueios, warnings e breakdown.
- `vehicle_commercial_suggestions`: sugestoes de descricao, preco e prioridade.
- `publication_overrides`: aprovacao manual auditada.

## Checklist

Categorias cobertas:

- fotos;
- FIPE e preco;
- margem;
- descricao;
- preparacao;
- documentacao.

Cada item possui `check_key`, `category`, `status`, `severity`, `required`, `weight`, valores atuais/esperados, mensagem e dica de acao.

## Score

O score vai de 0 a 100, com breakdown:

- fotos: 25 pontos;
- FIPE e preco: 20 pontos;
- margem: 15 pontos;
- descricao: 15 pontos;
- preparacao: 15 pontos;
- documentacao: 10 pontos.

Classificacao:

- `blocked`: bloqueio critico ou score menor que 40.
- `incomplete`: 40 a 59.
- `publishable_with_attention`: 60 a 74.
- `good`: 75 a 89.
- `excellent`: 90 a 100.

Score alto nao ignora bloqueio critico. `canPublish` so e verdadeiro quando nao ha bloqueios obrigatorios.

## Bloqueios de Publicacao

O backend bloqueia publicacao quando faltar:

- foto principal;
- minimo de fotos;
- preco valido;
- FIPE obrigatoria;
- margem positiva/minima;
- descricao valida;
- preparacao operacional;
- documentacao conferida;
- ausencia de restricao legal critica.

O guard tambem protege a publicacao externa existente em
`POST /api/integrations/carros-na-cidade/:vehicleId`, evitando que um portal
receba veiculo incompleto por uma rota lateral.

Erro esperado:

```json
{
  "error": "AD_NOT_READY_TO_PUBLISH",
  "message": "Este veiculo ainda possui pendencias antes da publicacao.",
  "score": 58,
  "blockingReasons": [],
  "warnings": []
}
```

## Sugestoes

As sugestoes iniciais usam provider `rule_based`:

- descricao comercial segura;
- preco considerando FIPE, custo e margem;
- prioridade comercial.

As sugestoes nao alteram dados automaticamente. A alteracao ocorre somente quando o usuario aceita a sugestao.

## Override Manual

`POST /api/vehicles/:vehicleId/preparation/override`

Regras:

- exige papel `super_admin`, `support`, `admin`, `manager` ou `gestor`;
- motivo com pelo menos 8 caracteres;
- grava `publication_overrides`;
- bloqueio legal critico so pode ser ignorado por `super_admin`.

## Variaveis

Ver tambem `docs/publication-readiness-policy.md`.

## Limitacoes

- A classificacao de foto interna depende hoje de `label` ou `notes` na imagem.
- Qualidade visual real das fotos ainda nao usa visao computacional.
- Sugestao por IA pode ser adicionada depois, mas deve continuar validada pela policy.
- A tela frontend detalhada por veiculo ainda pode ser aprofundada; o contrato backend ja esta pronto.
