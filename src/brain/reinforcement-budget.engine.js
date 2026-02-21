class ReinforcementBudgetEngine {

  adjust({ roi, currentBudget }) {

    if (roi > 1.2) {
      return currentBudget * 1.15
    }

    if (roi < 0) {
      return currentBudget * 0.7
    }

    return currentBudget
  }
}

module.exports = ReinforcementBudgetEngine
