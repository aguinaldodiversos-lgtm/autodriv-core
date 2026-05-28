const express = require("express");
const router = express.Router();

const authenticate = require("../../middlewares/auth");
const requireAuth = authenticate.withSubscription;
const { requireBillingEntitlement } = require("../billing/entitlement.guard");

const controller = require("./vehicles.controller");

/* =========================
   ROTAS (exigem assinatura ativa)
========================= */

router.get("/", requireAuth, controller.getVehicles);

router.get("/:id", requireAuth, controller.getVehicleById);

router.post("/", requireAuth, requireBillingEntitlement("vehicles:create"), controller.createVehicle);

router.put("/:id", requireAuth, requireBillingEntitlement("vehicles:update"), controller.updateVehicle);

router.delete("/:id", requireAuth, requireBillingEntitlement("vehicles:update"), controller.deleteVehicle);

router.post(
  "/:id/apply-suggestion",
  requireAuth,
  controller.applyVehicleSuggestion
);

module.exports = router;
