// src/infrastructure/ai/localAI.service.js

let pipelineInstance = null
let embedderInstance = null
let initialized = false

class LocalAIService {
  async init() {
    if (initialized) return

    try {
      const { pipeline } = await import('@xenova/transformers')

      pipelineInstance = await pipeline(
        'text-classification',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english'
      )

      embedderInstance = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      )

      initialized = true
      console.log('✅ Local AI carregada')
    } catch (error) {
      console.error('❌ Falha ao iniciar IA local:', error)
      throw error
    }
  }

  async classify(text, timeout = 8000) {
    if (!initialized) {
      throw new Error('LocalAI não inicializada')
    }

    return this.withTimeout(
      pipelineInstance(text),
      timeout
    )
  }

  async embed(text, timeout = 8000) {
    if (!initialized) {
      throw new Error('LocalAI não inicializada')
    }

    const result = await this.withTimeout(
      embedderInstance(text),
      timeout
    )

    return result[0]
  }

  async withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('LocalAI timeout')), ms)
      )
    ])
  }
}

module.exports = new LocalAIService()
