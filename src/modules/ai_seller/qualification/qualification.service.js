const pool = require("../../../config/db");

async function captureFinancialSignals(message, leadId) {
  const lower = message.toLowerCase();

  let paymentType = null;
  let hasTrade = null;

  if (lower.includes("financ")) paymentType = "financing";
  if (lower.includes("à vista") || lower.includes("avista")) paymentType = "cash";
  if (lower.includes("troca")) hasTrade = true;

  await pool.query(
    `UPDATE lead_ai_state
     SET payment_type = COALESCE($2, payment_type),
         has_trade_in = COALESCE($3, has_trade_in),
         updated_at = NOW()
     WHERE lead_id = $1`,
    [leadId, paymentType, hasTrade]
  );
}

module.exports = {
  captureFinancialSignals
};
