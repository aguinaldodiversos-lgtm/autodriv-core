const express = require("express");
const controller = require("./integrations.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get(
  "/vehicle/:vehicleId",
  auth,
  controller.listVehicle
);

router.post(
  "/carros-na-cidade/:vehicleId",
  auth,
  controller.publishCNC
);

router.post(
  "/:channel/:vehicleId",
  auth,
  controller.publishChannel
);

module.exports = router;
