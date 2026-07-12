const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockUSDC", function () {
  async function deploy() {
    const [owner, other] = await ethers.getSigners();
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy(owner.address);
    return { usdc, owner, other };
  }

  it("uses 6 decimals like real USDC", async function () {
    const { usdc } = await deploy();
    expect(await usdc.decimals()).to.equal(6);
  });

  it("allows the owner to mint", async function () {
    const { usdc, owner, other } = await deploy();
    await usdc.mint(other.address, 1_000_000n);
    expect(await usdc.balanceOf(other.address)).to.equal(1_000_000n);
  });

  it("reverts if a non-owner tries to mint", async function () {
    const { usdc, other } = await deploy();
    await expect(usdc.connect(other).mint(other.address, 1_000_000n))
      .to.be.revertedWithCustomError(usdc, "OwnableUnauthorizedAccount");
  });
});
