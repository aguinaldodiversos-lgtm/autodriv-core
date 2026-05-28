const { test, describe, afterEach } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const path = require("path");
const bcrypt = require("bcryptjs");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@127.0.0.1:65432/autodriv_test_unreachable";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "01234567890123456789012345678901";
}
process.env.NODE_ENV = process.env.NODE_ENV || "development";

const pool = require(path.join("..", "src", "config", "db"));
const app = require(path.join("..", "src", "app"));

const originalQuery = pool.query.bind(pool);

describe("auth security", () => {
  afterEach(() => {
    pool.query = originalQuery;
  });

  test("cadastro rejeita senha fraca antes de tocar no banco", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({
        dealership_name: "Loja Teste",
        name: "Admin",
        email: "Admin@Test.com",
        password: "123"
      });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /Senha fraca/);
  });

  test("login nao enumera email inexistente", async () => {
    pool.query = async () => ({ rows: [] });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "naoexiste@test.com", password: "Senha123" });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, "Credenciais invalidas");
  });

  test("login nao diferencia senha invalida de usuario inexistente", async () => {
    const hash = await bcrypt.hash("SenhaCorreta123", 10);
    pool.query = async () => ({
      rows: [
        {
          id: 1,
          dealership_id: 2,
          email: "admin@test.com",
          role: "admin",
          password_hash: hash,
          status: "active"
        }
      ]
    });

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@test.com", password: "Errada123" });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, "Credenciais invalidas");
  });
});
