function calculateLeadScore(state) {
  if (
    state.stage === "visit_scheduled" ||
    (state.payment_type && state.budget_range)
  ) {
    return "hot";
  }

  if (state.stage === "qualifying" || state.payment_type) {
    return "warm";
  }

  return "cold";
}

module.exports = calculateLeadScore;
