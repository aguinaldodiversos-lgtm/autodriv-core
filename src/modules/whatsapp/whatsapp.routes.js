const express = require("express");
const controller = require("./whatsapp.controller");
const auth = require("../../middlewares/auth");
const checkPlanLimit = require("../../middlewares/plan.middleware");
const { requireBillingEntitlement } = require("../billing/entitlement.guard");

const router = express.Router();

/* =====================================================
   CONECTAR WHATSAPP (APENAS MASTER)
===================================================== */
router.post(
  "/connect",
  auth,
  requireBillingEntitlement("whatsapp:connect"),
  checkPlanLimit("whatsapp"),
  controller.connect
);

module.exports = router;
