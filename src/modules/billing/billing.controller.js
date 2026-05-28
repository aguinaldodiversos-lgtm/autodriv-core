const service = require("./billing.service");
const { INTERNAL_STATUS } = require("./billing.status");

function sendError(res, err) {
  const status = err.statusCode || err.status || 500;
  const message = status >= 500 ? "Erro interno de billing" : err.message;
  res.status(status).json({ error: message });
}

async function mySubscription(req, res) {
  try {
    res.json(await service.getMySubscription(req.user));
  } catch (err) {
    sendError(res, err);
  }
}

async function checkoutSubscription(req, res) {
  try {
    res.status(201).json(await service.createCheckoutSubscription(req.user, req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function cancelMySubscription(req, res) {
  try {
    res.json(await service.cancelSubscription(req.user));
  } catch (err) {
    sendError(res, err);
  }
}

async function syncMySubscription(req, res) {
  try {
    res.json(await service.syncMySubscription(req.user));
  } catch (err) {
    sendError(res, err);
  }
}

async function entitlements(req, res) {
  try {
    const subscription = await service.getMySubscription(req.user);
    res.json({
      status: subscription.status,
      canUsePaidFeatures: subscription.canUsePaidFeatures,
      entitlements: subscription.entitlements || []
    });
  } catch (err) {
    sendError(res, err);
  }
}

async function webhook(req, res) {
  try {
    res.status(200).json(await service.processWebhook({
      headers: req.headers,
      query: req.query,
      body: req.body
    }));
  } catch (err) {
    sendError(res, err);
  }
}

async function listPlans(req, res) {
  try {
    res.json(await service.listPlans());
  } catch (err) {
    sendError(res, err);
  }
}

async function createPlan(req, res) {
  try {
    res.status(201).json(await service.createPlan(req.body));
  } catch (err) {
    sendError(res, err);
  }
}

async function updatePlan(req, res) {
  try {
    const plan = await service.updatePlan(req.params.id, req.body);
    if (!plan) return res.status(404).json({ error: "Plano nao encontrado" });
    res.json(plan);
  } catch (err) {
    sendError(res, err);
  }
}

async function listSubscriptions(req, res) {
  try {
    res.json(await service.listSubscriptions());
  } catch (err) {
    sendError(res, err);
  }
}

async function getSubscription(req, res) {
  try {
    const subscription = await service.findSubscriptionById(req.params.id);
    if (!subscription) return res.status(404).json({ error: "Assinatura nao encontrada" });
    res.json(subscription);
  } catch (err) {
    sendError(res, err);
  }
}

async function syncSubscription(req, res) {
  try {
    res.json(await service.syncSubscription(req.params.id));
  } catch (err) {
    sendError(res, err);
  }
}

async function manualOverride(req, res) {
  try {
    const mode = req.body?.mode;
    const status =
      mode === "active"
        ? INTERNAL_STATUS.MANUAL_OVERRIDE_ACTIVE
        : mode === "blocked"
          ? INTERNAL_STATUS.MANUAL_OVERRIDE_BLOCKED
          : null;

    if (!status) {
      return res.status(400).json({ error: "mode deve ser active ou blocked" });
    }

    const subscription = await service.setManualOverride(req.params.id, {
      status,
      reason: req.body?.reason,
      user_id: req.user.id
    });

    if (!subscription) return res.status(404).json({ error: "Assinatura nao encontrada" });
    res.json(subscription);
  } catch (err) {
    sendError(res, err);
  }
}

async function cancelSubscription(req, res) {
  try {
    const subscription = await service.cancelSubscriptionById(req.params.id);
    res.json(subscription);
  } catch (err) {
    sendError(res, err);
  }
}

async function reactivateSubscription(req, res) {
  res.status(501).json({
    error:
      "Reativacao direta ainda depende de confirmacao do fluxo Mercado Pago em sandbox. Use novo checkout ou manual_override temporario."
  });
}

module.exports = {
  mySubscription,
  checkoutSubscription,
  cancelMySubscription,
  syncMySubscription,
  entitlements,
  webhook,
  listPlans,
  createPlan,
  updatePlan,
  listSubscriptions,
  getSubscription,
  syncSubscription,
  manualOverride,
  cancelSubscription,
  reactivateSubscription
};
