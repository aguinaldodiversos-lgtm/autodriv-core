const pool = require("../../config/db");
const repo = require("./maintenance.repository");

/* =========================
   CRIAR ORDEM COM TAREFAS
========================= */

async function createMaintenance(data, user) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `INSERT INTO maintenance_orders
       (dealership_id, vehicle_id, status)
       VALUES ($1,$2,'pending')
       RETURNING *`,
      [user.dealershipId, data.vehicle_id]
    );

    const order = orderResult.rows[0];

    if (data.tasks && data.tasks.length > 0) {
      for (const task of data.tasks) {
        await client.query(
          `INSERT INTO maintenance_tasks
           (order_id, title, status)
           VALUES ($1,$2,'pending')`,
          [order.id, task]
        );
      }
    }

    await client.query("COMMIT");

    return order;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/* =========================
   LISTAR TAREFAS
========================= */

async function getMaintenanceByVehicle(vehicleId, user) {
  const order = await repo.findOrderByVehicle(
    vehicleId,
    user.dealershipId
  );

  if (!order) return null;

  const tasks = await repo.getTasks(order.id);

  return {
    order,
    tasks
  };
}

/* =========================
   ATUALIZAR STATUS DA TAREFA
========================= */

async function updateTask(taskId, status) {
  return repo.updateTaskStatus(taskId, status);
}

/* =========================
   ATUALIZAR DOCUMENTAÇÃO
========================= */

async function updateDocumentation(vehicleId, status, user) {
  const result = await pool.query(
    `UPDATE vehicles
     SET documentation_status = $1
     WHERE id = $2 AND dealership_id = $3
     RETURNING *`,
    [status, vehicleId, user.dealershipId]
  );

  return result.rows[0];
}

module.exports = {
  createMaintenance,
  getMaintenanceByVehicle,
  updateTask,
  updateDocumentation
};
