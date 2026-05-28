const express = require("express");
const controller = require("./sellerActions.controller");
const auth = require("../../middlewares/auth");

const router = express.Router();

router.get("/", auth, controller.list);
router.post("/:id/claim", auth, controller.claim);
router.post("/:id/complete", auth, controller.complete);
router.post("/:id/dismiss", auth, controller.dismiss);

module.exports = router;
