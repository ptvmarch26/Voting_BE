const { ethers } = require("ethers");
require("dotenv").config();

const electionABI = require("../artifacts/Election.json");

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
console.log("RPC_URL:", process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.CA_PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  electionABI.abi,
  wallet
);

const providerGanache = new ethers.JsonRpcProvider(process.env.GANACHE_RPC_URL);
console.log("GANACHE_RPC_URL:", process.env.GANACHE_RPC_URL);
const walletGanache = new ethers.Wallet(
  process.env.GANACHE_PRIVATE_KEY,
  providerGanache
);
const contractGanache = new ethers.Contract(
  process.env.GANACHE_CONTRACT_ADDRESS,
  electionABI.abi,
  walletGanache
);

module.exports = { provider, wallet, contract , contractGanache, providerGanache, walletGanache};
