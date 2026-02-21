// src/brain/post-visit-sale-score.engine.js

class PostVisitSaleScoreEngine {

  score(data) {

    let score = 40

    if (data.testDrive) score += 20
    if (data.proposalSent) score += 20
    if (data.timeInStore > 30) score += 10
    if (data.creditApproved) score += 15
    if (data.tradeIn) score += 10

    return Math.min(100, score)
  }
}

module.exports = PostVisitSaleScoreEngine
