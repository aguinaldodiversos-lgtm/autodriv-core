const express = require("express");
const controller = require("./goal.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.post("/set", auth, controller.setGoal);
router.get("/progress", auth, controller.getProgress);

module.exports = router;
