const inboxService = require("../inbox/inbox.service");
const pipelineService = require("../pipeline/pipeline.service");
const intelligenceService = require("../intelligence/intelligence.service");

function summarizeInbox(conversations) {
  return {
    total_open: conversations.length,
    overdue_sla: conversations.filter(
      (item) => item.sla_due_at && new Date(item.sla_due_at) < new Date()
    ).length,
    unassigned: conversations.filter((item) => !item.assigned_user_id).length,
    unread: conversations.reduce(
      (sum, item) => sum + Number(item.unread_count || 0),
      0
    )
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
        key: "move_lead",
        method: "PUT",
        endpoint_template: "/api/pipeline/:leadId/stage"
      }
    ]
  };
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
    getPipeline: deps.getPipeline || pipelineService.getPipeline
  };

  const errors = [];
  const [intelligenceResult, inboxResult, pipelineResult] = await Promise.allSettled([
    services.getTodayIntelligence(user),
    services.listConversations(user, { status: "open", limit: 25, offset: 0 }),
    services.getPipeline(user)
  ]);

  const intelligence =
    captureSectionError(errors, "intelligence", intelligenceResult) || emptyIntelligence();
  const inbox = captureSectionError(errors, "inbox", inboxResult) || [];
  const pipeline = captureSectionError(errors, "pipeline", pipelineResult) || emptyPipeline();

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
        value: summarizeInbox(inbox).unread
      },
      {
        key: "open_leads",
        label: "Leads no funil",
        value: summarizePipeline(pipeline).open_leads
      },
      {
        key: "sla_overdue",
        label: "SLA vencido",
        value: summarizeInbox(inbox).overdue_sla + summarizePipeline(pipeline).overdue_sla
      }
    ],
    intelligence: {
      summary: intelligence.summary,
      actions: intelligence.actions
    },
    inbox: {
      summary: summarizeInbox(inbox),
      conversations: inbox
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
