require("@nomicfoundation/hardhat-toolbox");

const PRIVATE_KEY = "0xb23c05106b79047e62b7fd9b79eec8179a151b42d4b7084569a841aed7a0f3f9";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "cancun"
    }
  },
  networks: {
    base_sepolia: {
      url: "https://sepolia.base.org",
      accounts: [PRIVATE_KEY],
      chainId: 84532
    }
  }
};
