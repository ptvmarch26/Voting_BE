const express = require("express");
const router = express.Router();

const voterRoutes = require("./voterRoutes");
const caRoutes = require("./adminRoutes");

const votingRoutes = require("./votingRoutes");

const organizationRoutes = require("./organizationRoutes");
const zkpRoutes = require("./zkpRoutes");

router.use("/voter", voterRoutes);
router.use("/ca", caRoutes);

router.use("/voting", votingRoutes);

router.use("/organization", organizationRoutes);

router.use("/zkp", zkpRoutes);

module.exports = router;
