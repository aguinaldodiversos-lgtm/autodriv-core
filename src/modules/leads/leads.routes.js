const express = require("express");
const controller = require("./leads.controller");
const auth = require("../../middlewares/auth.middleware");
const checkPlanLimit = require("../../middlewares/plan.middleware");

const router = express.Router();

router.get("/", auth, controller.list);
router.post("/:id/reactivate", auth, controller.reactivate);
router.post("/", auth, checkPlanLimit("leads"), controller.create);
router.put("/:id", auth, controller.update);
router.delete("/:id", auth, controller.remove);
router.get("/:id/score", auth, controller.getScore);

module.exports = router;
