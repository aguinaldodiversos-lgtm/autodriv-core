// src/brain/stock/risk.engine.ts
// Avalia risco financeiro do estoque atual

export interface StockRiskInput {
  capitalTravado:    number
  receitaMensal:     number
  diasMediosEstoque: number
  totalVeiculos:     number
  veiculosAcima60d:  number   // quantidade de veículos parados > 60 dias
}

export interface StockRiskResult {
  riskScore:       number        // 0–100 (maior = mais risco)
  riskLevel:       "low" | "medium" | "high" | "critical"
  capitalAtRisk:   number        // R$ em veículos parados >60d
  coverageMonths:  number        // meses que o capital travado representa
  recommendations: string[]
  kpis: {
    capitalTurningRatio: number  // capital travado / receita mensal
    desovaRate:          number  // % veículos candidatos a desova
  }
}

export class StockRiskEngine {

  evaluate(input: StockRiskInput): StockRiskResult {

    const capitalAtRisk = input.veiculosAcima60d > 0
      ? (input.capitalTravado / input.totalVeiculos) * input.veiculosAcima60d
      : 0

    const coverageMonths = input.receitaMensal > 0
      ? input.capitalTravado / input.receitaMensal
      : 99

    const capitalTurningRatio = input.receitaMensal > 0
      ? input.capitalTravado / input.receitaMensal
      : 0

    const desovaRate = input.totalVeiculos > 0
      ? (input.veiculosAcima60d / input.totalVeiculos) * 100
      : 0

    // Calcular score de risco
    let riskScore = 0
    if (capitalTurningRatio > 6)   riskScore += 40
    else if (capitalTurningRatio > 3) riskScore += 25
    else if (capitalTurningRatio > 1.5) riskScore += 10

    if (input.diasMediosEstoque > 60) riskScore += 30
    else if (input.diasMediosEstoque > 45) riskScore += 15

    if (desovaRate > 40) riskScore += 30
    else if (desovaRate > 20) riskScore += 15

    riskScore = Math.min(riskScore, 100)

    const riskLevel: StockRiskResult["riskLevel"] =
      riskScore >= 70 ? "critical" :
      riskScore >= 50 ? "high"     :
      riskScore >= 30 ? "medium"   : "low"

    const recommendations: string[] = []

    if (desovaRate > 30)
      recommendations.push(`${desovaRate.toFixed(0)}% do estoque parado >60d — acionar campanha de desova`)

    if (coverageMonths > 3)
      recommendations.push(`Capital imobilizado representa ${coverageMonths.toFixed(1)} meses de receita — risco financeiro`)

    if (input.diasMediosEstoque > 45)
      recommendations.push(`Giro médio de ${input.diasMediosEstoque.toFixed(0)} dias — revisar mix de compras`)

    if (riskLevel === "low")
      recommendations.push("Estoque saudável — manter estratégia atual de compras")

    return {
      riskScore,
      riskLevel,
      capitalAtRisk,
      coverageMonths,
      recommendations,
      kpis: { capitalTurningRatio, desovaRate }
    }
  }
}
