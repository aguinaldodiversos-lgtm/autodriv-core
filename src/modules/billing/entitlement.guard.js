const service = require("./billing.service");

const PLATFORM_ROLES = new Set(["super_admin", "support"]);

function paymentRequiredPayload(decision) {
  return {
    error: "PAYMENT_REQUIRED",
    message:
      decision.message ||
      "Sua assinatura precisa ser regularizada para continuar usando este recurso.",
    subscriptionStatus: decision.status,
    canAccessBilling: true,
    paymentUrl: "/configuracoes?tab=billing"
  };
}

function requireBillingEntitlement(featureKey) {
  return async function billingEntitlementGuard(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Token nao informado" });
      }

      if (PLATFORM_ROLES.has(req.user.role)) {
        return next();
      }

      const decision = await service.getAccessDecision(
        req.user.dealership_id,
        featureKey
      );

      if (!decision.allowed) {
        return res.status(402).json(paymentRequiredPayload(decision));
      }

      next();
    } catch (err) {
      console.error("Erro no billing entitlement:", err);
      res.status(500).json({ error: "Erro ao verificar acesso financeiro" });
    }
  };
}

module.exports = {
  requireBillingEntitlement
};
