const express = require("express");
const auth = require("../../middlewares/auth");
const controller = require("./intelligence.controller");

const router = express.Router();

router.get("/today", auth, controller.today);
router.get("/learning-metrics", auth, controller.learningMetrics);
router.patch("/actions/:id/feedback", auth, controller.feedback);
router.post("/actions/:id/outcome", auth, controller.outcome);

module.exports = router;
