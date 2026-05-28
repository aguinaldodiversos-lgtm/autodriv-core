# Politica de Prontidao Para Publicacao

## Objetivo

A publicacao de anuncio no AutoDriv nao deve depender apenas da tela. O backend e a fonte da verdade para decidir se um veiculo pode ou nao virar anuncio publico.

O modulo `src/modules/ad_preparation` centraliza essa decisao com:

- checklist operacional;
- score de 0 a 100;
- bloqueios obrigatorios;
- warnings nao bloqueantes;
- sugestoes comerciais;
- override manual auditado.

## Fluxo

1. O veiculo e cadastrado no estoque, mesmo incompleto.
2. O lojista completa fotos, FIPE, preco, custos, preparacao, documentacao e descricao.
3. O backend recalcula `GET/POST /api/vehicles/:vehicleId/preparation`.
4. A publicacao chama `adPreparation.assertCanPublish`.
5. Se houver bloqueio obrigatorio, retorna `AD_NOT_READY_TO_PUBLISH`.
6. Se estiver pronto, o backend atualiza o status do veiculo e registra anuncio publicado.

Integracoes externas, como Carros na Cidade, tambem devem chamar o mesmo guard
antes de enviar qualquer payload para fora do AutoDriv.

## Status

Status de anuncio/preparacao usados no backend:

- `draft`: cadastro ainda bruto.
- `blocked_incomplete`: faltam itens obrigatorios.
- `needs_review`: publicavel com atencao ou exige revisao operacional.
- `ready_to_publish`: pronto para publicar.
- `published`: publicado.
- `paused`: pausado.
- `archived`: arquivado.

## Checklist Minimo

### Fotos

Bloqueia quando:

- nao ha foto principal;
- ha menos que `AD_PREP_MIN_PHOTOS_TO_PUBLISH`.

Melhora score quando:

- possui 8 ou mais fotos;
- possui foto interna/painel identificada por label ou notes.

### FIPE e Preco

Bloqueia quando:

- FIPE e obrigatoria e esta ausente;
- preco de venda esta ausente ou zero.

Gera warning quando:

- FIPE esta sem mes de referencia;
- preco esta muito acima ou muito abaixo da FIPE.

### Margem

Bloqueia quando:

- custo de compra esta ausente;
- margem nao pode ser calculada;
- margem fica abaixo do minimo configurado;
- margem fica negativa.

### Descricao

Bloqueia quando:

- descricao esta ausente;
- descricao esta curta demais;
- descricao contem promessa indevida.

Termos bloqueados incluem promessa de credito aprovado, garantia total sem base, unico dono, cautelar aprovada, sem leilao/sinistro e menor preco da regiao.

### Preparacao

Bloqueia quando:

- `AD_PREP_REQUIRE_PREPARATION_CHECK=true` e a preparacao nao esta concluida;
- existem tarefas de preparacao pendentes ou em reparo.

### Documentacao

Bloqueia quando:

- `AD_PREP_REQUIRE_DOCUMENTATION_CHECK=true` e documentacao nao foi conferida;
- ha restricao legal critica.

Restricao legal critica nao deve ser ignorada por gerente comum.

## Score

Pesos:

- fotos: 25;
- FIPE e preco: 20;
- margem: 15;
- descricao: 15;
- preparacao: 15;
- documentacao: 10.

Grades:

- `blocked`: existe bloqueio ou score menor que 40;
- `incomplete`: 40 a 59;
- `publishable_with_attention`: 60 a 74;
- `good`: 75 a 89;
- `excellent`: 90 a 100.

Score alto nunca libera publicacao quando existe bloqueio obrigatorio.

## Override Manual

O override:

- exige usuario com papel `super_admin`, `support`, `admin`, `manager` ou `gestor`;
- exige motivo com pelo menos 8 caracteres;
- grava `publication_overrides`;
- reprocessa o checklist;
- fica auditavel por usuario, data, motivo e bloqueios ignorados.

Bloqueio legal/documental critico so pode ser ignorado por `super_admin`.

## Variaveis

```env
AD_PREP_MIN_PHOTOS_TO_PUBLISH=4
AD_PREP_IDEAL_PHOTOS_COUNT=10
AD_PREP_MIN_DESCRIPTION_LENGTH=120
AD_PREP_MAX_DESCRIPTION_LENGTH=1200
AD_PREP_MIN_GROSS_MARGIN_PERCENT=5
AD_PREP_MIN_NET_MARGIN_AMOUNT=0
AD_PREP_MAX_PRICE_ABOVE_FIPE_PERCENT=20
AD_PREP_MAX_PRICE_BELOW_FIPE_PERCENT_WITHOUT_REVIEW=35
AD_PREP_FIPE_MAX_AGE_DAYS=45
AD_PREP_REQUIRE_FIPE_TO_PUBLISH=true
AD_PREP_REQUIRE_DOCUMENTATION_CHECK=true
AD_PREP_REQUIRE_PREPARATION_CHECK=true
```

## Limitacoes Conhecidas

- A qualidade visual das fotos ainda e inferida por quantidade e metadados, nao por visao computacional.
- A sugestao de descricao e preco inicial e rule-based; IA pode ser adicionada depois com validacao da mesma policy.
- Integracoes com Instagram e portais devem chamar este guard antes de publicar fora do AutoDriv.
