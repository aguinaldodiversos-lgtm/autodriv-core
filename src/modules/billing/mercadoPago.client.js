const axios = require("axios");
const crypto = require("crypto");

const API_BASE_URL = "https://api.mercadopago.com";

function getAccessToken() {
  return process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || "";
}

function requireAccessToken() {
  const token = getAccessToken();
  if (!token) {
    const err = new Error("MERCADO_PAGO_ACCESS_TOKEN nao configurado");
    err.statusCode = 503;
    throw err;
  }
  return token;
}

function api() {
  return axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
      Authorization: `Bearer ${requireAccessToken()}`,
      "Content-Type": "application/json"
    }
  });
}

async function createPreapproval(payload, idempotencyKey) {
  const headers = idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : undefined;
  const { data } = await api().post("/preapproval", payload, { headers });
  return data;
}

async function getPreapproval(preapprovalId) {
  const { data } = await api().get(`/preapproval/${encodeURIComponent(preapprovalId)}`);
  return data;
}

async function updatePreapproval(preapprovalId, payload) {
  const { data } = await api().put(`/preapproval/${encodeURIComponent(preapprovalId)}`, payload);
  return data;
}

async function getAuthorizedPayment(id) {
  const { data } = await api().get(`/authorized_payments/${encodeURIComponent(id)}`);
  return data;
}

async function searchAuthorizedPayments(params) {
  const { data } = await api().get("/authorized_payments/search", { params });
  return data;
}

async function getPayment(paymentId) {
  const { data } = await api().get(`/v1/payments/${encodeURIComponent(paymentId)}`);
  return data;
}

function parseSignatureHeader(signatureHeader) {
  const result = {};
  for (const part of String(signatureHeader || "").split(",")) {
    const [key, value] = part.split("=");
    if (key && value) result[key.trim()] = value.trim();
  }
  return result;
}

function safeCompareHex(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function verifyWebhookSignature({ headers, query }) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET || "";
  if (!secret) {
    return { valid: false, reason: "missing_webhook_secret" };
  }

  const signature = headers["x-signature"];
  const requestId = headers["x-request-id"];
  const dataId = query["data.id"] || query.data_id || query.id;
  const parts = parseSignatureHeader(signature);

  if (!signature || !requestId || !parts.ts || !parts.v1 || !dataId) {
    return { valid: false, reason: "missing_signature_fields" };
  }

  const maxSkewMs = parseInt(process.env.MERCADO_PAGO_WEBHOOK_TOLERANCE_MS || "300000", 10);
  const timestamp = Number(parts.ts);
  if (Number.isFinite(timestamp) && Math.abs(Date.now() - timestamp) > maxSkewMs) {
    return { valid: false, reason: "timestamp_outside_tolerance" };
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${parts.ts};`;
  const expected = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  const valid = safeCompareHex(expected, parts.v1);

  return {
    valid,
    reason: valid ? null : "signature_mismatch",
    requestId: String(requestId),
    dataId: String(dataId)
  };
}

module.exports = {
  API_BASE_URL,
  createPreapproval,
  getPreapproval,
  updatePreapproval,
  getAuthorizedPayment,
  searchAuthorizedPayments,
  getPayment,
  verifyWebhookSignature
};
