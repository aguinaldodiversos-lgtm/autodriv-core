const express = require("express");
const rateLimit = require("express-rate-limit");
const controller = require("./billing.controller");

const router = express.Router();

const mercadoPagoWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.MERCADO_PAGO_WEBHOOK_RATE_LIMIT_MAX || "120", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas notificacoes. Tente novamente." }
});

router.post("/mercado-pago", mercadoPagoWebhookLimiter, controller.webhook);

module.exports = router;
