const express = require("express");
const controller = require("./whatsappAi.controller");

const router = express.Router();

router.get("/settings", controller.getSettings);
router.patch("/settings", controller.updateSettings);
router.post("/test-classify", controller.testClassify);
router.post("/test-reply", controller.testReply);

module.exports = router;
