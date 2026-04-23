/**
 * Smoke HTTP para rotas críticas. Requer API já a correr (ex.: npm start).
 * Lê .env na raiz só para SMOKE_* opcionais; o servidor precisa de DATABASE_URL + JWT_SECRET (≥32 chars).
 *
 * Uso: npm run smoke:critical
 * Opcional: SMOKE_BASE_URL, SMOKE_TOKEN (pula registo), SMOKE_EMAIL, SMOKE_PASSWORD, SMOKE_DEALERSHIP
 */

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const base =
  process.env.SMOKE_BASE_URL ||
  `http://127.0.0.1:${process.env.PORT || 10000}`;

function log(step, ok, detail) {
  const mark = ok ? "OK" : "FAIL";
  console.log(`[${mark}] ${step}${detail != null ? `: ${detail}` : ""}`);
}

async function readJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { _raw: text };
  }
}

async function main() {
  console.log(`Base URL: ${base}`);

  let token = process.env.SMOKE_TOKEN;
  const password = process.env.SMOKE_PASSWORD || "SmokeTest!23456";
  const email =
    process.env.SMOKE_EMAIL || `smoke_${Date.now()}@example.test`;
  const dealership =
    process.env.SMOKE_DEALERSHIP || "Smoke Dealership";

  if (!token) {
    const reg = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dealership_name: dealership,
        name: "Smoke User",
        email,
        password
      })
    });
    const body = await readJson(reg);
    if (!reg.ok) {
      throw new Error(
        `Registo falhou ${reg.status}: ${JSON.stringify(body)}`
      );
    }
    token = body.token;
    log("POST /api/auth/register", true, email);
  } else {
    log("auth", true, "SMOKE_TOKEN");
  }

  const auth = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  const checks = [];

  {
    const res = await fetch(`${base}/api/leads`, { headers: auth });
    const ok = res.ok;
    checks.push(ok);
    log("GET /api/leads", ok, res.status);
  }

  let leadId;
  {
    const res = await fetch(`${base}/api/leads`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({
        phone: `+3519${String(Date.now()).slice(-8)}`,
        name: "Smoke Lead"
      })
    });
    const body = await readJson(res);
    const ok = res.ok && body && body.id;
    leadId = body && body.id;
    checks.push(ok);
    log("POST /api/leads", ok, res.status);
  }

  {
    const res = await fetch(`${base}/api/inbox`, { headers: auth });
    const ok = res.ok;
    checks.push(ok);
    log("GET /api/inbox", ok, res.status);
  }

  if (leadId != null) {
    const res = await fetch(`${base}/api/inbox/${leadId}`, {
      headers: auth
    });
    const ok = res.ok;
    checks.push(ok);
    log(`GET /api/inbox/${leadId}`, ok, res.status);
  } else {
    checks.push(false);
    log("GET /api/inbox/:leadId", false, "sem leadId");
  }

  if (leadId != null) {
    const res = await fetch(`${base}/api/leads/${leadId}/score`, {
      headers: auth
    });
    const ok = res.ok;
    checks.push(ok);
    log(`GET /api/leads/${leadId}/score`, ok, res.status);
  } else {
    checks.push(false);
    log("GET /api/leads/:id/score", false, "sem leadId");
  }

  let saleId;
  {
    const res = await fetch(`${base}/api/sales`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ sale_price: 1 })
    });
    const body = await readJson(res);
    const ok = res.ok && body && body.id != null;
    saleId = body && body.id;
    checks.push(ok);
    log("POST /api/sales (rascunho)", ok, res.status);
  }

  if (saleId != null) {
    const res = await fetch(`${base}/api/sales/${saleId}/submit`, {
      method: "POST",
      headers: auth
    });
    const ok = res.ok;
    checks.push(ok);
    log(`POST /api/sales/${saleId}/submit`, ok, res.status);
  } else {
    checks.push(false);
    log("POST /api/sales/:id/submit", false, "sem saleId");
  }

  {
    const fakeId = 999999999;
    const res = await fetch(`${base}/api/contracts/${fakeId}/send-approval`, {
      method: "POST",
      headers: auth
    });
    const body = await readJson(res);
    const ok =
      res.status === 400 &&
      (body.message || body.error || "").includes("não encontrado");
    checks.push(ok);
    log(
      "POST /api/contracts/:id/send-approval (id inexistente → 400)",
      ok,
      res.status
    );
  }

  const failed = checks.filter((c) => !c).length;
  if (failed) {
    console.error(`\nSmoke terminou com ${failed} falha(s).`);
    process.exit(1);
  }
  console.log("\nSmoke crítico: todas as verificações passaram.");
}

main().catch((err) => {
  console.error(err.message || err);
  if (err.cause?.code === "ECONNREFUSED") {
    console.error(
      "Ligação recusada — inicia o servidor (npm start) com .env válido."
    );
  }
  process.exit(1);
});
