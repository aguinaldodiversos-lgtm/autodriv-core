const express = require("express");
const controller = require("./sales.controller");
const auth = require("../../middlewares/auth.middleware");

const router = express.Router();

router.post("/", auth, controller.create);
router.post("/:id/submit", auth, controller.submit);
router.post("/:id/approve", auth, controller.approve);
router.post("/:id/reject", auth, controller.reject);

module.exports = router;
