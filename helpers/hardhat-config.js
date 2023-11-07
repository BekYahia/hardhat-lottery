const { ethers } = require("hardhat")
require("dotenv").config()

const networkConfig = {
    1: {
        name: "mainnet",
        vrfCoordinatorAddress: "0x271682DEB8C4E0901D1a1550aD2e64D568E69909",
        entranceFee: ethers.parseEther("0.01")
    },
    11155111: {
        name: "sepolia",
        vrfCoordinatorAddress: "0x8103B0A8A00be2DDC778e6e7eaa21791Cd364625",
        entranceFee: ethers.parseEther("0.01"),
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c",
        subscriptionId: process.env.VRF_SUBSCRIPTION_ID,
        callBackGasLimit: 500_000,
        interval: "30",
    },
    31337: {
        name: "hardhat",
        entranceFee: ethers.parseEther("0.01"),
        gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // its does not matter since its been mocked
        callBackGasLimit: 500_000,
        interval: "30",
    },
}
const devChains = ["hardhat", "localhost"]
const BASE_FEE = ethers.parseEther("0.25") // its cost 0.25 link see: https://docs.chain.link/vrf/v2/subscription/supported-networks
const GAS_PRICE_LINK = 1_000_000_000 // AKA link price base on the current gas price

module.exports = {
    networkConfig,
    devChains,
    BASE_FEE,
    GAS_PRICE_LINK,
}