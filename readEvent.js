const { contractGanache } = require("./config/blockchain");

(async () => {
  const events = await contractGanache.queryFilter("TrusteeRegistered");
  console.log(events);
})();