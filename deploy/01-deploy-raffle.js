const { network, ethers } = require("hardhat");
const { devChains, networkConfig } = require("../helpers/hardhat-config");
const { verify } = require("../utils/verify");
const subscription_fund_amount = ethers.parseEther("5")

module.exports = async ({ getNamedAccounts, deployments }) => {

    const { deploy, log } = deployments
    const { deployer, player } = await getNamedAccounts()
    const networkData = networkConfig[network.config.chainId]

    let vrfCoordinatorAddress, subscriptionId, vrfCoordinator
    if(devChains.includes(network.name)) {
        //mock
        const mockedCoordinator = await deployments.get("VRFCoordinatorV2Mock")
        vrfCoordinatorAddress = await mockedCoordinator.address

        vrfCoordinator = await ethers.getContractAt("VRFCoordinatorV2Mock", vrfCoordinatorAddress)

        //create subscription and fund it
        const tx = await vrfCoordinator.createSubscription()
        const tx_receipt = await tx.wait(1)
        subscriptionId = await tx_receipt.logs[0].args.subId;
        await vrfCoordinator.fundSubscription(subscriptionId, subscription_fund_amount)

    } else {
        vrfCoordinatorAddress = networkData.vrfCoordinatorAddress
        //TODO: create subscription programmatically
        subscriptionId = networkData.subscriptionId
    }

    const args = [
        vrfCoordinatorAddress,
        networkData.entranceFee,
        networkData.gasLane,
        subscriptionId,
        networkData.callBackGasLimit,
        networkData.interval,
    ]

    const Raffle = await deploy("Raffle", {
        from: deployer,
        args,
        log: true,
        waitConfirmations: network.config?.blockConfirmations || 1,
    })
    log("Finished deploying Raffle...")

    if(!devChains.includes(network.name) && process.env.HRE_ETHERSCAN_KEY) {
        await verify(Raffle.address, args)
    }

    if(devChains.includes(network.name))
        await vrfCoordinator.addConsumer(Number(subscriptionId), Raffle.address)

    log("----------- DONE! -------------")
};

module.exports.tags = ["all", "raffle"]