const express = require("express");
const controller = require("./billing.controller");

const router = express.Router();

router.get("/plans", controller.listPlans);
router.post("/plans", controller.createPlan);
router.patch("/plans/:id", controller.updatePlan);

router.get("/subscriptions", controller.listSubscriptions);
router.get("/subscriptions/:id", controller.getSubscription);
router.post("/subscriptions/:id/sync", controller.syncSubscription);
router.post("/subscriptions/:id/cancel", controller.cancelSubscription);
router.post("/subscriptions/:id/reactivate", controller.reactivateSubscription);
router.post("/subscriptions/:id/manual-override", controller.manualOverride);

module.exports = router;
