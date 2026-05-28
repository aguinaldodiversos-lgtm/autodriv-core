const { test, describe, afterEach } = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
const path = require("path");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "postgresql://test:test@127.0.0.1:65432/autodriv_test_unreachable";
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "01234567890123456789012345678901";
}

const pool = require(path.join("..", "src", "config", "db"));
const mercadoPago = require(path.join("..", "src", "modules", "billing", "mercadoPago.client"));
const billingService = require(path.join("..", "src", "modules", "billing", "billing.service"));

const originalQuery = pool.query.bind(pool);
const originalSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;

function signature({ dataId, requestId, ts, secret }) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const hmac = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${hmac}`;
}

describe("billing security", () => {
  afterEach(() => {
    pool.query = originalQuery;
    if (originalSecret === undefined) {
      delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    } else {
      process.env.MERCADO_PAGO_WEBHOOK_SECRET = originalSecret;
    }
  });

  test("valida assinatura oficial do webhook Mercado Pago", () => {
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = "secret-test";
    const ts = Date.now();
    const requestId = "req-123";
    const dataId = "pay-123";

    const result = mercadoPago.verifyWebhookSignature({
      headers: {
        "x-request-id": requestId,
        "x-signature": signature({
          dataId,
          requestId,
          ts,
          secret: process.env.MERCADO_PAGO_WEBHOOK_SECRET
        })
      },
      query: { "data.id": dataId }
    });

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.dataId, dataId);
  });

  test("rejeita webhook sem segredo configurado", () => {
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;

    const result = mercadoPago.verifyWebhookSignature({
      headers: { "x-request-id": "req", "x-signature": "ts=1,v1=abc" },
      query: { "data.id": "123" }
    });

    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.reason, "missing_webhook_secret");
  });

  test("bloqueia recurso pago quando billing interno esta suspenso", async () => {
    pool.query = async (sql, params) => {
      const s = String(sql);
      if (s.includes("FROM account_subscriptions")) {
        assert.strictEqual(params[0], 7);
        return {
          rows: [
            {
              id: 10,
              dealership_id: 7,
              plan_id: 1,
              status: "suspended",
              grace_until: null
            }
          ]
        };
      }
      return { rows: [] };
    };

    const decision = await billingService.getAccessDecision(7, "vehicles:create");
    assert.strictEqual(decision.allowed, false);
    assert.strictEqual(decision.status, "suspended");
  });

  test("mantem compatibilidade com assinatura legada ativa", async () => {
    pool.query = async (sql, params) => {
      const s = String(sql);
      assert.strictEqual(params[0], 7);
      if (s.includes("FROM account_subscriptions")) return { rows: [] };
      if (s.includes("FROM subscriptions")) {
        return { rows: [{ plan: "master", status: "active" }] };
      }
      return { rows: [] };
    };

    const decision = await billingService.getAccessDecision(7, "vehicles:create");
    assert.strictEqual(decision.allowed, true);
    assert.strictEqual(decision.status, "active");
  });
});
