const mongoose = require("mongoose");

const voterSchema = new mongoose.Schema({
  hashed_key: { type: String, required: true, index: true },
  election_id: { type: String, required: true, index: true },
  merkle_proof: {
    path_elements: [String],
    path_indices: [String],
  },
  is_valid: { type: Boolean, default: false },
  pk_secp: { type: String, required: true },
});

voterSchema.index({ election_id: 1, hashed_key: 1 });

const Voter = mongoose.model("Voter", voterSchema);

module.exports = Voter;
