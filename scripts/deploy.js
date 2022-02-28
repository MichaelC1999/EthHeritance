const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const HeirCoin = await hre.ethers.getContractFactory("HeirCoin");
  const HeirCoinDeployed = await HeirCoin.deploy();
  await HeirCoinDeployed.deployed();
  console.log("HeirCoin deployed to ", HeirCoinDeployed.address)

  const Inheritor = await hre.ethers.getContractFactory("Inheritor");
  const InheritorDeployed = await Inheritor.deploy(HeirCoinDeployed.address);
  await InheritorDeployed.deployed();
  console.log("Inheritor deployed to ", InheritorDeployed.address)

  let config = `
  export const InheritorContractAddr = "${InheritorDeployed.address}"
  export const HeirCoinContractAddr = "${HeirCoinDeployed.address}"
  export const DeployedFrom = "${InheritorDeployed.deployTransaction.from}"
  export const chainID = "4"
  `

  let data = JSON.stringify(config)
  fs.writeFileSync('./src/contractAssets/config.js', JSON.parse(data))
  const InheritorJSON = fs.readFileSync('./artifacts/contracts/Inheritor.sol/Inheritor.json', {encoding:'utf8', flag:'r'})
  fs.writeFileSync('./src/contractAssets/Inheritor.json', InheritorJSON);
  const HeirCoinJSON = fs.readFileSync('./artifacts/contracts/HeirCoin.sol/HeirCoin.json', {encoding:'utf8', flag:'r'})
  fs.writeFileSync('./src/contractAssets/HeirCoin.json', HeirCoinJSON);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
