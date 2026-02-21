// src/brain/approach-strategy.engine.js

class ApproachStrategyEngine {

  suggest({ objection, profile }) {

    if (objection === "OBJECAO_PRECO")
      return "Reforçar valor agregado, garantia e condição especial presencial."

    if (objection === "OBJECAO_POSTERGACAO")
      return "Criar urgência e propor agendamento imediato."

    if (objection === "OBJECAO_CONCORRENCIA")
      return "Destacar diferenciais exclusivos da loja."

    if (objection === "OBJECAO_FINANCEIRA")
      return "Oferecer simulação flexível e facilidades de pagamento."

    return "Conduzir para visita com foco em experiência presencial."
  }
}

module.exports = ApproachStrategyEngine
