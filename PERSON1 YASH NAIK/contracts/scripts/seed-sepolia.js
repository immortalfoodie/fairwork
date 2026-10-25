const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  if (!signer) {
    console.error("No signer available. Please check PRIVATE_KEY in contracts/.env");
    process.exit(1);
  }

  const contractAddress = process.env.CONTRACT_ADDRESS || "0xc1C0415872eA86DfdA31615B9Ad94d795974CA1e";
  console.log("==================================================");
  console.log("FairWork Sepolia Transaction Trigger");
  console.log("==================================================");
  console.log(`Signer Address:   ${signer.address}`);
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log(`Sepolia Balance:  ${hre.ethers.formatEther(balance)} ETH`);
  console.log(`Target Contract:  ${contractAddress}`);
  console.log("==================================================");

  if (balance === 0n) {
    console.error("Error: Signer has 0 Sepolia ETH. Cannot pay for gas.");
    console.error("Please set PRIVATE_KEY in contracts/.env for an address with Sepolia ETH (e.g., 0x9908CAB15D339845c83775120F3f8373583Cc476 or 0xC615564e4105DA69Ac694132E9c96B7C556Bb081).");
    process.exit(1);
  }

  const fairWork = await hre.ethers.getContractAt("FairWork", contractAddress, signer);

  // Freelancer address (must differ from client/signer)
  const defaultFreelancer = "0xC615564e4105DA69Ac694132E9c96B7C556Bb081";
  let freelancer = process.env.FREELANCER_ADDRESS || defaultFreelancer;
  if (freelancer.toLowerCase() === signer.address.toLowerCase()) {
    freelancer = "0x9908CAB15D339845c83775120F3f8373583Cc476";
    if (freelancer.toLowerCase() === signer.address.toLowerCase()) {
      freelancer = defaultFreelancer;
    }
  }

  const termsHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes(`FairWork Sepolia Demo Agreement Terms v${Date.now()}`));
  const termsURI = "ipfs://bafybeifairworkdemosepolia";
  const mode = 0; // MILESTONE

  const now = Math.floor(Date.now() / 1000);
  const milestoneAmounts = [hre.ethers.parseEther("0.001"), hre.ethers.parseEther("0.002")];
  const deadlines = [now + 86400 * 7, now + 86400 * 14];
  const requiredProgressBps = [5000, 10000];
  const criteriaHashes = [
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("Milestone 1 Deliverables")),
    hre.ethers.keccak256(hre.ethers.toUtf8Bytes("Milestone 2 Deliverables"))
  ];

  const params = {
    freelancer,
    termsHash,
    termsURI,
    mode,
    latePenaltyBpsPerDay: 50, // 0.5%
    maxLatePenaltyBps: 1000,  // 10%
    reviewWindow: 86400 * 3,
    graceWindow: 86400 * 2,
    maxRevisions: 3,
    amounts: milestoneAmounts,
    deadlines: deadlines,
    requiredProgressBps: requiredProgressBps,
    criteriaHashes: criteriaHashes
  };

  console.log(`\nBroadcasting createAgreement transaction to Sepolia (Client: ${signer.address}, Freelancer: ${freelancer})...`);
  const tx = await fairWork.createAgreement(params);
  console.log(`Transaction submitted! Hash: ${tx.hash}`);
  console.log(`View on Sepolia Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);
  console.log("Waiting for confirmation on Ethereum Sepolia network...");

  const receipt = await tx.wait(1);
  console.log(`Confirmed in block #${receipt.blockNumber}! Status: SUCCESS`);
  console.log(`\nNow check contract page on Etherscan:`);
  console.log(`https://sepolia.etherscan.io/address/${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Transaction failed:", err);
    process.exit(1);
  });
