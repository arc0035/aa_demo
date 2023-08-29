const hre = require("hardhat");

async function main() {
  const factory = await hre.ethers.deployContract("WalletFactory");
  await factory.waitForDeployment();

  console.log(
    `Deployed to ${factory.target}`
  );
  
  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function test(factory){
  const [e1,e2,e3] = await ethers.getSigners();
  const salt = 0xabcd;
  const predicted = await factory.computeAddress(e1.address, e2.address, e3.address, salt);
  const tx = await factory.createAccount(e1.address, e2.address, e3.address, salt);
  const receipt = await tx.wait();
  const actual = receipt.logs[0].args[0];
  console.log(predicted == actual);
}