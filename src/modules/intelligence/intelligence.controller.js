const service = require("./intelligence.service");

async function today(req, res) {
  try {
    const result = await service.getTodayIntelligence(req.user);
    res.json(result);
  } catch (err) {
    console.error("INTELLIGENCE TODAY ERROR:", err);
    res.status(500).json({ error: "Erro ao gerar inteligencia do dia" });
  }
}

async function feedback(req, res) {
  try {
    const result = await service.recordFeedback(
      req.params.id,
      req.body.status,
      req.user
    );
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function outcome(req, res) {
  try {
    const result = await service.recordOutcome(
      req.params.id,
      req.body,
      req.user
    );
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

async function learningMetrics(req, res) {
  try {
    const result = await service.getLearningMetrics(req.user, {
      days: req.query.days
    });
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
}

module.exports = {
  today,
  feedback,
  outcome,
  learningMetrics
};
