const fs = require("fs");
const { ethers } = require("ethers");
const dotenv = require("dotenv");
const { contract } = require("./config/blockchain");

dotenv.config();

async function fetchCipherTotals() {
  try {
    console.log("🔗 Connecting to provider...");
    const provider = contract.runner.provider; // lấy provider từ contract có sẵn
    const startBlock = 9472966;

    const latestBlock = await provider.getBlockNumber();
    const step = 8; // Alchemy free tier chỉ cho phép 10 block
    console.log(`📡 Fetching events from ${startBlock} → ${latestBlock} (step=${step})...`);

    const allEvents = [];

    for (let from = startBlock; from <= latestBlock; from += step) {
      const to = Math.min(from + step - 1, latestBlock);
      console.log(`⛏️  Fetching events ${from} → ${to} ...`);
      const events = await contract.queryFilter("CipherTotalPublished", from, to);
    //   console.log(`   ↳ Found ${events.length} events.`);
      allEvents.push(...events);
    }

    console.log(`✅ Total events collected: ${allEvents.length}`);

    const C1_total_x = [];
    const C1_total_y = [];
    const C2_total_x = [];
    const C2_total_y = [];

    for (const e of allEvents) {
      const { candidateId, C1_total, C2_total } = e.args;
      C1_total_x.push(C1_total[0].toString());
      C1_total_y.push(C1_total[1].toString());
      C2_total_x.push(C2_total[0].toString());
      C2_total_y.push(C2_total[1].toString());
    }

    const result = {
      nCandidates: allEvents.length,
      fromBlock: startBlock,
      toBlock: latestBlock,
      C1_total_x,
      C1_total_y,
      C2_total_x,
      C2_total_y,
    };

    fs.writeFileSync("tally_result.json", JSON.stringify(result, null, 2));
    console.log("💾 Saved result to tally_result.json");
  } catch (err) {
    console.error("❌ Error fetching totals:", err);
  }
}

fetchCipherTotals();
