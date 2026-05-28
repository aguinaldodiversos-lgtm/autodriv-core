const inboxService = require("../inbox/inbox.service");
const pipelineService = require("../pipeline/pipeline.service");
const intelligenceService = require("../intelligence/intelligence.service");
const sellerActionsService = require("../seller_actions/sellerActions.service");
const pool = require("../../config/db");

function summarizeInbox(conversations) {
  return {
    total_open: conversations.length,
    overdue_sla: conversations.filter(
      (item) => item.sla_due_at && new Date(item.sla_due_at) < new Date()
    ).length,
    unassigned: conversations.filter((item) => !item.assigned_user_id).length,
    waiting_seller: conversations.filter((item) => item.status === "waiting_seller").length,
    human_required: conversations.filter((item) => item.lead_status === "human_required").length,
    unread: conversations.reduce(
      (sum, item) => sum + Number(item.unread_count || 0),
      0
    )
  };
}

function summarizeSellerActions(actions) {
  return {
    pending: actions.filter((item) => item.status === "pending").length,
    in_progress: actions.filter((item) => item.status === "in_progress").length,
    urgent: actions.filter((item) => item.priority === "urgent").length,
    high: actions.filter((item) => item.priority === "high").length
  };
}

function summarizePipeline(pipeline) {
  const stages = pipeline.stages || [];
  return {
    open_leads: pipeline.totals?.open_leads || 0,
    overdue_sla: pipeline.totals?.overdue_sla || 0,
    stages: stages.map((stage) => ({
      id: stage.id,
      key: stage.key,
      name: stage.name,
      total: Array.isArray(stage.leads) ? stage.leads.length : 0
    }))
  };
}

function buildScreenContract() {
  return {
    title: "Cockpit do lojista",
    refresh_seconds: 60,
    sections: [
      {
        key: "intelligence",
        title: "Acoes inteligentes de hoje",
        endpoint: "/api/dashboard/intelligence-actions"
      },
      {
        key: "inbox",
        title: "Inbox omnichannel",
        endpoint: "/api/inbox"
      },
      {
        key: "pipeline",
        title: "Funil comercial",
        endpoint: "/api/pipeline"
      },
      {
        key: "finance",
        title: "Financeiro e margem",
        endpoint: "/api/finance/summary"
      }
    ],
    primary_actions: [
      {
        key: "accept_intelligence_action",
        method: "PATCH",
        endpoint_template: "/api/intelligence/actions/:id/feedback",
        body_examples: [{ status: "accepted" }, { status: "ignored" }]
      },
      {
        key: "record_intelligence_outcome",
        method: "POST",
        endpoint_template: "/api/intelligence/actions/:id/outcome",
        body_examples: [
          { outcome_type: "reply" },
          { outcome_type: "proposal", outcome_value: 85000 },
          { outcome_type: "sale", outcome_value: 85000 }
        ]
      },
      {
        key: "claim_conversation",
        method: "POST",
        endpoint_template: "/api/inbox/:threadId/claim"
      },
      {
        key: "claim_seller_action",
        method: "POST",
        endpoint_template: "/api/seller-actions/:id/claim"
      },
      {
        key: "complete_seller_action",
        method: "POST",
        endpoint_template: "/api/seller-actions/:id/complete",
        body_examples: [
          { outcome_type: "reply" },
          { outcome_type: "appointment" },
          { outcome_type: "proposal", outcome_value: 85000 },
          { outcome_type: "sale", outcome_value: 85000 },
          { outcome_type: "no_result" }
        ]
      },
      {
        key: "move_lead",
        method: "PUT",
        endpoint_template: "/api/pipeline/:leadId/stage"
      }
    ]
  };
}

async function listHumanRequiredLeads(user, limit = 10) {
  const { rows } = await pool.query(
    `SELECT
       l.id,
       COALESCE(l.name, l.client_name) AS name,
       COALESCE(l.whatsapp_phone, l.phone, l.client_phone) AS phone,
       l.intent,
       l.intent_confidence,
       l.lead_score,
       l.status,
       l.ai_whatsapp_status,
       l.last_message_at,
       t.id AS inbox_thread_id,
       t.status AS inbox_status,
       a.id AS seller_action_id,
       a.type AS seller_action_type,
       a.priority AS seller_action_priority,
       a.title AS seller_action_title
     FROM leads l
     LEFT JOIN inbox_threads t ON t.lead_id = l.id
       AND t.dealership_id = l.dealership_id
       AND t.channel = 'whatsapp'
     LEFT JOIN LATERAL (
       SELECT *
       FROM seller_actions sa
       WHERE sa.lead_id = l.id
         AND sa.dealership_id = l.dealership_id
         AND sa.status IN ('pending', 'in_progress')
       ORDER BY
         CASE sa.priority
           WHEN 'urgent' THEN 0
           WHEN 'high' THEN 1
           WHEN 'medium' THEN 2
           ELSE 3
         END,
         sa.created_at DESC
       LIMIT 1
     ) a ON true
     WHERE l.dealership_id = $1
       AND (
         l.status = 'human_required'
         OR l.ai_whatsapp_status = 'human_required'
         OR t.status = 'waiting_seller'
       )
     ORDER BY COALESCE(l.lead_score, l.priority_score, l.score, 0) DESC,
              l.last_message_at DESC NULLS LAST
     LIMIT $2`,
    [user.dealership_id, limit]
  );
  return rows;
}

function emptyIntelligence() {
  return {
    summary: {
      critical_actions: 0,
      high_actions: 0,
      hot_leads: 0,
      stock_alerts: 0
    },
    actions: []
  };
}

function emptyPipeline() {
  return {
    totals: {
      open_leads: 0,
      overdue_sla: 0
    },
    stages: []
  };
}

function captureSectionError(errors, key, result) {
  if (result.status === "fulfilled") return result.value;
  const reason = result.reason || {};
  errors.push({
    key,
    message: reason.message || "Modulo indisponivel"
  });
  return null;
}

async function getOperationsDashboard(user, deps = {}) {
  const services = {
    getTodayIntelligence:
      deps.getTodayIntelligence || intelligenceService.getTodayIntelligence,
    listConversations:
      deps.listConversations || inboxService.listConversations,
    getPipeline: deps.getPipeline || pipelineService.getPipeline,
    listSellerActions:
      deps.listSellerActions || sellerActionsService.listActions,
    listHumanRequiredLeads:
      deps.listHumanRequiredLeads || listHumanRequiredLeads
  };

  const errors = [];
  const [
    intelligenceResult,
    inboxResult,
    pipelineResult,
    sellerActionsResult,
    humanRequiredResult
  ] = await Promise.allSettled([
    services.getTodayIntelligence(user),
    services.listConversations(user, { limit: 25, offset: 0 }),
    services.getPipeline(user),
    services.listSellerActions(user, { source: "ai_whatsapp", limit: 12, offset: 0 }),
    services.listHumanRequiredLeads(user, 10)
  ]);

  const intelligence =
    captureSectionError(errors, "intelligence", intelligenceResult) || emptyIntelligence();
  const inbox = captureSectionError(errors, "inbox", inboxResult) || [];
  const pipeline = captureSectionError(errors, "pipeline", pipelineResult) || emptyPipeline();
  const sellerActions = captureSectionError(errors, "seller_actions", sellerActionsResult) || [];
  const humanRequiredLeads = captureSectionError(errors, "human_required_leads", humanRequiredResult) || [];
  const sellerActionSummary = summarizeSellerActions(sellerActions);
  const inboxSummary = summarizeInbox(inbox);

  return {
    screen: buildScreenContract(),
    generated_at: new Date().toISOString(),
    status: errors.length ? "partial" : "ok",
    section_errors: errors,
    summary_cards: [
      {
        key: "critical_actions",
        label: "Criticas",
        value: intelligence.summary?.critical_actions || 0
      },
      {
        key: "inbox_unread",
        label: "Mensagens nao lidas",
        value: inboxSummary.unread
      },
      {
        key: "whatsapp_hot_leads",
        label: "WhatsApp quente",
        value: humanRequiredLeads.length
      },
      {
        key: "seller_actions_pending",
        label: "Acoes do vendedor",
        value: sellerActionSummary.pending + sellerActionSummary.in_progress
      },
      {
        key: "open_leads",
        label: "Leads no funil",
        value: summarizePipeline(pipeline).open_leads
      },
      {
        key: "sla_overdue",
        label: "SLA vencido",
        value: inboxSummary.overdue_sla + summarizePipeline(pipeline).overdue_sla
      }
    ],
    intelligence: {
      summary: intelligence.summary,
      actions: intelligence.actions
    },
    inbox: {
      summary: inboxSummary,
      conversations: inbox
    },
    whatsapp_ai: {
      human_required_leads: humanRequiredLeads,
      seller_actions: sellerActions,
      summary: sellerActionSummary
    },
    pipeline: {
      summary: summarizePipeline(pipeline),
      stages: pipeline.stages
    }
  };
}

module.exports = {
  getOperationsDashboard,
  summarizeInbox,
  summarizePipeline
};
