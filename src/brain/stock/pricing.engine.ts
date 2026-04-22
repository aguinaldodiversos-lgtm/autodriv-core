// src/brain/stock/pricing.engine.ts
// Engine de precificação dinâmica baseada em tempo de estoque e mercado

export interface PricingInput {
  vehicleId:   string
  currentPrice: number
  fipeValue?:  number
  daysInStock: number
  category:    string   // popular, médio, premium, luxo
}

export interface PricingResult {
  vehicleId:       string
  currentPrice:    number
  suggestedPrice:  number
  discount:        number       // percentual
  strategy:        string
  urgency:         "none" | "low" | "medium" | "high" | "critical"
}

export class PricingEngine {

  suggest(input: PricingInput): PricingResult {

    let discountPct = 0
    let urgency: PricingResult["urgency"] = "none"
    let strategy = "Manter preço atual"

    // Ajuste por tempo de estoque
    if (input.daysInStock > 90) {
      discountPct = 8
      urgency = "critical"
      strategy = "Desova urgente — desconto agressivo"
    } else if (input.daysInStock > 60) {
      discountPct = 5
      urgency = "high"
      strategy = "Redução de preço para acelerar saída"
    } else if (input.daysInStock > 45) {
      discountPct = 3
      urgency = "medium"
      strategy = "Ajuste leve para estimular interesse"
    } else if (input.daysInStock > 30) {
      discountPct = 1.5
      urgency = "low"
      strategy = "Revisão de preço mínima"
    }

    // Ajuste por gap com FIPE
    if (input.fipeValue && input.currentPrice > input.fipeValue * 1.10) {
      discountPct = Math.max(discountPct, 5)
      strategy += " | Preço acima da FIPE — risco de não venda"
      urgency = urgency === "none" ? "medium" : urgency
    }

    const suggestedPrice = input.currentPrice * (1 - discountPct / 100)
    const discount = input.currentPrice - suggestedPrice

    return {
      vehicleId:      input.vehicleId,
      currentPrice:   input.currentPrice,
      suggestedPrice: Math.round(suggestedPrice),
      discount:       Math.round(discount),
      strategy,
      urgency
    }
  }

  bulkSuggest(vehicles: PricingInput[]): PricingResult[] {
    return vehicles
      .map(v => this.suggest(v))
      .sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3, none: 4 }
        return order[a.urgency] - order[b.urgency]
      })
  }
}
