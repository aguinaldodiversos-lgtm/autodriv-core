const express = require("express");
const controller = require("./pipeline.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.get("/", auth, controller.getPipeline);
router.put("/:id/stage", auth, controller.updateStage);

module.exports = router;
