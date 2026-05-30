# Fluxo proposta -> venda -> contrato

## Objetivo

Transformar uma proposta aceita em uma venda em rascunho e em um contrato em rascunho, preservando o historico comercial e evitando baixa manual do veiculo antes da aprovacao.

## Endpoint

`POST /api/proposals/:id/accept`

Payload:

```json
{
  "price": 89900,
  "payment_method": "financiamento",
  "notes": "Cliente confirmou proposta por WhatsApp."
}
```

Resposta:

```json
{
  "proposal": {},
  "sale": {},
  "contract": {}
}
```

## Regras

- A proposta precisa pertencer a loja do usuario autenticado.
- O usuario precisa ter papel comercial/autorizado: `seller`, `manager`, `admin`, `super_admin` ou `support`.
- A proposta nao pode ter sido aceita antes.
- O veiculo vinculado nao pode estar vendido.
- O preco final precisa ser positivo. Se nao for enviado no payload, o sistema usa o preco da proposta.
- A operacao roda em transacao: cria venda, cria contrato rascunho, atualiza proposta e registra historico da venda.

## Estados gerados

- `proposals.status = accepted`
- `sales.approval_status = draft`
- `contracts.status = draft`

O veiculo ainda nao e marcado como vendido nessa etapa. A baixa continua separada para evitar vender estoque antes da aprovacao comercial/contratual.

## Proxima evolucao recomendada

- Adicionar acao no contrato aprovado para concluir a venda e marcar o veiculo como vendido.
- Criar assinatura/geracao de PDF integrada ao rascunho do contrato.
- Registrar resultado da proposta no modulo de inteligencia quando o contrato for aprovado ou a venda for concluida.
