// src/brain/visit-pipeline.engine.js

class VisitPipelineEngine {

  nextStage(currentStage, action) {

    const transitions = {
      NEW: "CONTACTED",
      CONTACTED: "VISIT_PROPOSED",
      VISIT_PROPOSED: "VISIT_SCHEDULED",
      VISIT_SCHEDULED: "VISIT_CONFIRMED",
      VISIT_CONFIRMED: "VISIT_COMPLETED"
    }

    if (action === "NO_SHOW")
      return "NO_SHOW"

    if (action === "SOLD")
      return "SOLD"

    return transitions[currentStage] || currentStage
  }
}

module.exports = VisitPipelineEngine
