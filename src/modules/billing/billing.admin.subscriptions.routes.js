const express = require("express");
const controller = require("./billing.controller");

const router = express.Router();

router.get("/", controller.listSubscriptions);
router.get("/:id", controller.getSubscription);
router.post("/:id/sync", controller.syncSubscription);
router.post("/:id/cancel", controller.cancelSubscription);
router.post("/:id/reactivate", controller.reactivateSubscription);
router.post("/:id/manual-override", controller.manualOverride);

module.exports = router;
