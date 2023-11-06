require("@nomicfoundation/hardhat-toolbox")
require("@nomicfoundation/hardhat-ethers")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("dotenv").config()

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: {
		compilers: [
			{ version: "0.8.7" },
		],
	},
	defaultNetwork: "hardhat",
	networks: {
		sepolia: {
			url: process.env.HRE_SEPOLIA_RPC_URL,
			accounts: [process.env.HRE_PRIVATE_KEY],
			chainId: 11155111,
			blockConfirmations: 6,
		},
	},
	namedAccounts: {
		deployer: {
			default: 0,
		},
		player: {
			default: 1,
		},
	},
	mocha: {
		timeout: 100_000,
	},
	etherscan: {
		apiKey: process.env.HRE_ETHERSCAN_KEY
	},
	gasReporter: {
		enabled: process.env.HRE_GAS_REPORTER,
		currency: "USD",
		outputFile: "gas-reporter.txt",
		noColors: true,
		coinmarketcap: process.env.HRE_COINMARKETCAP_KEY
	}
};
