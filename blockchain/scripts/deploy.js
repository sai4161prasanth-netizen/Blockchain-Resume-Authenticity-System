import { network } from "hardhat";

const { ethers } = await network.create();
const certificateStore = await ethers.deployContract("CertificateStore");
await certificateStore.waitForDeployment();

console.log("CertificateStore deployed to:", await certificateStore.getAddress());
