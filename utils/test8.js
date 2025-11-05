import { buildBabyjub } from "circomlibjs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
// 🔑 Config: chọn trustee nào tham gia
const TRUSTEE_NAME = "Bob"; // Thay bằng "Bob" hoặc "Charlie"
const TRUSTEE_ID = 2; // Alice=1, Bob=2, Charlie=3

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔧 Đường dẫn chuẩn tuyệt đối
const DKG_FOLDER = path.join(__dirname, "utils", "dkgKeys");

const TALLY_FILE = path.join(__dirname, "tally_result.json");

(async () => {
  console.log(`🔓 Tạo partial decryption cho ${TRUSTEE_NAME}...\n`);

  // 1️⃣ Khởi tạo BabyJubJub
  const babyjub = await buildBabyjub();
  const F = babyjub.F;

  // 2️⃣ Đọc share của trustee
  const shareFile = path.join(DKG_FOLDER, `${TRUSTEE_NAME}.json`);
  const shareData = JSON.parse(await fs.readFile(shareFile, "utf8"));
  const s_i = BigInt(shareData.share);
  console.log(`📄 Đọc share của ${TRUSTEE_NAME} (ID=${shareData.id})`);
  console.log(`   s_i = ${s_i.toString()}\n`);

  // 3️⃣ Đọc tally data
  const tallyData = JSON.parse(await fs.readFile(TALLY_FILE, "utf8"));
  const { C1_total_x, C1_total_y } = tallyData;
  const numCandidates = C1_total_x.length;

  console.log(`🎯 Số ứng viên: ${numCandidates}\n`);
  console.log("=".repeat(60));

  // 4️⃣ Tính D_i = s_i · C1 cho từng candidate
  const D_i_array = [];

  for (let i = 0; i < numCandidates; i++) {
    const C1 = [F.e(BigInt(C1_total_x[i])), F.e(BigInt(C1_total_y[i]))];
    const D_i = babyjub.mulPointEscalar(C1, s_i);

    const D_ix = F.toObject(D_i[0]).toString();
    const D_iy = F.toObject(D_i[1]).toString();

    D_i_array.push([D_ix, D_iy]);

    console.log(`🧮 Candidate ${i + 1}:`);
    console.log(`   D_${TRUSTEE_ID}x = ${D_ix}`);
    console.log(`   D_${TRUSTEE_ID}y = ${D_iy}`);
  }

  console.log("=".repeat(60));

  // 5️⃣ Lưu file
  const outputPath = `./utils/D_i_${TRUSTEE_NAME}.json`;
  await fs.writeFile(outputPath, JSON.stringify(D_i_array, null, 2));

  console.log(`\n✅ Đã tạo partial decryption cho ${TRUSTEE_NAME}`);
  console.log(`📄 Lưu tại: ${outputPath}\n`);
})();