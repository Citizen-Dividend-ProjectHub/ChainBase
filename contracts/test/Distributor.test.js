const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Distributor", function () {
  const AMOUNT = 100_000_000n; // 100 mUSDC (6 decimals)

  async function deploy() {
    const [owner, recipientA, recipientB, recipientC, stranger] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy(owner.address);

    const Distributor = await ethers.getContractFactory("Distributor");
    const distributor = await Distributor.deploy(await usdc.getAddress(), owner.address);

    return { usdc, distributor, owner, recipientA, recipientB, recipientC, stranger };
  }

  async function fundPool(usdc, distributor, amount) {
    await usdc.mint(await distributor.getAddress(), amount);
  }

  describe("eligibility registry", function () {
    it("lets the owner enroll and revoke recipients, emitting events", async function () {
      const { distributor, recipientA } = await deploy();

      await expect(distributor.enrollRecipient(recipientA.address))
        .to.emit(distributor, "RecipientEnrolled")
        .withArgs(recipientA.address);
      expect(await distributor.isEligible(recipientA.address)).to.equal(true);

      await expect(distributor.revokeRecipient(recipientA.address))
        .to.emit(distributor, "RecipientRevoked")
        .withArgs(recipientA.address);
      expect(await distributor.isEligible(recipientA.address)).to.equal(false);
    });

    it("reverts if a non-owner tries to enroll or revoke", async function () {
      const { distributor, stranger, recipientA } = await deploy();
      await expect(distributor.connect(stranger).enrollRecipient(recipientA.address))
        .to.be.revertedWithCustomError(distributor, "OwnableUnauthorizedAccount");
      await expect(distributor.connect(stranger).revokeRecipient(recipientA.address))
        .to.be.revertedWithCustomError(distributor, "OwnableUnauthorizedAccount");
    });
  });

  describe("poolBalance", function () {
    it("reflects the live USDC balance held by the contract", async function () {
      const { usdc, distributor } = await deploy();
      expect(await distributor.poolBalance()).to.equal(0n);
      await fundPool(usdc, distributor, AMOUNT);
      expect(await distributor.poolBalance()).to.equal(AMOUNT);
    });
  });

  describe("disburseBatch", function () {
    it("reverts for a non-owner caller", async function () {
      const { distributor, stranger, recipientA } = await deploy();
      await expect(
        distributor.connect(stranger).disburseBatch(1, [recipientA.address], AMOUNT)
      ).to.be.revertedWithCustomError(distributor, "OwnableUnauthorizedAccount");
    });

    it("reverts while paused", async function () {
      const { usdc, distributor, owner, recipientA } = await deploy();
      await distributor.enrollRecipient(recipientA.address);
      await fundPool(usdc, distributor, AMOUNT);
      await distributor.pause();
      await expect(
        distributor.disburseBatch(1, [recipientA.address], AMOUNT)
      ).to.be.revertedWithCustomError(distributor, "EnforcedPause");
    });

    it("reverts the whole batch if the pool can't cover all eligible recipients", async function () {
      const { usdc, distributor, recipientA, recipientB } = await deploy();
      await distributor.enrollRecipient(recipientA.address);
      await distributor.enrollRecipient(recipientB.address);
      await fundPool(usdc, distributor, AMOUNT); // only enough for 1, not 2

      await expect(
        distributor.disburseBatch(1, [recipientA.address, recipientB.address], AMOUNT)
      ).to.be.revertedWith("Distributor: insufficient pool balance");
    });

    it("pays eligible recipients and skips ineligible ones without reverting", async function () {
      const { usdc, distributor, recipientA, recipientB, recipientC } = await deploy();
      // A and C are eligible, B is not (never enrolled).
      await distributor.enrollRecipient(recipientA.address);
      await distributor.enrollRecipient(recipientC.address);
      await fundPool(usdc, distributor, AMOUNT * 2n);

      const tx = distributor.disburseBatch(
        7,
        [recipientA.address, recipientB.address, recipientC.address],
        AMOUNT
      );

      await expect(tx)
        .to.emit(distributor, "Disbursed").withArgs(7, recipientA.address, AMOUNT)
        .and.to.emit(distributor, "Disbursed").withArgs(7, recipientC.address, AMOUNT)
        .and.to.emit(distributor, "DisbursementSkipped").withArgs(7, recipientB.address, "not eligible")
        .and.to.emit(distributor, "CycleDisbursed").withArgs(7, 2, AMOUNT * 2n);

      expect(await usdc.balanceOf(recipientA.address)).to.equal(AMOUNT);
      expect(await usdc.balanceOf(recipientB.address)).to.equal(0n);
      expect(await usdc.balanceOf(recipientC.address)).to.equal(AMOUNT);
      expect(await distributor.poolBalance()).to.equal(0n);
    });
  });

  describe("pause / unpause", function () {
    it("reverts for a non-owner caller", async function () {
      const { distributor, stranger } = await deploy();
      await expect(distributor.connect(stranger).pause())
        .to.be.revertedWithCustomError(distributor, "OwnableUnauthorizedAccount");
      await expect(distributor.connect(stranger).unpause())
        .to.be.revertedWithCustomError(distributor, "OwnableUnauthorizedAccount");
    });

    it("allows disbursement again after unpausing", async function () {
      const { usdc, distributor, recipientA } = await deploy();
      await distributor.enrollRecipient(recipientA.address);
      await fundPool(usdc, distributor, AMOUNT);

      await distributor.pause();
      await distributor.unpause();

      await expect(distributor.disburseBatch(1, [recipientA.address], AMOUNT))
        .to.emit(distributor, "Disbursed").withArgs(1, recipientA.address, AMOUNT);
    });
  });
});
