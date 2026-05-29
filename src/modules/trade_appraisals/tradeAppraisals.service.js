const repo = require("./tradeAppraisals.repository");
const { calculateOffer } = require("./tradeAppraisals.pricing");

const statuses = new Set(["pending", "in_review", "offered", "accepted", "rejected", "converted", "archived"]);

function httpError(message, statusCode, payload) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.payload = payload;
  return err;
}

function dealershipId(user) {
  if (!user?.dealership_id) throw httpError("Loja nao associada ao usuario", 403);
  return user.dealership_id;
}

function requireVehicleIdentity(data) {
  if (!data.brand || !data.model) {
    throw httpError("Marca e modelo sao obrigatorios para avaliar troca", 400, {
      error: "TRADE_APPRAISAL_VEHICLE_REQUIRED",
      message: "Informe pelo menos marca e modelo do veiculo do cliente."
    });
  }
}

function withPricing(data) {
  const pricing = calculateOffer(data);
  return {
    ...data,
    expected_resale_price: data.expected_resale_price || pricing.expected_resale_price,
    suggested_offer_price: pricing.suggested_offer_price,
    min_offer_price: pricing.min_offer_price,
    max_offer_price: pricing.max_offer_price,
    pricing_breakdown: {
      ...pricing.breakdown,
      confidence: pricing.confidence,
      warnings: pricing.warnings,
      reasons: pricing.reasons
    }
  };
}

async function create(user, data = {}) {
  const did = dealershipId(user);
  requireVehicleIdentity(data);
  const payload = withPricing({
    ...data,
    dealership_id: did,
    assigned_user_id: data.assigned_user_id || user.id || null,
    status: data.status || "in_review",
    evaluated_by: data.condition_score ? user.id : null,
    evaluated_at: data.condition_score ? new Date() : null
  });
  const appraisal = await repo.create(payload);

  await repo.createSellerAction({
    dealership_id: did,
    lead_id: appraisal.lead_id,
    assigned_seller_id: appraisal.assigned_user_id || user.id || null,
    priority: appraisal.suggested_offer_price ? "high" : "medium",
    title: "Avaliar veiculo usado na troca",
    description: `${appraisal.brand} ${appraisal.model}${appraisal.year ? ` ${appraisal.year}` : ""}. Oferta sugerida: ${appraisal.suggested_offer_price || "pendente"}.`,
    metadata: {
      trade_appraisal_id: appraisal.id,
      suggested_offer_price: appraisal.suggested_offer_price,
      source: appraisal.source
    }
  });

  return appraisal;
}

async function list(user, filters = {}) {
  return repo.list(dealershipId(user), filters);
}

async function get(user, id) {
  const appraisal = await repo.findById(id, dealershipId(user));
  if (!appraisal) throw httpError("Avaliacao nao encontrada", 404);
  return appraisal;
}

async function update(user, id, data = {}) {
  if (data.status && !statuses.has(data.status)) throw httpError("status invalido", 400);
  const current = await get(user, id);
  const merged = withPricing({ ...current, ...data });
  const updated = await repo.update(id, dealershipId(user), {
    ...data,
    ...merged,
    evaluated_by: data.condition_score ? user.id : null,
    evaluated_at: data.condition_score ? new Date() : null
  });
  if (!updated) throw httpError("Avaliacao nao encontrada", 404);
  return updated;
}

async function recalculate(user, id) {
  const current = await get(user, id);
  const priced = withPricing(current);
  return repo.update(id, dealershipId(user), priced);
}

async function makeOffer(user, id, data = {}) {
  const current = await get(user, id);
  const priced = withPricing({ ...current, ...data });
  const finalOffer = data.final_offer_price || priced.suggested_offer_price;
  if (!finalOffer) {
    throw httpError("Dados insuficientes para gerar oferta", 422, {
      error: "TRADE_APPRAISAL_INSUFFICIENT_DATA",
      message: "Informe FIPE, preco de mercado ou preco esperado de revenda para calcular a oferta."
    });
  }
  return repo.update(id, dealershipId(user), {
    ...priced,
    status: "offered",
    final_offer_price: finalOffer,
    offer_expires_at: data.offer_expires_at || null,
    metadata: {
      last_offer_by: user.id || null,
      last_offer_at: new Date().toISOString()
    }
  });
}

async function accept(user, id, data = {}) {
  const current = await get(user, id);
  if (!["offered", "in_review", "pending"].includes(current.status)) {
    throw httpError("Avaliacao nao pode ser aceita neste status", 409);
  }
  return repo.update(id, dealershipId(user), {
    status: "accepted",
    final_offer_price: data.final_offer_price || current.final_offer_price || current.suggested_offer_price,
    metadata: {
      accepted_by: user.id || null,
      accepted_at: new Date().toISOString(),
      acceptance_notes: data.notes || null
    }
  });
}

async function reject(user, id, data = {}) {
  await get(user, id);
  return repo.update(id, dealershipId(user), {
    status: "rejected",
    metadata: {
      rejected_by: user.id || null,
      rejected_at: new Date().toISOString(),
      rejection_reason: data.reason || null
    }
  });
}

async function convertToStock(user, id) {
  const appraisal = await get(user, id);
  if (appraisal.status !== "accepted") {
    throw httpError("Apenas avaliacao aceita pode virar estoque", 409, {
      error: "TRADE_APPRAISAL_NOT_ACCEPTED",
      message: "Aceite a oferta antes de converter o veiculo para estoque."
    });
  }
  return repo.convertToVehicle(appraisal, user.id);
}

module.exports = {
  create,
  list,
  get,
  update,
  recalculate,
  makeOffer,
  accept,
  reject,
  convertToStock
};
