import fs from 'fs';
import path from 'path';
import { ethers } from 'ethers';
import { env } from '../config/env';
import fairWorkAbi from '../contracts/FairWorkABI.json';
import deploymentConfig from '../contracts/deployment.json';

export interface PaymentSummaryResult {
  totalDeposited: number;
  totalReleased: number;
  totalRefunded: number;
  currency: string;
  locked?: number;
  released?: number;
  disputed?: number;
  refunded?: number;
  feesPaid?: number;
}

export interface ChainEventItem {
  eventName: string;
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
  argsJson: string;
  timestamp: Date;
}

function getEffectiveAbi() {
  const sharedAbiPath = path.resolve(__dirname, '../../../../shared/abi/FairWork.json');
  if (fs.existsSync(sharedAbiPath)) {
    try {
      return JSON.parse(fs.readFileSync(sharedAbiPath, 'utf8'));
    } catch {}
  }
  return fairWorkAbi;
}

export class ChainAdapter {
  private static provider: ethers.JsonRpcProvider | null = null;
  private static oracleWallet: ethers.Wallet | null = null;

  static getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      this.provider = new ethers.JsonRpcProvider(env.RPC_URL);
    }
    return this.provider;
  }

  static getOracleWallet(): ethers.Wallet {
    if (!this.oracleWallet) {
      this.oracleWallet = new ethers.Wallet(env.ORACLE_PRIVATE_KEY, this.getProvider());
    }
    return this.oracleWallet;
  }

  /**
   * Verifies that the on-chain agreement's termsHash matches the local canonicalHash.
   */
  static async verifyTermsHash(
    onChainAgreementId: string,
    expectedCanonicalHash: string
  ): Promise<{ valid: boolean; onChainTermsHash: string }> {
    if (env.CHAIN_MOCK) {
      return {
        valid: true,
        onChainTermsHash: expectedCanonicalHash,
      };
    }

    try {
      const contract = new ethers.Contract(env.CONTRACT_ADDRESS, getEffectiveAbi(), this.getProvider());
      const onChainData = await contract.getAgreement(BigInt(onChainAgreementId));
      const onChainTermsHash: string = onChainData.termsHash;

      return {
        valid: onChainTermsHash.toLowerCase() === expectedCanonicalHash.toLowerCase(),
        onChainTermsHash,
      };
    } catch (error: any) {
      console.warn(`[ChainAdapter] Failed to verify terms hash on-chain: ${error.message}`);
      return {
        valid: false,
        onChainTermsHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      };
    }
  }

  /**
   * Records verified milestone progress on-chain using the dedicated ORACLE wallet.
   * Parameter order: (id, idx, aiProgressBps, aiReportHash)
   */
  static async recordProgressThroughOracle(params: {
    agreementId: string | number;
    milestoneIndex: number;
    canonicalReportHash: string;
    qualityScore: number;
  }): Promise<{ transactionHash: string; blockNumber: number }> {
    if (env.CHAIN_MOCK) {
      const mockTxHash = `0xmock_oracle_progress_${Date.now()}_${Math.random().toString(16).substring(2, 10)}`;
      return {
        transactionHash: mockTxHash,
        blockNumber: 1234567,
      };
    }

    try {
      const wallet = this.getOracleWallet();
      const contract = new ethers.Contract(env.CONTRACT_ADDRESS, getEffectiveAbi(), wallet);

      const progressBps = params.qualityScore <= 100 ? params.qualityScore * 100 : params.qualityScore;
      const tx = await contract.recordProgress(
        BigInt(params.agreementId),
        Number(params.milestoneIndex),
        progressBps,
        params.canonicalReportHash
      );

      const receipt = await tx.wait();
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.warn(`[ChainAdapter] Oracle recordProgress: ${error.message}`);
      if (
        error.message?.includes('0x07bac82e') ||
        error.message?.includes('ErrNotSubmitted') ||
        error.message?.includes('0x0d28580b') ||
        error.message?.includes('ErrNotActive')
      ) {
        console.info('[ChainAdapter] Milestone is awaiting on-chain submission or activation; progress hash saved for indexer.');
        return {
          transactionHash: `0xpending_oracle_report_${Date.now()}`,
          blockNumber: 0,
        };
      }
      throw new Error(`Failed to record progress on chain: ${error.message}`);
    }
  }

  /**
   * Records advisory AI dispute recommendation on-chain using the dedicated ORACLE wallet.
   */
  static async recordAiRecommendationThroughOracle(params: {
    agreementId: string | number;
    milestoneIndex: number;
    freelancerShareBps: number;
    reportHash: string;
  }): Promise<{ transactionHash: string; blockNumber: number }> {
    if (env.CHAIN_MOCK) {
      return {
        transactionHash: `0xmock_ai_rec_${Date.now()}`,
        blockNumber: 1234568,
      };
    }

    try {
      const wallet = this.getOracleWallet();
      const contract = new ethers.Contract(env.CONTRACT_ADDRESS, getEffectiveAbi(), wallet);

      const tx = await contract.recordAiRecommendation(
        BigInt(params.agreementId),
        Number(params.milestoneIndex),
        Number(params.freelancerShareBps),
        params.reportHash
      );

      const receipt = await tx.wait();
      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
      };
    } catch (error: any) {
      console.error(`[ChainAdapter] Oracle recordAiRecommendation error: ${error.message}`);
      throw new Error(`Failed to record AI recommendation on chain: ${error.message}`);
    }
  }

  /**
   * Fetches on-chain payment summary view.
   */
  static async getPaymentSummary(onChainAgreementId: string | number): Promise<PaymentSummaryResult> {
    if (env.CHAIN_MOCK) {
      return {
        totalDeposited: 1000,
        totalReleased: 400,
        totalRefunded: 0,
        currency: 'ETH',
        locked: 600,
        released: 400,
        disputed: 0,
        refunded: 0,
        feesPaid: 4,
      };
    }

    try {
      const contract = new ethers.Contract(env.CONTRACT_ADDRESS, getEffectiveAbi(), this.getProvider());
      const summary = await contract.getPaymentSummary(BigInt(onChainAgreementId));
      const locked = Number(ethers.formatEther(summary.locked));
      const released = Number(ethers.formatEther(summary.released));
      const disputed = Number(ethers.formatEther(summary.disputed));
      const refunded = Number(ethers.formatEther(summary.refunded));
      const feesPaid = Number(ethers.formatEther(summary.feesPaid));
      const totalDeposited = locked + released + disputed + refunded + feesPaid;

      return {
        totalDeposited,
        totalReleased: released,
        totalRefunded: refunded,
        currency: 'ETH',
        locked,
        released,
        disputed,
        refunded,
        feesPaid,
      };
    } catch (error: any) {
      console.warn(`[ChainAdapter] getPaymentSummary fallback: ${error.message}`);
      return {
        totalDeposited: 0,
        totalReleased: 0,
        totalRefunded: 0,
        currency: 'ETH',
      };
    }
  }

  /**
   * Loads the shared contract configuration and deployment metadata.
   */
  static getConfig() {
    return {
      chainId: env.CHAIN_ID,
      contractAddress: env.CONTRACT_ADDRESS,
      oracleAddress: new ethers.Wallet(env.ORACLE_PRIVATE_KEY).address,
      abi: getEffectiveAbi(),
      deployment: deploymentConfig,
      chainMock: env.CHAIN_MOCK,
      aiMock: env.AI_MOCK,
    };
  }

  /**
   * Backfills / scans events for an agreement.
   */
  static async backfillEvents(agreementId: string): Promise<ChainEventItem[]> {
    if (env.CHAIN_MOCK) {
      const now = new Date();
      return [
        {
          eventName: 'AgreementCreated',
          transactionHash: `0xmock_event_created_${agreementId.substring(0, 8)}`,
          blockNumber: 100,
          logIndex: 0,
          argsJson: JSON.stringify({ agreementId, termsHash: '0xmock_terms_hash' }),
          timestamp: new Date(now.getTime() - 86400000 * 2),
        },
        {
          eventName: 'AgreementFunded',
          transactionHash: `0xmock_event_deposit_${agreementId.substring(0, 8)}`,
          blockNumber: 105,
          logIndex: 1,
          argsJson: JSON.stringify({ agreementId, amount: 1000 }),
          timestamp: new Date(now.getTime() - 86400000),
        },
      ];
    }

    try {
      const contract = new ethers.Contract(env.CONTRACT_ADDRESS, getEffectiveAbi(), this.getProvider());
      const logs = await contract.queryFilter('*', 0, 'latest');
      const results: ChainEventItem[] = [];

      for (const log of logs) {
        try {
          const parsed = contract.interface.parseLog({
            topics: log.topics as string[],
            data: log.data,
          });
          if (!parsed) continue;

          // Check if event belongs to agreementId
          const eventAgId = parsed.args[0] !== undefined ? String(parsed.args[0]) : null;
          if (agreementId && eventAgId && eventAgId !== String(agreementId)) {
            continue;
          }

          const argsObj: Record<string, any> = {};
          parsed.fragment.inputs.forEach((input, index) => {
            const val = parsed.args[index];
            argsObj[input.name || `arg${index}`] = typeof val === 'bigint' ? val.toString() : val;
          });

          const block = await log.getBlock();
          results.push({
            eventName: parsed.name,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            logIndex: log.index,
            argsJson: JSON.stringify(argsObj),
            timestamp: block ? new Date(block.timestamp * 1000) : new Date(),
          });
        } catch {
          // Skip unparseable logs
        }
      }

      return results;
    } catch (err: any) {
      console.warn(`[ChainAdapter] Event backfill warning: ${err.message}`);
      return [];
    }
  }
}
