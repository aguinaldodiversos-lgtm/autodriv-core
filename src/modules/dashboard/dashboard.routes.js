const express = require("express");
const controller = require("./dashboard.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/alerts", auth, controller.getAlerts);

module.exports = router;
