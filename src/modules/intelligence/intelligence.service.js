const pool = require("../../config/db");
const repository = require("./intelligence.repository");
const { explainActions } = require("./explanation.service");
const afterSalesService = require("../after_sales/afterSales.service");

function priorityLabel(score) {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function impactLabel(value) {
  const numeric = Number(value || 0);
  if (numeric >= 50000) return "very_high";
  if (numeric >= 15000) return "high";
  if (numeric >= 3000) return "medium";
  return "operational";
}

function actionDefaults(type) {
  const map = {
    lead_followup: {
      impact_area: "sales",
      expected_outcome: "reply",
      recommended_channel: "whatsapp"
    },
    visit_confirmation: {
      impact_area: "sales",
      expected_outcome: "appointment",
      recommended_channel: "whatsapp"
    },
    lead_assignment: {
      impact_area: "team",
      expected_outcome: "reply",
      recommended_channel: "crm"
    },
    stock_action: {
      impact_area: "stock",
      expected_outcome: "sale",
      recommended_channel: "stock"
    },
    price_adjustment: {
      impact_area: "stock",
      expected_outcome: "sale",
      recommended_channel: "stock"
    },
    stock_margin: {
      impact_area: "finance",
      expected_outcome: "sale",
      recommended_channel: "stock"
    },
    ad_quality: {
      impact_area: "marketing",
      expected_outcome: "reply",
      recommended_channel: "ads"
    },
    stock_preparation: {
      impact_area: "stock",
      expected_outcome: "sale",
      recommended_channel: "stock"
    },
    inbox_reply: {
      impact_area: "sales",
      expected_outcome: "reply",
      recommended_channel: "inbox"
    },
    inbox_claim: {
      impact_area: "team",
      expected_outcome: "reply",
      recommended_channel: "inbox"
    },
    proposal_close: {
      impact_area: "sales",
      expected_outcome: "proposal",
      recommended_channel: "whatsapp"
    },
    after_sales: {
      impact_area: "retention",
      expected_outcome: "repurchase",
      recommended_channel: "whatsapp"
    },
    seller_attention: {
      impact_area: "team",
      expected_outcome: "reply",
      recommended_channel: "crm"
    },
    overdue_task: {
      impact_area: "operations",
      expected_outcome: "no_result",
      recommended_channel: "crm"
    },
    finance_overdue_receivable: {
      impact_area: "finance",
      expected_outcome: "no_result",
      recommended_channel: "phone"
    },
    finance_due_expense: {
      impact_area: "finance",
      expected_outcome: "no_result",
      recommended_channel: "finance"
    },
    finance_cash_risk: {
      impact_area: "finance",
      expected_outcome: "no_result",
      recommended_channel: "finance"
    },
    vehicle_cost_leak: {
      impact_area: "finance",
      expected_outcome: "sale",
      recommended_channel: "stock"
    }
  };

  return map[type] || {
    impact_area: "operations",
    expected_outcome: "no_result",
    recommended_channel: "crm"
  };
}

function action(input) {
  const priority_score = Math.max(0, Math.min(100, Math.round(input.score)));
  const defaults = actionDefaults(input.type);
  const impact_estimate = input.impactEstimate ?? input.evidence?.impact_estimate ?? null;

  return {
    action_key: input.key,
    type: input.type,
    entity_type: input.entityType,
    entity_id: input.entityId,
    priority_score,
    priority_label: priorityLabel(priority_score),
    reason: input.reason,
    suggested_action: input.suggestedAction,
    evidence: input.evidence || {},
    impact_area: input.impactArea || defaults.impact_area,
    impact_label: input.impactLabel || impactLabel(impact_estimate),
    impact_estimate,
    urgency_label: input.urgencyLabel || priorityLabel(priority_score),
    expected_outcome: input.expectedOutcome || defaults.expected_outcome,
    recommended_channel: input.recommendedChannel || defaults.recommended_channel
  };
}

function hoursSince(value) {
  if (!value) return null;
  const at = new Date(value).getTime();
  if (!Number.isFinite(at)) return null;
  return Math.max(0, (Date.now() - at) / (1000 * 60 * 60));
}

function daysUntil(value) {
  if (!value) return null;
  const at = new Date(value).getTime();
  if (!Number.isFinite(at)) return null;
  return Math.ceil((at - Date.now()) / (1000 * 60 * 60 * 24));
}

async function leadActions(dealershipId) {
  const { rows } = await pool.query(
    `SELECT
        l.id,
        COALESCE(l.name, l.client_name, 'Lead') AS name,
        l.status,
        l.created_at,
        COALESCE(l.score, 0) AS score,
        COALESCE(l.priority_score, 0) AS priority_score,
        l.assigned_user_id,
        s.stage,
        s.visit_scheduled_at,
        MAX(c.created_at) AS last_interaction_at
     FROM leads l
     LEFT JOIN lead_ai_state s
       ON s.lead_id = l.id
      AND s.dealership_id = l.dealership_id
     LEFT JOIN lead_conversations c
       ON c.lead_id = l.id
      AND c.dealership_id = l.dealership_id
     WHERE l.dealership_id = $1
       AND COALESCE(l.status, 'new') NOT IN ('won', 'lost')
     GROUP BY l.id, s.stage, s.visit_scheduled_at
     ORDER BY COALESCE(l.priority_score, l.score, 0) DESC, l.updated_at DESC
     LIMIT 30`,
    [dealershipId]
  );

  const actions = [];
  for (const lead of rows) {
    const staleHours =
      hoursSince(lead.last_interaction_at) ?? hoursSince(lead.created_at) ?? 999;
    const score = Number(lead.priority_score || lead.score || 0);

    if (score >= 70 && staleHours >= 2) {
      actions.push(
        action({
          key: `lead:${lead.id}:hot-followup`,
          type: "lead_followup",
          entityType: "lead",
          entityId: lead.id,
          score: Math.min(100, score + Math.min(20, staleHours)),
          reason: `Lead quente sem interacao recente (${Math.round(staleHours)}h)`,
          suggestedAction: "Chamar o lead no WhatsApp ou ligar agora",
          impactEstimate: null,
          evidence: {
            lead_id: lead.id,
            lead_name: lead.name,
            score,
            stage: lead.stage,
            hours_since_last_interaction: Math.round(staleHours)
          }
        })
      );
    }

    if (lead.stage === "visit_scheduled") {
      actions.push(
        action({
          key: `lead:${lead.id}:confirm-visit`,
          type: "visit_confirmation",
          entityType: "lead",
          entityId: lead.id,
          score: 82,
          reason: "Lead com visita marcada precisa confirmacao ativa",
          suggestedAction: "Confirmar presenca e preparar o veiculo antes da visita",
          impactEstimate: null,
          evidence: {
            lead_id: lead.id,
            lead_name: lead.name,
            visit_scheduled_at: lead.visit_scheduled_at
          }
        })
      );
    }

    if (!lead.assigned_user_id && score >= 40) {
      actions.push(
        action({
          key: `lead:${lead.id}:assign-seller`,
          type: "lead_assignment",
          entityType: "lead",
          entityId: lead.id,
          score: 68,
          reason: "Lead sem vendedor responsavel",
          suggestedAction: "Atribuir o lead ao vendedor com menor carga hoje",
          evidence: {
            lead_id: lead.id,
            lead_name: lead.name,
            score
          }
        })
      );
    }
  }

  return actions;
}

async function stockActions(dealershipId) {
  const { rows } = await pool.query(
    `SELECT
        id,
        title,
        brand,
        model,
        price,
        fipe_price,
        purchase_price,
        acquisition_cost,
        preparation_cost_actual,
        preparation_cost_estimate,
        preparation_status,
        ad_quality_score,
        ad_status,
        COALESCE(entry_date, created_at) AS entry_date,
        FLOOR(EXTRACT(EPOCH FROM (NOW() - COALESCE(entry_date, created_at))) / 86400)::int AS days_in_stock
     FROM vehicles
     WHERE dealership_id = $1
       AND status = 'available'
     ORDER BY COALESCE(entry_date, created_at) ASC
     LIMIT 50`,
    [dealershipId]
  );

  const actions = [];
  for (const vehicle of rows) {
    const days = Number(vehicle.days_in_stock || 0);
    const price = Number(vehicle.price || 0);
    const fipe = Number(vehicle.fipe_price || 0);
    const purchase = Number(vehicle.purchase_price || 0);
    const totalCost =
      purchase +
      Number(vehicle.acquisition_cost || 0) +
      Math.max(
        Number(vehicle.preparation_cost_actual || 0),
        Number(vehicle.preparation_cost_estimate || 0)
      );
    const fipeDiff = fipe > 0 ? ((price - fipe) / fipe) * 100 : null;
    const projectedMargin = price > 0 && totalCost > 0 ? price - totalCost : null;
    const adQuality = Number(vehicle.ad_quality_score || 0);

    if (days >= 60) {
      actions.push(
        action({
          key: `vehicle:${vehicle.id}:aging-stock`,
          type: "stock_action",
          entityType: "vehicle",
          entityId: vehicle.id,
          score: Math.min(100, 55 + Math.floor(days / 3)),
          reason: `Veiculo parado ha ${days} dias no estoque`,
          suggestedAction: "Revisar preco, fotos e criar campanha de giro",
          impactEstimate: projectedMargin != null ? Math.max(projectedMargin, price * 0.05) : price * 0.05,
          evidence: {
            vehicle_id: vehicle.id,
            title: vehicle.title,
            days_in_stock: days,
            price,
            fipe_price: fipe || null
          }
        })
      );
    }

    if (fipeDiff != null && fipeDiff >= 8) {
      actions.push(
        action({
          key: `vehicle:${vehicle.id}:price-above-fipe`,
          type: "price_adjustment",
          entityType: "vehicle",
          entityId: vehicle.id,
          score: Math.min(100, 60 + fipeDiff * 2),
          reason: `Preco ${Math.round(fipeDiff)}% acima da FIPE`,
          suggestedAction: "Avaliar reducao de preco ou reforcar diferenciais do veiculo",
          impactEstimate: price > 0 ? price * 0.03 : null,
          evidence: {
            vehicle_id: vehicle.id,
            title: vehicle.title,
            price,
            fipe_price: fipe,
            fipe_difference_percent: Number(fipeDiff.toFixed(1))
          }
        })
      );
    }

    if (projectedMargin != null && projectedMargin < 0) {
      actions.push(
        action({
          key: `vehicle:${vehicle.id}:negative-margin`,
          type: "stock_margin",
          entityType: "vehicle",
          entityId: vehicle.id,
          score: 92,
          reason: "Margem projetada negativa no estoque",
          suggestedAction: "Bloquear desconto e revisar custo/preco antes de negociar",
          impactEstimate: Math.abs(projectedMargin),
          evidence: {
            vehicle_id: vehicle.id,
            title: vehicle.title,
            price,
            projected_cost: totalCost,
            projected_margin: projectedMargin
          }
        })
      );
    }

    if (adQuality > 0 && adQuality < 60) {
      actions.push(
        action({
          key: `vehicle:${vehicle.id}:bad-ad-quality`,
          type: "ad_quality",
          entityType: "vehicle",
          entityId: vehicle.id,
          score: 74,
          reason: `Anuncio com qualidade baixa (${adQuality}/100)`,
          suggestedAction: "Melhorar fotos, descricao e dados obrigatorios do anuncio",
          impactEstimate: price > 0 ? price * 0.02 : null,
          evidence: {
            vehicle_id: vehicle.id,
            title: vehicle.title,
            ad_quality_score: adQuality,
            ad_status: vehicle.ad_status
          }
        })
      );
    }

    if (vehicle.preparation_status && vehicle.preparation_status !== "done" && days >= 7) {
      actions.push(
        action({
          key: `vehicle:${vehicle.id}:preparation-delay`,
          type: "stock_preparation",
          entityType: "vehicle",
          entityId: vehicle.id,
          score: 66,
          reason: "Preparacao do veiculo ainda pendente",
          suggestedAction: "Concluir preparacao para liberar fotos finais e venda ativa",
          impactEstimate: price > 0 ? price * 0.03 : null,
          evidence: {
            vehicle_id: vehicle.id,
            title: vehicle.title,
            preparation_status: vehicle.preparation_status,
            days_in_stock: days
          }
        })
      );
    }
  }

  return actions;
}

async function inboxActions(dealershipId) {
  const { rows } = await pool.query(
    `SELECT
       t.id,
       t.lead_id,
       t.channel,
       t.status,
       t.assigned_user_id,
       t.sla_due_at,
       t.last_message_at,
       t.unread_count,
       COALESCE(l.name, l.client_name, 'Lead') AS lead_name,
       COALESCE(l.priority_score, l.score, 0) AS lead_score
     FROM inbox_threads t
     LEFT JOIN leads l ON l.id = t.lead_id
     WHERE t.dealership_id = $1
       AND t.status IN ('open', 'waiting_seller')
     ORDER BY t.sla_due_at ASC NULLS LAST, t.last_message_at DESC NULLS LAST
     LIMIT 50`,
    [dealershipId]
  );

  const actions = [];
  for (const thread of rows) {
    const overdue = thread.sla_due_at && new Date(thread.sla_due_at) < new Date();
    const unread = Number(thread.unread_count || 0);
    const leadScore = Number(thread.lead_score || 0);

    if (overdue || unread > 0) {
      actions.push(
        action({
          key: `inbox:${thread.id}:reply`,
          type: "inbox_reply",
          entityType: "inbox_thread",
          entityId: thread.id,
          score: Math.min(100, (overdue ? 80 : 55) + Math.min(15, unread * 3) + Math.floor(leadScore / 10)),
          reason: overdue ? "Atendimento com SLA vencido" : "Conversa aberta com mensagem nao lida",
          suggestedAction: "Assumir conversa e responder o cliente agora",
          evidence: {
            thread_id: thread.id,
            lead_id: thread.lead_id,
            lead_name: thread.lead_name,
            channel: thread.channel,
            unread_count: unread,
            sla_due_at: thread.sla_due_at
          }
        })
      );
    }

    if (!thread.assigned_user_id) {
      actions.push(
        action({
          key: `inbox:${thread.id}:claim`,
          type: "inbox_claim",
          entityType: "inbox_thread",
          entityId: thread.id,
          score: 62,
          reason: "Conversa sem responsavel definido",
          suggestedAction: "Assumir ou atribuir a conversa para um vendedor",
          evidence: {
            thread_id: thread.id,
            lead_id: thread.lead_id,
            channel: thread.channel
          }
        })
      );
    }
  }

  return actions;
}

async function proposalActions(dealershipId) {
  const { rows } = await pool.query(
    `SELECT
       p.id,
       p.lead_id,
       p.vehicle_id,
       p.price,
       p.status,
       p.updated_at,
       COALESCE(l.name, l.client_name, c.name, 'Cliente') AS client_name,
       v.title AS vehicle_title,
       l.assigned_user_id
     FROM proposals p
     LEFT JOIN leads l ON l.id = p.lead_id
     LEFT JOIN clients c ON c.id = p.client_id
     LEFT JOIN vehicles v ON v.id = p.vehicle_id
     WHERE p.dealership_id = $1
       AND COALESCE(p.status, 'pending') IN ('pending', 'open', 'sent')
     ORDER BY p.updated_at ASC
     LIMIT 30`,
    [dealershipId]
  );

  return rows
    .filter((proposal) => (hoursSince(proposal.updated_at) || 0) >= 24)
    .map((proposal) =>
      action({
        key: `proposal:${proposal.id}:close-followup`,
        type: "proposal_close",
        entityType: "proposal",
        entityId: proposal.id,
        score: Math.min(100, 58 + Math.floor((hoursSince(proposal.updated_at) || 0) / 6)),
        reason: "Proposta aberta sem retorno recente",
        suggestedAction: "Retomar proposta com condicao, alternativa de veiculo ou chamada para visita",
        evidence: {
          proposal_id: proposal.id,
          lead_id: proposal.lead_id,
          vehicle_id: proposal.vehicle_id,
          client_name: proposal.client_name,
          vehicle_title: proposal.vehicle_title,
          hours_since_update: Math.round(hoursSince(proposal.updated_at) || 0)
        }
      })
    );
}

async function financeActions(dealershipId) {
  const { rows: financeRows } = await pool.query(
    `SELECT
       f.id,
       f.type,
       f.category,
       f.description,
       f.amount,
       f.due_date,
       f.vehicle_id,
       v.title AS vehicle_title
     FROM finance_entries f
     LEFT JOIN vehicles v ON v.id = f.vehicle_id
     WHERE f.dealership_id = $1
       AND f.status = 'pending'
       AND (
         f.due_date < CURRENT_DATE
         OR f.due_date <= CURRENT_DATE + INTERVAL '7 days'
       )
     ORDER BY f.due_date ASC NULLS LAST, f.amount DESC
     LIMIT 40`,
    [dealershipId]
  );

  const actions = [];
  for (const entry of financeRows) {
    const amount = Number(entry.amount || 0);
    const dueInDays = daysUntil(entry.due_date);
    const overdue = dueInDays != null && dueInDays < 0;

    if (entry.type === "income" && overdue) {
      actions.push(
        action({
          key: `finance:${entry.id}:overdue-receivable`,
          type: "finance_overdue_receivable",
          entityType: "finance_entry",
          entityId: entry.id,
          score: Math.min(100, 72 + Math.abs(dueInDays) * 2 + Math.min(18, amount / 5000)),
          reason: `Receita vencida ha ${Math.abs(dueInDays)} dias`,
          suggestedAction: "Cobrar recebimento hoje e registrar retorno no financeiro",
          impactEstimate: amount,
          urgencyLabel: "critical",
          evidence: {
            finance_entry_id: entry.id,
            amount,
            due_date: entry.due_date,
            category: entry.category,
            vehicle_id: entry.vehicle_id,
            vehicle_title: entry.vehicle_title
          }
        })
      );
    }

    if (entry.type === "expense" && (overdue || dueInDays <= 3)) {
      actions.push(
        action({
          key: `finance:${entry.id}:due-expense`,
          type: "finance_due_expense",
          entityType: "finance_entry",
          entityId: entry.id,
          score: Math.min(100, (overdue ? 76 : 58) + Math.min(20, amount / 3000)),
          reason: overdue
            ? `Despesa vencida ha ${Math.abs(dueInDays)} dias`
            : `Despesa vence em ${dueInDays} dias`,
          suggestedAction: "Priorizar pagamento, renegociar prazo ou reservar caixa",
          impactEstimate: amount,
          urgencyLabel: overdue ? "critical" : "high",
          evidence: {
            finance_entry_id: entry.id,
            amount,
            due_date: entry.due_date,
            category: entry.category,
            vehicle_id: entry.vehicle_id,
            vehicle_title: entry.vehicle_title
          }
        })
      );
    }
  }

  const { rows: cashRows } = await pool.query(
    `SELECT
       COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS incoming,
       COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS outgoing
     FROM finance_entries
     WHERE dealership_id = $1
       AND status = 'pending'
       AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'`,
    [dealershipId]
  );

  const incoming = Number(cashRows[0]?.incoming || 0);
  const outgoing = Number(cashRows[0]?.outgoing || 0);
  if (outgoing > incoming && outgoing > 0) {
    const gap = outgoing - incoming;
    actions.push(
      action({
        key: `finance:cash-risk:${new Date().toISOString().slice(0, 10)}`,
        type: "finance_cash_risk",
        entityType: "finance",
        entityId: null,
        score: Math.min(100, 70 + Math.min(25, gap / 3000)),
        reason: "Saidas previstas dos proximos 7 dias superam entradas",
        suggestedAction: "Revisar contas da semana, antecipar recebiveis e segurar despesas nao essenciais",
        impactEstimate: gap,
        evidence: {
          incoming_7_days: incoming,
          outgoing_7_days: outgoing,
          cash_gap: gap
        }
      })
    );
  }

  const { rows: vehicleCostRows } = await pool.query(
    `SELECT
       v.id,
       v.title,
       v.price,
       v.purchase_price,
       v.acquisition_cost,
       v.preparation_cost_actual,
       COALESCE(SUM(CASE WHEN f.type = 'expense' THEN f.amount ELSE 0 END), 0) AS finance_expense
     FROM vehicles v
     LEFT JOIN finance_entries f
       ON f.vehicle_id = v.id
      AND f.dealership_id = v.dealership_id
     WHERE v.dealership_id = $1
       AND COALESCE(v.status, 'available') = 'available'
     GROUP BY v.id
     HAVING COALESCE(SUM(CASE WHEN f.type = 'expense' THEN f.amount ELSE 0 END), 0) > 0
     ORDER BY finance_expense DESC
     LIMIT 20`,
    [dealershipId]
  );

  for (const vehicle of vehicleCostRows) {
    const price = Number(vehicle.price || 0);
    const purchase = Number(vehicle.purchase_price || 0);
    const baseCost =
      purchase +
      Number(vehicle.acquisition_cost || 0) +
      Number(vehicle.preparation_cost_actual || 0);
    const financeExpense = Number(vehicle.finance_expense || 0);
    const totalCost = baseCost + financeExpense;
    const margin = price - totalCost;

    if ((price > 0 && financeExpense / price >= 0.04) || margin < 0) {
      actions.push(
        action({
          key: `vehicle:${vehicle.id}:finance-cost-leak`,
          type: "vehicle_cost_leak",
          entityType: "vehicle",
          entityId: vehicle.id,
          score: margin < 0 ? 90 : Math.min(88, 62 + Math.round((financeExpense / Math.max(price, 1)) * 100)),
          reason: margin < 0
            ? "Custos financeiros deixam o veiculo com margem negativa"
            : "Custos financeiros ja consomem parte relevante da margem",
          suggestedAction: "Revisar preco minimo, bloquear desconto e acelerar venda deste veiculo",
          impactEstimate: Math.abs(Math.min(margin, financeExpense)),
          evidence: {
            vehicle_id: vehicle.id,
            title: vehicle.title,
            price,
            base_cost: baseCost,
            finance_expense: financeExpense,
            projected_margin: margin
          }
        })
      );
    }
  }

  return actions;
}

async function afterSalesActions(dealershipId) {
  const { rows } = await pool.query(
    `SELECT *
     FROM post_sale_opportunities
     WHERE dealership_id = $1
       AND status = 'pending'
       AND (due_at IS NULL OR due_at <= NOW() + INTERVAL '14 days')
     ORDER BY due_at ASC NULLS LAST, updated_at DESC
     LIMIT 30`,
    [dealershipId]
  );

  return rows.map((item) =>
    action({
      key: `after-sales:${item.id}:opportunity`,
      type: "after_sales",
      entityType: "post_sale_opportunity",
      entityId: item.id,
      score: item.due_at && new Date(item.due_at) < new Date() ? 82 : 64,
      reason: item.reason,
      suggestedAction: item.suggested_action,
      evidence: {
        opportunity_id: item.id,
        type: item.type,
        client_id: item.client_id,
        lead_id: item.lead_id,
        vehicle_id: item.vehicle_id,
        due_at: item.due_at,
        metadata: item.metadata
      }
    })
  );
}

async function sellerActions(dealershipId) {
  const { rows } = await pool.query(
    `SELECT
        u.id,
        u.name,
        COUNT(l.id)::int AS assigned_leads,
        COUNT(l.id) FILTER (
          WHERE l.updated_at < NOW() - INTERVAL '24 hours'
            AND COALESCE(l.status, 'new') NOT IN ('won', 'lost')
        )::int AS stale_leads
     FROM users u
     LEFT JOIN leads l
       ON l.assigned_user_id = u.id
      AND l.dealership_id = u.dealership_id
     WHERE u.dealership_id = $1
       AND u.role = 'seller'
     GROUP BY u.id
     ORDER BY stale_leads DESC, assigned_leads DESC
     LIMIT 20`,
    [dealershipId]
  );

  return rows
    .filter((seller) => Number(seller.stale_leads || 0) >= 5)
    .map((seller) =>
      action({
        key: `seller:${seller.id}:stale-leads`,
        type: "seller_attention",
        entityType: "user",
        entityId: seller.id,
        score: Math.min(100, 50 + Number(seller.stale_leads) * 6),
        reason: `${seller.stale_leads} leads parados com o vendedor`,
        suggestedAction: "Revisar carteira do vendedor e redistribuir leads se necessario",
        evidence: {
          seller_id: seller.id,
          seller_name: seller.name,
          assigned_leads: Number(seller.assigned_leads || 0),
          stale_leads: Number(seller.stale_leads || 0)
        }
      })
    );
}

async function taskActions(dealershipId) {
  const { rows } = await pool.query(
    `SELECT id, title, type, due_at
     FROM tasks
     WHERE dealership_id = $1
       AND status = 'pending'
       AND due_at IS NOT NULL
       AND due_at < NOW()
     ORDER BY due_at ASC
     LIMIT 20`,
    [dealershipId]
  );

  return rows.map((task) =>
    action({
      key: `task:${task.id}:overdue`,
      type: "overdue_task",
      entityType: "task",
      entityId: task.id,
      score: 72,
      reason: "Tarefa pendente esta atrasada",
      suggestedAction: "Concluir, reagendar ou delegar a tarefa hoje",
      evidence: {
        task_id: task.id,
        title: task.title,
        type: task.type,
        due_at: task.due_at
      }
    })
  );
}

function summarize(actions) {
  return {
    critical_actions: actions.filter((a) => a.priority_label === "critical").length,
    high_actions: actions.filter((a) => a.priority_label === "high").length,
    total_actions: actions.length,
    hot_leads: actions.filter((a) => a.type === "lead_followup").length,
    stock_alerts: actions.filter((a) =>
      ["stock_action", "price_adjustment", "stock_margin", "ad_quality", "stock_preparation", "vehicle_cost_leak"].includes(a.type)
    ).length,
    finance_alerts: actions.filter((a) =>
      ["finance_overdue_receivable", "finance_due_expense", "finance_cash_risk", "vehicle_cost_leak"].includes(a.type)
    ).length,
    seller_alerts: actions.filter((a) => a.type === "seller_attention").length,
    inbox_alerts: actions.filter((a) => a.type.startsWith("inbox_")).length,
    proposal_alerts: actions.filter((a) => a.type === "proposal_close").length,
    after_sales_alerts: actions.filter((a) => a.type === "after_sales").length,
    high_impact_actions: actions.filter((a) => ["very_high", "high"].includes(a.impact_label)).length
  };
}

async function getTodayIntelligence(user) {
  const dealershipId = user.dealership_id;
  try {
    await afterSalesService.generateOpportunities(user);
  } catch (err) {
    console.error("Erro ao gerar oportunidades de pos-venda:", err);
  }

  const generated = [
    ...(await leadActions(dealershipId)),
    ...(await inboxActions(dealershipId)),
    ...(await stockActions(dealershipId)),
    ...(await proposalActions(dealershipId)),
    ...(await financeActions(dealershipId)),
    ...(await afterSalesActions(dealershipId)),
    ...(await sellerActions(dealershipId)),
    ...(await taskActions(dealershipId))
  ]
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 20);

  const explained = await explainActions(generated);
  await repository.upsertActions(dealershipId, explained);
  const actions = await repository.listPending(dealershipId, 20);

  return {
    generated_at: new Date().toISOString(),
    summary: summarize(actions),
    actions
  };
}

async function recordFeedback(actionId, status, user) {
  if (!["accepted", "ignored"].includes(status)) {
    const err = new Error("status deve ser accepted ou ignored");
    err.statusCode = 400;
    throw err;
  }

  const updated = await repository.updateFeedback(
    actionId,
    user.dealership_id,
    status,
    user.id
  );

  if (!updated) {
    const err = new Error("Sugestao nao encontrada");
    err.statusCode = 404;
    throw err;
  }

  return updated;
}

const OUTCOME_TYPES = new Set([
  "sale",
  "reply",
  "proposal",
  "appointment",
  "repurchase",
  "no_result"
]);

async function recordOutcome(actionId, data, user) {
  const outcomeType = data?.outcome_type;

  if (!OUTCOME_TYPES.has(outcomeType)) {
    const err = new Error("outcome_type invalido");
    err.statusCode = 400;
    throw err;
  }

  const action = await repository.findActionById(actionId, user.dealership_id);
  if (!action) {
    const err = new Error("Sugestao nao encontrada");
    err.statusCode = 404;
    throw err;
  }

  if (action.status !== "accepted") {
    const err = new Error("Resultado so pode ser registrado para sugestoes aceitas");
    err.statusCode = 409;
    throw err;
  }

  const outcome = await repository.upsertOutcome(actionId, user.dealership_id, user.id, {
    outcome_type: outcomeType,
    outcome_value: data.outcome_value,
    notes: data.notes,
    occurred_at: data.occurred_at,
    metadata: {
      entity_type: action.entity_type,
      entity_id: action.entity_id,
      action_type: action.type,
      priority_score: action.priority_score,
      ...(data.metadata || {})
    }
  });

  if (!outcome) {
    const err = new Error("Resultado nao registrado");
    err.statusCode = 500;
    throw err;
  }

  return {
    ...outcome,
    action
  };
}

function toNumber(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function pct(part, total) {
  const denominator = toNumber(total);
  if (denominator <= 0) return 0;
  return Number(((toNumber(part) / denominator) * 100).toFixed(1));
}

function normalizeMetricRow(row) {
  const normalized = { ...row };
  for (const key of [
    "total_actions",
    "pending_actions",
    "accepted_actions",
    "ignored_actions",
    "outcomes_recorded",
    "positive_outcomes",
    "sales_generated",
    "proposals_generated",
    "appointments_generated",
    "total"
  ]) {
    if (key in normalized) normalized[key] = toNumber(normalized[key]);
  }

  if ("outcome_value_total" in normalized) {
    normalized.outcome_value_total = toNumber(normalized.outcome_value_total);
  }
  if ("estimated_impact_total" in normalized) {
    normalized.estimated_impact_total = toNumber(normalized.estimated_impact_total);
  }
  if ("average_priority_score" in normalized) {
    normalized.average_priority_score = Number(toNumber(normalized.average_priority_score).toFixed(1));
  }

  return normalized;
}

async function getLearningMetrics(user, options = {}) {
  const days = Math.min(Math.max(Number(options.days) || 90, 7), 365);
  const metrics = await repository.getLearningMetrics(user.dealership_id, days);
  const summary = normalizeMetricRow(metrics.summary);

  summary.acceptance_rate = pct(summary.accepted_actions, summary.total_actions);
  summary.outcome_rate = pct(summary.outcomes_recorded, summary.accepted_actions);
  summary.positive_outcome_rate = pct(summary.positive_outcomes, summary.accepted_actions);
  summary.value_per_accepted_action =
    summary.accepted_actions > 0
      ? Number((summary.outcome_value_total / summary.accepted_actions).toFixed(2))
      : 0;

  return {
    generated_at: new Date().toISOString(),
    period_days: days,
    summary,
    by_outcome_type: metrics.by_outcome_type.map(normalizeMetricRow),
    by_action_type: metrics.by_action_type.map((row) => {
      const normalized = normalizeMetricRow(row);
      return {
        ...normalized,
        acceptance_rate: pct(normalized.accepted_actions, normalized.total_actions),
        outcome_rate: pct(normalized.outcomes_recorded, normalized.accepted_actions),
        positive_outcome_rate: pct(normalized.positive_outcomes, normalized.accepted_actions)
      };
    }),
    by_seller: metrics.by_seller.map((row) => {
      const normalized = normalizeMetricRow(row);
      return {
        ...normalized,
        positive_outcome_rate: pct(normalized.positive_outcomes, normalized.outcomes_recorded)
      };
    }),
    by_impact_area: metrics.by_impact_area.map((row) => {
      const normalized = normalizeMetricRow(row);
      normalized.estimated_impact_total = toNumber(normalized.estimated_impact_total);
      return {
        ...normalized,
        acceptance_rate: pct(normalized.accepted_actions, normalized.total_actions),
        positive_outcome_rate: pct(normalized.positive_outcomes, normalized.accepted_actions)
      };
    })
  };
}

module.exports = {
  getTodayIntelligence,
  recordFeedback,
  recordOutcome,
  getLearningMetrics,
  priorityLabel
};
