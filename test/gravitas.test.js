const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Gravitas Protocol: Institutional Refactor", function () {
    let registry, teleport;
    let owner, executor, user, recipient;
    let mockTokenA, mockTokenB, mockPair, mockFactory, mockRouter;

    beforeEach(async function () {
        [owner, executor, user, recipient] = await ethers.getSigners();

        // 1. Deploy Registry
        const RegistryFactory = await ethers.getContractFactory("GravitasPolicyRegistry");
        registry = await RegistryFactory.deploy();

        // 2. Deploy Teleport
        const TeleportFactory = await ethers.getContractFactory("Teleport");
        teleport = await TeleportFactory.deploy(registry.target);

        // 3. Setup Mocks (Simplified for unit testing)
        const MockToken = await ethers.getContractFactory("TokenA"); // Using existing TokenA.sol as mock
        mockTokenA = await MockToken.deploy();
        mockTokenB = await MockToken.deploy();

        // 4. Configure Registry
        await registry.setAssetCompliance(mockTokenA.target, true);
        await registry.setAssetCompliance(mockTokenB.target, true);
        await registry.setExecutorStatus(executor.address, true);
    });

    describe("Compliance & Authorization", function () {
        it("Should block non-compliant assets", async function () {
            const nonCompliantToken = await (await ethers.getContractFactory("TokenA")).deploy();
            // Authorize router first to reach compliance check
            await registry.setRouterAuthorization(owner.address, true);
            
            await expect(teleport.migrateLiquidityV2(
                owner.address, // mock factory
                owner.address, // mock router
                mockTokenA.target,
                nonCompliantToken.target,
                100,
                1000,
                0,
                0,
                Math.floor(Date.now() / 1000) + 3600,
                recipient.address
            )).to.be.revertedWith("Teleport: non-compliant assets");
        });

        it("Should block unauthorized routers", async function () {
            const unauthorizedRouter = user.address;
            await expect(teleport.migrateLiquidityV2(
                owner.address,
                unauthorizedRouter,
                mockTokenA.target,
                mockTokenB.target,
                100,
                1000,
                0,
                0,
                Math.floor(Date.now() / 1000) + 3600,
                recipient.address
            )).to.be.revertedWith("Teleport: router not authorized");
        });

        it("Should allow authorized executors", async function () {
            // Setup router authorization
            const mockRouterAddr = user.address;
            await registry.setRouterAuthorization(mockRouterAddr, true);
            
            // This will still fail on the actual logic (burning LP) because we haven't mocked the factory/pair
            // but it should pass the authorization check.
            try {
                await teleport.connect(executor).migrateLiquidityV2(
                    owner.address,
                    mockRouterAddr,
                    mockTokenA.target,
                    mockTokenB.target,
                    100,
                    1000,
                    0,
                    0,
                    Math.floor(Date.now() / 1000) + 3600,
                    recipient.address
                );
            } catch (e) {
                expect(e.message).to.not.contain("Teleport: not authorized");
            }
        });
    });

    describe("Policy Enforcement", function () {
        it("Should enforce maxMoveBps", async function () {
            await registry.setRouterAuthorization(user.address, true);
            
            await expect(teleport.migrateLiquidityV2(
                owner.address,
                user.address,
                mockTokenA.target,
                mockTokenB.target,
                300, // 30%
                1000,
                0,
                0,
                Math.floor(Date.now() / 1000) + 3600,
                recipient.address
            )).to.be.revertedWith("Teleport: exceeds maxMoveBps");
        });
    });
});
