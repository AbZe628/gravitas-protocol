// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.24;

/*
 * REFERENCE IMPLEMENTATION, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
 * This dummy token has no legal or religious standing and is not an issuer product.
 */
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IShariahPolicyChecker} from "contracts/interfaces/IShariahPolicyChecker.sol";

contract GatedDemoSukuk is ERC20 {
    error InvalidRegistry();
    error InvalidManager();

    IShariahPolicyChecker public immutable registry;
    address public immutable issuer;
    address public immutable manager;
    bool private _initialMintInProgress = true;

    modifier onlyIssuer() {
        require(msg.sender == issuer, "GatedDemoSukuk: caller is not issuer");
        _;
    }

    constructor(
        address registryAddress,
        address managerAddress,
        address initialHolder,
        uint256 initialSupply
    ) ERC20("Demo Sukuk (dummy)", "DSUKUK") {
        if (registryAddress.code.length == 0) revert InvalidRegistry();
        if (managerAddress.code.length == 0) revert InvalidManager();
        registry = IShariahPolicyChecker(registryAddress);
        issuer = msg.sender;
        manager = managerAddress;
        // The token cannot be approved before its address exists. This constructor mint is the sole exception.
        _mint(initialHolder, initialSupply);
        _initialMintInProgress = false;
    }

    function mint(address to, uint256 amount) external onlyIssuer {
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }

    function _update(address from, address to, uint256 amount) internal override {
        if (!_initialMintInProgress) {
            // Retain the registry asset/pause gate on every post-deployment balance change.
            require(registry.verifyAssetCompliance(address(this)), "GatedDemoSukuk: asset not approved");
        }
        // Mint and burn keep their issuer/holder/allowance controls. Every transfer between
        // nonzero addresses must be initiated by the fixed manager, so neither transfer nor
        // transferFrom can bypass executor authorization or omit TransferChecked evidence.
        if (from != address(0) && to != address(0)) {
            require(_msgSender() == manager, "GatedDemoSukuk: manager only");
        }
        super._update(from, to, amount);
    }
}
