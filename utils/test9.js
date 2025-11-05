import fs from "fs/promises";
import path from "path";
import { buildBabyjub } from "circomlibjs";
import { performance } from "perf_hooks";

const __dirname = import.meta.dirname || new URL(".", import.meta.url).pathname;

// ====================================================
// 🔢 Modular inverse
// ====================================================
const modInverse = (a, m) => {
  a = ((a % m) + m) % m;
  let [oldR, r] = [a, m];
  let [oldS, s] = [1n, 0n];

  while (r !== 0n) {
    const quotient = oldR / r;
    [oldR, r] = [r, oldR - quotient * r];
    [oldS, s] = [s, oldS - quotient * s];
  }

  if (oldR !== 1n) throw new Error("Không tồn tại modular inverse");
  return ((oldS % m) + m) % m;
};

// ====================================================
// 🧮 Lagrange coefficient tại x=0
// ====================================================
const lagrangeCoefficient = (i, ids, n) => {
  let numerator = 1n;
  let denominator = 1n;

  for (let j = 0; j < ids.length; j++) {
    if (i !== j) {
      numerator = (numerator * (0n - ids[j])) % n;
      denominator = (denominator * (ids[i] - ids[j])) % n;
    }
  }

  numerator = ((numerator % n) + n) % n;
  denominator = ((denominator % n) + n) % n;

  const inv = modInverse(denominator, n);
  const lambda = (numerator * inv) % n;

  return ((lambda % n) + n) % n;
};

// ====================================================
// 🔐 Brute-force tìm m sao cho M = m·G
// ====================================================
const findDiscreteLog = (Mpoint, G, F, babyjub, maxTries = 100) => {
  const identity = [F.e(0n), F.e(1n)];

  if (
    F.toObject(Mpoint[0]) === F.toObject(identity[0]) &&
    F.toObject(Mpoint[1]) === F.toObject(identity[1])
  ) {
    return 0;
  }

  let test = G;
  for (let m = 1; m <= maxTries; m++) {
    if (
      F.toObject(Mpoint[0]) === F.toObject(test[0]) &&
      F.toObject(Mpoint[1]) === F.toObject(test[1])
    ) {
      return m;
    }
    test = babyjub.addPoint(test, G);
  }

  return null;
};

// ====================================================
// 🧩 Main
// ====================================================
const main = async () => {
  console.log("🔓 Bắt đầu giải mã với Partial Decryptions + Lagrange (2/3 threshold)...\n");
  const t0 = performance.now();

  // 1️⃣ Khởi tạo BabyJubJub
  const babyjub = await buildBabyjub();
  const F = babyjub.F;
  const G = babyjub.Base8;
  const n = babyjub.subOrder;

  // 2️⃣ Trustees tham gia
  const trustees = ["Alice", "Bob"];
  console.log(`👥 Trustees tham gia: ${trustees.join(", ")}\n`);

  // 3️⃣ Đọc shares và IDs
  const dkgFolder = path.join(__dirname, "./utils/dkgKeys");
  const trusteeData = [];
  for (const name of trustees) {
    const filePath = path.join(dkgFolder, `${name}.json`);
    const data = JSON.parse(await fs.readFile(filePath, "utf8"));
    trusteeData.push({
      name,
      id: BigInt(data.id),
      share: BigInt(data.share),
    });
    console.log(`📄 Đọc ${name}: ID=${data.id}, share=${data.share}`);
  }

  // 4️⃣ Tính hệ số Lagrange
  const ids = trusteeData.map((t) => t.id);
  const lambdas = trusteeData.map((t, i) => {
    const lambda = lagrangeCoefficient(i, ids, n);
    console.log(`🧮 λ_${t.name} = ${lambda.toString()}`);
    if (ids.length === 2) {
      const manual = (0n - ids[1 - i]) * modInverse(ids[i] - ids[1 - i], n) % n;
      const manualNorm = ((manual % n) + n) % n;
      console.log(`   ↳ Kiểm tra thủ công: ${manualNorm.toString()}`);
      console.log(`   ↳ Khớp? ${lambda === manualNorm ? "✅" : "❌"}`);
    }
    return lambda;
  });

  // 5️⃣ Tái tạo SK và kiểm tra PK hệ thống
  let sk_reconstructed = trusteeData.reduce(
    (sum, t, i) => (sum + lambdas[i] * t.share) % n,
    0n
  );
  sk_reconstructed = ((sk_reconstructed % n) + n) % n;
  console.log(`\n🔑 SK tái tạo từ Lagrange: ${sk_reconstructed}`);

  const PK_from_sk = babyjub.mulPointEscalar(G, sk_reconstructed);
  console.log(`   PK từ SK: (${F.toObject(PK_from_sk[0])}, ${F.toObject(PK_from_sk[1])})`);

  const pkFile = path.join(__dirname, "./utils/dkgKeys/public_key.json");
  const pkData = JSON.parse(await fs.readFile(pkFile, "utf8"));
  console.log(`   PK hệ thống: (${pkData.x}, ${pkData.y})`);

  const pkMatch =
    F.toObject(PK_from_sk[0]).toString() === pkData.x &&
    F.toObject(PK_from_sk[1]).toString() === pkData.y;
  console.log(`   ${pkMatch ? "✅ Khớp!" : "❌ KHÔNG khớp - có lỗi!"}\n`);

  // 6️⃣ Đọc D_i (partial decryptions)
  const D_arrays = [];
  for (const name of trustees) {
    const filePath = path.join(__dirname, `./D_i_${name}.json`);
    const D_i = JSON.parse(await fs.readFile(filePath, "utf8"));
    D_arrays.push(D_i);
    console.log(`📂 Đọc D_i của ${name} (${D_i.length} candidates)`);
  }

  // 7️⃣ Đọc tally data
  const tallyPath = path.join(__dirname, "./tally_result.json");
  const tallyData = JSON.parse(await fs.readFile(tallyPath, "utf8"));
  const { C2_total_x, C2_total_y, nVoters } = tallyData;
  const numCandidates = C2_total_x.length;

  console.log(`\n📊 Tổng số cử tri: ${nVoters}`);
  console.log(`🎯 Số ứng viên: ${numCandidates}\n`);
  console.log("=".repeat(60));

  // 8️⃣ Giải mã từng ứng viên
  const results = [];
  for (let i = 0; i < numCandidates; i++) {
    const tStart = performance.now();
    const C2_total = [F.e(BigInt(C2_total_x[i])), F.e(BigInt(C2_total_y[i]))];

    // ΣD = Σ(λ_i * D_i)
    let D_weighted_sum = null;
    for (let j = 0; j < D_arrays.length; j++) {
      const D_j = [F.e(BigInt(D_arrays[j][i][0])), F.e(BigInt(D_arrays[j][i][1]))];
      const D_j_weighted = babyjub.mulPointEscalar(D_j, lambdas[j]);
      D_weighted_sum = D_weighted_sum
        ? babyjub.addPoint(D_weighted_sum, D_j_weighted)
        : D_j_weighted;
    }

    // M = C2 - ΣD
    const negDSum = [D_weighted_sum[0], F.neg(D_weighted_sum[1])];
    const M = babyjub.addPoint(C2_total, negDSum);

    // Check điểm vô cực
    const Mx = F.toObject(M[0]);
    const My = F.toObject(M[1]);
    const isIdentity = (Mx === 0n) && (My === 1n || My === n - 1n);

    console.log(`🧮 Candidate ${i + 1}:`);
    if (isIdentity) {
      console.log("   → Không phiếu (điểm vô cực)");
    } else {
      console.log(`   Mx: ${Mx}`);
      console.log(`   My: ${My}`);
    }

    // Tìm m
    const votes = isIdentity ? 0 : findDiscreteLog(M, G, F, babyjub, nVoters + 10);
    const tEnd = performance.now();
    const timeTaken = (tEnd - tStart).toFixed(2);

    results.push({
      candidate: i + 1,
      votes: votes ?? "unknown",
      time_ms: Number(timeTaken),
      Mx: Mx.toString(),
      My: My.toString(),
    });

    console.log(`   Votes: ${votes ?? "???"} phiếu  ⏱️ ${timeTaken} ms`);
  }

  console.log("=".repeat(60));

  // 9️⃣ Tổng kết & người thắng
  const totalVotes = results.reduce(
    (sum, r) => sum + (typeof r.votes === "number" ? r.votes : 0),
    0
  );
  const t1 = performance.now();
  const totalTime = (t1 - t0).toFixed(2);

  console.log(`\n✅ Tổng số phiếu đã giải mã: ${totalVotes}/${nVoters}`);
  console.log(`🕒 Tổng thời gian giải mã: ${totalTime} ms (${(totalTime / 1000).toFixed(2)} s)`);
  if (totalVotes === nVoters) console.log("🎉 Giải mã thành công 100%!");
  else console.log("⚠️  Có sự khác biệt, cần kiểm tra lại!");

  const winner = results.reduce(
    (max, r) => (typeof r.votes === "number" && r.votes > (max.votes || 0) ? r : max),
    {}
  );
  if (winner.votes) {
    console.log(`\n🏆 Người thắng cuộc: Ứng viên ${winner.candidate} với ${winner.votes} phiếu!`);
  }

  // 🔟 Lưu kết quả
  const outputPath = path.join(__dirname, "./decryption_result_di.json");
  await fs.writeFile(
    outputPath,
    JSON.stringify(
      {
        method: "partial_decryption_with_lagrange",
        trustees_used: trustees,
        threshold: "2/3",
        total_voters: nVoters,
        total_time_ms: Number(totalTime),
        results,
        winner,
      },
      null,
      2
    )
  );

  console.log(`\n💾 Kết quả đã lưu tại: ${outputPath}\n`);
};

main().catch(console.error);
