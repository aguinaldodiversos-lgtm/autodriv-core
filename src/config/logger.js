const pino = require("pino");

const isProd = process.env.NODE_ENV === "production";

module.exports = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie"],
    remove: true
  }
});
