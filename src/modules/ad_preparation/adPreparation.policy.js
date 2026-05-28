function numberEnv(name, fallback) {
  const raw = process.env[name];
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function boolEnv(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  return ["true", "1", "yes", "sim"].includes(String(raw).toLowerCase());
}

const policy = {
  minPhotosToPublish: numberEnv("AD_PREP_MIN_PHOTOS_TO_PUBLISH", 4),
  idealPhotosCount: numberEnv("AD_PREP_IDEAL_PHOTOS_COUNT", 10),
  minDescriptionLength: numberEnv("AD_PREP_MIN_DESCRIPTION_LENGTH", 120),
  maxDescriptionLength: numberEnv("AD_PREP_MAX_DESCRIPTION_LENGTH", 1200),
  minGrossMarginPercent: numberEnv("AD_PREP_MIN_GROSS_MARGIN_PERCENT", 5),
  minNetMarginAmount: numberEnv("AD_PREP_MIN_NET_MARGIN_AMOUNT", 0),
  maxPriceAboveFipePercent: numberEnv("AD_PREP_MAX_PRICE_ABOVE_FIPE_PERCENT", 20),
  maxPriceBelowFipePercentWithoutReview: numberEnv(
    "AD_PREP_MAX_PRICE_BELOW_FIPE_PERCENT_WITHOUT_REVIEW",
    35
  ),
  fipeMaxAgeDays: numberEnv("AD_PREP_FIPE_MAX_AGE_DAYS", 45),
  requireFipeToPublish: boolEnv("AD_PREP_REQUIRE_FIPE_TO_PUBLISH", true),
  requireDocumentationCheck: boolEnv("AD_PREP_REQUIRE_DOCUMENTATION_CHECK", true),
  requirePreparationCheck: boolEnv("AD_PREP_REQUIRE_PREPARATION_CHECK", true)
};

const categoryWeights = {
  photos: 25,
  fipeAndPrice: 20,
  margin: 15,
  description: 15,
  preparation: 15,
  documentation: 10
};

const forbiddenDescriptionPatterns = [
  { key: "credit_approval", pattern: /\b(financiamento aprovado|credito aprovado|aprovacao garantida)\b/i },
  { key: "single_owner", pattern: /\b(unico dono|único dono)\b/i },
  { key: "warranty", pattern: /\b(garantia total|garantia de fabrica|garantia completa)\b/i },
  { key: "auction_claim", pattern: /\b(sem leilao|sem leilão|sem sinistro)\b/i },
  { key: "inspection_claim", pattern: /\b(cautelar aprovada|laudo aprovado)\b/i },
  { key: "lowest_price", pattern: /\b(menor preco|menor preço|mais barato da regiao|mais barato da região)\b/i }
];

const publicationStatuses = new Set([
  "draft",
  "preparing",
  "ready_to_publish",
  "blocked_incomplete",
  "published",
  "paused",
  "archived"
]);

function gradeForScore(score, hasBlocking) {
  if (hasBlocking || score < 40) return "blocked";
  if (score < 60) return "incomplete";
  if (score < 75) return "publishable_with_attention";
  if (score < 90) return "good";
  return "excellent";
}

function statusForScore(score, hasBlocking) {
  if (hasBlocking) return "blocked_incomplete";
  if (score >= 75) return "ready_to_publish";
  if (score >= 60) return "needs_review";
  return "blocked_incomplete";
}

module.exports = {
  policy,
  categoryWeights,
  forbiddenDescriptionPatterns,
  publicationStatuses,
  gradeForScore,
  statusForScore
};
