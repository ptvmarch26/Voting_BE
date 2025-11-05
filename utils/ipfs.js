import fs from "fs";
import { create } from "ipfs-http-client";

const ipfs = create({ url: 'http://127.0.0.1:5001/api/v0' });

async function uploadToIPFS() {
  const data = fs.readFileSync("./tally_result.json");

  const result = await ipfs.add(data);
  console.log("✅ Uploaded to IPFS:");
  console.log("CID:", result.cid.toString());
}

uploadToIPFS().catch(console.error);
