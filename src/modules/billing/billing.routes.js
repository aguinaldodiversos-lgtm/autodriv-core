const express = require("express");
const controller = require("./billing.controller");

const router = express.Router();

router.get("/my-subscription", controller.mySubscription);
router.post("/checkout/subscription", controller.checkoutSubscription);
router.post("/subscription/cancel", controller.cancelMySubscription);
router.post("/subscription/sync", controller.syncMySubscription);
router.get("/entitlements", controller.entitlements);

module.exports = router;
