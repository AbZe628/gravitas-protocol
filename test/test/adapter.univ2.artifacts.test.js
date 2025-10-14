const { expect } = require("chai");

describe("Artifacts::UniV2Adapter", function () {
  it("loads UniV2Adapter artifact and ABI", async function () {
    const { artifacts } = require("hardhat");
    const art = await artifacts.readArtifact("UniV2Adapter");
    expect(art).to.have.property("abi");
    expect(Array.isArray(art.abi)).to.equal(true);
    expect(art.bytecode && art.bytecode.length).to.be.greaterThan(10);
    expect(art.deployedBytecode && art.deployedBytecode.length).to.be.greaterThan(10);
  });
});
