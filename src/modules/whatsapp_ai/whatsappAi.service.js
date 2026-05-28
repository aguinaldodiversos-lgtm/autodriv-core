const repo = require("./whatsappAi.repository");
const { classifyIntent, normalizeText, INTENTS } = require("./intent-classifier");
const { scoreLead } = require("./lead-score");
const { validateReply, isOptOut, safeFallbackReply } = require("./policy");
const { buildControlledReply, handoffMessage } = require("./reply-builder");
const { actionFor } = require("./seller-actions");

function isHumanActive(lead) {
  return ["human_required", "human_active", "opted_out"].includes(
    String(lead.ai_whatsapp_status || "")
  );
}

function countPreviousUnknown(lead) {
  const metadata = lead.metadata || {};
  return Number(metadata?.whatsapp_ai?.unknown_count || 0);
}

function getMaxAutoMessages(settings) {
  const value = Number(settings.ai_max_auto_messages_per_lead);
  return Number.isFinite(value) && value >= 0 ? value : 5;
}

function shouldEscalate({ classification, score, settings, lead }) {
  const threshold = Number(settings.ai_escalation_threshold || 70);
  const lowConfidence = Number(settings.ai_low_confidence_threshold || 0.65);
  const unknownRetryLimit = Number(settings.ai_unknown_retry_limit || 1);
  const autoCount = Number(lead.ai_auto_message_count || 0);

  if (!settings.ai_handoff_enabled) return false;
  if (classification.intent === INTENTS.SUPPORT_OR_POST_SALE) return true;
  if (classification.shouldEscalate) return true;
  if (classification.confidence < lowConfidence) return true;
  if (score >= threshold) return true;
  if (autoCount >= getMaxAutoMessages(settings)) return true;
  if (
    classification.intent === INTENTS.UNKNOWN &&
    countPreviousUnknown(lead) >= unknownRetryLimit
  ) {
    return true;
  }
  return false;
}

async function sendIfPossible(sendMessage, reply) {
  if (!reply || typeof sendMessage !== "function") return false;
  await sendMessage(reply);
  return true;
}

async function createSellerAction({ dealershipId, lead, settings, classification, score, providerMessageId }) {
  const action = actionFor({ classification, score });
  return repo.createSellerAction({
    dealershipId,
    leadId: lead.id,
    assignedSellerId: lead.assigned_user_id || settings.ai_default_seller_id || null,
    ...action,
    metadata: {
      intent: classification.intent,
      confidence: classification.confidence,
      urgency: classification.urgency,
      provider_message_id: providerMessageId || null,
      entities: classification.entities
    }
  });
}

async function processInboundMessage({
  dealershipId,
  phone,
  text,
  providerMessageId,
  rawPayload = {},
  messageType = "text",
  customerName,
  sendMessage
}) {
  const normalizedPhone = repo.normalizePhone(phone);
  if (!dealershipId || !normalizedPhone || !String(text || "").trim()) {
    return { processed: false, reason: "invalid_payload" };
  }

  const settings = await repo.getSettings(dealershipId);
  const { lead } = await repo.findOrCreateLead({
    dealershipId,
    phone: normalizedPhone,
    customerName,
    rawPayload
  });
  const thread = await repo.upsertWhatsAppThread({
    dealershipId,
    lead,
    phone: normalizedPhone
  });

  const normalizedMessage = normalizeText(text);
  const inbound = await repo.saveConversationMessage({
    dealershipId,
    leadId: lead.id,
    inboxThreadId: thread.id,
    role: "client",
    direction: "inbound",
    externalMessageId: providerMessageId,
    message: text,
    normalizedMessage,
    messageType,
    rawPayload
  });

  if (inbound.duplicate) {
    await repo.logAiEvent({
      dealershipId,
      leadId: lead.id,
      providerMessageId,
      eventType: "duplicate_inbound",
      decision: "ignored",
      metadata: { reason: "provider_message_id_duplicate" }
    });
    return { processed: false, duplicate: true };
  }

  if (isOptOut(text)) {
    await repo.markOptOut(lead.id, dealershipId);
    await repo.updateThreadStatus({
      threadId: thread.id,
      dealershipId,
      status: "closed",
      metadata: { whatsapp_ai: { opted_out: true } },
      unreadCount: 0
    });
    await repo.logAiEvent({
      dealershipId,
      leadId: lead.id,
      providerMessageId,
      eventType: "opt_out",
      decision: "stop_auto_reply"
    });
    return { processed: true, optedOut: true, reply: null };
  }

  if (!settings.ai_whatsapp_enabled || isHumanActive(lead)) {
    await repo.logAiEvent({
      dealershipId,
      leadId: lead.id,
      providerMessageId,
      eventType: "inbound_saved",
      decision: "no_auto_reply",
      metadata: {
        ai_whatsapp_enabled: settings.ai_whatsapp_enabled,
        ai_whatsapp_status: lead.ai_whatsapp_status
      }
    });
    return { processed: true, reply: null, skippedAutoReply: true };
  }

  const classification = classifyIntent(text, {
    lowConfidenceThreshold: settings.ai_low_confidence_threshold
  });
  const leadScore = scoreLead({
    message: text,
    classification,
    previousUnknownCount: countPreviousUnknown(lead)
  });
  const escalate = shouldEscalate({
    classification,
    score: leadScore.score,
    settings,
    lead
  });

  const updatedLead = await repo.updateLeadAfterAnalysis({
    leadId: lead.id,
    dealershipId,
    classification,
    score: leadScore.score,
    scoreReasons: leadScore.reasons,
    message: text,
    nextStatus: escalate ? "human_required" : "qualifying",
    aiStatus: escalate ? "human_required" : "enabled"
  });

  const decision = escalate
    ? "handoff_to_human"
    : settings.ai_auto_reply_enabled
      ? "auto_reply"
      : "action_only";

  let sellerAction = null;
  if (escalate || leadScore.score >= 30) {
    sellerAction = await createSellerAction({
      dealershipId,
      lead: updatedLead || lead,
      settings,
      classification,
      score: leadScore.score,
      providerMessageId
    });
  }

  let reply = null;
  if (settings.ai_auto_reply_enabled) {
    reply = buildControlledReply({
      classification,
      settings,
      shouldEscalate: escalate
    });
    const policy = validateReply(reply);
    if (!policy.allowed) {
      await repo.logAiEvent({
        dealershipId,
        leadId: lead.id,
        providerMessageId,
        eventType: "policy_block",
        classification,
        decision,
        status: "blocked",
        errorMessage: policy.reason
      });
      reply = escalate ? handoffMessage(settings) : safeFallbackReply();
    }
  }

  if (reply) {
    await repo.saveConversationMessage({
      dealershipId,
      leadId: lead.id,
      inboxThreadId: thread.id,
      role: "ai",
      direction: "outbound",
      message: reply,
      normalizedMessage: normalizeText(reply),
      aiProcessed: true,
      aiIntent: classification.intent,
      aiConfidence: classification.confidence,
      metadata: {
        whatsapp_ai: {
          decision,
          score: leadScore.score,
          score_label: leadScore.label,
          seller_action_id: sellerAction?.id || null
        }
      }
    });

    if (!escalate) {
      await repo.incrementAutoMessageCount(lead.id, dealershipId);
    }

    try {
      await sendIfPossible(sendMessage, reply);
    } catch (err) {
      await repo.logAiEvent({
        dealershipId,
        leadId: lead.id,
        providerMessageId,
        eventType: "send_failed",
        classification,
        decision,
        status: "failed",
        errorMessage: err.message
      });
      return {
        processed: true,
        reply,
        classification,
        leadScore,
        handoffToHuman: escalate,
        sendFailed: true
      };
    }
  }

  await repo.updateThreadStatus({
    threadId: thread.id,
    dealershipId,
    status: escalate ? "waiting_seller" : "waiting_customer",
    unreadCount: escalate ? 1 : 0,
    metadata: {
      whatsapp_ai: {
        intent: classification.intent,
        confidence: classification.confidence,
        score: leadScore.score,
        decision,
        handoff_to_human: escalate
      }
    }
  });

  await repo.logAiEvent({
    dealershipId,
    leadId: lead.id,
    providerMessageId,
    eventType: "inbound_processed",
    classification,
    decision,
    metadata: {
      score: leadScore.score,
      score_label: leadScore.label,
      seller_action_id: sellerAction?.id || null
    }
  });

  return {
    processed: true,
    reply,
    classification,
    leadScore,
    handoffToHuman: escalate,
    sellerAction
  };
}

async function getSettings(dealershipId) {
  return repo.getSettings(dealershipId);
}

async function updateSettings(dealershipId, data) {
  return repo.upsertSettings(dealershipId, data || {});
}

function testClassify(message) {
  const classification = classifyIntent(message);
  const leadScore = scoreLead({ message, classification });
  return { classification, leadScore };
}

function testReply(message) {
  const classification = classifyIntent(message);
  const leadScore = scoreLead({ message, classification });
  const shouldEscalateReply = classification.shouldEscalate || leadScore.score >= 70;
  const reply = buildControlledReply({ classification, shouldEscalate: shouldEscalateReply });
  const policy = validateReply(reply);
  return { classification, leadScore, reply, policy };
}

module.exports = {
  processInboundMessage,
  getSettings,
  updateSettings,
  testClassify,
  testReply,
  shouldEscalate
};
