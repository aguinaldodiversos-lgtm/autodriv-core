function money(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function conditionFactor(score) {
  const value = Number(score || 0);
  if (!Number.isFinite(value) || value <= 0) return 0.9;
  if (value >= 90) return 1.02;
  if (value >= 75) return 0.97;
  if (value >= 60) return 0.92;
  if (value >= 40) return 0.85;
  return 0.78;
}

function roundToHundreds(value) {
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.max(0, Math.round(value / 100) * 100);
}

function calculateOffer(input = {}) {
  const fipe = money(input.fipe_price);
  const marketAvg = money(input.market_price_avg);
  const marketLow = money(input.market_price_low);
  const marketHigh = money(input.market_price_high);
  const resale = money(input.expected_resale_price) || marketAvg || fipe || marketHigh || marketLow;
  const repair = money(input.estimated_repair_cost);
  const documentation = money(input.documentation_cost);
  const desiredMarginPercent = Math.max(0, Number(input.desired_margin_percent ?? 12));
  const desiredMarginAmount = resale ? resale * (desiredMarginPercent / 100) : 0;
  const adjustedResale = resale ? resale * conditionFactor(input.condition_score) : 0;
  const maxOffer = adjustedResale ? adjustedResale - repair - documentation - desiredMarginAmount : 0;
  const suggestedOffer = roundToHundreds(maxOffer);
  const minOffer = suggestedOffer ? roundToHundreds(suggestedOffer * 0.92) : null;
  const confidenceParts = [
    Boolean(fipe),
    Boolean(marketAvg || marketLow || marketHigh),
    Boolean(input.condition_score),
    Boolean(input.mileage),
    Boolean(input.brand && input.model && input.year)
  ];
  const confidence = Number((confidenceParts.filter(Boolean).length / confidenceParts.length).toFixed(2));
  const warnings = [];
  const reasons = [];

  if (!fipe && !marketAvg) warnings.push("Sem FIPE ou preco medio de mercado; oferta com baixa confianca.");
  if (!input.condition_score) warnings.push("Sem nota de condicao; aplicado fator conservador.");
  if (!input.mileage) warnings.push("Quilometragem ausente reduz confianca.");
  if (suggestedOffer && fipe && suggestedOffer > fipe) {
    warnings.push("Oferta sugerida acima da FIPE; revisar manualmente antes de enviar.");
  }
  if (resale) reasons.push("Oferta calculada a partir do preco de revenda esperado.");
  if (repair) reasons.push("Custo estimado de reparo foi abatido da oferta.");
  if (desiredMarginPercent) reasons.push(`Margem desejada de ${desiredMarginPercent}% preservada.`);

  return {
    suggested_offer_price: suggestedOffer,
    min_offer_price: minOffer,
    max_offer_price: suggestedOffer,
    expected_resale_price: resale || null,
    confidence,
    warnings,
    reasons,
    breakdown: {
      fipe_price: fipe || null,
      market_price_avg: marketAvg || null,
      condition_factor: conditionFactor(input.condition_score),
      adjusted_resale_price: roundToHundreds(adjustedResale),
      estimated_repair_cost: repair,
      documentation_cost: documentation,
      desired_margin_percent: desiredMarginPercent,
      desired_margin_amount: roundToHundreds(desiredMarginAmount)
    }
  };
}

module.exports = {
  calculateOffer
};
