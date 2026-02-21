export class PredictiveScaler {
  predictNextLoad(history: number[]) {
    const n = history.length
    const xMean = (n - 1) / 2
    const yMean =
      history.reduce((a, b) => a + b, 0) / n

    let num = 0
    let den = 0

    for (let i = 0; i < n; i++) {
      num += (i - xMean) * (history[i] - yMean)
      den += (i - xMean) ** 2
    }

    const slope = num / (den || 1)
    const intercept = yMean - slope * xMean

    return slope * n + intercept
  }

  shouldScale(predicted: number, threshold: number) {
    return predicted > threshold
  }
}
