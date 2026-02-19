const pool = require("../../config/db");
const funnelService = require("../funnel_analysis/funnel.service");
const forecastService = require("../analytics/forecast.service");
const rankingService = require("../seller_ranking/ranking.service");
const strategyEngine = require("./strategy.engine");

async function generateConversionStrategy(dealershipId) {

  const month = new Date().getMonth() + 1;
  const year = new Date().getFullYear();

  const funnel = await funnelService.analyzeFunnel(dealershipId);
  const forecast = await forecastService.calculateMonthlyForecast(dealershipId);
  const ranking = await rankingService.calculateRanking(dealershipId, month, year);

  const totalLeads = await pool.query(
    `SELECT COUNT(*) FROM leads WHERE dealership_id = $1`,
    [dealershipId]
  );

  const data = {
    total_leads: parseInt(totalLeads.rows[0].count),
    funnel,
    forecast,
    ranking
  };

  const report = await strategyEngine.generateStrategyReport(data);

  return {
    summary_data: data,
    ai_recommendations: report
  };
}

module.exports = {
  generateConversionStrategy
};
