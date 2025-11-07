
// utils/test7.js
// import { buildBabyjub } from "circomlibjs";
// import fs from "fs/promises";

// // --- Trustee's secret share (s_i) ---
// const s_i_str =
//   "1932827187934375078641046841845168058010361553321358426325488431076535437973"; // trustee i
// // const s_i_str2 = "1932827187934375078641046841845168058010361553321358426325488431076535437973"; // trustee 2

// // --- C1_total cho 10 ứng viên ---
// const C1_total_x = [
//   "9466757728076010810611612358262479274950048736672621023622489664919182495259",
//     "2599076218609602391084691507817625100113230074557436867670610540584443604789",
//     "3355874795524137999390648866607657987933770380142028856104740626204998606005",
//     "18641545056784634925054551390040611154099770620005213312794944471414568783538",
//     "10258676510223615266401800675805390248155354986983050979786227206187646292920",
//     "4558251233732699395550822110549842191567948758094298260638881093626962206211",
//     "11431321561538678493039482646822354024329327343832568212834497639697606359530",
//     "13160925216063003616245341502183718442123602388895218250680690750796467307569",
//     "14873745795703594291507194441315226711223332073469034825585151194559285714991",
//     "16233702868232260720445010156201387594614120208547221046839679013435351333660"
// ];

// const C1_total_y = [
//   "6203109101749563404364417550896384500939875794339143872145778431778482800267",
//     "5670670236977894566520654985699293676233758074309450777620895355811895208248",
//     "20413776050761597088382180281903170828155658772939971459723272833375885583696",
//     "12211440518893443105748368423636248991698095949171958617669030776705291749543",
//     "11909249189711977149106790267250517346980213798184038681138724829089225432777",
//     "5282469650908039513037622057649253716751777460615061447668393759348532690326",
//     "20184310286477495871115343775731128570479430979253007757498581821932725271816",
//     "14237296827078640583671503369600627399083310036588567300531859216565680974155",
//     "11805486743444502510070683863078214371223222776166144797072609202375280500688",
//     "1323667907046266432362283572086479667430700175049933607213484577443553842894"
// ];

// (async () => {
//   const babyjub = await buildBabyjub();
//   const F = babyjub.F;
//   const s_i = BigInt(s_i_str);

//   const D_all = [];

//   // --- Bắt đầu tính tổng C1_total (cộng hết 10 điểm lại)
//   let C1_sum = [
//     F.e(BigInt(C1_total_x[0])),
//     F.e(BigInt(C1_total_y[0])),
//   ];

//   for (let i = 1; i < C1_total_x.length; i++) {
//     const nextPoint = [
//       F.e(BigInt(C1_total_x[i])),
//       F.e(BigInt(C1_total_y[i])),
//     ];
//     C1_sum = babyjub.addPoint(C1_sum, nextPoint);
//   }

//   const C1_sum_x = F.toObject(C1_sum[0]).toString();
//   const C1_sum_y = F.toObject(C1_sum[1]).toString();

//   console.log("🧮 Tổng cộng tất cả C1_total[i] lại → C1_sum:");
//   console.log("   C1x_total =", C1_sum_x);
//   console.log("   C1y_total =", C1_sum_y);

//   // --- Tính D_i cho từng ứng viên (như cũ)
//   for (let i = 0; i < C1_total_x.length; i++) {
//     const C1_point = [
//       F.e(BigInt(C1_total_x[i])),
//       F.e(BigInt(C1_total_y[i])),
//     ];
//     const D_i = babyjub.mulPointEscalar(C1_point, s_i);

//     D_all.push([
//       F.toObject(D_i[0]).toString(),
//       F.toObject(D_i[1]).toString(),
//     ]);
//   }

//   // --- Tính D_total = s_i * C1_sum (proof sẽ dùng cái này)
//   const D_total = babyjub.mulPointEscalar(C1_sum, s_i);
//   const D_total_x = F.toObject(D_total[0]).toString();
//   const D_total_y = F.toObject(D_total[1]).toString();

//   console.log("🧩 D_total = s_i * (C1_sum):");
//   console.log("   D_ix_total =", D_total_x);
//   console.log("   D_iy_total =", D_total_y);

//   // --- Ghi file kết quả
//   const outputPath = "utils/D_i_array2.json";
//   await fs.writeFile(outputPath, JSON.stringify(D_all, null, 2));

//   console.log("✅ Đã tạo danh sách D_i dạng mảng đơn giản.");
//   console.log(`📄 Lưu tại: ${outputPath}`);
// })();




const { buildBabyjub } = require("circomlibjs");
const fs = require("fs/promises");

// --- Danh sách trustee ---
const trustees = [
  {
    id: 1,
    s_i: "1932827187934375078641046841845168058010361553321358426325488431076535437973",
    PKx: "5242997238789728033402668553763602243913903097511597232111491760551645322650",
    PKy: "17904287567350713742521556784097465717211603485575722206287149513446893300684",
  },
  {
    id: 2,
    s_i: "288047908067672580341451203259985360060331758011544889427840988588462024566",
    PKx: "19326263602994237795560165446572369223799854917421506512732396920659561643999",
    PKy: "18117365769098037518050270592504091138203171111153859925441631904613870786632"
  }
];

// --- C1_total cho 10 ứng viên ---
const C1_total_x = [
  '20907738477776949286661462333302260395358338182441840497675390768872105581786',
  '3869921790523170708811701524669005804038218513549799636438959760805096930189',
  '7621977140384542392350140902927607644349517345792027280988901857260289359858',
  '17757362087583793761301250686415928467865968690245081389952696898949856701802',
  '15952496556655598417331071648560761659673446521546179680809223341941933198577',
  '4559747218180573822858044977077193003779579640950075808818100385835936067296',
  '1082375022121711511555916397628611910868030339177812628627745506667663267856',
  '11861752818515754543117134013391970287087730923239970108330805538831165520439',
  '18340091666389683386405567193812656308203883318540719493953604830240554491449',
  '1330598029802852384816033551496317466406725451946137471977474622501459950384'
];

const C1_total_y = [
  '12374546289586315979902453496983522575881182754929873500928062879535155930706',
  '12800834882848651073565898777565762929265493064475471029812150524967082463245',
  '3109728046820800125727539540864120421650371892320960369396283759760971234444',
  '15101840998421923460277271619167326320396256366063086612712981578691885896417',
  '2916289045148647369904664781472676262715781127485061559058059662144335969931',
  '16545047237872659369894933323432283273568118621280866791674398503462613741851',
  '4089670238631069112273747641484554036593591124229994847987476329960889788550',
  '16156132869013902424812974219384325858227243715849257470798225188846669306518',
  '19254451110603783665340103314883411500931469168124974113026045025823340192675',
  '20859278306068529989870008428739021952520557982386827836407938286117976079150'
];

(async () => {
  const babyjub = await buildBabyjub();
  const F = babyjub.F;

  // --- Bước 1: Tính tổng tất cả C1_total[i] ---
  let C1_sum = [
    F.e(BigInt(C1_total_x[0])),
    F.e(BigInt(C1_total_y[0])),
  ];

  for (let i = 1; i < C1_total_x.length; i++) {
    const nextPoint = [
      F.e(BigInt(C1_total_x[i])),
      F.e(BigInt(C1_total_y[i])),
    ];
    C1_sum = babyjub.addPoint(C1_sum, nextPoint);
  }

  const C1_sum_x = F.toObject(C1_sum[0]).toString();
  const C1_sum_y = F.toObject(C1_sum[1]).toString();

  console.log("🧮 Tổng cộng tất cả C1_total[i] → C1_sum:");
  console.log("   C1x_total =", C1_sum_x);
  console.log("   C1y_total =", C1_sum_y);

  // --- Bước 2: Tạo file output cho từng trustee ---
  for (const t of trustees) {
    const s_i = BigInt(t.s_i);
    const D_total = babyjub.mulPointEscalar(C1_sum, s_i);
    const D_total_x = F.toObject(D_total[0]).toString();
    const D_total_y = F.toObject(D_total[1]).toString();

    console.log(`\n🧩 Trustee ${t.id}:`);
    console.log("   D_ix_total =", D_total_x);
    console.log("   D_iy_total =", D_total_y);

    // --- Tính D_i cho từng ứng viên (D_i_Array) ---
    const D_i_Array = [];
    for (let i = 0; i < C1_total_x.length; i++) {
      const C1_point = [
        F.e(BigInt(C1_total_x[i])),
        F.e(BigInt(C1_total_y[i])),
      ];
      const D_point = babyjub.mulPointEscalar(C1_point, s_i);
      D_i_Array.push([
        F.toObject(D_point[0]).toString(),
        F.toObject(D_point[1]).toString(),
      ]);
    }

    // --- Ghi file tổng và file mảng ---
    const outputDataTotal = {
      C1x: C1_sum_x,
      C1y: C1_sum_y,
      D_ix: D_total_x,
      D_iy: D_total_y,
      PKx: t.PKx,
      PKy: t.PKy,
      s_i: t.s_i,
    };


    await fs.mkdir("utils", { recursive: true });
    const outputPathTotal = `utils/D_total_trustee${t.id}.json`;
    const outputPathArray = `utils/D_array_trustee${t.id}.json`;

    await fs.writeFile(outputPathTotal, JSON.stringify(outputDataTotal, null, 2));
    await fs.writeFile(outputPathArray, JSON.stringify(D_i_Array, null, 2));

    console.log(`✅ File output tổng: ${outputPathTotal}`);
    console.log(`✅ File output D_i_Array: ${outputPathArray}`);
  }

  console.log("\n🎉 Hoàn tất! Đã tạo cả D_total và D_i_Array cho 2 trustee.");
})();