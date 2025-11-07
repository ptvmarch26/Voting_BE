const { contractGanache } = require("./config/blockchain");

(async () => {
  const events = await contractGanache.queryFilter("PartialDecryptionSubmitted");
  console.log(events);
})();