// ===================== generate_dkg.js =====================
import { buildBabyjub } from "circomlibjs";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const __dirname = import.meta.dirname || new URL(".", import.meta.url).pathname;

let babyjub, F, G, n;

const evalPolynomial = (coeffs, x) => {
  let res = 0n;
  const X = BigInt(x);
  for (let i = 0; i < coeffs.length; i++) {
    res = (res + coeffs[i] * X ** BigInt(i)) % n;
  }
  return res;
};

const initBabyjub = async () => {
  babyjub = await buildBabyjub();
  F = babyjub.F;
  G = babyjub.Base8;
  n = babyjub.subOrder;
  console.log("✅ BabyJubJub initialized");
};

const main = async () => {
  await initBabyjub();
  const trustees = ["Alice", "Bob", "Charlie"];
  const threshold = 2;

  const folder = path.join(__dirname, "./utils/dkgKeys");
  await fs.mkdir(folder, { recursive: true });

  // 1️⃣ Mỗi trustee tạo đa thức riêng
  const polys = trustees.map((name) => ({
    name,
    coeffs: Array.from(
      { length: threshold },
      () => BigInt("0x" + crypto.randomBytes(32).toString("hex")) % n
    ),
  }));
  // Trong file generate_dkg.js
  // ... sau khi tạo polys
  const sk_total = polys.reduce((acc, p) => (acc + p.coeffs[0]) % n, 0n);
  console.log("\n🔑 SK TỔNG GỐC (Đáp án):");
  console.log(sk_total.toString());
  console.log("========================================");

  // 2️⃣ Tính public commit (a_j * G)
  const commits = polys.map((p) => ({
    name: p.name,
    commits: p.coeffs.map((a) => babyjub.mulPointEscalar(G, a)),
  }));

  // 3️⃣ Public key hệ thống = tổng a0_t * G
  const pkPoint = commits.reduce(
    (acc, t) => babyjub.addPoint(acc, t.commits[0]),
    [F.e(0n), F.e(1n)]
  );

  const epk = {
    x: F.toObject(pkPoint[0]).toString(),
    y: F.toObject(pkPoint[1]).toString(),
  };

  await fs.writeFile(
    path.join(folder, "public_key.json"),
    JSON.stringify(epk, null, 2)
  ); // 4️⃣ Mỗi trustee tính secret share CỦA CHÍNH HỌ

  // 4️⃣ Mỗi trustee tính secret share của chính họ
  // ... bên trong hàm main ...

  for (let i = 0; i < trustees.length; i++) {
    const IDi = BigInt(i + 1);
    const myShares = polys.map((p) => evalPolynomial(p.coeffs, IDi));
    // Đây là s_i (Secret Share)
    const mySecret = myShares.reduce((a, b) => (a + b) % n, 0n);

    // ======================================================
    // ⬇️ PHẦN CẦN THÊM: TÍNH PK_i TỪ s_i
    // Đây là PK_i = s_i * G (Public Key Share)
    const myPkPoint = babyjub.mulPointEscalar(G, mySecret);
    const myPK = {
      x: F.toObject(myPkPoint[0]).toString(),
      y: F.toObject(myPkPoint[1]).toString(),
    };
    // ======================================================

    await fs.writeFile(
      path.join(folder, `${trustees[i]}.json`),
      JSON.stringify(
        {
          trustee: trustees[i],
          id: i + 1,
          share: mySecret.toString(), // s_i (dùng làm private witness)
          pk_share: myPK, // PK_i (dùng làm public input)
        },
        null,
        2
      )
    );
  }

  // ... phần còn lại của file ...

  console.log(
    "✅ Đã tạo xong các share và public_key.json trong utils/dkgKeys/"
  );
  console.log("📡 Public key hệ thống:", epk);
};

main().catch(console.error);
