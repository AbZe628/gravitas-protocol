const { expect } = require("chai");

describe("Artifacts::Teleport", function () {
  it("loads Teleport artifact and ABI", async function () {
    // late-require to ensure Hardhat injects runtime (artifacts)
    const { artifacts } = require("hardhat");
    const art = await artifacts.readArtifact("Teleport");
    expect(art).to.have.property("abi");
    expect(Array.isArray(art.abi)).to.equal(true);
    expect(art.bytecode && art.bytecode.length).to.be.greaterThan(10);
    expect(art.deployedBytecode && art.deployedBytecode.length).to.be.greaterThan(10);
  });

  it("Hardhat network is available (has at least one signer)", async function () {
    const { ethers } = require("hardhat");
    const signers = await ethers.getSigners();
    expect(signers.length).to.be.greaterThan(0);
  });
});
