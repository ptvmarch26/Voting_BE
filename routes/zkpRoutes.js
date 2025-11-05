const express = require("express");
const router = express.Router();
const ZKPController = require("../controllers/zkpController");

router.post("/verify-vote", ZKPController.verifyValidVote);
// router.post("/verify-cipher-all", ZKPController.verifyValidCipherAll);

module.exports = router;
