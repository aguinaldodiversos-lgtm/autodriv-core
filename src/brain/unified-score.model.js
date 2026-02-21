// src/brain/unified-score.model.js

class UnifiedScoreModel {

  normalize(value, max = 100) {
    return Math.max(0, Math.min(max, value))
  }

  combine(weights) {
    const totalWeight = Object.values(weights)
      .reduce((sum, w) => sum + w.weight, 0)

    const score = Object.values(weights)
      .reduce((sum, w) => sum + (w.value * w.weight), 0)

    return totalWeight > 0
      ? score / totalWeight
      : 0
  }
}

module.exports = UnifiedScoreModel
