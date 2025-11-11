const { expect } = require("chai");
const { ethers, network } = require("hardhat");

// --- Adrese konstanti s Mainneta (sve u malim slovima) ---
const UNI_V2_FACTORY = "0x5c69bee701ef814a2b6a3edd4b1652cb9cc5a6f0";
const SUSHI_V2_FACTORY = "0xc0aee478e3658e2610c5f7a4a2e17772e956aa4";
const WBTC = "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599";
const WETH = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"; // Ispravljena adresa
const UNI_LP_PAIR = "0xbb2b803c31109a26af7cba0b2c4a2346c015350c";
const WHALE_ADDRESS = "0x4a2ee3690626150c26027c343273151b2280614f";

// --- Minimalni ABI-ji (zaobilazimo Hardhat greške s ABI-jem) ---
const MINIMAL_ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)"
];
const MINIMAL_FACTORY_ABI = [
    "function getPair(address tokenA, address tokenB) view returns (address pair)"
];

describe("Gravitas Protocol: Teleport (Mainnet Fork Test)", function () {
    let teleport;
    let owner, whaleSigner;
    let uniLpToken;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();

        const TeleportFactory = await ethers.getContractFactory("Teleport");
        teleport = await TeleportFactory.deploy();
        
        // Impersoniraj kita
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [WHALE_ADDRESS],
        });
        await network.provider.send("hardhat_setBalance", [
            WHALE_ADDRESS,
            "0x1000000000000000000",
        ]);
        whaleSigner = await ethers.getSigner(WHALE_ADDRESS);

        // KORISTIMO ISPRAVAN PROVIDER (whaleSigner.provider) za dohvat podataka s forka
        uniLpToken = new ethers.Contract(UNI_LP_PAIR, MINIMAL_ERC20_ABI, whaleSigner.provider);
    });

    it("Trebao bi uspješno migrirati likvidnost (approve, transfer, migrate) i potvrditi stanje", async function () {
        
        // ISPRAVAN BALANCEOF (bez .connect())
        const startBalance = await uniLpToken.balanceOf(WHALE_ADDRESS); 
        
        console.log(`Pocetno stanje kita: ${ethers.formatUnits(startBalance, 18)} UNI-V2 LP tokena`);
        expect(startBalance).to.be.gt(0, "Kit mora imati LP tokene za početak");

        // Transakcije (moraju koristiti .connect())
        await uniLpToken.connect(whaleSigner).approve(teleport.target, startBalance);
        await uniLpToken.connect(whaleSigner).transfer(teleport.target, startBalance);
        
        const teleportLpBalance = await uniLpToken.balanceOf(teleport.target);
        expect(teleportLpBalance).to.equal(startBalance, "Teleport ugovor nije primio LP tokene");

        console.log("Pokrecem migraciju...");
        await teleport.connect(owner).migrateLiquidityV2Manual(
            UNI_V2_FACTORY,
            SUSHI_V2_FACTORY,
            WBTC,
            WETH,
            startBalance
        );
        console.log("Migracija zavrsena!");

        // Konačna provjera
        expect(await uniLpToken.balanceOf(WHALE_ADDRESS)).to.equal(0);
        expect(await uniLpToken.balanceOf(teleport.target)).to.equal(0);
        console.log("Staro (Uniswap) LP stanje je sada 0. (Uspjeh)");

        const sushiFactory = new ethers.Contract(SUSHI_V2_FACTORY, MINIMAL_FACTORY_ABI, whaleSigner.provider);
        const sushiPairAddress = await sushiFactory.getPair(WBTC, WETH);
        
        const sushiLpToken = new ethers.Contract(sushiPairAddress, MINIMAL_ERC20_ABI, whaleSigner.provider);
        const newLpBalance = await sushiLpToken.balanceOf(teleport.target);
        
        expect(newLpBalance).to.be.gt(0, "Teleport ugovor nije dobio nove (Sushi) LP tokene");
        console.log(`Novo (Sushiswap) LP stanje: ${ethers.formatUnits(newLpBalance, 18)} (Uspjeh)`);
    });
});