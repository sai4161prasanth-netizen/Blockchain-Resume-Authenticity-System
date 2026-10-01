import assert from "node:assert/strict";
import { network } from "hardhat";

const { ethers } = await network.create();
const [owner, issuer, other] = await ethers.getSigners();
const certificateStore = await ethers.deployContract("CertificateStore");
await certificateStore.waitForDeployment();

const expectRevert = async (action, message) => {
  await assert.rejects(async () => {
    const transaction = await action();
    await transaction.wait();
  }, message);
};

const hash = "a".repeat(64);
await expectRevert(
  () => certificateStore.connect(issuer).issueCertificate("Credential holder", hash, "Test University"),
  /Not authorized to issue certificates/
);

await (await certificateStore.authorizeInstitution(issuer.address)).wait();
await expectRevert(
  () => certificateStore.connect(issuer).issueCertificate("Credential holder", "A".repeat(64), "Test University"),
  /Hash must be lowercase SHA-256 hex/
);
await expectRevert(
  () => certificateStore.connect(issuer).issueCertificate("Credential holder", "g".repeat(64), "Test University"),
  /Hash must be lowercase SHA-256 hex/
);
await expectRevert(
  () => certificateStore.connect(issuer).issueCertificate("Credential holder", "a".repeat(63), "Test University"),
  /Hash must be lowercase SHA-256 hex/
);

await (await certificateStore.connect(issuer).issueCertificate("Credential holder", hash, "Test University")).wait();
const issued = await certificateStore.verifyCertificate(hash);
assert.equal(issued[0], true, "issued hash should be active");
assert.equal(issued[2], "Test University", "institution should be preserved");
assert.equal(issued[4].toLowerCase(), issuer.address.toLowerCase(), "issuer wallet should be preserved");

await expectRevert(
  () => certificateStore.connect(other).issueCertificate("Credential holder", hash, "Other University"),
  /Not authorized to issue certificates/
);
await expectRevert(
  () => certificateStore.connect(issuer).issueCertificate("Credential holder", hash, "Test University"),
  /Certificate already issued/
);
await expectRevert(
  () => certificateStore.connect(other).revokeCertificate(hash),
  /Only issuer or owner can revoke/
);

await (await certificateStore.connect(issuer).revokeCertificate(hash)).wait();
assert.equal((await certificateStore.verifyCertificate(hash))[0], false, "revoked hash should be inactive");

console.log("CertificateStore smoke check passed: authorization, canonical hash, issuance, duplicate rejection, and revocation.");
