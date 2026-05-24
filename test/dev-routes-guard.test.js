const assert = require("assert");
const { test, describe, before, after } = require("node:test");
const path = require("path");

const modPath = path.join("..", "src", "middlewares", "devRoutesGuard");

describe("devRoutesGuard", () => {
  const prev = { ...process.env };

  after(() => {
    Object.keys(process.env).forEach((k) => {
      if (!(k in prev)) delete process.env[k];
    });
    Object.assign(process.env, prev);
  });

  test("segredo muito curto: 500", () => {
    process.env.DEV_ROUTES_SECRET = "short";
    const { devRoutesGuard } = require(modPath);
    let code;
    const res = {
      status: (c) => {
        code = c;
        return res;
      },
      json: () => res
    };
    devRoutesGuard({ headers: {} }, res, () => assert.fail("não deveria passar"));
    assert.strictEqual(code, 500);
  });

  test("segredo bom + header errado: 401", () => {
    process.env.DEV_ROUTES_SECRET = "x".repeat(16);
    const { devRoutesGuard } = require(modPath);
    let code;
    const res = {
      status: (c) => {
        code = c;
        return res;
      },
      json: () => res
    };
    devRoutesGuard({ headers: { "x-dev-routes-secret": "wrong" } }, res, () => assert.fail());
    assert.strictEqual(code, 401);
  });

  test("segredo e header a coincidir: chama next", (t) => {
    const secret = "k".repeat(16);
    process.env.DEV_ROUTES_SECRET = secret;
    const { devRoutesGuard } = require(modPath);
    let nextCalled;
    const res = { status: () => res, json: () => res };
    devRoutesGuard(
      { headers: { "x-dev-routes-secret": secret } },
      res,
      () => {
        nextCalled = true;
      }
    );
    assert.strictEqual(nextCalled, true);
  });
});
