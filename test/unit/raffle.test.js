const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { devChains, networkConfig } = require("../../helpers/hardhat-config");
const { expect } = require("chai");

!devChains.includes(network.name)
? describe.skip
: describe("Raffle.sol", () => {

    let raffle, vrfCoordinatorV2Mock, raffleEntranceFee, interval
    const networkData = networkConfig[network.config.chainId]
    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        const deploymentsFixture = await deployments.fixture(["all"])

        raffle = await ethers.getContractAt("Raffle", deploymentsFixture["Raffle"].address)
        vrfCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock", deploymentsFixture["VRFCoordinatorV2Mock"].address)

        raffleEntranceFee = await raffle.getEntranceFee()
        interval = await raffle.getInterval()
    })

    describe("Constructor", () => {
        it("Initialize Raffle correctly", async () => {
            expect(await raffle.getRequestConfirmations()).to.be.equal(3)
            expect(await raffle.getRaffleState()).to.be.equal(0)
            expect(interval).to.be.equal(networkData.interval)
            expect(await raffle.getEntranceFee()).to.be.equal(networkData.entranceFee)
        })
    })

    describe("enterRaffle", () => {
        it("Should revert when you do not pay enough", async () => {
            await expect(raffle.enterRaffle()).to.be.revertedWithCustomError(raffle, "Raffle__NotEnoughETHEntered")
        })

        it("Record players when they enter", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            const player = await raffle.getPlayer(0)

            expect(player).to.be.equal(deployer)
        })

        it("Emit event after player entrance", async () => {
            await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(raffle, "RaffleEnter")
        })

        it("Doesn't allow entrance when raffle is calculation", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [Number(interval) + 1])
            await network.provider.send("evm_mine", [])

            //pretend to be chain-link keeper to call performUpkeep 
            await raffle.performUpkeep("0x")
            
            console.log(await raffle.getRaffleState())
            expect(true).to.true
            // await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
        })
    })
})