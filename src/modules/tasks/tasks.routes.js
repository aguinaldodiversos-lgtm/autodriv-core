const express = require("express");
const controller = require("./tasks.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/", auth, controller.list);
router.patch("/:id/complete", auth, controller.complete);

module.exports = router;
