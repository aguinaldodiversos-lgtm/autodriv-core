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

async function updateTaskStatus(taskId, status) {
  const result = await pool.query(
    `UPDATE maintenance_tasks
     SET status = $1
     WHERE id = $2
     RETURNING *`,
    [status, taskId]
  );

  return result.rows[0];
}

module.exports = {
  createOrder,
  findOrderByVehicle,
  updateOrderStatus,
  createTask,
  getTasks,
  updateTaskStatus
};
