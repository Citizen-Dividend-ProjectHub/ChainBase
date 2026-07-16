// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @notice Holds the ChainBase USDC funding pool, maintains the on-chain
/// eligibility registry, and executes batched monthly disbursements.
/// The owner is the backend service wallet (Web3.py / APScheduler).
contract Distributor is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;

    mapping(address => bool) public isEligible;

    event RecipientEnrolled(address indexed recipient);
    event RecipientRevoked(address indexed recipient);
    event Disbursed(uint256 indexed cycleId, address indexed recipient, uint256 amount);
    event DisbursementSkipped(uint256 indexed cycleId, address indexed recipient, string reason);
    event CycleDisbursed(uint256 indexed cycleId, uint256 recipientCount, uint256 totalAmount);

    constructor(address usdcAddress, address initialOwner) Ownable(initialOwner) {
        require(usdcAddress != address(0), "Distributor: zero token address");
        usdc = IERC20(usdcAddress);
    }

    function enrollRecipient(address recipient) external onlyOwner {
        require(recipient != address(0), "Distributor: zero recipient address");
        isEligible[recipient] = true;
        emit RecipientEnrolled(recipient);
    }

    function revokeRecipient(address recipient) external onlyOwner {
        isEligible[recipient] = false;
        emit RecipientRevoked(recipient);
    }

    /// @notice Live USDC balance held by this contract — the funding pool.
    function poolBalance() public view returns (uint256) {
        return usdc.balanceOf(address(this));
    }

    /// @notice Pays `amountPerRecipient` USDC to every eligible address in
    /// `recipients`, in a single transaction. Addresses that aren't
    /// currently eligible on-chain are skipped (not reverted), so one stale
    /// address can't fail an entire cycle.
    function disburseBatch(
        uint256 cycleId,
        address[] calldata recipients,
        uint256 amountPerRecipient
    ) external onlyOwner whenNotPaused nonReentrant {
        require(recipients.length > 0, "Distributor: empty recipient list");
        require(amountPerRecipient > 0, "Distributor: zero amount");

        uint256 eligibleCount = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            if (isEligible[recipients[i]]) {
                eligibleCount++;
            }
        }

        uint256 totalRequired = eligibleCount * amountPerRecipient;
        require(poolBalance() >= totalRequired, "Distributor: insufficient pool balance");

        for (uint256 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            if (!isEligible[recipient]) {
                emit DisbursementSkipped(cycleId, recipient, "not eligible");
                continue;
            }
            usdc.safeTransfer(recipient, amountPerRecipient);
            emit Disbursed(cycleId, recipient, amountPerRecipient);
        }

        emit CycleDisbursed(cycleId, eligibleCount, totalRequired);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}
