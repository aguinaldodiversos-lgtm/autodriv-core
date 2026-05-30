const { test, describe, afterEach } = require("node:test");
const assert = require("node:assert");
const path = require("path");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@127.0.0.1:65432/autodriv_test_unreachable";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "01234567890123456789012345678901";
}

const pool = require(path.join("..", "src", "config", "db"));
const service = require(path.join("..", "src", "modules", "proposals", "proposals.service"));

const originalConnect = pool.connect.bind(pool);

function user(overrides = {}) {
  return {
    id: 22,
    dealership_id: 7,
    role: "seller",
    ...overrides
  };
}

function mockClient(handler) {
  const calls = [];
  const client = {
    query: async (sql, params = []) => {
      calls.push({ sql: String(sql), params });
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
        return { rows: [] };
      }
      return handler(String(sql), params);
    },
    release: () => {
      calls.push({ sql: "RELEASE", params: [] });
    }
  };
  pool.connect = async () => client;
  return calls;
}

describe("proposal contract flow", () => {
  afterEach(() => {
    pool.connect = originalConnect;
  });

  test("aceita proposta e cria venda + contrato em uma transacao", async () => {
    const calls = mockClient((sql, params) => {
      if (sql.includes("FROM proposals p") && sql.includes("FOR UPDATE")) {
        assert.deepStrictEqual(params, [15, 7]);
        return {
          rows: [
            {
              id: 15,
              dealership_id: 7,
              client_id: 3,
              vehicle_id: 4,
              price: "90000",
              status: "open",
              notes: "Proposta inicial",
              vehicle_status: "available",
              vehicle_sold_at: null,
              sale_id: null,
              contract_id: null
            }
          ]
        };
      }
      if (sql.includes("INSERT INTO sales_approval_history")) {
        assert.deepStrictEqual(params, [31, 22, "Cliente confirmou"]);
        return { rows: [] };
      }
      if (sql.includes("INSERT INTO sales")) {
        assert.strictEqual(params[0], 7);
        assert.strictEqual(params[1], 4);
        assert.strictEqual(params[2], 3);
        assert.strictEqual(params[3], 15);
        assert.strictEqual(params[4], 22);
        assert.strictEqual(params[5], 88000);
        assert.strictEqual(params[6], "financiamento");
        return { rows: [{ id: 31, dealership_id: 7, proposal_id: 15, price: 88000, approval_status: "draft" }] };
      }
      if (sql.includes("INSERT INTO contracts")) {
        assert.strictEqual(params[0], 31);
        assert.strictEqual(params[1], 7);
        return { rows: [{ id: 41, sale_id: 31, dealership_id: 7, status: "draft" }] };
      }
      if (sql.includes("UPDATE proposals")) {
        assert.strictEqual(params[3], 31);
        assert.strictEqual(params[4], 41);
        return {
          rows: [
            {
              id: 15,
              dealership_id: 7,
              status: "accepted",
              sale_id: 31,
              contract_id: 41
            }
          ]
        };
      }
      throw new Error(`Query inesperada: ${sql}`);
    });

    const result = await service.acceptProposal(
      15,
      { price: 88000, payment_method: "financiamento", notes: "Cliente confirmou" },
      user()
    );

    assert.strictEqual(result.proposal.status, "accepted");
    assert.strictEqual(result.sale.id, 31);
    assert.strictEqual(result.contract.id, 41);
    assert.ok(calls.some((call) => call.sql === "BEGIN"));
    assert.ok(calls.some((call) => call.sql === "COMMIT"));
  });

  test("bloqueia proposta ja aceita e faz rollback", async () => {
    const calls = mockClient((sql) => {
      if (sql.includes("FROM proposals p") && sql.includes("FOR UPDATE")) {
        return {
          rows: [
            {
              id: 15,
              dealership_id: 7,
              price: "90000",
              status: "accepted",
              sale_id: 31,
              contract_id: 41
            }
          ]
        };
      }
      throw new Error(`Query inesperada: ${sql}`);
    });

    await assert.rejects(
      () => service.acceptProposal(15, {}, user()),
      (err) => err.payload?.error === "PROPOSAL_ALREADY_ACCEPTED"
    );
    assert.ok(calls.some((call) => call.sql === "ROLLBACK"));
  });

  test("usuario sem papel comercial nao aceita proposta", async () => {
    await assert.rejects(
      () => service.acceptProposal(15, {}, user({ role: "cliente" })),
      /permissao/
    );
  });
});
