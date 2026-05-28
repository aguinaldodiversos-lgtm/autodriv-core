const repo = require("./adPreparation.repository");
const { evaluateContext, totalCost } = require("./adPreparation.evaluator");
const { forbiddenDescriptionPatterns, policy } = require("./adPreparation.policy");

const elevatedRoles = new Set(["super_admin", "support", "admin", "manager", "gestor"]);

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

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function vehicleName(vehicle) {
  return [vehicle.brand, vehicle.model, vehicle.version, vehicle.year]
    .filter(Boolean)
    .join(" ");
}

async function loadContextOrFail(vehicleId, user) {
  const context = await repo.loadVehicleContext(vehicleId, dealershipId(user));
  if (!context) throw httpError("Veiculo nao encontrado", 404);
  return context;
}

async function evaluate(vehicleId, user, { persist = true } = {}) {
  const did = dealershipId(user);
  const context = await loadContextOrFail(vehicleId, user);
  const evaluation = evaluateContext(context);

  if (persist) {
    await repo.saveEvaluation({
      vehicleId: context.vehicle.id,
      dealershipId: did,
      checks: evaluation.checks,
      score: evaluation
    });
  }

  return {
    vehicle: context.vehicle,
    score: evaluation.score,
    grade: evaluation.grade,
    canPublish: evaluation.canPublish,
    status: evaluation.status,
    blockingReasons: evaluation.blockingReasons,
    warnings: evaluation.warnings,
    breakdown: evaluation.breakdown,
    metrics: evaluation.metrics,
    checks: evaluation.checks
  };
}

async function getPreparation(vehicleId, user) {
  const did = dealershipId(user);
  await loadContextOrFail(vehicleId, user);
  const stored = await repo.getPreparation(vehicleId, did);
  if (!stored.score) {
    return evaluate(vehicleId, user, { persist: true });
  }

  return {
    score: stored.score.score,
    grade: stored.score.grade,
    canPublish: stored.score.can_publish,
    status: stored.score.status,
    blockingReasons: stored.score.blocking_reasons || [],
    warnings: stored.score.warnings || [],
    breakdown: stored.score.breakdown || {},
    checks: stored.checks.map((check) => ({
      key: check.check_key,
      category: check.category,
      status: check.status,
      severity: check.severity,
      required: check.required,
      weight: check.weight,
      currentValue: check.current_value,
      expectedValue: check.expected_value,
      message: check.message,
      actionHint: check.action_hint,
      lastCheckedAt: check.last_checked_at,
      manuallyApprovedBy: check.manually_approved_by,
      manuallyApprovedAt: check.manually_approved_at,
      manualApprovalReason: check.manual_approval_reason
    })),
    suggestions: stored.suggestions
  };
}

function validateGeneratedDescription(description, vehicle) {
  const warnings = [];
  const forbidden = forbiddenDescriptionPatterns.find((item) =>
    item.pattern.test(description)
  );
  if (forbidden) warnings.push(`Termo bloqueado removido: ${forbidden.key}`);
  if (!vehicle.fipe_price && /fipe/i.test(description)) {
    warnings.push("Nao mencione FIPE sem valor FIPE cadastrado.");
  }
  return {
    allowed: !forbidden && !(warnings.length && !vehicle.fipe_price),
    warnings
  };
}

async function suggestDescription(vehicleId, user) {
  const context = await loadContextOrFail(vehicleId, user);
  const { vehicle } = context;
  const name = vehicleName(vehicle) || vehicle.title || "Veiculo";
  const highlights = [
    vehicle.transmission,
    vehicle.fuel,
    vehicle.color,
    vehicle.mileage ? `${vehicle.mileage} km` : null,
    vehicle.fipe_price && vehicle.price && Number(vehicle.price) < Number(vehicle.fipe_price)
      ? "Abaixo da FIPE"
      : null
  ].filter(Boolean);
  const warnings = [];
  const usedFields = ["brand", "model", "year"].filter((key) => vehicle[key]);

  if (!vehicle.transmission) warnings.push("Cambio nao informado.");
  else usedFields.push("transmission");
  if (!vehicle.mileage) warnings.push("Quilometragem nao informada.");
  else usedFields.push("mileage");
  if (!vehicle.fipe_price) warnings.push("Nao foi possivel mencionar FIPE porque o valor nao esta preenchido.");
  else usedFields.push("fipe_price");

  const suggestedTitle = `${name} - pronto para anunciar`.slice(0, 90);
  const descriptionParts = [
    `${name} disponivel para venda.`,
    highlights.length ? `Destaques: ${highlights.join(", ")}.` : null,
    "Ideal para quem busca uma opcao bem apresentada e com atendimento consultivo.",
    "Consulte condicoes, disponibilidade e possibilidade de financiamento com nossa equipe."
  ].filter(Boolean);
  const suggestedDescription = descriptionParts.join(" ");
  const validation = validateGeneratedDescription(suggestedDescription, vehicle);
  warnings.push(...validation.warnings);

  const payload = {
    suggestedTitle,
    suggestedDescription,
    highlights,
    warnings,
    usedFields
  };

  return repo.saveSuggestion({
    vehicleId,
    dealershipId: dealershipId(user),
    suggestionType: "description",
    provider: "rule_based",
    payload
  });
}

async function suggestPrice(vehicleId, user) {
  const context = await loadContextOrFail(vehicleId, user);
  const { vehicle } = context;
  const fipe = money(vehicle.fipe_price);
  const currentPrice = money(vehicle.price);
  const cost = totalCost(vehicle);
  const warnings = [];
  const reasons = [];
  let confidence = 0.85;
  let strategy = "competitive";

  if (!fipe) {
    warnings.push("FIPE ausente, sugestao com confianca reduzida.");
    confidence -= 0.25;
  }
  if (!cost) {
    warnings.push("Custo de compra ausente, margem real nao calculada.");
    confidence -= 0.25;
  }
  if (!vehicle.mileage) {
    warnings.push("Quilometragem nao informada, sugestao com confianca reduzida.");
    confidence -= 0.1;
  }

  const minMarginAmount = Math.max(policy.minNetMarginAmount, cost * (policy.minGrossMarginPercent / 100));
  const minAcceptablePrice = cost ? Math.round(cost + minMarginAmount) : null;
  let suggestedPrice = currentPrice || fipe || minAcceptablePrice || 0;

  if (fipe && minAcceptablePrice) {
    const competitivePrice = Math.round(fipe * 0.97);
    suggestedPrice = Math.max(minAcceptablePrice, competitivePrice);
    reasons.push("Preco sugerido busca ficar competitivo contra FIPE.");
    if (suggestedPrice > fipe * 1.05) {
      strategy = "margin_protected";
      reasons.push("Preco prioriza protecao de margem minima.");
    }
  } else if (minAcceptablePrice) {
    strategy = "margin_protected";
    suggestedPrice = minAcceptablePrice;
    reasons.push("Preco protege margem minima com base nos custos informados.");
  } else if (fipe) {
    suggestedPrice = Math.round(fipe * 0.98);
    reasons.push("Preco usa FIPE como principal referencia.");
  }

  if (cost && suggestedPrice < cost) {
    warnings.push("Preco sugerido abaixo do custo total; nao aplique sem aprovacao.");
    suggestedPrice = minAcceptablePrice || cost;
  }

  const targetMarginAmount = cost ? suggestedPrice - cost : null;
  const targetMarginPercent =
    targetMarginAmount != null && suggestedPrice > 0
      ? Number(((targetMarginAmount / suggestedPrice) * 100).toFixed(1))
      : null;
  const fipeDeltaAmount = fipe ? suggestedPrice - fipe : null;
  const fipeDeltaPercent =
    fipeDeltaAmount != null ? Number(((fipeDeltaAmount / fipe) * 100).toFixed(1)) : null;

  const payload = {
    suggestedPrice,
    minAcceptablePrice,
    targetMarginAmount,
    targetMarginPercent,
    fipeDeltaAmount,
    fipeDeltaPercent,
    strategy,
    confidence: Math.max(0.1, Math.min(0.95, Number(confidence.toFixed(2)))),
    reasons,
    warnings
  };

  return repo.saveSuggestion({
    vehicleId,
    dealershipId: dealershipId(user),
    suggestionType: "price",
    provider: "rule_based",
    payload
  });
}

async function suggestPriority(vehicleId, user) {
  const evaluation = await evaluate(vehicleId, user, { persist: true });
  const context = await loadContextOrFail(vehicleId, user);
  const { vehicle } = context;
  const fipe = money(vehicle.fipe_price);
  const price = money(vehicle.price);
  const margin = evaluation.metrics.marginPercent;
  const fipeDelta = evaluation.metrics.fipeDeltaPercent;

  let priority = "normal";
  const recommendedActions = [];
  let reason = "Anuncio completo, sem diferencial comercial forte.";

  if (!evaluation.canPublish) {
    priority = "low";
    reason = "Veiculo possui bloqueios antes da publicacao.";
    recommendedActions.push("Resolver pendencias do checklist");
  } else if (price && fipe && fipeDelta <= 0 && margin >= policy.minGrossMarginPercent) {
    priority = evaluation.score >= 85 ? "urgent" : "high";
    reason = "Checklist completo, preco competitivo contra FIPE e margem positiva.";
    recommendedActions.push("Publicar anuncio", "Destacar por 7 dias", "Enviar para leads interessados");
  } else if (evaluation.score >= 75) {
    priority = "high";
    reason = "Anuncio pronto com boa qualidade operacional.";
    recommendedActions.push("Publicar anuncio", "Monitorar respostas nas primeiras 24h");
  } else {
    priority = "normal";
    recommendedActions.push("Publicar com acompanhamento", "Melhorar fotos e descricao");
  }

  const payload = {
    priority,
    reason,
    recommendedActions
  };

  return repo.saveSuggestion({
    vehicleId,
    dealershipId: dealershipId(user),
    suggestionType: "priority",
    provider: "rule_based",
    payload
  });
}

async function acceptSuggestion(vehicleId, suggestionId, user) {
  const did = dealershipId(user);
  const suggestion = await repo.findSuggestion(vehicleId, did, suggestionId);
  if (!suggestion) throw httpError("Sugestao nao encontrada", 404);
  await repo.acceptSuggestion({
    vehicleId,
    dealershipId: did,
    suggestion,
    userId: user.id
  });
  return evaluate(vehicleId, user, { persist: true });
}

async function rejectSuggestion(vehicleId, suggestionId, user) {
  const did = dealershipId(user);
  const rejected = await repo.rejectSuggestion({
    dealershipId: did,
    suggestionId,
    userId: user.id
  });
  if (!rejected) throw httpError("Sugestao nao encontrada", 404);
  return rejected;
}

async function createOverride(vehicleId, user, data = {}) {
  if (!elevatedRoles.has(user.role)) {
    throw httpError("Apenas gerente ou admin pode aprovar excecao", 403);
  }
  if (!data.reason || String(data.reason).trim().length < 8) {
    throw httpError("Motivo da aprovacao manual e obrigatorio", 400);
  }
  const evaluation = await evaluate(vehicleId, user, { persist: true });
  const criticalBlocks = evaluation.blockingReasons.filter((reason) =>
    ["no_legal_restriction"].includes(reason.key)
  );
  if (criticalBlocks.length && user.role !== "super_admin") {
    throw httpError("Bloqueio documental/legal critico nao pode ser ignorado por este usuario", 403);
  }
  const override = await repo.createOverride({
    vehicleId,
    dealershipId: dealershipId(user),
    reason: data.reason,
    approvedBy: user.id,
    expiresAt: data.expires_at || null,
    metadata: {
      check_keys: Array.isArray(data.check_keys)
        ? data.check_keys.map((key) => String(key)).filter(Boolean)
        : [],
      blocking_keys: evaluation.blockingReasons.map((item) => item.key),
      score: evaluation.score
    }
  });
  return {
    override,
    evaluation: await evaluate(vehicleId, user, { persist: true })
  };
}

async function assertCanPublish(vehicleId, user) {
  const evaluation = await evaluate(vehicleId, user, { persist: true });
  if (!evaluation.canPublish) {
    throw httpError("Este veiculo ainda possui pendencias antes da publicacao.", 422, {
      error: "AD_NOT_READY_TO_PUBLISH",
      message: "Este veiculo ainda possui pendencias antes da publicacao.",
      score: evaluation.score,
      blockingReasons: evaluation.blockingReasons,
      warnings: evaluation.warnings
    });
  }
  return evaluation;
}

async function publishVehicle(vehicleId, user) {
  const evaluation = await assertCanPublish(vehicleId, user);
  const vehicle = await repo.publishVehicle({
    vehicleId,
    dealershipId: dealershipId(user),
    userId: user.id,
    evaluation
  });
  return {
    vehicle,
    preparation: evaluation
  };
}

module.exports = {
  evaluate,
  getPreparation,
  suggestDescription,
  suggestPrice,
  suggestPriority,
  acceptSuggestion,
  rejectSuggestion,
  createOverride,
  assertCanPublish,
  publishVehicle,
  validateGeneratedDescription
};
