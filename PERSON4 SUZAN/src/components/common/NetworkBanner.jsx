import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useWallet } from '../../context/WalletContext.jsx';
import Button from '../ui/Button.jsx';
import { SUPPORTED_NETWORKS } from '../../chain/contract.js';

export default function NetworkBanner() {
  const { isWrongNetwork, chainId, configuredChainId, switchNetwork } = useWallet();

  if (!isWrongNetwork) return null;

  const targetId = configuredChainId && SUPPORTED_NETWORKS[configuredChainId] ? configuredChainId : 11155111;
  const targetNet = SUPPORTED_NETWORKS[targetId] || SUPPORTED_NETWORKS[11155111] || { name: 'Sepolia Testnet' };

  return (
    <div className="bg-coral/25 border-b-2 border-coral px-4 py-2 text-ink z-30">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs md:text-sm">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-coral shrink-0" />
          <span>
            <strong className="font-heading font-bold text-ink">Unsupported Network:</strong> Connected to Chain ID{' '}
            <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-coral/40">{chainId}</code>. SANKALP requires{' '}
            <strong className="font-heading font-semibold text-forest">{targetNet.name}</strong> (Chain ID{' '}
            <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-forest/30">{targetId}</code>) or Hardhat Local (31337).
          </span>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => switchNetwork && switchNetwork(targetId)}
          icon={RefreshCw}
          className="whitespace-nowrap font-medium text-xs py-1"
        >
          Switch to {targetNet.name}
        </Button>
      </div>
    </div>
  );
}
