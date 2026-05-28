# WhatsApp AI - Pre-atendimento controlado

## Objetivo

O modulo `src/modules/whatsapp_ai` atua como pre-atendente comercial para mensagens recebidas pelo WhatsApp. Ele captura o lead, classifica a intencao, salva historico, calcula score, gera acao para vendedor e decide se pode responder com roteiro controlado ou se precisa encaminhar para humano.

Ele nao e um chatbot livre. O fluxo nao negocia preco final, nao promete aprovacao de financiamento, nao confirma disponibilidade sem vendedor, nao reserva veiculo e nao faz avaliacao final.

## Arquitetura atual

- WhatsApp usa Baileys em `src/modules/whatsapp_baileys`.
- O worker e iniciado por `npm run worker:whatsapp`.
- As lojas atendidas pelo worker vem de `WHATSAPP_DEALERSHIP_IDS` ou `WHATSAPP_DEALERSHIP_ID`.
- A entrada real passa por `src/modules/whatsapp/whatsapp.service.js`.
- O novo pipeline chama `whatsappAi.processInboundMessage`.
- O historico continua em `lead_conversations`.
- O inbox continua em `inbox_threads`.
- O lead continua em `leads`.
- A proxima acao comercial fica em `seller_actions`.

## Fluxo inbound

1. Recebe mensagem do Baileys.
2. Valida `dealership_id`, telefone e texto.
3. Normaliza telefone.
4. Busca ou cria lead ativo de WhatsApp.
5. Cria/atualiza thread do inbox.
6. Salva mensagem inbound com `provider_message_id`.
7. Se a mensagem ja existe, nao responde novamente.
8. Verifica opt-out.
9. Se humano ja assumiu, salva historico e nao responde.
10. Classifica intencao.
11. Calcula score auditavel.
12. Atualiza lead.
13. Decide resposta automatica, acao de vendedor ou handoff.
14. Valida a resposta pela policy antes de enviar.
15. Salva outbound e envia pelo WhatsApp quando permitido.
16. Registra evento em `whatsapp_ai_events`.

## Intencoes

- `BUY_INTENT`: interesse de compra.
- `TRADE_IN`: troca.
- `FINANCING`: financiamento.
- `APPRAISAL`: avaliacao/venda do veiculo do cliente.
- `GENERAL_QUESTION`: duvida operacional.
- `SUPPORT_OR_POST_SALE`: suporte, reclamacao ou pos-venda.
- `UNKNOWN`: indefinida.

## Escalacao para humano

Escala quando:

- cliente pede vendedor, atendente, ligacao ou humano;
- ha suporte, reclamacao ou pos-venda;
- score atinge `WHATSAPP_AI_ESCALATION_SCORE`;
- confianca fica abaixo de `WHATSAPP_AI_LOW_CONFIDENCE_THRESHOLD`;
- intencao indefinida passa do limite;
- limite de mensagens automaticas por lead e atingido;
- ha sinal quente como visita hoje, proposta, menor valor, financiamento ou troca.

Ao escalar:

- `leads.status = human_required`;
- `leads.ai_whatsapp_status = human_required`;
- `inbox_threads.status = waiting_seller`;
- cria `seller_actions`;
- envia mensagem curta de transicao se auto-reply estiver ativo.

## Lead score

Pontuacao simples:

- +30 veiculo especifico.
- +25 pergunta preco/menor valor.
- +25 quer visitar loja.
- +25 financiamento.
- +20 entrada informada.
- +20 troca.
- +20 avaliacao.
- +15 resposta de qualificacao.
- +10 localizacao ou horario.
- -20 baixa confianca.
- -30 indefinida persistente.
- -50 opt-out.

Classificacao:

- 0-29: frio.
- 30-59: morno.
- 60-79: quente.
- 80-100: muito quente.

## Politica de resposta

A resposta automatica e bloqueada se contiver:

- aprovacao de credito garantida;
- desconto/preco inventado;
- disponibilidade confirmada sem fonte real;
- reserva do veiculo;
- pedido de dado sensivel;
- link nao autorizado;
- mais de 400 caracteres.

Quando a policy bloqueia uma resposta, o sistema usa mensagem segura ou handoff.

## Opt-out

Palavras como `parar`, `cancelar`, `nao quero`, `remover`, `sair` e `descadastrar` encerram resposta automatica.

O lead recebe:

- `opted_out_at`;
- `ai_whatsapp_status = opted_out`;
- `status = archived`;
- thread fechada.

## Variaveis de ambiente

```env
WHATSAPP_DEALERSHIP_IDS=1,2
WHATSAPP_AI_ENABLED=true
WHATSAPP_AI_AUTO_REPLY_ENABLED=true
WHATSAPP_AI_HANDOFF_ENABLED=true
WHATSAPP_AI_MAX_AUTO_MESSAGES=5
WHATSAPP_AI_ESCALATION_SCORE=70
WHATSAPP_AI_LOW_CONFIDENCE_THRESHOLD=0.65
WHATSAPP_AI_UNKNOWN_RETRY_LIMIT=1
WHATSAPP_AI_BUSINESS_HOURS_ONLY=false
WHATSAPP_AI_REPLY_DELAY_SECONDS=0
WHATSAPP_AI_HANDOFF_MESSAGE=Perfeito, vou encaminhar voce para um vendedor continuar o atendimento com mais precisao.
```

## Rotas administrativas

Todas exigem autenticação e papel `super_admin`, `support`, `admin` ou `manager`.

- `GET /api/admin/whatsapp-ai/settings`
- `PATCH /api/admin/whatsapp-ai/settings`
- `POST /api/admin/whatsapp-ai/test-classify`
- `POST /api/admin/whatsapp-ai/test-reply`

## Teste local sem WhatsApp real

Use as rotas de teste para validar classificacao e resposta:

```bash
curl -X POST https://autodriv-core.onrender.com/api/admin/whatsapp-ai/test-classify \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Tenho interesse no Civic 2020 e quero visitar hoje"}'
```

## Riscos conhecidos

- O envio real depende de sessao Baileys conectada no worker.
- O modulo usa classificador deterministico controlado; OpenAI pode ser adicionada depois como provider, mas sempre atras da mesma policy.
- Nao existe painel dedicado para `seller_actions`; os dados ja ficam prontos para o cockpit/inbox consumir.
- Transcricao de audio ainda nao foi implementada; audio sem texto deve virar `UNKNOWN` quando suportado.
