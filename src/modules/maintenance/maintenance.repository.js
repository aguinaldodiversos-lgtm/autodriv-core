const pool = require("../../config/db");

/* =========================
   ORDERS
========================= */

async function createOrder(data) {
  const result = await pool.query(
    `INSERT INTO maintenance_orders
     (dealership_id, vehicle_id, status)
     VALUES ($1,$2,$3)
     RETURNING *`,
    [
      data.dealership_id,
      data.vehicle_id,
      data.status || "pending"
    ]
  );

  return result.rows[0];
}

async function findOrderByVehicle(vehicleId, dealershipId) {
  const result = await pool.query(
    `SELECT * FROM maintenance_orders
     WHERE vehicle_id = $1 AND dealership_id = $2`,
    [vehicleId, dealershipId]
  );

  return result.rows[0];
}

async function updateOrderStatus(orderId, status) {
  const result = await pool.query(
    `UPDATE maintenance_orders
     SET status = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, orderId]
  );

  return result.rows[0];
}

/* =========================
   TASKS
========================= */

async function createTask(orderId, title) {
  const result = await pool.query(
    `INSERT INTO maintenance_tasks
     (order_id, title, status)
     VALUES ($1,$2,'pending')
     RETURNING *`,
    [orderId, title]
  );

  return result.rows[0];
}

async function getTasks(orderId) {
  const result = await pool.query(
    `SELECT * FROM maintenance_tasks
     WHERE order_id = $1
     ORDER BY id ASC`,
    [orderId]
  );

  return result.rows;
}

/**
 * Só altera tarefa se a ordem pertencer à loja.
 */
async function updateTaskStatusForDealership(taskId, status, dealershipId) {
  const result = await pool.query(
    `UPDATE maintenance_tasks t
     SET status = $1
     FROM maintenance_orders o
     WHERE t.id = $2::int
       AND t.order_id = o.id
       AND o.dealership_id = $3::int
     RETURNING t.*`,
    [status, taskId, dealershipId]
  );

  return result.rows[0] || null;
}

module.exports = {
  createOrder,
  findOrderByVehicle,
  updateOrderStatus,
  createTask,
  getTasks,
  updateTaskStatusForDealership
};
