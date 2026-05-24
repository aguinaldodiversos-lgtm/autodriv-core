const assert = require("assert");
const { test, describe } = require("node:test");
const path = require("path");
const { getClientIpForRateLimit } = require(
  path.join("..", "src", "utils", "clientIp")
);

describe("getClientIpForRateLimit (evitar bucket único indevido)", () => {
  test("com req.ip (Express pós–trust proxy) usa esse valor", () => {
    const ip = getClientIpForRateLimit({ ip: "203.0.113.1", socket: { remoteAddress: "10.0.0.1" } });
    assert.strictEqual(ip, "203.0.113.1");
  });

  test("sem req.ip cai no remoteAddress", () => {
    const ip = getClientIpForRateLimit({ ip: null, socket: { remoteAddress: "10.0.0.2" } });
    assert.strictEqual(ip, "10.0.0.2");
  });
});
