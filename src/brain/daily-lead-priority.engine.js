// src/brain/daily-lead-priority.engine.js

class DailyLeadPriorityEngine {

  rank(leads) {

    return leads
      .map(l => {

        const prioridade =
          (l.saleScore * 0.5) +
          (l.visitScore * 0.3) +
          (l.urgency ? 20 : 0)

        return {
          ...l,
          prioridade
        }
      })
      .sort((a,b)=>b.prioridade - a.prioridade)
  }
}

module.exports = DailyLeadPriorityEngine
