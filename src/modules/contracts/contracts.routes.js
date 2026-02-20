// src/modules/contracts/contracts.routes.js

const express = require("express");
const router = express.Router();
const controller = require("./contracts.controller");
const authMiddleware = require("../../middlewares/auth.middleware");

router.post("/:id/send-approval", authMiddleware, controller.sendForApproval);
router.post("/:id/approve", authMiddleware, controller.approve);
router.post("/:id/reject", authMiddleware, controller.reject);
router.post("/:saleId/generate", authMiddleware, controller.generate);

module.exports = router;
