class VisitLeadScoreEngine {

  score(lead) {

    let score = 50

    if (lead.message.includes("hoje"))
      score += 20

    if (lead.city === lead.storeCity)
      score += 15

    if (lead.budget)
      score += 10

    return Math.min(100, score)
  }
}

module.exports = VisitLeadScoreEngine
