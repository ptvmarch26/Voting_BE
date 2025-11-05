const { groth16 } = require("snarkjs");
require("dotenv").config();
const { ethers } = require("ethers");
const electionABI = require("./artifacts/Election.json").abi;
const fs = require("fs");
const path = require("path");


async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

  // 🧠 Khởi tạo 3 trustee (admin cũng là 1)
  const admin = new ethers.Wallet(process.env.CA_PRIVATE_KEY, provider); // trustee3
  const t1 = new ethers.Wallet(process.env.PRIVATE_KEY_T1, provider);
  const t2 = new ethers.Wallet(process.env.PRIVATE_KEY_T2, provider);

  const contract = new ethers.Contract(
    process.env.CONTRACT_ADDRESS,
    electionABI,
    provider
  );

  console.log("🧾 Contract:", await contract.getAddress());
  console.log("👑 Admin / Trustee3:", admin.address);

  // 🧠 Hàm verify
  async function verify(trustee, name) {
    const instance = contract.connect(trustee);
    const signerAddr = await trustee.getAddress();
    console.log(`📌 Connected as ${name}: ${signerAddr}`);

    try {
      // 📥 đọc proof & publicSignals
      const proof = JSON.parse(
        fs.readFileSync("./ZKP/build/PartialDecryption_proof.json", "utf8")
      );
      const publicSignals = JSON.parse(
        fs.readFileSync("./ZKP/build/PartialDecryption_public.json", "utf8")
      );

      // 🧩 3️⃣ Verify off-chain (chắc chắn proof hợp lệ)
      const vKeyPath = path.join(
        __dirname,
        "./ZKP/build/verification_key.json"
      );
      const vKey = JSON.parse(fs.readFileSync(vKeyPath, "utf8"));

      const verified = await groth16.verify(vKey, publicSignals, proof);
      if (!verified) throw new Error("❌ Proof verify thất bại off-chain!");
      console.log("✅ Proof verify off-chain thành công");

      // 🧩 chuẩn bị dữ liệu gọi Solidity
      const calldata = await groth16.exportSolidityCallData(
        proof,
        publicSignals
      );
      const argv = calldata
        .replace(/["[\]\s]/g, "")
        .split(",")
        .map((x) => BigInt(x).toString());

      const a = [argv[0], argv[1]];
      const b = [
        [argv[2], argv[3]],
        [argv[4], argv[5]],
      ];
      const c = [argv[6], argv[7]];
      const inputSignals = argv.slice(8);

      console.log("🧩 a:", a);
      console.log("🧩 b:", b);
      console.log("🧩 c:", c);
      console.log("🧩 inputs:", inputSignals);

      // ✅ gọi hàm verifyPartialProof trên chain
      const tx = await instance.verifyPartialProof(a, b, c, inputSignals);
      // console.log(`✅ ${name} verifyPartialProof tx:`, tx);
      receipt = await tx.wait();
      // console.log(`🎯 ${name} done.`, receipt);
    } catch (err) {
      console.error(
        `❌ ${name} verifyPartialProof error:`,
        err.reason || err.message
      );
    }
  }

  // 🚀 Chạy lần lượt
  await verify(t1, "Trustee1");
}

main();
