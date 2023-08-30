const hre = require("hardhat");
const ethers = hre.ethers;
//target=0xff4F5Af43630c5fA6E31f7f892F65902eF327752  yarn hardhat run scripts/transfer.js
async function main() {
    const target = process.env.target;
    if (!target){
        console.log('地址为空');
        return;
    }
    const signers = await hre.ethers.getSigners();
    let signer = signers[0];
    tx = await signer.sendTransaction({
        to: target,
        value: ethers.parseEther("4.0")
      });
      
    const receipt = await tx.wait();
    
    console.log(receipt.status==1?'success':'failure');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

