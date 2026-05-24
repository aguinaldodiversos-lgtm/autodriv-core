let pipelineInstance = null;
let embedderInstance = null;
let initialized = false;
let initPromise = null;

class LocalAIService {
  async init() {
    if (initialized) return;
    if (initPromise) return initPromise;

    initPromise = this.load();

    try {
      await initPromise;
    } finally {
      initPromise = null;
    }
  }

  async load() {
    const { pipeline } = await import("@xenova/transformers");

    pipelineInstance = await pipeline(
      "text-classification",
      "Xenova/distilbert-base-uncased-finetuned-sst-2-english"
    );

    embedderInstance = await pipeline(
      "feature-extraction",
      "Xenova/all-MiniLM-L6-v2"
    );

    initialized = true;
    console.log("Local AI carregada");
  }

  async classify(text, timeout = 8000) {
    if (!initialized) {
      await this.init();
    }

    return this.withTimeout(
      pipelineInstance(text),
      timeout
    );
  }

  async embed(text, timeout = 8000) {
    if (!initialized) {
      await this.init();
    }

    const result = await this.withTimeout(
      embedderInstance(text),
      timeout
    );

    return result[0];
  }

  async withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("LocalAI timeout")), ms)
      )
    ]);
  }
}

module.exports = new LocalAIService();
