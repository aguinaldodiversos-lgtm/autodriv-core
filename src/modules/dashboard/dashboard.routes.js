const express = require("express");
const controller = require("./dashboard.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

/* =========================
   DASHBOARD PRINCIPAL
========================= */
router.get("/", auth, controller.getStats);

/* =========================
   SCORE DE RECUPERAÇÃO
========================= */
router.get("/recovery", auth, controller.recoveryStats);

module.exports = router;
