const express = require("express");
const controller = require("./vehicles.controller");
const auth = require("../../middlewares/auth.middleware");
const checkPlan = require("../../middlewares/plan.middleware");

const router = express.Router();

router.get("/", auth, controller.list);

router.post(
  "/",
  auth,
  checkPlan("vehicles"),
  controller.create
);

module.exports = router;
