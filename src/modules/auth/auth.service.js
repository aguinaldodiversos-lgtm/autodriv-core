const pool = require("../../config/db");
const { hashPassword, comparePassword } = require("../../utils/hash");
const { generateToken } = require("../../utils/jwt");

async function register({ name, email, password }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const dealership = await client.query(
      `INSERT INTO dealerships (name, email)
       VALUES ($1,$2)
       RETURNING *`,
      [name, email]
    );

    const passwordHash = await hashPassword(password);

    const user = await client.query(
      `INSERT INTO users
       (dealership_id, name, email, password_hash, role)
       VALUES ($1,$2,$3,$4,'admin')
       RETURNING *`,
      [dealership.rows[0].id, name, email, passwordHash]
    );

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    await client.query(
      `INSERT INTO subscriptions
       (dealership_id, plan, status, current_period_end)
       VALUES ($1,'starter','active',$2)`,
      [dealership.rows[0].id, trialEnd]
    );

    await client.query("COMMIT");

    const token = generateToken({
      userId: user.rows[0].id,
      dealershipId: dealership.rows[0].id,
      role: "admin"
    });

    return { token };

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function login({ email, password }) {
  const result = await pool.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error("Usuário não encontrado");
  }

  const user = result.rows[0];

  const valid = await comparePassword(password, user.password_hash);
  if (!valid) throw new Error("Senha inválida");

  const token = generateToken({
    userId: user.id,
    dealershipId: user.dealership_id,
    role: user.role
  });

  return { token };
}

module.exports = {
  register,
  login
};
