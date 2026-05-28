const crypto = require("crypto");
const repo = require("./billing.repository");
const mercadoPago = require("./mercadoPago.client");
const {
  INTERNAL_STATUS,
  ACCESS_ALLOWED_STATUSES,
  mapProviderSubscriptionStatus,
  statusMessage
} = require("./billing.status");

function graceDays() {
  const days = parseInt(process.env.BILLING_GRACE_DAYS || "5", 10);
  return Number.isFinite(days) && days >= 0 ? days : 5;
}

function futureDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function getAppUrl() {
  return (
    process.env.APP_PUBLIC_URL ||
    process.env.BILLING_SUCCESS_URL ||
    "https://autodriv-frontend.onrender.com"
  ).replace(/\/$/, "");
}

function formatSubscription(subscription, entitlements = []) {
  if (!subscription) {
    return {
      status: "not_configured",
      message: "Nenhuma assinatura recorrente encontrada.",
      canUsePaidFeatures: false,
      entitlements
    };
  }

  return {
    ...subscription,
    message: statusMessage(subscription.status, subscription.grace_until),
    canUsePaidFeatures: ACCESS_ALLOWED_STATUSES.has(subscription.status),
    entitlements
  };
}

function mapAuthorizedPayment(invoice) {
  const payment = invoice.payment || {};
  const status = payment.status || invoice.summarized || invoice.status || null;
  return {
    provider_authorized_payment_id: invoice.id ? String(invoice.id) : null,
    provider_payment_id: payment.id ? String(payment.id) : null,
    status,
    status_detail: payment.status_detail || null,
    amount: invoice.transaction_amount || null,
    currency: invoice.currency_id || "BRL",
    due_date: invoice.debit_date || null,
    paid_at: status === "approved" ? invoice.last_modified || new Date() : null,
    failed_at: ["rejected", "cancelled", "canceled"].includes(String(status))
      ? invoice.last_modified || new Date()
      : null,
    raw_payload: invoice
  };
}

async function getEntitlementsForSubscription(subscription) {
  return repo.listEntitlements(subscription?.plan_id);
}

async function getMySubscription(user) {
  const subscription = await repo.findLatestSubscriptionByDealership(user.dealership_id);
  if (subscription) {
    return formatSubscription(subscription, await getEntitlementsForSubscription(subscription));
  }

  const legacy = await repo.getLegacySubscription(user.dealership_id);
  if (!legacy) return formatSubscription(null);

  const status =
    legacy.plan === "trial" && legacy.current_period_end && new Date(legacy.current_period_end) > new Date()
      ? INTERNAL_STATUS.TRIALING
      : legacy.status === "active"
        ? INTERNAL_STATUS.ACTIVE
        : INTERNAL_STATUS.SUSPENDED;

  return formatSubscription({
    id: null,
    dealership_id: user.dealership_id,
    plan_code: legacy.plan,
    status,
    current_period_end: legacy.current_period_end,
    provider: "legacy"
  });
}

async function createCheckoutSubscription(user, payload = {}) {
  const planCode = payload.plan_code || process.env.BILLING_DEFAULT_PLAN_CODE || "starter";
  const plan = await repo.findPlanByCode(planCode);
  if (!plan || !plan.active) {
    const err = new Error("Plano de billing nao encontrado ou inativo");
    err.statusCode = 400;
    throw err;
  }

  if (Number(plan.amount) <= 0 && !plan.mercado_pago_plan_id) {
    const err = new Error("Plano sem valor configurado para checkout");
    err.statusCode = 400;
    throw err;
  }

  const externalReference = crypto.randomUUID();
  const local = await repo.createLocalSubscription({
    dealership_id: user.dealership_id,
    user_id: user.id,
    plan_id: plan.id,
    external_reference: externalReference,
    status: INTERNAL_STATUS.PAYMENT_PENDING,
    grace_until: futureDate(graceDays())
  });

  const mpPayload = {
    reason: plan.name,
    external_reference: externalReference,
    payer_email: user.email,
    back_url: process.env.BILLING_SUCCESS_URL || `${getAppUrl()}/configuracoes?tab=billing`,
    auto_recurring: {
      frequency: plan.interval_count || 1,
      frequency_type: plan.interval_type || "months",
      transaction_amount: Number(plan.amount),
      currency_id: plan.currency || "BRL"
    }
  };

  if (plan.mercado_pago_plan_id) {
    mpPayload.preapproval_plan_id = plan.mercado_pago_plan_id;
  }

  const provider = await mercadoPago.createPreapproval(mpPayload, externalReference);

  const updated = await repo.updateSubscription(local.id, {
    provider_subscription_id: provider.id ? String(provider.id) : null,
    provider_payer_id: provider.payer_id ? String(provider.payer_id) : null,
    provider_status: provider.status || null,
    status: mapProviderSubscriptionStatus(provider.status, local.grace_until),
    next_billing_date: provider.next_payment_date || null,
    checkout_url: provider.init_point || provider.sandbox_init_point || null,
    raw_provider_payload: provider,
    last_sync_at: new Date()
  });

  return formatSubscription(updated, await getEntitlementsForSubscription(updated));
}

async function applyProviderSubscription(providerSubscription) {
  const existing =
    (providerSubscription.id &&
      (await repo.findSubscriptionByProviderId(String(providerSubscription.id)))) ||
    (providerSubscription.external_reference &&
      (await repo.findSubscriptionByExternalReference(String(providerSubscription.external_reference))));

  if (!existing) {
    const err = new Error("Assinatura local nao encontrada para o provider");
    err.statusCode = 404;
    throw err;
  }

  const graceUntil = existing.grace_until || futureDate(graceDays());
  const status = mapProviderSubscriptionStatus(providerSubscription.status, graceUntil);
  const updated = await repo.updateSubscription(existing.id, {
    provider_subscription_id: providerSubscription.id ? String(providerSubscription.id) : null,
    provider_payer_id: providerSubscription.payer_id ? String(providerSubscription.payer_id) : null,
    provider_status: providerSubscription.status || null,
    status,
    next_billing_date: providerSubscription.next_payment_date || null,
    grace_until: graceUntil,
    canceled_at: status === INTERNAL_STATUS.CANCELED ? new Date() : null,
    suspended_at: status === INTERNAL_STATUS.SUSPENDED ? new Date() : null,
    raw_provider_payload: providerSubscription,
    last_sync_at: new Date()
  });

  await syncAuthorizedPayments(updated);
  return updated;
}

async function syncAuthorizedPayments(subscription) {
  if (!subscription.provider_subscription_id) return [];
  const response = await mercadoPago.searchAuthorizedPayments({
    preapproval_id: subscription.provider_subscription_id
  });
  const invoices = Array.isArray(response.results) ? response.results : [];
  const saved = [];
  for (const invoice of invoices.slice(0, 12)) {
    saved.push(await repo.upsertPayment(subscription.id, mapAuthorizedPayment(invoice)));
  }
  const latest = saved[0];
  if (latest) {
    await repo.updateSubscription(subscription.id, {
      last_payment_status: latest.status,
      last_payment_id: latest.provider_payment_id,
      last_sync_at: new Date()
    });
  }
  return saved;
}

async function syncSubscription(id) {
  const local = await repo.findSubscriptionById(id);
  if (!local) {
    const err = new Error("Assinatura nao encontrada");
    err.statusCode = 404;
    throw err;
  }
  if (!local.provider_subscription_id) {
    return formatSubscription(local, await getEntitlementsForSubscription(local));
  }
  const provider = await mercadoPago.getPreapproval(local.provider_subscription_id);
  const updated = await applyProviderSubscription(provider);
  return formatSubscription(updated, await getEntitlementsForSubscription(updated));
}

async function syncMySubscription(user) {
  const local = await repo.findLatestSubscriptionByDealership(user.dealership_id);
  if (!local) return getMySubscription(user);
  return syncSubscription(local.id);
}

async function cancelSubscription(user) {
  const local = await repo.findLatestSubscriptionByDealership(user.dealership_id);
  if (!local) {
    const err = new Error("Assinatura nao encontrada");
    err.statusCode = 404;
    throw err;
  }

  if (local.provider_subscription_id) {
    await mercadoPago.updatePreapproval(local.provider_subscription_id, { status: "cancelled" });
  }

  const updated = await repo.updateSubscription(local.id, {
    status: INTERNAL_STATUS.CANCELED,
    provider_status: "cancelled",
    canceled_at: new Date(),
    last_sync_at: new Date()
  });
  return formatSubscription(updated, await getEntitlementsForSubscription(updated));
}

async function cancelSubscriptionById(id) {
  const local = await repo.findSubscriptionById(id);
  if (!local) {
    const err = new Error("Assinatura nao encontrada");
    err.statusCode = 404;
    throw err;
  }

  if (local.provider_subscription_id) {
    await mercadoPago.updatePreapproval(local.provider_subscription_id, { status: "cancelled" });
  }

  return repo.updateSubscription(local.id, {
    status: INTERNAL_STATUS.CANCELED,
    provider_status: "cancelled",
    canceled_at: new Date(),
    last_sync_at: new Date()
  });
}

async function processWebhook({ headers, query, body }) {
  const verification = mercadoPago.verifyWebhookSignature({ headers, query });
  const dataId = verification.dataId || body?.data?.id || query["data.id"] || query.id;
  const eventType = body?.type || query.type || body?.topic || "unknown";
  const action = body?.action || query.action || null;
  const providerEventId = body?.id
    ? String(body.id)
    : `${eventType}:${dataId || "missing"}:${headers["x-request-id"] || crypto.randomUUID()}`;

  const event = await repo.insertEvent({
    event_type: eventType,
    provider_event_id: providerEventId,
    provider_resource_id: dataId ? String(dataId) : null,
    action,
    x_request_id: verification.requestId || headers["x-request-id"] || null,
    signature_valid: verification.valid,
    raw_payload: body || {},
    processing_status: verification.valid ? "received" : "invalid_signature",
    error_message: verification.valid ? null : verification.reason
  });

  if (!event) {
    return { duplicated: true };
  }

  if (!verification.valid) {
    const err = new Error("Webhook Mercado Pago com assinatura invalida");
    err.statusCode = 401;
    throw err;
  }

  try {
    await syncProviderResource(eventType, dataId);
    await repo.updateEventStatus(event.id, "processed");
    return { processed: true };
  } catch (err) {
    await repo.updateEventStatus(event.id, "failed", String(err.message || err).slice(0, 500));
    return { processed: false, queued_for_retry: true };
  }
}

async function syncProviderResource(eventType, dataId) {
  if (!dataId) return null;
  const type = String(eventType || "").toLowerCase();
  if (type.includes("authorized_payment")) {
    const invoice = await mercadoPago.getAuthorizedPayment(dataId);
    const sub = await repo.findSubscriptionByProviderId(String(invoice.preapproval_id));
    if (sub) await repo.upsertPayment(sub.id, mapAuthorizedPayment(invoice));
    if (sub?.provider_subscription_id) {
      return applyProviderSubscription(await mercadoPago.getPreapproval(sub.provider_subscription_id));
    }
    return sub;
  }

  if (type.includes("payment")) {
    const payment = await mercadoPago.getPayment(dataId);
    if (payment.external_reference) {
      const sub = await repo.findSubscriptionByExternalReference(String(payment.external_reference));
      if (sub) {
        await repo.upsertPayment(sub.id, {
          provider_payment_id: payment.id ? String(payment.id) : null,
          provider_authorized_payment_id: null,
          status: payment.status,
          status_detail: payment.status_detail,
          amount: payment.transaction_amount,
          currency: payment.currency_id || "BRL",
          paid_at: payment.status === "approved" ? payment.date_approved || new Date() : null,
          failed_at: payment.status === "rejected" ? payment.date_last_updated || new Date() : null,
          raw_payload: payment
        });
      }
      return sub;
    }
  }

  return applyProviderSubscription(await mercadoPago.getPreapproval(dataId));
}

async function getAccessDecision(dealershipId, featureKey) {
  const sub = await repo.findLatestSubscriptionByDealership(dealershipId);
  if (sub) {
    if (!ACCESS_ALLOWED_STATUSES.has(sub.status)) {
      return {
        allowed: false,
        status: sub.status,
        message: statusMessage(sub.status, sub.grace_until)
      };
    }

    const entitlements = await repo.listEntitlements(sub.plan_id);
    const entitlement = entitlements.find((item) => item.feature_key === featureKey);
    if (entitlement && entitlement.enabled === false) {
      return {
        allowed: false,
        status: sub.status,
        message: "Recurso indisponivel no plano atual."
      };
    }
    return { allowed: true, status: sub.status };
  }

  const legacy = await repo.getLegacySubscription(dealershipId);
  if (!legacy) {
    return {
      allowed: false,
      status: "not_configured",
      message: "Assinatura nao encontrada"
    };
  }

  if (legacy.plan === "trial") {
    const end = legacy.current_period_end ? new Date(legacy.current_period_end) : null;
    const active = end && !Number.isNaN(end.getTime()) && end > new Date();
    return {
      allowed: active,
      status: active ? INTERNAL_STATUS.TRIALING : INTERNAL_STATUS.SUSPENDED,
      message: active ? undefined : "Seu periodo de teste expirou."
    };
  }

  return {
    allowed: legacy.status === "active",
    status: legacy.status === "active" ? INTERNAL_STATUS.ACTIVE : INTERNAL_STATUS.SUSPENDED,
    message: legacy.status === "active" ? undefined : "Sua assinatura esta inativa."
  };
}

module.exports = {
  listPlans: repo.listPlans,
  createPlan: repo.createPlan,
  updatePlan: repo.updatePlan,
  listSubscriptions: repo.listSubscriptions,
  findSubscriptionById: repo.findSubscriptionById,
  setManualOverride: repo.setManualOverride,
  getMySubscription,
  createCheckoutSubscription,
  syncSubscription,
  syncMySubscription,
  cancelSubscription,
  cancelSubscriptionById,
  processWebhook,
  getAccessDecision
};
