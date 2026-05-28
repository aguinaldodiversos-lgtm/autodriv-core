# Fluxo CRM de Leads

## Entrada de leads

O AutoDriv recebe leads por canais diferentes:

- cadastro manual em `/api/leads`;
- fontes externas em `lead_sources`;
- inbox operacional;
- WhatsApp via worker Baileys;
- futuras integracoes de portais e formularios.

Todo lead deve ser sempre escopado por `dealership_id`.

## WhatsApp

O WhatsApp cria ou atualiza lead aberto usando:

- `dealership_id`;
- telefone normalizado;
- `source = whatsapp`;
- status aberto.

O sistema evita criar um novo lead para cada mensagem. Se existir lead aberto com o mesmo telefone na mesma loja, ele e atualizado. Se o lead estiver encerrado/arquivado, uma nova oportunidade pode ser criada em evolucao futura.

## Historico

Mensagens ficam em `lead_conversations` com:

- `direction`: `inbound` ou `outbound`;
- `channel`: `whatsapp`;
- `external_message_id`: idempotencia do provedor;
- `ai_intent` e `ai_confidence` quando processadas;
- `raw_payload` reduzido.

## Proxima acao

Quando o lead e qualificado, o sistema cria `seller_actions`:

- `confirm_vehicle_availability`;
- `simulate_financing`;
- `evaluate_trade_in`;
- `appraise_vehicle`;
- `answer_question`;
- `handle_complaint`;
- `follow_up`.

Essas acoes devem alimentar o cockpit inteligente e a rotina do vendedor.

## Handoff humano

Quando a IA identifica lead quente ou risco, ela muda:

- `leads.status = human_required`;
- `leads.ai_whatsapp_status = human_required`;
- `inbox_threads.status = waiting_seller`.

Enquanto o lead estiver em handoff, mensagens novas sao salvas, mas a IA nao responde automaticamente.

## Reabertura

Para a IA voltar a responder no futuro, um painel/admin deve alterar `ai_whatsapp_status` para `enabled` e mover o lead para um status operacional aberto. Essa retomada nao deve ser automatica enquanto houver vendedor ativo.
