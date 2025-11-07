// === CHUYỂN SANG COMMONJS (require) ===
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { buildBabyjub, buildPoseidon } = require("circomlibjs");
const crypto = require("crypto");
// === 1. LẤY CONTRACT TỪ CONFIG CỦA BACKEND ===
// Đây là thay đổi quan trọng nhất:
// Chúng ta tái sử dụng 'contract' đã được khởi tạo ở backend
// ❗️ Đảm bảo đường dẫn này chính xác so với vị trí file script
const { contractGanache } = require("../../config/blockchain");

// =================================================================
// === CÁC HÀM HELPER (LẤY TỪ CODE CỦA BẠN) ===
// =================================================================

/**
 * Hàm mã hóa phiếu bầu (Lấy từ encryptVote.js)
 */
async function encryptVote(babyjub, PKx, PKy, numCandidates, choice) {
  const F = babyjub.F;
  const G = babyjub.Base8;
  const n = babyjub.subOrder;
  const PK = [F.e(PKx), F.e(PKy)]; // Public key hệ thống

  const mVec = Array(numCandidates).fill(0n);
  mVec[choice] = 1n; // Chọn ứng cử viên

  // Tạo số ngẫu nhiên r
  const rVec = Array.from({ length: numCandidates }, () => {
      const rBytes = crypto.randomBytes(32);
      return BigInt("0x" + rBytes.toString("hex")) % n;
    });
  // const rVec = Array.from(
  //   { length: numCandidates },
  //   () => BigInt(Math.floor(Math.random() * 1e6)) + 1n
  // );

  const C1x = [],
    C1y = [],
    C2x = [],
    C2y = [];

  for (let i = 0; i < numCandidates; i++) {
    const r = rVec[i],
      m = mVec[i];

    const C1 = babyjub.mulPointEscalar(G, r);
    const rPK = babyjub.mulPointEscalar(PK, r);
    const mG = babyjub.mulPointEscalar(G, m);
    const C2 = babyjub.addPoint(mG, rPK);

    C1x.push(F.toObject(C1[0]).toString());
    C1y.push(F.toObject(C1[1]).toString());
    C2x.push(F.toObject(C2[0]).toString());
    C2y.push(F.toObject(C2[1]).toString());
  }

  return {
    m: mVec.map(String),
    r: rVec.map(String),
    C1x,
    C1y,
    C2x,
    C2y,
  };
}

/**
 * Hàm tính toán hashCipher (Mô phỏng publicSignals[1] từ ZK Proof)
 */
function calculateHashCipher(poseidon, C1x, C1y, C2x, C2y) {
  let acc = 0n; // Bắt đầu từ 0 (giống F.e(0n))
  const nCandidates = C1x.length;

  for (let i = 0; i < nCandidates; i++) {
    // Hash từng ciphertext (4 thành phần)
    const h = poseidon([
      BigInt(C1x[i]),
      BigInt(C1y[i]),
      BigInt(C2x[i]),
      BigInt(C2y[i]),
    ]);

    // Hash chuỗi tuần tự
    acc = poseidon([acc, h]);
  }

  // Chuẩn hoá về field element
  return poseidon.F.toObject(acc).toString();
}


/**
 * Hàm helper để tạm dừng
 */
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// =================================================================
// === HÀM MAIN SCRIPT ===
// =================================================================

async function main() {
  // === 1. CẤU HÌNH SCRIPT ===
  const SECRETS_FILE_PATH = "./voter_secrets_for_script_100.json"; // ❗️Đảm bảo file này đồng cấp với script
  const OUTPUT_VOTES_JSON = "./simulated_votes_for_db.json"; // ❗️File output mới
  const ELECTION_ID = "ELC2024"; // ❗️ID cuộc bầu cử
  const VOTES_TO_SIMULATE = 10; // Chỉ mô phỏng 5 phiếu bầu cho nhanh
  const DELAY_BETWEEN_VOTES_MS = 500; // 1 giây (có thể giảm)
  // ============================

  // === 2. KHỞI TẠO CÁC DỊCH VỤ ===
  console.log("⚙️  Initializing services (Circomlib)...");

  const babyjub = await buildBabyjub();
  const poseidon = await buildPoseidon();

  console.log(`✅ Contract loaded from backend config.`);
  if (contractGanache) {
    try {
      console.log(
        `✅ Signer address (from config): ${await contractGanache.runner.getAddress()}`
      );
    } catch (e) {
      console.warn("Could not get signer address, continuing...");
    }
  } else {
    console.warn(
      "⚠️  'contract' không tải được, tiếp tục mà không log signer."
    );
  }

  // === 3. LẤY DỮ LIỆU CỬ TRI ===
  const secretsPath = path.join(__dirname, SECRETS_FILE_PATH);
  if (!fs.existsSync(secretsPath)) {
    console.error(`❌ Không tìm thấy file secrets tại: ${secretsPath}`);
    process.exit(1);
  }
  const allVoters = JSON.parse(fs.readFileSync(secretsPath, "utf8"));

  const votersToSimulate = allVoters
    .sort(() => 0.5 - Math.random())
    .slice(0, VOTES_TO_SIMULATE);
  console.log(
    `ℹ️  Loaded ${allVoters.length} voters. Simulating for ${votersToSimulate.length}.`
  );

  // === 4. LẤY CÁC THÔNG SỐ CÔNG KHAI (TỪ FILE CỦA BẠN) ===
  const PKx =
    2604310802931262046103031577287117957977641989763823131879060452055262896253n;
  const PKy =
    5402202502947533840716525119270368361660322597454899932649978655425150017472n;
  const numCandidates = 10;

  // === MỚI: Mảng để lưu kết quả ===
  const voteRecords = [];

  // === 5. BẮT ĐẦU VÒNG LẶP BỎ PHIẾU ===
  for (let i = 0; i < votersToSimulate.length; i++) {
    const voter = votersToSimulate[i];
    const choice = Math.floor(Math.random() * numCandidates); // Bỏ phiếu ngẫu nhiên

    console.log(`\n---
[${i + 1}/${
      votersToSimulate.length
    }] Generating vote for voter (hash): ${voter.hashed_key.substring(0, 15)}...
  Choice: Candidate ${choice}`);

    try {
      // 1. MÃ HÓA PHIẾU BẦU
      const { C1x, C1y, C2x, C2y } = await encryptVote(
        babyjub,
        PKx,
        PKy,
        numCandidates,
        choice
      );
      console.log("  1. Encrypted vote (C1x, C1y, C2x, C2y).");

      // 2. TÍNH HASH_CIPHER (Mô phỏng publicSignals[1])
      const hashCipher = calculateHashCipher(poseidon, C1x, C1y, C2x, C2y);
      console.log(
        `  2. Calculated hashCipher: ${hashCipher.substring(0, 15)}...`
      );

      // 3. LẤY NULLIFIER (Đã có sẵn trong file JSON)
      const nullifier = voter.nullifier;
      console.log(
        `  3. Got pre-calculated nullifier: ${nullifier.substring(0, 15)}...`
      );

      // 4. CHUẨN BỊ DỮ LIỆU (giống logic verifyValidVote)
      const nullifierBytes32 = ethers.zeroPadValue(
        ethers.toBeHex(BigInt(nullifier)),
        32
      );
      const hashCipherBytes32 = ethers.zeroPadValue(
        ethers.toBeHex(BigInt(hashCipher)),
        32
      );
      console.log("  4. Padded data to bytes32.");

      // 5. TẠO VOTE RECORD (THAY VÌ GỬI LÊN BLOCKCHAIN)
      const voteRecord = {
        C1x: C1x,
        C1y: C1y,
        C2x: C2x,
        C2y: C2y,
        hash_cipher: hashCipherBytes32,
        election_id: ELECTION_ID, // Sử dụng hằng số đã định nghĩa
        nullifier: nullifierBytes32,
        isValid: true, 
        timestamp: new Date(),
      };

      voteRecords.push(voteRecord);
      console.log(
        `✅ SUCCESS! Generated vote record for nullifier ${nullifier.substring(
          0,
          15
        )}...`
      );

      console.log("  5. Sending transaction to contract.submitVote()...");

      const tx = await contractGanache.submitVote(nullifierBytes32, hashCipherBytes32);

      const receipt = await tx.wait();

      console.log(`✅ SUCCESS! TxHash: ${receipt.hash}`);
    } catch (error) {
      const errorMessage = error.message.split("(")[0];
      console.error(`❌ FAILED for voter ${voter.hashed_key}:`, errorMessage);
    }

    if (i < votersToSimulate.length - 1) {
      console.log(`  ... Waiting ${DELAY_BETWEEN_VOTES_MS / 1000}s...`);
      await delay(DELAY_BETWEEN_VOTES_MS);
    }
  }

  // === 6. GHI KẾT QUẢ RA FILE JSON ===
  const outputVotesPath = path.join(__dirname, OUTPUT_VOTES_JSON);
  fs.writeFileSync(
    outputVotesPath,
    JSON.stringify(voteRecords, null, 2), // (null, 2) để format file JSON cho đẹp
    "utf8"
  );

  console.log("\n🎉 Simulation complete.");
  console.log(
    `💾 Wrote ${voteRecords.length} simulated votes to ${OUTPUT_VOTES_JSON}`
  );
}

// Chạy script
main().catch((err) => {
  console.error("❌ Fatal Error:", err);
  process.exit(1);
});
