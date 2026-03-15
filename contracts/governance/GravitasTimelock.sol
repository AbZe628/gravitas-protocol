// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/governance/TimelockController.sol";

/**
 * @title GravitasTimelock
 * @notice Timelock controller for GravitasPolicyRegistry governance.
 * @dev All policy changes go through a minimum delay, providing a safety window
 *      for the community and institutional partners to review changes.
 *      
 *      Production configuration:
 *      - minDelay: 48 hours (172800 seconds) — gives institutional partners time to review
 *      - proposers: Gnosis Safe multisig address(es)
 *      - executors: address(0) — anyone can execute after delay
 *      - admin: address(0) — no admin, fully decentralized
 */
contract GravitasTimelock is TimelockController {
    constructor(
        uint256 minDelay,
        address[] memory proposers,
        address[] memory executors,
        address admin
    ) TimelockController(minDelay, proposers, executors, admin) {}
}
