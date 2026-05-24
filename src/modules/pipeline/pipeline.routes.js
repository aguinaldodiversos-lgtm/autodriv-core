const express = require("express");
const controller = require("./pipeline.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/", auth, controller.getPipeline);
router.get("/stages", auth, controller.listStages);
router.post("/stages", auth, controller.upsertStage);
router.get("/close-reasons", auth, controller.listCloseReasons);
router.post("/close-reasons", auth, controller.upsertCloseReason);
router.put("/:id/stage", auth, controller.updateStage);
router.get("/:id/activities", auth, controller.listActivities);
router.post("/:id/activities", auth, controller.addActivity);

module.exports = router;
