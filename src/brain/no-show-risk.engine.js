// src/brain/no-show-risk.engine.js

class NoShowRiskEngine {

  evaluate(lead) {

    let risk = 0

    if (!lead.confirmed) risk += 40
    if (lead.responseTime > 60) risk += 30
    if (!lead.reminderSent) risk += 20

    return {
      noShowRiskScore: Math.min(100, risk),
      altoRisco: risk > 60
    }
  }
}

module.exports = NoShowRiskEngine
