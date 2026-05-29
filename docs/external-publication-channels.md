# Publicacao Externa de Anuncios

## Objetivo

O modulo `src/modules/integrations` controla a saida de anuncios para canais externos. Ele garante que nenhum veiculo incompleto saia para Instagram, portais ou Carros na Cidade sem passar pela esteira de preparacao do backend.

## Fluxo

1. Usuario solicita publicacao em um canal.
2. Backend recalcula `ad_preparation`.
3. Se `canPublish=false`, a tentativa fica registrada como `blocked` em `vehicle_integrations`.
4. Se `canPublish=true`, o backend monta um payload padronizado.
5. O adapter do canal envia ou prepara o payload.
6. O status final fica registrado por canal: `pending`, `published`, `prepared`, `failed` ou `blocked`.

## Rotas

- `POST /api/integrations/carros-na-cidade/:vehicleId`
- `POST /api/integrations/:channel/:vehicleId`
- `GET /api/integrations/vehicle/:vehicleId`

Canais aceitos inicialmente:

- `carros_na_cidade`
- `instagram`
- `instagram_story`
- `portal_generic`

## Payload Padronizado

O payload gerado por `publicationPayload.js` contem:

- dados do veiculo;
- preco;
- descricao;
- fotos;
- FIPE;
- readiness score;
- bloqueios e avisos;
- metadados do canal.

Esse payload e salvo em `vehicle_integrations.payload` para auditoria e replay controlado.

## Status e Erros

Campos adicionados em `vehicle_integrations`:

- `payload`;
- `status_detail`;
- `external_url`;
- `last_error`;
- `last_error_at`;
- `last_attempt_at`;
- `published_at`;
- `attempt_count`;
- `updated_at`.

Erros de publicacao ficam no proprio registro do canal. Bloqueio por anuncio incompleto usa:

```json
{
  "error": "AD_NOT_READY_TO_PUBLISH",
  "message": "Este veiculo ainda possui pendencias antes da publicacao."
}
```

## Instagram

O adapter de Instagram hoje prepara e registra payload. Ele nao finge publicacao real quando faltam credenciais ou quando o fluxo oficial Graph API ainda nao foi validado em sandbox.

Variaveis previstas:

- `INSTAGRAM_GRAPH_API_URL`
- `INSTAGRAM_BUSINESS_ACCOUNT_ID`
- `INSTAGRAM_ACCESS_TOKEN`

Antes de ativar envio real, validar em sandbox:

- conta Business/Creator;
- permissao de publicacao;
- limite de midias;
- publicacao em duas etapas, quando exigida;
- tratamento de erro por media.

## Portal Generico

O adapter `portal_generic` envia para `PORTAL_GENERIC_API_URL` com Bearer token quando configurado. Sem configuracao, registra status `prepared`.

Variaveis:

- `PORTAL_GENERIC_API_URL`
- `PORTAL_GENERIC_API_TOKEN`

## Garantias

- A publicacao externa nao depende do frontend.
- O backend recalcula a preparacao na hora.
- Tentativas bloqueadas tambem ficam auditaveis.
- Erros de canal nao apagam dados do veiculo.
- O payload salvo ajuda a diagnosticar divergencias por portal.
