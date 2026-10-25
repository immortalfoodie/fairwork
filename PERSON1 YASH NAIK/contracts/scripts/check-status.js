const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const networkName = hre.network.name || "localhost";
  const sharedDir = fs.existsSync(path.resolve(__dirname, "../../shared"))
    ? path.resolve(__dirname, "../../shared")
    : path.resolve(__dirname, "../../../shared");

  let address = process.env.CONTRACT_ADDRESS;
  const deploymentFile = path.join(sharedDir, "deployments", `${networkName}.json`);

  if (fs.existsSync(deploymentFile)) {
    const data = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    address = data.address || address;
  } else if (!address) {
    address = networkName === "sepolia" ? "0xc1C0415872eA86DfdA31615B9Ad94d795974CA1e" : "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  }

  console.log("==================================================");
  console.log(`Inspecting FairWork Contract on [${networkName}] at: ${address}`);
  console.log("==================================================");

  const fairWork = await hre.ethers.getContractAt("FairWork", address);

  // 1. Contract Configuration
  const owner = await fairWork.owner();
  const oracle = await fairWork.oracle();
  const treasury = await fairWork.treasury();
  const feeBps = await fairWork.feeBps();
  const paused = await fairWork.paused();
  const arbitrators = await fairWork.getArbitratorPool();

  console.log("Contract Configuration:");
  console.log(`- Owner:         ${owner}`);
  console.log(`- Oracle:        ${oracle}`);
  console.log(`- Treasury:      ${treasury}`);
  console.log(`- Fee (bps):     ${feeBps} (${Number(feeBps) / 100}%)`);
  console.log(`- Paused:        ${paused}`);
  console.log(`- Arbitrators:   ${arbitrators.length} registered [${arbitrators.slice(0, 3).join(", ")}]`);
  console.log("--------------------------------------------------");

  // 2. Check Agreement #1 (seeded agreement)
  try {
    const agreement = await fairWork.getAgreement(1);
    const statusNames = ["Draft", "AwaitingFunding", "Active", "Completed", "Cancelled", "Disputed"];
    const modeNames = ["MILESTONE", "LUMP_SUM"];

    console.log("Agreement #1 State:");
    console.log(`- Status:        ${statusNames[Number(agreement.status)]}`);
    console.log(`- Client:        ${agreement.client}`);
    console.log(`- Freelancer:    ${agreement.freelancer}`);
    console.log(`- Total Amount:  ${hre.ethers.formatEther(agreement.totalAmount)} ETH`);
    console.log(`- Payment Mode:  ${modeNames[Number(agreement.mode)]}`);
    console.log(`- Terms Hash:    ${agreement.termsHash}`);
    console.log(`- Terms URI:     ${agreement.termsURI}`);

    // Payment Summary
    const summary = await fairWork.getPaymentSummary(1);
    console.log("\nPayment Accounting Summary (#1):");
    console.log(`- Locked:        ${hre.ethers.formatEther(summary.locked)} ETH`);
    console.log(`- Released:      ${hre.ethers.formatEther(summary.released)} ETH`);
    console.log(`- Disputed:      ${hre.ethers.formatEther(summary.disputed)} ETH`);
    console.log(`- Refunded:      ${hre.ethers.formatEther(summary.refunded)} ETH`);
    console.log(`- Fees Paid:     ${hre.ethers.formatEther(summary.feesPaid)} ETH`);

    // Milestones
    const count = await fairWork.getMilestoneCount(1);
    const mStatusNames = ["Pending", "Submitted", "Approved", "Rejected", "Disputed", "Paid", "Refunded"];
    console.log(`\nMilestones (${count} total):`);
    for (let i = 0; i < Number(count); i++) {
      const m = await fairWork.getMilestone(1, i);
      console.log(
        `  [Milestone ${i}] Status: ${mStatusNames[Number(m.status)]} | Amount: ${hre.ethers.formatEther(
          m.amount
        )} ETH | Deadline: ${new Date(Number(m.deadline) * 1000).toISOString()}`
      );
    }
  } catch (err) {
    console.log("No Agreement #1 found yet. (Run 'npm run seed' to create it)");
  }

  // 3. Query Past Event Logs
  console.log("\n--------------------------------------------------");
  console.log("Recent Contract Events On-Chain:");
  try {
    const latestBlock = await hre.ethers.provider.getBlockNumber();
    const fromBlock = networkName === "localhost" ? 0 : Math.max(0, latestBlock - 5000);
    const filter = {
      address: address,
      fromBlock: fromBlock,
      toBlock: "latest",
    };
    const logs = await hre.ethers.provider.getLogs(filter);
    console.log(`Total events emitted in blocks [${fromBlock} - ${latestBlock}]: ${logs.length}`);

    for (const log of logs.slice(-10)) {
      try {
        const parsed = fairWork.interface.parseLog(log);
        if (parsed) {
          console.log(`  - Event [${parsed.name}]: tx ${log.transactionHash.slice(0, 18)}... block #${log.blockNumber}`);
        }
      } catch (e) {}
    }
  } catch (err) {
    console.log(`(Event logs query skipped: ${err.message})`);
  }

  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Check failed:", err);
    process.exit(1);
  });
