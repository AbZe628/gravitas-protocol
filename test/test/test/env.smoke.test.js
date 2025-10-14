const { expect } = require("chai");

describe("Env::Smoke", function () {
  it("Hardhat runtime is present", async function () {
    // If this require fails, Hardhat isn't set up correctly
    const hre = require("hardhat");
    expect(hre).to.have.property("ethers");
    expect(hre).to.have.property("artifacts");
    expect(hre).to.have.property("network");
  });

  it("can obtain a provider block number", async function () {
    const { ethers } = require("hardhat");
    const bn = await ethers.provider.getBlockNumber();
    // On fresh in-memory network this should be >= 0
    expect(bn).to.be.at.least(0);
  });
});
