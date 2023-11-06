const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { devChains, networkConfig } = require("../../helpers/hardhat-config");
const { expect, assert } = require("chai");

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
            
            await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen")
        })
    })

    describe("CheckUpkeep", () => {
        it("Return false: No enough money sent", async () => {
            await network.provider.send("evm_increaseTime", [Number(interval) + 1])
            await network.provider.send("evm_mine", [])

            const { upKeepNeed } = await raffle.checkUpkeep.staticCall("0x")

            expect(upKeepNeed).to.false
        })

        it("Return False: Raffle is not Open", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [Number(interval) + 1])
            await network.provider.send("evm_mine", [])

            //pretend to be chain-link keeper to call performUpkeep 
            await raffle.performUpkeep("0x")
            const { upKeepNeed } = await raffle.checkUpkeep.staticCall("0x")

            expect(upKeepNeed).to.false
            expect(await raffle.getRaffleState()).to.be.equal(1)
        })

        it("Return False: Time has not pass yet", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [Number(interval) - 5])
            await network.provider.send("evm_mine", [])

            const { upKeepNeed } = await raffle.checkUpkeep.staticCall("0x")
            assert(!upKeepNeed)
        })

        it("Return True: it's Open with enough ETH, players, time, and balance", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [Number(interval) + 5])
            await network.provider.send("evm_mine", [])

            const { upKeepNeed } = await raffle.checkUpkeep.staticCall("0x")
            assert(upKeepNeed)
        })
    });

    describe("PerformUpkeep", () => {
        it("Run only when checkupKeep is true", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [Number(interval) + 5])
            await network.provider.send("evm_mine", [])

            //pretend to be chain-link keeper to call performUpkeep 
            const tx = await raffle.performUpkeep("0x")
            assert(tx)
        })

        it("Revert when checkupKeep is false", async () => {
            await expect(raffle.performUpkeep("0x")).to.be.revertedWithCustomError(raffle, "Raffle__UpKeepNotNeeded")
        })

        it("Emit an event after select the winner, and update Raffle status", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [Number(interval) + 1])
            await network.provider.send("evm_mine", [])

            //vrf coordinator also emit and event RandomWordsRequested which has the request_id;
            await expect(raffle.performUpkeep("0x")).to.emit(raffle, "RequestedRaffleWinner")
            expect(await raffle.getRaffleState()).to.be.equal(1)
        })
    })

    describe("FulfillRandomWords", () => {
        beforeEach(async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [Number(interval) + 5])
            await network.provider.send("evm_mine", [])     
        })

        it("Can only bee called after calling performCheckupKeep", async () => {
            [0, 1, 2].forEach(async (i) => {
                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(i, await raffle.getAddress())).to.be.revertedWith("nonexistent request")
            })
        })

        it("Pick a winner, reset the lottery, and send the money to the lucky guy", async () => {

            const accounts = await ethers.getSigners()
            const additionalAccounts = 3, totalAccounts = additionalAccounts+1

            for (let i = 1; i <= additionalAccounts; i++) {
                const accountConnected = raffle.connect(accounts[i])
                await accountConnected.enterRaffle({ value: raffleEntranceFee })
            }

            const startingTimeStamp = await raffle.getLatestTimeStamp()

            expect(await raffle.getNumberOfPlayers()).to.be.equal(totalAccounts)
            expect(Number(await ethers.provider.getBalance(await raffle.getAddress()))).to.be.equal(Number(raffleEntranceFee) * totalAccounts)

            await new Promise( async (resolve, reject) => {
                raffle.once("WinnerPicked", async () => {
                    try {
                        const endingTimeStamp = await raffle.getLatestTimeStamp()

                        //print the winner
                        for (let index = 0; index < totalAccounts; index++) {
                            console.log(`#${index}`, accounts[index].address)
                        }
                        console.log("-----------\nThe winner is", await raffle.getRecentWinner())

                        expect(await ethers.provider.getBalance(await raffle.getAddress())).to.be.equal(0)
                        expect(await raffle.getNumberOfPlayers()).to.be.equal(0)
                        expect(await raffle.getRaffleState()).to.be.equal(0)
                        expect(startingTimeStamp < endingTimeStamp).to.be.true
                    } catch (error) {reject(error)}
                    resolve()
                })

                //setup for listener
                const tx = await raffle.performUpkeep("0x")
                const tx_receipt = await tx.wait(1)
                await vrfCoordinatorV2Mock.fulfillRandomWords(
                    tx_receipt.logs[1].args.requestId,
                    await raffle.getAddress()
                )
            })

        })
    })
})