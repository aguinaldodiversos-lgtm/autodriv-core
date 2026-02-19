const express = require("express");
const controller = require("./funnel.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/", auth, controller.getFunnelAnalysis);

module.exports = router;
