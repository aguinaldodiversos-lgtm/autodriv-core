const express = require("express");
const controller = require("./dashboard.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/alerts", auth, controller.alerts);

module.exports = router;
