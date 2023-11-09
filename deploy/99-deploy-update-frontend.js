const fs = require("fs")
const { network } = require("hardhat")
const ABI_FRONTEND_PATH = "../hardhat-lottery-ui/src/constants/abi.json"
const CONTRACT_FRONTEND_ADDRESS_PATH = "../hardhat-lottery-ui/src/constants/contractAddress.json"
const chainId = network.config.chainId.toString()

module.exports = async ({ deployments }) => {
    if(!eval(process.env.HRE_UPDATE_FRONTEND)) return

    console.log("Updating frontend...")
    const raffle =  await deployments.get("Raffle")
    const currentAddress = JSON.parse(fs.readFileSync(CONTRACT_FRONTEND_ADDRESS_PATH, "utf8"))

    if(chainId in currentAddress) {
        if(!currentAddress[chainId].includes(raffle.address))
            currentAddress[chainId].push(raffle.address)
    } else {
        currentAddress[chainId] = [raffle.address]
    }

    fs.writeFileSync(CONTRACT_FRONTEND_ADDRESS_PATH, JSON.stringify(currentAddress))
    fs.writeFileSync(ABI_FRONTEND_PATH, JSON.stringify(raffle.abi))
}

module.exports.tags = ["all", "frontend"]