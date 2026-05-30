const validViews = new Set(["stock", "showroom", "preparation", "sold-month"]);
const validSorts = new Set([
  "newest",
  "oldest",
  "price_asc",
  "price_desc",
  "margin_desc",
  "score_asc",
  "score_desc",
  "days_in_stock_desc",
  "priority_desc",
  "sold_at_desc"
]);

const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };

function numeric(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function money(value) {
  return numeric(value) || 0;
}

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(start, end = new Date()) {
  const a = toDate(start);
  const b = toDate(end);
  if (!a || !b) return null;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / 86400000));
}

function parsePositiveInt(value, fallback, max) {
  const parsed = parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function parseQuery(query = {}) {
  const view = String(query.view || "stock").trim();
  if (!validViews.has(view)) {
    const err = new Error("view invalida");
    err.statusCode = 400;
    err.payload = {
      error: "INVALID_VEHICLE_VIEW",
      message: "Use view=stock, showroom, preparation ou sold-month."
    };
    throw err;
  }

  const sort = validSorts.has(String(query.sort || "")) ? String(query.sort) : defaultSortForView(view);
  return {
    view,
    search: String(query.search || "").trim().toLowerCase(),
    status: String(query.status || "").trim().toLowerCase(),
    brand: String(query.brand || "").trim().toLowerCase(),
    model: String(query.model || "").trim().toLowerCase(),
    minPrice: numeric(query.minPrice),
    maxPrice: numeric(query.maxPrice),
    minScore: numeric(query.minScore),
    maxScore: numeric(query.maxScore),
    sort,
    page: parsePositiveInt(query.page, 1, 100000),
    limit: parsePositiveInt(query.limit, 20, 100)
  };
}

function defaultSortForView(view) {
  if (view === "sold-month") return "sold_at_desc";
  if (view === "showroom") return "priority_desc";
  if (view === "preparation") return "days_in_stock_desc";
  return "days_in_stock_desc";
}

function gradeLabel(score, canPublish) {
  const value = Number(score || 0);
  if (!canPublish && value < 60) return "incomplete";
  if (value >= 90) return "excellent";
  if (value >= 75) return "good";
  if (value >= 60) return "publicable_with_attention";
  if (value >= 40) return "incomplete";
  return "poor";
}

function costBasis(row) {
  const purchase = numeric(row.purchase_price);
  if (purchase == null || purchase <= 0) return null;
  return (
    purchase +
    money(row.acquisition_cost) +
    Math.max(money(row.preparation_cost_actual), money(row.preparation_cost_estimate)) +
    money(row.documentation_cost) +
    money(row.transport_cost) +
    money(row.commission_cost) +
    money(row.other_costs)
  );
}

function margin(price, row) {
  const value = numeric(price);
  const cost = costBasis(row);
  if (value == null || value <= 0 || cost == null) {
    return { amount: null, percent: null };
  }
  const amount = value - cost;
  return {
    amount,
    percent: Number(((amount / value) * 100).toFixed(2))
  };
}

function fipeDelta(row) {
  const price = numeric(row.price);
  const fipe = numeric(row.fipe_price);
  if (price == null || fipe == null || fipe <= 0) return { amount: null, percent: null };
  const amount = price - fipe;
  return {
    amount,
    percent: Number(((amount / fipe) * 100).toFixed(2))
  };
}

function mapIssue(issue) {
  return {
    key: issue.key,
    label: issue.actionHint || issue.message || issue.key,
    severity: issue.category === "documentation" ? "blocking" : "warning",
    category: issue.category || null
  };
}

function fallbackPendingItems(row, expectedMargin) {
  const items = [];
  if (!row.has_main_image || Number(row.image_count || 0) < 4) {
    items.push({ key: "minimum_photos_count", label: "Adicionar fotos", severity: "blocking", category: "photos" });
  }
  if (!row.fipe_price) {
    items.push({ key: "fipe_value_present", label: "Informar FIPE", severity: "blocking", category: "fipeAndPrice" });
  }
  if (!numeric(row.price)) {
    items.push({ key: "sale_price_present", label: "Definir preço", severity: "blocking", category: "fipeAndPrice" });
  }
  if (expectedMargin.amount == null) {
    items.push({ key: "margin_calculated", label: "Preencher custo para margem", severity: "warning", category: "margin" });
  } else if (expectedMargin.amount < 0) {
    items.push({ key: "minimum_margin_ok", label: "Corrigir margem negativa", severity: "blocking", category: "margin" });
  }
  if (!String(row.ad_description || "").trim()) {
    items.push({ key: "description_present", label: "Criar descrição comercial", severity: "warning", category: "description" });
  }
  if (!["done", "ready"].includes(String(row.preparation_status || ""))) {
    items.push({ key: "preparation_done", label: "Finalizar preparação", severity: "warning", category: "preparation" });
  }
  if (!["ok", "checked", "ready", "approved"].includes(String(row.documentation_status || "").toLowerCase())) {
    items.push({ key: "document_status_checked", label: "Conferir documentação", severity: "blocking", category: "documentation" });
  }
  return items;
}

function buildRecommendation(item) {
  const pendingKeys = new Set(item.topPendingItems.map((pending) => pending.key));
  if (item.status === "sold") {
    return {
      type: "sold_result",
      priority: "low",
      title: "Resultado da venda",
      message: item.realizedMarginAmount == null
        ? "Venda registrada. Margem realizada ainda não calculada por falta de custo."
        : `Venda registrada com margem estimada de ${item.realizedMarginPercent}%.`,
      recommendedActions: ["view_sale"]
    };
  }
  if (item.expectedMarginAmount != null && item.expectedMarginAmount < 0) {
    return {
      type: "margin_risk",
      priority: "urgent",
      title: "Risco de margem",
      message: "Preço e custos indicam margem negativa. Revise preço, custo de compra ou preparação.",
      recommendedActions: ["review_price", "review_costs"]
    };
  }
  if (pendingKeys.has("minimum_photos_count") || pendingKeys.has("fipe_value_present") || pendingKeys.has("sale_price_present")) {
    return {
      type: "fix_today",
      priority: "high",
      title: "Corrigir hoje",
      message: "Faltam dados básicos para vender bem: fotos, FIPE ou preço.",
      recommendedActions: ["add_photos", "fill_fipe", "set_price"]
    };
  }
  if (String(item.preparationStatus || "").includes("progress") && Number(item.daysInStock || 0) >= 10) {
    return {
      type: "delayed_preparation",
      priority: "high",
      title: "Preparação atrasada",
      message: `Veículo está em preparação há ${item.daysInStock} dias. Defina a próxima ação operacional.`,
      recommendedActions: ["fix_preparation", "assign_owner"]
    };
  }
  if (item.canPublish && item.expectedMarginPercent != null && item.expectedMarginPercent >= 8 && item.fipeDeltaPercent != null && item.fipeDeltaPercent <= 3 && item.adScore >= 75) {
    return {
      type: "prioritize_sale",
      priority: "high",
      title: "Prioridade de venda",
      message: "Carro pronto, com margem positiva e preço competitivo. Priorize atendimento e divulgação.",
      recommendedActions: ["promote_listing", "send_to_leads"]
    };
  }
  if (item.canPublish) {
    return {
      type: "publish_now",
      priority: "medium",
      title: "Publicar agora",
      message: "Veículo pronto para anúncio. Publique ou revise destaque comercial.",
      recommendedActions: ["publish"]
    };
  }
  if (Number(item.daysInStock || 0) >= 45) {
    return {
      type: "stagnant_stock",
      priority: "high",
      title: "Carro parado",
      message: `Veículo está há ${item.daysInStock} dias em estoque. Revise preço, fotos e divulgação.`,
      recommendedActions: ["recalculate_price", "improve_photos", "promote_listing"]
    };
  }
  return {
    type: "fix_today",
    priority: "medium",
    title: "Completar cadastro",
    message: "Complete pendências para liberar o veículo para venda com qualidade.",
    recommendedActions: ["edit", "recalculate_score"]
  };
}

function decorateVehicle(row, now = new Date()) {
  const expectedMargin = margin(row.price, row);
  const soldPrice = numeric(row.sold_price) || numeric(row.sale_price) || numeric(row.latest_sale_price);
  const realizedMargin = margin(soldPrice, row);
  const delta = fipeDelta(row);
  const soldAt = row.sold_at || row.latest_sale_approved_at || row.latest_sale_created_at || null;
  const entryDate = row.entry_date || row.created_at;
  const daysInStock = soldAt ? daysBetween(entryDate, soldAt) : daysBetween(entryDate, now);
  const adScore = Number(row.ad_score ?? row.ad_quality_score ?? 0);
  const blockingReasons = Array.isArray(row.blocking_reasons) ? row.blocking_reasons : [];
  const warnings = Array.isArray(row.warnings) ? row.warnings : [];
  const fallbackItems = fallbackPendingItems(row, expectedMargin);
  const topPendingItems = (blockingReasons.length ? blockingReasons.map(mapIssue) : fallbackItems)
    .concat(warnings.slice(0, 2).map(mapIssue))
    .slice(0, 4);
  const isSold = String(row.status || "") === "sold" ||
    Boolean(row.sold_at) ||
    row.sale_status === "completed" ||
    row.latest_sale_status === "approved";
  const canPublish = Boolean(row.can_publish) || (
    adScore >= 75 &&
    fallbackItems.filter((item) => item.severity === "blocking").length === 0
  );
  const status = isSold ? "sold" : row.status || "available";

  const item = {
    id: row.id,
    dealershipId: row.dealership_id,
    brand: row.brand,
    model: row.model,
    version: row.version,
    year: row.year,
    modelYear: row.year,
    licensePlate: row.license_plate,
    mainPhotoUrl: row.main_photo_url || null,
    imageCount: Number(row.image_count || 0),
    status,
    publicationStatus: row.ad_status || "draft",
    preparationStatus: row.preparation_status || row.ad_preparation_status || "not_started",
    price: numeric(row.price),
    fipeValue: numeric(row.fipe_price),
    fipeDeltaAmount: delta.amount,
    fipeDeltaPercent: delta.percent,
    acquisitionPrice: numeric(row.purchase_price),
    estimatedCosts: costBasis(row) == null ? null : costBasis(row) - money(row.purchase_price),
    expectedMarginAmount: expectedMargin.amount,
    expectedMarginPercent: expectedMargin.percent,
    realizedMarginAmount: realizedMargin.amount,
    realizedMarginPercent: realizedMargin.percent,
    adScore,
    adScoreGrade: row.ad_grade || gradeLabel(adScore, canPublish),
    canPublish,
    daysInStock,
    soldAt,
    soldPrice,
    soldBy: row.sold_by_user_name || row.latest_sale_user_name || null,
    saleStatus: row.sale_status || row.latest_sale_status || null,
    topPendingItems,
    recommendation: null,
    actions: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at || row.created_at
  };
  item.recommendation = buildRecommendation(item);
  item.actions = actionsForItem(item);
  return item;
}

function actionsForItem(item) {
  if (item.status === "sold") return ["view_sale", "view_history"];
  const actions = ["edit"];
  if (item.topPendingItems.some((pending) => pending.category === "photos")) actions.push("add_photos");
  if (item.topPendingItems.some((pending) => pending.category === "preparation")) actions.push("fix_preparation");
  if (!item.canPublish) actions.push("recalculate_score");
  if (item.canPublish && item.publicationStatus !== "published") actions.push("publish");
  actions.push("mark_sold");
  return Array.from(new Set(actions));
}

function belongsToView(item, view, now = new Date()) {
  const isSold = item.status === "sold" || Boolean(item.soldAt) || item.saleStatus === "completed";
  if (view === "sold-month") {
    if (!isSold || !item.soldAt) return false;
    const soldDate = toDate(item.soldAt);
    return soldDate &&
      soldDate.getFullYear() === now.getFullYear() &&
      soldDate.getMonth() === now.getMonth();
  }
  if (isSold || ["archived", "removed", "deleted"].includes(String(item.status || ""))) return false;
  if (view === "showroom") {
    return item.canPublish || ["published", "ready_to_publish", "active", "approved"].includes(String(item.publicationStatus || ""));
  }
  if (view === "preparation") {
    const hasBlockingPending = item.topPendingItems.some((pending) =>
      ["blocking", "critical"].includes(String(pending.severity || ""))
    );
    return !item.canPublish ||
      ["preparation", "preparing"].includes(String(item.status || "")) ||
      ["not_started", "in_progress", "blocked"].includes(String(item.preparationStatus || "")) ||
      hasBlockingPending;
  }
  return true;
}

function passesFilters(item, params) {
  if (params.search) {
    const haystack = [item.brand, item.model, item.version, item.licensePlate, item.status, item.publicationStatus]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(params.search)) return false;
  }
  if (params.status && String(item.status || "").toLowerCase() !== params.status) return false;
  if (params.brand && !String(item.brand || "").toLowerCase().includes(params.brand)) return false;
  if (params.model && !String(item.model || "").toLowerCase().includes(params.model)) return false;
  if (params.minPrice != null && (item.price == null || item.price < params.minPrice)) return false;
  if (params.maxPrice != null && (item.price == null || item.price > params.maxPrice)) return false;
  if (params.minScore != null && item.adScore < params.minScore) return false;
  if (params.maxScore != null && item.adScore > params.maxScore) return false;
  return true;
}

function sortItems(items, sort) {
  const copy = [...items];
  const byNumber = (getter, dir = "desc") => (a, b) => {
    const av = getter(a) ?? (dir === "desc" ? -Infinity : Infinity);
    const bv = getter(b) ?? (dir === "desc" ? -Infinity : Infinity);
    return dir === "desc" ? bv - av : av - bv;
  };
  const byDate = (getter, dir = "desc") => (a, b) => {
    const av = toDate(getter(a))?.getTime() || 0;
    const bv = toDate(getter(b))?.getTime() || 0;
    return dir === "desc" ? bv - av : av - bv;
  };
  const map = {
    newest: byDate((item) => item.createdAt),
    oldest: byDate((item) => item.createdAt, "asc"),
    price_asc: byNumber((item) => item.price, "asc"),
    price_desc: byNumber((item) => item.price),
    margin_desc: byNumber((item) => item.expectedMarginAmount),
    score_asc: byNumber((item) => item.adScore, "asc"),
    score_desc: byNumber((item) => item.adScore),
    days_in_stock_desc: byNumber((item) => item.daysInStock),
    sold_at_desc: byDate((item) => item.soldAt),
    priority_desc: (a, b) => (priorityWeight[b.recommendation.priority] || 0) - (priorityWeight[a.recommendation.priority] || 0)
  };
  return copy.sort(map[sort] || map.newest);
}

function buildSummary(items, view, now = new Date()) {
  const stockItems = items.filter((item) => belongsToView(item, "stock", now));
  const showroomItems = items.filter((item) => belongsToView(item, "showroom", now));
  const preparationItems = items.filter((item) => belongsToView(item, "preparation", now));
  const soldItems = items.filter((item) => belongsToView(item, "sold-month", now));
  const validScores = items.map((item) => item.adScore).filter((score) => Number.isFinite(score));
  return {
    view,
    total: view === "stock" ? stockItems.length : view === "showroom" ? showroomItems.length : view === "preparation" ? preparationItems.length : soldItems.length,
    stockCount: stockItems.length,
    showroomCount: showroomItems.length,
    preparationCount: preparationItems.length,
    soldMonthCount: soldItems.length,
    attentionCount: items.filter((item) => ["fix_today", "stagnant_stock", "delayed_preparation", "margin_risk"].includes(item.recommendation.type)).length,
    blockedCount: items.filter((item) => !item.canPublish && item.status !== "sold").length,
    readyToPublishCount: items.filter((item) => item.canPublish && item.publicationStatus !== "published" && item.status !== "sold").length,
    averageScore: validScores.length ? Math.round(validScores.reduce((sum, score) => sum + score, 0) / validScores.length) : 0,
    totalExpectedMargin: items.reduce((sum, item) => sum + (item.expectedMarginAmount || 0), 0),
    totalRealizedMarginMonth: soldItems.reduce((sum, item) => sum + (item.realizedMarginAmount || 0), 0),
    totalSoldValueMonth: soldItems.reduce((sum, item) => sum + (item.soldPrice || 0), 0),
    averageDaysInStockSoldMonth: soldItems.length
      ? Math.round(soldItems.reduce((sum, item) => sum + (item.daysInStock || 0), 0) / soldItems.length)
      : 0
  };
}

function buildPanel(rows, query, now = new Date()) {
  const params = parseQuery(query);
  const all = rows.map((row) => decorateVehicle(row, now));
  const filteredByView = all
    .filter((item) => belongsToView(item, params.view, now))
    .filter((item) => passesFilters(item, params));
  const sorted = sortItems(filteredByView, params.sort);
  const offset = (params.page - 1) * params.limit;
  const data = sorted.slice(offset, offset + params.limit);
  return {
    data,
    summary: buildSummary(all, params.view, now),
    pagination: {
      page: params.page,
      limit: params.limit,
      total: sorted.length,
      totalPages: Math.max(1, Math.ceil(sorted.length / params.limit))
    }
  };
}

module.exports = {
  parseQuery,
  decorateVehicle,
  belongsToView,
  buildRecommendation,
  buildPanel,
  buildSummary
};
