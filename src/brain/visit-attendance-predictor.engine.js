// src/brain/visit-attendance-predictor.engine.js

class VisitAttendancePredictor {

  predict(lead) {

    let score = 50

    if (lead.confirmed) score += 25
    if (lead.responseTime < 10) score += 15
    if (lead.previousVisits > 0) score += 10

    return Math.min(100, score)
  }
}

module.exports = VisitAttendancePredictor
