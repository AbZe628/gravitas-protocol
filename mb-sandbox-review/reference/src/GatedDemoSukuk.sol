// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.24;

/*
 * REFERENCE IMPLEMENTATION, UNAUDITED, FOR EVALUATION, NOT FOR PRODUCTION.
 * This dummy token has no legal or religious standing and is not an issuer product.
 */
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IShariahPolicyChecker} from "contracts/interfaces/IShariahPolicyChecker.sol";

contract GatedDemoSukuk is ERC20 {
    IShariahPolicyChecker public immutable registry;
    address public immutable issuer;
    bool private _initialMintInProgress = true;

    modifier onlyIssuer() {
        require(msg.sender == issuer, "GatedDemoSukuk: caller is not issuer");
        _;
    }

    constructor(address registryAddress, address initialHolder, uint256 initialSupply)
        ERC20("Demo Sukuk (dummy)", "DSUKUK")
    {
        registry = IShariahPolicyChecker(registryAddress);
        issuer = msg.sender;
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
            require(registry.verifyAssetCompliance(address(this)), "GatedDemoSukuk: asset not approved");
        }
        super._update(from, to, amount);
    }
}
