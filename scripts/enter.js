const { ethers, deployments } = require("hardhat");

async function main() {
    const raffle = await ethers.getContractAt("Raffle", (await deployments.get("Raffle")).address)
    const value = await raffle.getEntranceFee()
    await raffle.enterRaffle({ value })
    console.log(`Entered Raffle Successfully with ${ethers.formatUnits(value, "ether")} ETH...`)
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.log(error)
        process.exit(1)
    });