const { network } = require("hardhat")
const { devChains, BASE_FEE, GAS_PRICE_LINK } = require("../helpers/hardhat-config")

module.exports = async({ getNamedAccounts, deployments }) => {

    if(!devChains.includes(network.name)) return

    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    log("Deploying mocks...")
    await deploy("VRFCoordinatorV2Mock", {
        from: deployer,
        args: [BASE_FEE, GAS_PRICE_LINK],
        log: true,
    })
    log("Mocks deployed...")

}

module.exports.tags = ["all", "mocks"]