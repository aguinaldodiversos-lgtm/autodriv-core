const pool = require("../../config/db");
const repo = require("./maintenance.repository");

function httpError(message, statusCode) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/* =========================
   CRIAR ORDEM COM TAREFAS
========================= */

async function createMaintenance(data, user) {
  if (!user || user.dealership_id == null) {
    throw httpError("Loja não associada ao utilizador", 403);
  }
  if (data.vehicle_id == null || data.vehicle_id === "") {
    throw httpError("vehicle_id é obrigatório", 400);
  }
  const vehicleNumeric = parseInt(data.vehicle_id, 10);
  if (!Number.isFinite(vehicleNumeric) || vehicleNumeric <= 0) {
    throw httpError("vehicle_id inválido", 400);
  }

  const v = await pool.query(
    `SELECT id, dealership_id FROM vehicles WHERE id = $1`,
    [vehicleNumeric]
  );
  if (!v.rows.length) {
    throw httpError("Veículo não encontrado", 404);
  }
  if (Number(v.rows[0].dealership_id) !== Number(user.dealership_id)) {
    throw httpError("Acesso negado: veículo de outra loja", 403);
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderResult = await client.query(
      `INSERT INTO maintenance_orders
       (dealership_id, vehicle_id, status)
       VALUES ($1,$2,'pending')
       RETURNING *`,
      [user.dealership_id, vehicleNumeric]
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
  if (!user || user.dealership_id == null) {
    throw httpError("Loja não associada ao utilizador", 403);
  }
  const order = await repo.findOrderByVehicle(
    vehicleId,
    user.dealership_id
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

async function updateTask(taskId, status, user) {
  if (!user || user.dealership_id == null) {
    throw httpError("Loja não associada ao utilizador", 403);
  }
  if (status == null || String(status).trim() === "") {
    throw httpError("status é obrigatório", 400);
  }
  const tid = parseInt(taskId, 10);
  if (!Number.isFinite(tid) || tid <= 0) {
    throw httpError("taskId inválido", 400);
  }

  const row = await repo.updateTaskStatusForDealership(
    tid,
    status,
    user.dealership_id
  );
  if (row) {
    return row;
  }
  const exists = await pool.query(
    `SELECT o.dealership_id
     FROM maintenance_tasks t
     INNER JOIN maintenance_orders o
       ON o.id = t.order_id
     WHERE t.id = $1`,
    [tid]
  );
  if (!exists.rows.length) {
    throw httpError("Tarefa não encontrada", 404);
  }
  throw httpError("Acesso negado: tarefa de outra loja", 403);
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
    [status, vehicleId, user.dealership_id]
  );

  return result.rows[0];
}

module.exports = {
  createMaintenance,
  getMaintenanceByVehicle,
  updateTask,
  updateDocumentation
};
