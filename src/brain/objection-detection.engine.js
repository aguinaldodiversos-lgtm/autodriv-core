// src/brain/objection-detection.engine.js

class ObjectionDetectionEngine {

  detect(message) {

    const text = message.toLowerCase()

    if (text.includes("caro") || text.includes("preço"))
      return "OBJECAO_PRECO"

    if (text.includes("vou pensar"))
      return "OBJECAO_POSTERGACAO"

    if (text.includes("outro lugar"))
      return "OBJECAO_CONCORRENCIA"

    if (text.includes("sem dinheiro") || text.includes("entrada"))
      return "OBJECAO_FINANCEIRA"

    return null
  }
}

module.exports = ObjectionDetectionEngine
