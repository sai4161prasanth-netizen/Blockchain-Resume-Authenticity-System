import "dotenv/config";
import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";

const sepoliaNetwork = process.env.SEPOLIA_RPC_URL && process.env.PRIVATE_KEY
  ? {
      sepolia: {
        type: "http" as const,
        chainType: "l1" as const,
        chainId: 11155111,
        url: process.env.SEPOLIA_RPC_URL,
        accounts: [process.env.PRIVATE_KEY]
      }
    }
  : {};

export default defineConfig({
  plugins: [hardhatEthers],
  solidity: "0.8.28",
  networks: {
    hardhatMainnet: { type: "edr-simulated", chainType: "l1" },
    localhost: {
      type: "http",
      chainType: "l1",
      url: "http://127.0.0.1:8545",
      ethers: { waitForTransactionReceipt: true }
    },
    ...sepoliaNetwork
  }
});
