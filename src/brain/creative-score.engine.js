class CreativeScoreEngine {

  score({ impressions, clicks, conversions }) {

    const ctr = impressions > 0 ? clicks / impressions : 0
    const conversao = clicks > 0 ? conversions / clicks : 0

    let score = 50

    score += ctr * 200
    score += conversao * 300

    return Math.max(0, Math.min(100, score))
  }
}

module.exports = CreativeScoreEngine
