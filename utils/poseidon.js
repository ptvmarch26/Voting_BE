import { buildPoseidon } from "circomlibjs";

async function main() {
  // Khởi tạo hàm băm Poseidon
  const poseidon = await buildPoseidon();

  // Hai biến đầu vào
  const a = 123n;
  const b = 456n;

  // Tính hash
  const hash = poseidon([a, b]);

  // Lấy giá trị BigInt
  const hashValue = poseidon.F.toObject(hash);

  console.log("Poseidon Hash:");
  console.log(`Input a = ${a}`);
  console.log(`Input b = ${b}`);
  console.log(`Hash = ${hashValue}`);
}

main();
