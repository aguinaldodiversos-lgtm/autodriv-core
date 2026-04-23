const express = require("express");
const controller = require("./integrations.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.post(
  "/carros-na-cidade/:vehicleId",
  auth,
  controller.publishCNC
);

module.exports = router;
