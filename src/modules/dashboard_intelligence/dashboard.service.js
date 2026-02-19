const pool = require("../../config/db");
const forecastService = require("../analytics/forecast.service");
const insightsService = require("./insights.service");
const performanceService = require("./performance.service");

async function getDashboardIntelligence(dealershipId) {

  const totalLeads = await pool.query(
    `SELECT COUNT(*) FROM leads WHERE dealership_id = $1`,
    [dealershipId]
  );

  const hotLeads = await pool.query(
    `SELECT COUNT(*)
     FROM leads
     WHERE dealership_id = $1
       AND priority_score >= 50`,
    [dealershipId]
  );

  const forecast = await forecastService.calculateMonthlyForecast(dealershipId);
  const insights = await insightsService.generateInsights(dealershipId);
  const sellerPerformance = await performanceService.getSellerPerformance(dealershipId);

  return {
    overview: {
      total_leads: parseInt(totalLeads.rows[0].count),
      hot_leads: parseInt(hotLeads.rows[0].count)
    },
    forecast,
    seller_performance: sellerPerformance,
    insights
  };
}

module.exports = {
  getDashboardIntelligence
};
