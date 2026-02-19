const pool = require("../../config/db");
const PLANS = require("../../config/plans");

async function canDowngrade(dealershipId, newPlanKey) {
  const plan = PLANS[newPlanKey];

  if (!plan) return false;

  const vehicles = await pool.query(
    `SELECT COUNT(*) FROM vehicles WHERE dealership_id = $1`,
    [dealershipId]
  );

  const users = await pool.query(
    `SELECT COUNT(*) FROM users WHERE dealership_id = $1`,
    [dealershipId]
  );

  const totalVehicles = parseInt(vehicles.rows[0].count);
  const totalUsers = parseInt(users.rows[0].count);

  if (
    plan.limits.vehicles !== "unlimited" &&
    totalVehicles > plan.limits.vehicles
  ) {
    return false;
  }

  if (
    plan.limits.users !== "unlimited" &&
    totalUsers > plan.limits.users
  ) {
    return false;
  }

  return true;
}

module.exports = {
  canDowngrade
};
