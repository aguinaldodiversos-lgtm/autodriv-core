// src/modules/contracts/contracts.routes.js

const express = require("express");
const router = express.Router();
const controller = require("./contracts.controller");
const auth = require("../../middlewares/auth");

router.post("/:id/send-approval", auth, controller.sendForApproval);
router.post("/:id/approve", auth, controller.approve);
router.post("/:id/reject", auth, controller.reject);
router.post("/:contractId/generate", auth, controller.generate);

module.exports = router;
