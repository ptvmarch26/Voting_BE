const Vote = require("../models/voteModel");
const { contract } = require("../config/blockchain");

const initListener = async () => {
  contract.on("VotePublished", async (nullifier, hashCipher) => {
    console.log(" New vote event:", hashCipher);
    const vote = await Vote.findOne({ hash_cipher: hashCipher });
    if (vote) {
      vote.isValid = true;
      await vote.save();
      console.log("DB updated:", hashCipher);
    } else {
      console.warn("Received event not found in DB");
    }
  });
};

module.exports = { initListener };
