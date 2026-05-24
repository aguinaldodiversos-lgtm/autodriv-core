const pool = require("../../config/db");
const intelligenceService = require("../intelligence/intelligence.service");
const operationsDashboardService = require("./operationsDashboard.service");

/* =========================
   MÉTRICAS GERAIS
========================= */
async function getStats(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const result = await pool.query(
      `
      SELECT
        (SELECT COUNT(*) FROM vehicles WHERE dealership_id = $1) AS total_vehicles,
        (SELECT COUNT(*) FROM leads WHERE dealership_id = $1) AS total_leads,
        (SELECT COUNT(*) FROM leads WHERE dealership_id = $1 AND status = 'new') AS new_leads,
        (SELECT COUNT(*) FROM leads WHERE dealership_id = $1 AND status = 'contacted') AS contacted_leads,
        (SELECT COUNT(*) FROM leads WHERE dealership_id = $1 AND status = 'won') AS sales
      `,
      [dealershipId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ error: "Erro ao buscar estatísticas" });
  }
}

/* =========================
   SCORE DE RECUPERAÇÃO
========================= */
async function recoveryStats(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const result = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE l.origin IN ('manual','import')
        ) AS total_old_leads,

        COUNT(*) FILTER (
          WHERE l.origin IN ('manual','import')
          AND s.stage IN ('ready_for_visit','visit_scheduled','handoff_to_human')
        ) AS recovered_leads

      FROM leads l
      LEFT JOIN lead_ai_state s
        ON s.lead_id = l.id
      WHERE l.dealership_id = $1
      `,
      [dealershipId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Recovery stats error:", err);
    res.status(500).json({ error: "Erro ao calcular recuperação" });
  }
}

/* =========================
   ALERTAS INTELIGENTES
========================= */
async function alerts(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const result = await pool.query(
      `
      SELECT
        l.id AS lead_id,
        l.client_name,
        l.score,
        s.stage,
        s.updated_at
      FROM leads l
      JOIN lead_ai_state s
        ON s.lead_id = l.id
      WHERE l.dealership_id = $1
      `,
      [dealershipId]
    );

    const alerts = [];
    const now = new Date();

    for (const lead of result.rows) {
      const updated = new Date(lead.updated_at);
      const diffHours = (now - updated) / (1000 * 60 * 60);

      // Lead quente
      if (lead.score >= 70) {
        alerts.push({
          type: "hot_lead",
          lead_id: lead.lead_id,
          message: "Lead quente aguardando contato"
        });
      }

      // Lead parado em qualificação
      if (lead.stage === "qualifying" && diffHours > 24) {
        alerts.push({
          type: "stalled_lead",
          lead_id: lead.lead_id,
          message: "Lead parado há mais de 24h"
        });
      }

      // IA travada
      if (lead.stage === "responded" && diffHours > 48) {
        alerts.push({
          type: "ai_stuck",
          lead_id: lead.lead_id,
          message: "IA não conseguiu converter. Assuma manualmente"
        });
      }
    }

    res.json(alerts);
  } catch (err) {
    console.error("Alerts error:", err);
    res.status(500).json({ error: "Erro ao gerar alertas" });
  }
}

/* =========================
   PREVISÃO DE VENDAS
========================= */
async function forecast(req, res) {
  try {
    const dealershipId = req.user.dealership_id;

    const result = await pool.query(
      `
      SELECT
        s.stage,
        COUNT(*) AS total
      FROM lead_ai_state s
      JOIN leads l
        ON l.id = s.lead_id
      WHERE l.dealership_id = $1
      GROUP BY s.stage
      `,
      [dealershipId]
    );

    const counts = {
      qualifying: 0,
      ready_for_visit: 0,
      visit_scheduled: 0
    };

    for (const row of result.rows) {
      if (counts[row.stage] !== undefined) {
        counts[row.stage] = parseInt(row.total);
      }
    }

    const forecastData = {
      qualifying: {
        leads: counts.qualifying,
        conversion_rate: 0.1,
        expected_sales: Math.round(counts.qualifying * 0.1)
      },
      ready_for_visit: {
        leads: counts.ready_for_visit,
        conversion_rate: 0.25,
        expected_sales: Math.round(counts.ready_for_visit * 0.25)
      },
      visit_scheduled: {
        leads: counts.visit_scheduled,
        conversion_rate: 0.4,
        expected_sales: Math.round(counts.visit_scheduled * 0.4)
      }
    };

    const totalForecast =
      forecastData.qualifying.expected_sales +
      forecastData.ready_for_visit.expected_sales +
      forecastData.visit_scheduled.expected_sales;

    res.json({
      ...forecastData,
      total_forecast: totalForecast
    });
  } catch (err) {
    console.error("Forecast error:", err);
    res.status(500).json({ error: "Erro ao calcular previsão" });
  }
}

/* =========================
   ACOES INTELIGENTES DE HOJE
========================= */
async function intelligenceActions(req, res) {
  try {
    const data = await intelligenceService.getTodayIntelligence(req.user);

    res.json({
      screen: {
        title: "Acoes inteligentes de hoje",
        subtitle: "Prioridades geradas com base em leads, conversas, estoque, FIPE, vendas, vendedores e tarefas",
        feedback: {
          method: "PATCH",
          endpoint_template: "/api/intelligence/actions/:id/feedback",
          accepted_statuses: ["accepted", "ignored"]
        },
        outcome: {
          method: "POST",
          endpoint_template: "/api/intelligence/actions/:id/outcome",
          outcome_types: ["sale", "reply", "proposal", "appointment", "repurchase", "no_result"]
        }
      },
      summary_cards: [
        {
          key: "critical_actions",
          label: "Criticas",
          value: data.summary.critical_actions
        },
        {
          key: "high_actions",
          label: "Alta prioridade",
          value: data.summary.high_actions
        },
        {
          key: "hot_leads",
          label: "Leads quentes",
          value: data.summary.hot_leads
        },
        {
          key: "stock_alerts",
          label: "Estoque",
          value: data.summary.stock_alerts
        }
      ],
      generated_at: data.generated_at,
      summary: data.summary,
      actions: data.actions
    });
  } catch (err) {
    console.error("Dashboard intelligence actions error:", err);
    res.status(err.statusCode || 500).json({
      error: err.statusCode ? err.message : "Erro ao carregar acoes inteligentes"
    });
  }
}

/* =========================
   COCKPIT OPERACIONAL
========================= */
async function operations(req, res) {
  try {
    res.json(await operationsDashboardService.getOperationsDashboard(req.user));
  } catch (err) {
    console.error("Dashboard operations error:", err);
    res.status(err.statusCode || 500).json({
      error: err.statusCode ? err.message : "Erro ao carregar cockpit operacional"
    });
  }
}

module.exports = {
  getStats,
  recoveryStats,
  alerts,
  forecast,
  intelligenceActions,
  operations
};
