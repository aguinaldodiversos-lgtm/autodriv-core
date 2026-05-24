const express = require("express");
const controller = require("./dashboard.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/", auth, controller.getStats);
router.get("/recovery", auth, controller.recoveryStats);
router.get("/alerts", auth, controller.alerts);
router.get("/forecast", auth, controller.forecast);
router.get("/operations", auth, controller.operations);
router.get("/intelligence-actions", auth, controller.intelligenceActions);

module.exports = router;
