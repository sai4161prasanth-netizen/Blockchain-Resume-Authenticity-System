import hre from "hardhat";

async function main() {
  const CertificateStore = await hre.ethers.getContractFactory("CertificateStore");
  const certificateStore = await CertificateStore.deploy();

  await certificateStore.waitForDeployment();

  console.log("CertificateStore deployed to:", await certificateStore.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
