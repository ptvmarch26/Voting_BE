require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
const { groth16 } = require("snarkjs");
const {contractGanache, providerGanache} = require("./config/blockchain");
async function main() {
  

  // 🧠 Khởi tạo 3 trustee (trong đó admin cũng là 1)
  const admin = new ethers.Wallet(process.env.GANACHE_PRIVATE_KEY_T3, providerGanache); // cũng là trustee3
  const t1 = new ethers.Wallet(process.env.GANACHE_PRIVATE_KEY_T1, providerGanache);
  const t2 = new ethers.Wallet(process.env.GANACHE_PRIVATE_KEY_T2, providerGanache);

  console.log("🧾 Contract:", await contractGanache.getAddress());
  console.log("👑 Admin / Trustee3:", admin.address);



  // =============================
  // 1️⃣ Đăng ký 3 trustee
  // =============================
//   const electionAdmin = contractGanache.connect(admin);
//   try {
//     const tx = await electionAdmin.registerTrustees([
//       t1.address,
//       t2.address,
//       admin.address,
//     ]);
//     console.log("📡 registerTrustees tx:", tx.hash);
//     await tx.wait();
//   } catch (err) {
//     console.log("⚠️ Có thể đã đăng ký trước:", err.message);
//   }

  //   // =============================
  //   // 2️⃣ Cả 3 trustee verify proof
  //   // =============================
  async function verify(trustee, name) {
  const instance = contractGanache.connect(trustee);
  const signerAddr = await trustee.getAddress();
  console.log(`📌 Connected as ${name}: ${signerAddr}`);

  try {
    // --- BUILD input object từ share (1 cặp) ---
    const share = JSON.parse(fs.readFileSync("./ZKP/input3.json", "utf8"));

    const input = {
      C1x: share.C1x,
      C1y: share.C1y,
      D_ix: share.D_ix,
      D_iy: share.D_iy,
      PKx: share.PKx,
      PKy: share.PKy,
      s_i: share.s_i
    };

    // --- 1) Sinh proof bằng snarkjs.groth16.fullProve ---
    const wasmPath = path.join(__dirname, "./ZKP/build/PartialDecryption_js/PartialDecryption.wasm");
    const zkeyPath = path.join(__dirname, "./ZKP/build/PartialDecryption.zkey");
    console.log("🧩 Running fullProve...");
    const { proof, publicSignals } = await groth16.fullProve(input, wasmPath, zkeyPath);

    // Lưu proof/public cho debug
    fs.writeFileSync("./ZKP/build/PartialDecryption_proof.json", JSON.stringify(proof, null, 2));
    fs.writeFileSync("./ZKP/build/PartialDecryption_public.json", JSON.stringify(publicSignals, null, 2));

    console.log("✅ Proof created. publicSignals:", publicSignals);

    // --- 2) Verify off-chain with verification key (optional but recommended) ---
    const vKeyPath = path.join(__dirname, "./ZKP/build/PartialDecryption_key.json");
    const vKey = JSON.parse(fs.readFileSync(vKeyPath, "utf8"));
    const verified = await groth16.verify(vKey, publicSignals, proof);
    if (!verified) throw new Error("❌ Proof verify thất bại off-chain!");
    console.log("✅ Proof verify off-chain thành công");

    // --- 3) Chuẩn bị calldata cho Solidity ---
    const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
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

    // --- 4) Gọi hàm verifyPartialProof trên chain ---
    const tx = await instance.verifyPartialProof(a, b, c, inputSignals);
    console.log(`✅ ${name} verifyPartialProof tx:`, tx.hash);
    const receipt = await tx.wait();
    console.log(`🎯 ${name} done. Block: ${receipt.blockNumber}`);
  } catch (err) {
    console.error(`❌ ${name} verifyPartialProof error:`, err.reason || err.message);
  }
}

console.time(`verifyPartialProof time`);
  // 🚀 Chạy lần lượt
  await verify(t2, "Trustee2");
  //   // =============================
  //   // 3️⃣ Cả 3 trustee publish phần giải mã
  //   // =============================

  try {
  const contractWithSigner = contractGanache.connect(t2);

  // 🔹 Đọc mảng D_i (đã tạo sẵn bằng script test7.js)
  // File lưu dạng [[D1x,D1y],[D2x,D2y],...]
  const D_points = JSON.parse(
    fs.readFileSync("./utils/D_array_trustee2.json", "utf8")
  );

  console.log(`📤 Đang gửi ${D_points.length} điểm D_i lên blockchain...`);

  // 🔹 Gửi transaction
  const txPub = await contractWithSigner.publishPartialDecryption(D_points);
  console.log("⛓️  Sent publishPartialDecryption tx:", txPub.hash);

  const receipt = await txPub.wait();
  console.log("✅ publishPartialDecryption confirmed, block:", receipt.blockNumber);

  // 🔹 In ra trạng thái thresholdCount
  const cnt = await contractGanache.thresholdCount();
  console.log("🔢 thresholdCount:", cnt.toString());
} catch (err) {
  console.error("❌ publishPartialDecryption tx failed:", err.reason || err.message);
}
console.timeEnd(`verifyPartialProof time`);

  //   // =============================
  //   // 4️⃣ In trạng thái cuối
  //   // =============================
  //   const pd1 = await contract.partialDecryptions(t1.address);
  //   const pd2 = await contract.partialDecryptions(t2.address);
  //   const pd3 = await contract.partialDecryptions(admin.address);
  //   const count = await contract.thresholdCount();

  //   console.log("\n📦 PartialDecryption:");
  //   console.log(" Trustee1:", pd1);
  //   console.log(" Trustee2:", pd2);
  //   console.log(" Admin (T3):", pd3);
  //   console.log("🔢 thresholdCount:", count.toString());

  //   if (count >= 2) {
  //     console.log("🎉 ✅ Đủ 2/3 trustee đồng ý — Aggregator có thể giải mã.");
  //   } else {
  //     console.log("⚠️ Chưa đủ ngưỡng trustee.");
  //   }
}

main().catch((err) => console.error(err));
