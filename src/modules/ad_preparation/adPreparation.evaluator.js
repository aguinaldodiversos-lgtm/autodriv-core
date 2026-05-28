const {
  policy,
  categoryWeights,
  forbiddenDescriptionPatterns,
  gradeForScore,
  statusForScore
} = require("./adPreparation.policy");

function numeric(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function percent(delta, base) {
  if (!base) return null;
  return Number(((delta / base) * 100).toFixed(1));
}

function findAllowedOverride(overrides, checkKey) {
  return (overrides || []).find((override) => {
    const keys = override.metadata?.check_keys || override.metadata?.blocking_keys || [];
    return !keys.length || keys.includes(checkKey);
  });
}

function makeCheck({
  key,
  category,
  label,
  ok,
  warning,
  blocked,
  required = true,
  severity = "warning",
  weight = 0,
  currentValue,
  expectedValue,
  message,
  actionHint,
  overrides
}) {
  let status = ok ? "valid" : warning ? "warning" : blocked || required ? "blocked" : "missing";
  const finalSeverity = blocked || (required && !ok && !warning) ? "blocking" : severity;
  const manualOverride = !ok ? findAllowedOverride(overrides, key) : null;
  if (manualOverride && finalSeverity !== "critical") {
    status = "manually_approved";
  }
  return {
    key,
    label,
    category,
    status,
    severity: status === "manually_approved" ? "warning" : finalSeverity,
    required,
    weight,
    currentValue,
    expectedValue,
    message,
    actionHint,
    lastCheckedAt: new Date().toISOString(),
    manuallyApprovedBy: status === "manually_approved" ? manualOverride.approved_by || null : null,
    manuallyApprovedAt: status === "manually_approved" ? manualOverride.created_at || null : null,
    manualApprovalReason: status === "manually_approved" ? manualOverride.reason || null : null
  };
}

function totalCost(vehicle) {
  const preparation = Math.max(
    numeric(vehicle.preparation_cost_actual),
    numeric(vehicle.preparation_cost_estimate),
    numeric(vehicle.preparation_actual_from_tasks),
    numeric(vehicle.preparation_estimated_from_tasks)
  );
  return (
    numeric(vehicle.purchase_price) +
    numeric(vehicle.acquisition_cost) +
    preparation +
    numeric(vehicle.documentation_cost) +
    numeric(vehicle.transport_cost) +
    numeric(vehicle.commission_cost) +
    numeric(vehicle.other_costs)
  );
}

function fipeAgeWarning(vehicle) {
  if (!vehicle.fipe_reference_month) return false;
  const raw = String(vehicle.fipe_reference_month);
  const yearMatch = raw.match(/20\d{2}/);
  if (!yearMatch) return false;
  const monthMap = {
    janeiro: 0, fevereiro: 1, marco: 2, "março": 2, abril: 3, maio: 4, junho: 5,
    julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11
  };
  const monthKey = Object.keys(monthMap).find((key) => raw.toLowerCase().includes(key));
  if (!monthKey) return false;
  const date = new Date(Number(yearMatch[0]), monthMap[monthKey], 1);
  return (Date.now() - date.getTime()) / 86400000 > policy.fipeMaxAgeDays;
}

function scoreCategory(checks, category, max) {
  const categoryChecks = checks.filter((check) => check.category === category);
  const totalWeight = categoryChecks.reduce((sum, check) => sum + Math.max(0, check.weight), 0);
  if (!totalWeight) return 0;
  const earned = categoryChecks.reduce((sum, check) => {
    if (check.status === "valid" || check.status === "manually_approved") return sum + check.weight;
    if (check.status === "warning") return sum + check.weight * 0.5;
    return sum;
  }, 0);
  return Math.min(max, Math.round((earned / totalWeight) * max));
}

function evaluateContext(context) {
  const { vehicle, images, preparationTasks, overrides } = context;
  const imageCount = images.length;
  const hasMainPhoto = images.some((image) => image.is_main || image.is_cover);
  const price = numeric(vehicle.price);
  const fipe = numeric(vehicle.fipe_price);
  const cost = totalCost(vehicle);
  const marginAmount = price > 0 && cost > 0 ? price - cost : null;
  const marginPercent = marginAmount != null ? percent(marginAmount, price) : null;
  const fipeDeltaPercent = price > 0 && fipe > 0 ? percent(price - fipe, fipe) : null;
  const description = String(vehicle.ad_description || "").trim();
  const forbiddenTerm = forbiddenDescriptionPatterns.find((item) => item.pattern.test(description));
  const hasCriticalPrep = preparationTasks.some((task) =>
    ["pending", "doing", "needs_repair"].includes(String(task.status || ""))
  );
  const documentationOk = ["ok", "checked", "ready", "approved"].includes(
    String(vehicle.documentation_status || "").toLowerCase()
  );
  const legalBlocked = ["blocked", "restriction", "critical", "judicial"].includes(
    String(vehicle.legal_restriction_status || "").toLowerCase()
  );

  const checks = [
    makeCheck({
      key: "main_photo_present",
      label: "Foto principal existe",
      category: "photos",
      ok: hasMainPhoto,
      required: true,
      weight: 5,
      currentValue: { hasMainPhoto },
      expectedValue: { hasMainPhoto: true },
      message: hasMainPhoto ? "Foto principal definida." : "Defina uma foto principal para publicar.",
      actionHint: "Marque a melhor foto externa como principal.",
      overrides
    }),
    makeCheck({
      key: "minimum_photos_count",
      label: "Minimo de fotos",
      category: "photos",
      ok: imageCount >= policy.minPhotosToPublish,
      required: true,
      weight: 8,
      currentValue: { imageCount },
      expectedValue: { min: policy.minPhotosToPublish },
      message: `O anuncio tem ${imageCount} foto(s).`,
      actionHint: `Adicione pelo menos ${policy.minPhotosToPublish} fotos.`,
      overrides
    }),
    makeCheck({
      key: "ideal_photos_count",
      label: "Quantidade ideal de fotos",
      category: "photos",
      ok: imageCount >= 8,
      warning: imageCount >= policy.minPhotosToPublish,
      required: false,
      weight: 6,
      currentValue: { imageCount },
      expectedValue: { ideal: policy.idealPhotosCount },
      message: imageCount >= 8 ? "Boa quantidade de fotos." : "Mais fotos melhoram a conversao.",
      actionHint: "Inclua frente, traseira, laterais, painel, bancos e porta-malas.",
      overrides
    }),
    makeCheck({
      key: "interior_photo",
      label: "Foto interna",
      category: "photos",
      ok: images.some((image) => /interior|banco|painel|intern/i.test(image.label || image.notes || "")),
      warning: imageCount >= policy.minPhotosToPublish,
      required: false,
      weight: 4,
      currentValue: { labels: images.map((image) => image.label).filter(Boolean) },
      expectedValue: { recommended: "interior/painel" },
      message: "Foto interna recomendada.",
      actionHint: "Adicione foto do interior e painel.",
      overrides
    }),
    makeCheck({
      key: "photos_quality_ok",
      label: "Qualidade de fotos sem alerta",
      category: "photos",
      ok: imageCount >= policy.minPhotosToPublish,
      required: false,
      weight: 2,
      currentValue: { imageCount },
      expectedValue: { min: policy.minPhotosToPublish },
      message: "Qualidade basica inferida pela quantidade minima.",
      actionHint: "Troque fotos escuras, repetidas ou cortadas.",
      overrides
    }),

    makeCheck({
      key: "fipe_code_present",
      label: "Codigo FIPE",
      category: "fipeAndPrice",
      ok: Boolean(vehicle.fipe_code),
      required: policy.requireFipeToPublish,
      weight: 5,
      currentValue: { fipe_code: vehicle.fipe_code || null },
      expectedValue: { required: policy.requireFipeToPublish },
      message: vehicle.fipe_code ? "Codigo FIPE vinculado." : "Vincule o codigo FIPE.",
      actionHint: "Selecione marca, modelo e ano na consulta FIPE.",
      overrides
    }),
    makeCheck({
      key: "fipe_value_present",
      label: "Valor FIPE",
      category: "fipeAndPrice",
      ok: fipe > 0,
      required: policy.requireFipeToPublish,
      weight: 5,
      currentValue: { fipe_price: fipe || null },
      expectedValue: { fipe_price: "> 0" },
      message: fipe > 0 ? "Valor FIPE preenchido." : "Informe o valor FIPE.",
      actionHint: "Consulte a FIPE novamente.",
      overrides
    }),
    makeCheck({
      key: "fipe_value_recent",
      label: "FIPE atualizada",
      category: "fipeAndPrice",
      ok: Boolean(vehicle.fipe_reference_month) && !fipeAgeWarning(vehicle),
      warning: Boolean(vehicle.fipe_reference_month),
      required: false,
      weight: 5,
      currentValue: { fipe_reference_month: vehicle.fipe_reference_month || null },
      expectedValue: { maxAgeDays: policy.fipeMaxAgeDays },
      message: vehicle.fipe_reference_month ? "Referencia FIPE preenchida." : "Mes de referencia FIPE ausente.",
      actionHint: "Atualize a FIPE se a referencia estiver antiga.",
      overrides
    }),
    makeCheck({
      key: "sale_price_present",
      label: "Preco de venda",
      category: "fipeAndPrice",
      ok: price > 0,
      required: true,
      weight: 4,
      currentValue: { price },
      expectedValue: { price: "> 0" },
      message: price > 0 ? "Preco informado." : "Preco de venda e obrigatorio.",
      actionHint: "Defina o preco de anuncio.",
      overrides
    }),
    makeCheck({
      key: "sale_price_within_reasonable_range",
      label: "Preco coerente com FIPE",
      category: "fipeAndPrice",
      ok: fipeDeltaPercent == null || (
        fipeDeltaPercent <= policy.maxPriceAboveFipePercent &&
        fipeDeltaPercent >= -policy.maxPriceBelowFipePercentWithoutReview
      ),
      warning: fipeDeltaPercent != null,
      required: false,
      weight: 2,
      currentValue: { fipeDeltaPercent },
      expectedValue: {
        maxAbovePercent: policy.maxPriceAboveFipePercent,
        maxBelowPercent: policy.maxPriceBelowFipePercentWithoutReview
      },
      message: fipeDeltaPercent == null ? "Sem FIPE para comparar preco." : `Preco ${fipeDeltaPercent}% vs FIPE.`,
      actionHint: "Revise preco ou justifique diferenciais.",
      overrides
    }),

    makeCheck({
      key: "acquisition_cost_present",
      label: "Custo de aquisicao",
      category: "margin",
      ok: numeric(vehicle.purchase_price) > 0,
      required: true,
      weight: 4,
      currentValue: { purchase_price: numeric(vehicle.purchase_price) },
      expectedValue: { purchase_price: "> 0" },
      message: "Preco de compra necessario para margem real.",
      actionHint: "Informe o custo de compra do veiculo.",
      overrides
    }),
    makeCheck({
      key: "margin_calculated",
      label: "Margem calculada",
      category: "margin",
      ok: marginAmount != null,
      required: true,
      weight: 5,
      currentValue: { totalCost: cost, marginAmount },
      expectedValue: { price: "> 0", totalCost: "> 0" },
      message: marginAmount != null ? `Margem estimada: ${marginAmount}.` : "Margem ainda nao calculavel.",
      actionHint: "Preencha preco e custos.",
      overrides
    }),
    makeCheck({
      key: "minimum_margin_ok",
      label: "Margem minima",
      category: "margin",
      ok: marginAmount != null && marginAmount >= policy.minNetMarginAmount && marginPercent >= policy.minGrossMarginPercent,
      required: true,
      weight: 4,
      currentValue: { marginAmount, marginPercent },
      expectedValue: {
        minMarginAmount: policy.minNetMarginAmount,
        minMarginPercent: policy.minGrossMarginPercent
      },
      message: marginAmount != null ? `Margem ${marginPercent}%.` : "Margem ausente.",
      actionHint: "Ajuste preco ou custos antes de publicar.",
      overrides
    }),
    makeCheck({
      key: "expected_costs_present",
      label: "Custos extras preenchidos",
      category: "margin",
      ok: ["acquisition_cost", "preparation_cost_estimate", "documentation_cost"].some(
        (key) => numeric(vehicle[key]) > 0
      ),
      warning: true,
      required: false,
      weight: 2,
      currentValue: {
        acquisition_cost: numeric(vehicle.acquisition_cost),
        preparation_cost_estimate: numeric(vehicle.preparation_cost_estimate),
        documentation_cost: numeric(vehicle.documentation_cost)
      },
      expectedValue: { recommended: "custos extras informados" },
      message: "Custos extras aumentam precisao da margem.",
      actionHint: "Informe preparacao, documentacao e transporte quando houver.",
      overrides
    }),

    makeCheck({
      key: "description_present",
      label: "Descricao comercial",
      category: "description",
      ok: description.length > 0,
      required: true,
      weight: 5,
      currentValue: { length: description.length },
      expectedValue: { minLength: policy.minDescriptionLength },
      message: description ? "Descricao preenchida." : "Descricao comercial obrigatoria.",
      actionHint: "Gere ou escreva uma descricao segura.",
      overrides
    }),
    makeCheck({
      key: "description_min_length",
      label: "Descricao com tamanho adequado",
      category: "description",
      ok: description.length >= policy.minDescriptionLength && description.length <= policy.maxDescriptionLength,
      warning: description.length > 0,
      required: true,
      weight: 5,
      currentValue: { length: description.length },
      expectedValue: { minLength: policy.minDescriptionLength, maxLength: policy.maxDescriptionLength },
      message: `Descricao tem ${description.length} caracteres.`,
      actionHint: "Inclua dados reais, diferenciais e chamada para contato.",
      overrides
    }),
    makeCheck({
      key: "description_no_forbidden_terms",
      label: "Descricao sem promessa indevida",
      category: "description",
      ok: !forbiddenTerm,
      required: true,
      weight: 2,
      currentValue: { forbidden: forbiddenTerm?.key || null },
      expectedValue: { forbidden: false },
      message: forbiddenTerm ? "Descricao contem termo proibido." : "Descricao sem termos proibidos conhecidos.",
      actionHint: "Remova promessas nao comprovadas.",
      overrides
    }),
    makeCheck({
      key: "description_has_commercial_highlights",
      label: "Descricao com destaques",
      category: "description",
      ok: [vehicle.transmission, vehicle.fuel, vehicle.color, vehicle.version].filter(Boolean).length >= 2,
      warning: description.length > 0,
      required: false,
      weight: 3,
      currentValue: {
        version: vehicle.version || null,
        transmission: vehicle.transmission || null,
        fuel: vehicle.fuel || null,
        color: vehicle.color || null
      },
      expectedValue: { minKnownHighlights: 2 },
      message: "Destaques comerciais baseados no cadastro.",
      actionHint: "Complete versao, cambio, combustivel e cor.",
      overrides
    }),

    makeCheck({
      key: "preparation_done",
      label: "Preparacao concluida",
      category: "preparation",
      ok: !policy.requirePreparationCheck || (vehicle.preparation_status === "done" && !hasCriticalPrep),
      required: policy.requirePreparationCheck,
      weight: 5,
      currentValue: {
        preparation_status: vehicle.preparation_status,
        pending_preparation_tasks: numeric(vehicle.pending_preparation_tasks)
      },
      expectedValue: { preparation_status: "done", pending_tasks: 0 },
      message: "Preparacao operacional precisa estar concluida.",
      actionHint: "Conclua revisao, limpeza e reparos pendentes.",
      overrides
    }),
    makeCheck({
      key: "inspection_done",
      label: "Inspecao/revisao realizada",
      category: "preparation",
      ok: ["done", "ready"].includes(String(vehicle.preparation_status || "")),
      warning: numeric(vehicle.completed_preparation_tasks) > 0,
      required: false,
      weight: 5,
      currentValue: { completed_preparation_tasks: numeric(vehicle.completed_preparation_tasks) },
      expectedValue: { recommended: "revisao registrada" },
      message: "Registro de preparacao aumenta confianca.",
      actionHint: "Registre tarefas de revisao, limpeza e detalhes.",
      overrides
    }),
    makeCheck({
      key: "no_critical_repairs_pending",
      label: "Sem reparos criticos pendentes",
      category: "preparation",
      ok: !hasCriticalPrep,
      required: true,
      weight: 5,
      currentValue: { pending_preparation_tasks: numeric(vehicle.pending_preparation_tasks) },
      expectedValue: { pending_preparation_tasks: 0 },
      message: hasCriticalPrep ? "Existem reparos/tarefas pendentes." : "Sem reparos pendentes registrados.",
      actionHint: "Finalize ou cancele tarefas antes da publicacao.",
      overrides
    }),

    makeCheck({
      key: "document_status_checked",
      label: "Documentacao conferida",
      category: "documentation",
      ok: !policy.requireDocumentationCheck || documentationOk,
      required: policy.requireDocumentationCheck,
      weight: 4,
      currentValue: {
        documentation_status: vehicle.documentation_status,
        documentation_checked_at: vehicle.documentation_checked_at
      },
      expectedValue: { status: "ok|checked|ready|approved" },
      message: documentationOk ? "Documentacao conferida." : "Documentacao ainda nao conferida.",
      actionHint: "Atualize o status documental do veiculo.",
      overrides
    }),
    makeCheck({
      key: "no_legal_restriction",
      label: "Sem restricao legal critica",
      category: "documentation",
      ok: !legalBlocked,
      required: true,
      severity: legalBlocked ? "critical" : "warning",
      weight: 4,
      currentValue: { legal_restriction_status: vehicle.legal_restriction_status || "unknown" },
      expectedValue: { forbidden: ["blocked", "restriction", "critical", "judicial"] },
      message: legalBlocked ? "Restricao legal critica bloqueia publicacao." : "Sem restricao critica registrada.",
      actionHint: "Resolva restricoes antes de publicar.",
      overrides
    }),
    makeCheck({
      key: "documentation_ready_for_sale",
      label: "Pronto para transferencia",
      category: "documentation",
      ok: documentationOk && !legalBlocked,
      warning: documentationOk,
      required: false,
      weight: 2,
      currentValue: { documentation_status: vehicle.documentation_status },
      expectedValue: { readyForSale: true },
      message: "Documentacao pronta melhora conversao.",
      actionHint: "Confirme debitos, multas, IPVA, licenciamento e alienacao.",
      overrides
    })
  ];

  const blockingReasons = checks
    .filter((check) => check.required && ["blocked", "missing"].includes(check.status))
    .map((check) => ({
      key: check.key,
      category: check.category,
      message: check.message,
      actionHint: check.actionHint
    }));
  const warnings = checks
    .filter((check) => check.status === "warning" || check.status === "manually_approved")
    .map((check) => ({
      key: check.key,
      category: check.category,
      message: check.message,
      actionHint: check.actionHint
    }));

  const breakdown = Object.fromEntries(
    Object.entries(categoryWeights).map(([category, max]) => [
      category,
      scoreCategory(checks, category, max)
    ])
  );
  const score = Math.max(
    0,
    Math.min(100, Object.values(breakdown).reduce((sum, value) => sum + value, 0))
  );
  const hasBlocking = blockingReasons.length > 0;
  const grade = gradeForScore(score, hasBlocking);

  return {
    score,
    grade,
    canPublish: !hasBlocking,
    status: statusForScore(score, hasBlocking),
    blockingReasons,
    warnings,
    breakdown,
    metrics: {
      totalCost: cost,
      marginAmount,
      marginPercent,
      fipeDeltaPercent,
      imageCount
    },
    checks
  };
}

module.exports = {
  evaluateContext,
  totalCost
};
