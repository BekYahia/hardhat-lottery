const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { devChains, networkConfig } = require("../../helpers/hardhat-config")
const { expect } = require("chai")

devChains.includes(network.name)
? describe.skip
: describe("Raffle.sol Staging Tests", () => {

    let raffle, raffleEntranceFee
    const networkData = networkConfig[network.config.chainId]

    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        const raffleAddress = (await deployments.get("Raffle")).address
        raffle = await ethers.getContractAt("Raffle", raffleAddress)
        raffleEntranceFee = await raffle.getEntranceFee()
    })

    describe("FulfillRandomWords", () => {
        it("Uses Chain link live keepers and VRF,and select a winner", async () => {

            const startingTimeStamp = await raffle.getLatestTimeStamp()
            const deployerStartingBalance = await ethers.provider.getBalance(await raffle.getAddress())

            await new Promise( async (resolve, reject) => {
                raffle.once("WinnerPicked", async () => {
                    try {
                        const endingTimeStamp = await raffle.getLatestTimeStamp()
                        const deployerEndingBalance = await ethers.provider.getBalance(await raffle.getAddress())

                        expect(deployerStartingBalance).to.be.equal(deployerStartingBalance + deployerEndingBalance)
                        expect(await ethers.provider.getBalance(await raffle.getAddress())).to.be.equal(0)
                        expect(await raffle.getRecentWinner()).to.be.equal(deployer)
                        expect(await raffle.getNumberOfPlayers()).to.be.equal(0)
                        expect(await raffle.getRaffleState()).to.be.equal(0)
                        expect(startingTimeStamp < endingTimeStamp).to.be.true

                    } catch (error) {
                        reject(error)
                    }
                    resolve()
                })

                const tx = await raffle.enterRaffle({ value: raffleEntranceFee })
                tx.wait(1)
                console.log("Waiting for the winner to be picked...")
            })
        })
    })
})