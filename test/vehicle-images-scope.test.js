/**
 * Escopo: upload/listagem de imagens só com veículo da mesma loja (IDOR/OWASP).
 */
const { test, describe, afterEach } = require("node:test");
const assert = require("node:assert");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const path = require("path");

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
const service = require(path.join("..", "src", "modules", "images", "images.service"));

const originalQuery = pool.query.bind(pool);

function token(dealershipId) {
  return jwt.sign(
    { user_id: 7, dealership_id: dealershipId },
    process.env.JWT_SECRET
  );
}

function userRow(did) {
  return { id: 7, email: "u@t.com", dealership_id: did, role: "admin" };
}

function activeSubscription() {
  return {
    id: 1,
    plan: "master",
    status: "active",
    current_period_end: new Date(Date.now() + 86400000)
  };
}

describe("vehicle images: auth obrigatório", () => {
  afterEach(() => {
    pool.query = originalQuery;
  });

  test("GET /api/images/1 sem token → 401", async () => {
    const res = await request(app).get("/api/images/1");
    assert.strictEqual(res.status, 401);
  });

  test("POST /api/images/1 sem token → 401", async () => {
    const res = await request(app)
      .post("/api/images/1")
      .attach("image", Buffer.from("x"), { filename: "a.jpg" })
      .set("Content-Type", "multipart/form-data");
    assert.strictEqual(res.status, 401);
  });
});

describe("vehicle images: escopo e upload", () => {
  afterEach(() => {
    pool.query = originalQuery;
  });

  test("Loja 1: upload com veículo da Loja 1 → 200 e INSERT escopado", async () => {
    pool.query = async (sql, params) => {
      const s = String(sql);
      if (s.includes("FROM users") && s.includes("WHERE id")) {
        return { rows: [userRow(1)] };
      }
      if (s.includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (s.includes("INSERT INTO vehicle_images") && s.includes("FROM vehicles v")) {
        assert.strictEqual(params[3], 1, "dealership do insert");
        return {
          rows: [
            {
              id: 5,
              vehicle_id: 10,
              image_url: "/tmp/x",
              is_main: false
            }
          ]
        };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .post("/api/images/10")
      .set("Authorization", `Bearer ${token(1)}`)
      .attach("image", Buffer.from("fake"), {
        filename: "f.jpg",
        contentType: "image/jpeg"
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.vehicle_id, 10);
  });

  test("Loja 1, veículo Loja 2: insert vazio + SELECT → 403", async () => {
    let insertSeen = false;
    pool.query = async (sql) => {
      const s = String(sql);
      if (s.includes("FROM users") && s.includes("WHERE id")) {
        return { rows: [userRow(1)] };
      }
      if (s.includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (s.includes("INSERT INTO vehicle_images") && s.includes("FROM vehicles v")) {
        insertSeen = true;
        return { rows: [] };
      }
      if (s.includes("SELECT id, dealership_id FROM vehicles WHERE id = $1")) {
        return { rows: [{ id: 10, dealership_id: 2 }] };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .post("/api/images/10")
      .set("Authorization", `Bearer ${token(1)}`)
      .attach("image", Buffer.from("x"), { filename: "a.jpg" });

    assert.strictEqual(insertSeen, true);
    assert.strictEqual(res.status, 403);
    assert.match(res.body.error, /outra loja/);
  });

  test("Loja 2, veículo Loja 1: 403", async () => {
    pool.query = async (sql) => {
      if (String(sql).includes("FROM users") && String(sql).includes("WHERE id")) {
        return { rows: [userRow(2)] };
      }
      if (String(sql).includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (String(sql).includes("INSERT INTO vehicle_images") && String(sql).includes("vehicles v")) {
        return { rows: [] };
      }
      if (String(sql).includes("SELECT id, dealership_id FROM vehicles")) {
        return { rows: [{ id: 1, dealership_id: 1 }] };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .post("/api/images/1")
      .set("Authorization", `Bearer ${token(2)}`)
      .attach("image", Buffer.from("x"), { filename: "a.jpg" });

    assert.strictEqual(res.status, 403);
  });

  test("veículo inexistente: 404", async () => {
    pool.query = async (sql) => {
      if (String(sql).includes("FROM users")) return { rows: [userRow(1)] };
      if (String(sql).includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (String(sql).includes("INSERT INTO vehicle_images")) {
        return { rows: [] };
      }
      if (String(sql).includes("SELECT id, dealership_id FROM vehicles")) {
        return { rows: [] };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .post("/api/images/999")
      .set("Authorization", `Bearer ${token(1)}`)
      .attach("image", Buffer.from("x"), { filename: "a.jpg" });

    assert.strictEqual(res.status, 404);
  });

  test("GET lista: Loja 1 lê veículo da Loja 1", async () => {
    pool.query = async (sql) => {
      if (String(sql).includes("FROM users") && !String(sql).includes("INNER JOIN")) {
        return { rows: [userRow(1)] };
      }
      if (String(sql).includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (String(sql).includes("SELECT id, dealership_id FROM vehicles")) {
        return { rows: [{ id: 1, dealership_id: 1 }] };
      }
      if (String(sql).includes("FROM vehicle_images vi") && String(sql).includes("INNER JOIN")) {
        return { rows: [{ id: 1, image_url: "u", is_main: false }] };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .get("/api/images/1")
      .set("Authorization", `Bearer ${token(1)}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body));
  });

  test("GET lista: outra loja → 403", async () => {
    pool.query = async (sql) => {
      if (String(sql).includes("FROM users") && !String(sql).includes("INNER")) {
        return { rows: [userRow(2)] };
      }
      if (String(sql).includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      if (String(sql).includes("SELECT id, dealership_id FROM vehicles")) {
        return { rows: [{ id: 1, dealership_id: 1 }] };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .get("/api/images/1")
      .set("Authorization", `Bearer ${token(2)}`);

    assert.strictEqual(res.status, 403);
  });

  test("MIME inválido → 400 (multer)", async () => {
    pool.query = async (sql) => {
      if (String(sql).includes("FROM users")) return { rows: [userRow(1)] };
      if (String(sql).includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      return { rows: [] };
    };

    const res = await request(app)
      .post("/api/images/1")
      .set("Authorization", `Bearer ${token(1)}`)
      .attach("image", Buffer.from("x"), {
        filename: "x.gif",
        contentType: "image/gif"
      });

    assert.strictEqual(res.status, 400);
  });

  test("ficheiro acima do limite → 413", async () => {
    pool.query = async (sql) => {
      if (String(sql).includes("FROM users")) return { rows: [userRow(1)] };
      if (String(sql).includes("FROM subscriptions")) {
        return { rows: [activeSubscription()] };
      }
      return { rows: [] };
    };
    const big = Buffer.alloc(5 * 1024 * 1024 + 1, 0xff);
    const res = await request(app)
      .post("/api/images/1")
      .set("Authorization", `Bearer ${token(1)}`)
      .attach("image", big, {
        filename: "h.jpg",
        contentType: "image/jpeg"
      });
    assert.strictEqual(res.status, 413);
  });
});

describe("images.service: unidade", () => {
  test("utilizador sem loja: 403", async () => {
    await assert.rejects(
      () => service.uploadVehicleImage(1, { path: "/p" }, { id: 1, dealership_id: null }),
      (e) => e.statusCode === 403
    );
  });
});
