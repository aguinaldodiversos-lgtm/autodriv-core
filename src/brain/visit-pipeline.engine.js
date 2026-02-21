const LeadCore = require("./lead-intelligence.core")

class VisitPipelineEngine {

  constructor() {
    this.leadCore = new LeadCore()
  }

  nextStage(leadData) {

    const unifiedScore =
      this.leadCore.evaluate(leadData)

    if (unifiedScore > 75)
      return "VISIT_SCHEDULED"

    if (unifiedScore > 50)
      return "VISIT_PROPOSED"

    return "CONTACTED"
  }
}

module.exports = VisitPipelineEngine
