const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth");

const controller = require("./vehicles.controller");

/* =========================
   ROTAS
========================= */

router.get("/", auth, controller.getVehicles);

router.get("/:id", auth, controller.getVehicleById);

router.post("/", auth, controller.createVehicle);

router.put("/:id", auth, controller.updateVehicle);

router.delete("/:id", auth, controller.deleteVehicle);

router.post(
  "/:id/apply-suggestion",
  auth,
  controller.applyVehicleSuggestion
);

module.exports = router;
