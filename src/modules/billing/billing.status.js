const INTERNAL_STATUS = {
  TRIALING: "trialing",
  ACTIVE: "active",
  PAYMENT_PENDING: "payment_pending",
  PAST_DUE: "past_due",
  GRACE_PERIOD: "grace_period",
  SUSPENDED: "suspended",
  CANCELED: "canceled",
  MANUAL_OVERRIDE_ACTIVE: "manual_override_active",
  MANUAL_OVERRIDE_BLOCKED: "manual_override_blocked"
};

const ACCESS_ALLOWED_STATUSES = new Set([
  INTERNAL_STATUS.TRIALING,
  INTERNAL_STATUS.ACTIVE,
  INTERNAL_STATUS.GRACE_PERIOD,
  INTERNAL_STATUS.MANUAL_OVERRIDE_ACTIVE
]);

const ACCESS_BLOCKED_STATUSES = new Set([
  INTERNAL_STATUS.PAYMENT_PENDING,
  INTERNAL_STATUS.PAST_DUE,
  INTERNAL_STATUS.SUSPENDED,
  INTERNAL_STATUS.CANCELED,
  INTERNAL_STATUS.MANUAL_OVERRIDE_BLOCKED
]);

function mapProviderSubscriptionStatus(providerStatus, graceUntil) {
  const status = String(providerStatus || "").toLowerCase();
  if (status === "authorized") return INTERNAL_STATUS.ACTIVE;
  if (status === "pending") return INTERNAL_STATUS.PAYMENT_PENDING;
  if (status === "cancelled" || status === "canceled") return INTERNAL_STATUS.CANCELED;
  if (status === "paused") {
    if (graceUntil && new Date(graceUntil) > new Date()) {
      return INTERNAL_STATUS.GRACE_PERIOD;
    }
    return INTERNAL_STATUS.SUSPENDED;
  }
  return INTERNAL_STATUS.PAYMENT_PENDING;
}

function statusMessage(status, graceUntil) {
  if (status === INTERNAL_STATUS.ACTIVE) return "Sua assinatura esta ativa.";
  if (status === INTERNAL_STATUS.TRIALING) return "Seu periodo de teste esta ativo.";
  if (status === INTERNAL_STATUS.PAYMENT_PENDING) {
    return "Seu pagamento esta em analise. Assim que o Mercado Pago confirmar, sua conta sera liberada automaticamente.";
  }
  if (status === INTERNAL_STATUS.PAST_DUE) {
    return "Nao identificamos o pagamento da mensalidade. Regularize para evitar bloqueio da conta.";
  }
  if (status === INTERNAL_STATUS.GRACE_PERIOD) {
    const until = graceUntil ? new Date(graceUntil).toISOString().slice(0, 10) : "em breve";
    return `Sua mensalidade esta pendente. Voce ainda tem acesso temporario ate ${until}.`;
  }
  if (status === INTERNAL_STATUS.SUSPENDED) {
    return "Sua conta esta suspensa por falta de pagamento. Regularize a assinatura para voltar a usar os recursos pagos.";
  }
  if (status === INTERNAL_STATUS.CANCELED) {
    return "Sua assinatura foi cancelada. Para reativar, escolha um plano novamente.";
  }
  if (status === INTERNAL_STATUS.MANUAL_OVERRIDE_ACTIVE) {
    return "Acesso liberado manualmente pelo suporte.";
  }
  if (status === INTERNAL_STATUS.MANUAL_OVERRIDE_BLOCKED) {
    return "Conta bloqueada manualmente pelo suporte.";
  }
  return "Status de assinatura em verificacao.";
}

module.exports = {
  INTERNAL_STATUS,
  ACCESS_ALLOWED_STATUSES,
  ACCESS_BLOCKED_STATUSES,
  mapProviderSubscriptionStatus,
  statusMessage
};
