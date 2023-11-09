const { ethers, deployments, network } = require("hardhat")
const { devChains } = require("../helpers/hardhat-config")

async function main() {

    if(!devChains.includes(network.name))
        return console.log("This script only for development chains.")

    // Chainlink: Automation
    const raffle = await ethers.getContractAt("Raffle", (await deployments.get("Raffle")).address)
    const { upKeepNeed } = await raffle.checkUpkeep.staticCall("0x")
    
    if(!upKeepNeed) return console.log("No Upkeep Needed!")
    
    const tx = await raffle.performUpkeep("0x")
    const tx_receipt = await tx.wait(1)
    const requestId = tx_receipt.logs[1].args.requestId
    console.log(`Performing keep up with request id #${requestId}`)
    
    // Chainlink: VRFCoordinatorV2Mock
    const vrfCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock", (await deployments.get("VRFCoordinatorV2Mock")).address)
    const tx1 = await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, await raffle.getAddress())
    const tx1_receipt = await tx1.wait(1)
    console.log("The winner is ", await raffle.getRecentWinner())
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.log(error)
        process.exit(1)
    })