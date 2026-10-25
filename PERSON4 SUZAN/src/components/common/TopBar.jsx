import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Bell,
  Plus,
  Menu,
  ChevronDown,
  User,
  Shield,
  LogOut,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext.jsx';
import { DEMO_ACCOUNTS } from '../../mock/mockStore.js';
import { SUPPORTED_NETWORKS } from '../../chain/contract.js';
import Button from '../ui/Button.jsx';
import AddressChip from '../ui/AddressChip.jsx';
import { apiFetch } from '../../api/client.js';

export default function TopBar({
  onToggleSidebar,
  setActivePage,
  onOpenCreateProject,
  onSearch,
}) {
  const {
    address,
    user,
    isConnected,
    isOwner,
    openConnectModal,
    disconnectWallet,
    switchDemoAccount,
    appMode,
    toggleAppMode,
    isMock,
    chainId,
    configuredChainId,
    switchNetwork
  } = useWallet();

  const [searchQuery, setSearchQuery] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNetworkMenuOpen, setIsNetworkMenuOpen] = useState(false);
  const alertsRef = useRef(null);
  const profileMenuRef = useRef(null);
  const networkMenuRef = useRef(null);

  // Fetch alerts from GET /alerts
  useEffect(() => {
    let isMounted = true;
    async function loadAlerts() {
      try {
        const data = await apiFetch('/alerts?resolved=false');
        if (isMounted && data) {
          const list = Array.isArray(data) ? data : (data.alerts || []);
          setAlerts(list);
          setUnreadAlertsCount(list.length);
        }
      } catch (err) {
        // Fallback silently if alerts unavailable
      }
    }
    loadAlerts();
    const interval = setInterval(loadAlerts, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (alertsRef.current && !alertsRef.current.contains(event.target)) {
        setIsAlertsOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
    setActivePage('projects');
  };

  return (
    <header className="sticky top-0 z-20 bg-ivory/90 backdrop-blur-md border-b border-gray px-4 lg:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Left: Mobile hamburger + Search bar */}
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 text-ink/70 hover:text-ink hover:bg-sage rounded-[8px]"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, agreements, clients..."
              className="w-full pl-9 pr-4 py-2 text-xs md:text-sm bg-white border border-gray rounded-[10px] text-ink placeholder:text-ink/40 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/20 transition-all"
            />
          </form>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          {/* Interactive Network Switcher Dropdown */}
          <div className="relative" ref={networkMenuRef}>
            <button
              onClick={() => setIsNetworkMenuOpen(!isNetworkMenuOpen)}
              className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-[8px] bg-white border border-gray hover:border-forest/40 text-xs font-mono font-medium text-ink transition-colors"
              title="Switch Blockchain Network"
            >
              <span className={`w-2 h-2 rounded-full ${Number(configuredChainId) === 80002 ? 'bg-purple-600' : 'bg-emerald-500'}`} />
              <span>{SUPPORTED_NETWORKS[configuredChainId]?.name || `Chain ${configuredChainId}`}</span>
              <ChevronDown className="w-3 h-3 text-ink/50" />
            </button>

            {isNetworkMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border-2 border-ink rounded-card shadow-brutal p-3 z-40 animate-slide-in">
                <div className="pb-2 mb-2 border-b border-gray">
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-ink/60 block">
                    Active EVM Network
                  </span>
                  <span className="text-xs font-mono font-bold text-forest">
                    {SUPPORTED_NETWORKS[configuredChainId]?.name} (ID: {configuredChainId})
                  </span>
                </div>

                <div className="space-y-1">
                  {Object.keys(SUPPORTED_NETWORKS).map((netId) => {
                    const net = SUPPORTED_NETWORKS[netId];
                    const isSelected = Number(configuredChainId) === Number(netId);
                    return (
                      <button
                        key={netId}
                        onClick={() => {
                          if (switchNetwork) switchNetwork(netId);
                          setIsNetworkMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-2 rounded-[6px] text-xs font-medium text-left transition-colors ${
                          isSelected ? 'bg-sage text-forest font-bold' : 'hover:bg-ivory text-ink'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${Number(netId) === 80002 ? 'bg-purple-600' : 'bg-emerald-500'}`} />
                          <span>{net.name}</span>
                        </div>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-forest" />}
                      </button>
                    );
                  })}

                  <div className="pt-2 mt-2 border-t border-gray/60">
                    <a
                      href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-2 rounded-[6px] text-xs font-medium text-forest hover:bg-sage/40 transition-colors"
                    >
                      <span>Get Sepolia Testnet ETH (Faucet)</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic Mode Switcher Button: Live Mode vs Demo Mode */}
          <button
            onClick={() => toggleAppMode && toggleAppMode()}
            className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-[10px] border-2 font-heading font-bold text-xs transition-all shadow-xs active:translate-y-0.5 cursor-pointer ${
              !isMock
                ? 'bg-emerald-50 border-emerald-600 text-emerald-950 hover:bg-emerald-100 hover:shadow-sm'
                : 'bg-amber-50 border-amber-600 text-amber-950 hover:bg-amber-100 hover:shadow-sm'
            }`}
            title={
              !isMock
                ? 'LIVE MODE: Connected to live Hardhat/Sepolia EVM and AI Microservice. Click to switch to Demo Mode.'
                : 'DEMO MODE: Offline simulated smart contracts. Click to switch to Live Mode.'
            }
          >
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  !isMock ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  !isMock ? 'bg-emerald-600' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="tracking-wide">
              {!isMock ? 'LIVE MODE' : 'DEMO MODE'}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold tracking-tight uppercase ${
                !isMock
                  ? 'bg-emerald-200/80 text-emerald-900 group-hover:bg-emerald-200'
                  : 'bg-amber-200/80 text-amber-900 group-hover:bg-amber-200'
              }`}
            >
              Toggle
            </span>
          </button>

          {/* Quick Persona Switcher (Client vs Freelancer) */}
          <div className="flex items-center bg-white border border-gray rounded-full p-0.5 shadow-xs">
            <button
              onClick={() => switchDemoAccount('CLIENT')}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-heading font-semibold transition-all ${
                (user?.role || '').toUpperCase() === 'CLIENT'
                  ? 'bg-forest text-ivory shadow-xs'
                  : 'text-ink/60 hover:text-ink hover:bg-sage/40'
              }`}
              title="Switch to Alice (Client)"
            >
              Client
            </button>
            <button
              onClick={() => switchDemoAccount('FREELANCER')}
              className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-heading font-semibold transition-all ${
                (user?.role || '').toUpperCase() === 'FREELANCER'
                  ? 'bg-forest text-ivory shadow-xs'
                  : 'text-ink/60 hover:text-ink hover:bg-sage/40'
              }`}
              title="Switch to Bob (Freelancer)"
            >
              Freelancer
            </button>
          </div>

          {/* Prominent coral "+ New Project" button */}
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={onOpenCreateProject}
            className="font-heading font-semibold"
          >
            New Project
          </Button>

          {/* Alerts Notification Bell backed by GET /alerts */}
          <div className="relative" ref={alertsRef}>
            <button
              onClick={() => setIsAlertsOpen(!isAlertsOpen)}
              className="relative p-2 rounded-[8px] bg-white border border-gray hover:bg-sage/50 text-ink transition-colors"
              aria-label="Open notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-coral border-2 border-ivory text-ink font-heading font-bold text-[10px] flex items-center justify-center">
                  {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                </span>
              )}
            </button>

            {isAlertsOpen && (
              <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white border-2 border-ink rounded-card shadow-brutal p-4 z-40 animate-slide-in">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray">
                  <h4 className="font-heading font-bold text-sm text-ink">Notifications & Alerts</h4>
                  <span className="text-xs font-mono text-ink/60">{alerts.length} active</span>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2.5">
                  {alerts.length === 0 ? (
                    <div className="py-6 text-center text-xs text-ink/50">
                      No pending alerts or notifications.
                    </div>
                  ) : (
                    alerts.map((al, idx) => (
                      <div
                        key={al.id || idx}
                        className="p-3 bg-sage/40 hover:bg-sage/70 rounded-[8px] border border-gray/60 transition-colors text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-heading font-semibold text-ink">
                            {al.title || 'Platform Alert'}
                          </span>
                          <span className="text-[10px] font-mono text-ink/50">
                            {al.type || 'Notice'}
                          </span>
                        </div>
                        <p className="text-xs text-ink/70 mt-1 leading-relaxed">
                          {al.message || al.description || 'Milestone or agreement deadline approaching.'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile & Wallet Menu */}
          {isConnected ? (
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 p-1.5 pl-2.5 rounded-[10px] bg-white border border-gray hover:border-forest/40 transition-colors"
                aria-label="User profile menu"
              >
                <div className="w-6 h-6 rounded-full bg-forest text-ivory flex items-center justify-center text-xs font-heading font-bold">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="hidden md:inline text-xs font-heading font-medium text-ink max-w-[100px] truncate">
                  {user?.name || (address ? `${address.slice(0, 6)}...` : 'User')}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-ink/60" />
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border-2 border-ink rounded-card shadow-brutal p-3 z-40 animate-slide-in">
                  <div className="pb-3 mb-2 border-b border-gray">
                    <p className="text-xs font-heading font-bold text-ink truncate">{user?.name || 'Verified User'}</p>
                    <p className="text-[11px] text-forest font-medium">{user?.role || 'CLIENT / FREELANCER'}</p>
                    {address && (
                      <div className="mt-2">
                        <AddressChip address={address} showExplorer={false} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setActivePage('profile');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-xs font-medium text-ink hover:bg-sage text-left"
                    >
                      <User className="w-3.5 h-3.5 text-forest" />
                      View & Edit Profile
                    </button>

                    {isOwner && (
                      <button
                        onClick={() => {
                          setActivePage('admin');
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-xs font-medium text-ink hover:bg-sage text-left"
                      >
                        <Shield className="w-3.5 h-3.5 text-coral" />
                        Admin Council
                      </button>
                    )}

                    {isMock && (
                      <div className="pt-2 mt-2 border-t border-gray">
                        <span className="text-[10px] font-heading font-bold text-ink/60 uppercase tracking-wider px-2 block mb-1">
                          Switch Mock Persona
                        </span>
                        <div className="space-y-1">
                          {Object.keys(DEMO_ACCOUNTS).map(key => (
                            <button
                              key={key}
                              onClick={() => {
                                switchDemoAccount(key);
                                setIsProfileMenuOpen(false);
                              }}
                              className="w-full text-left px-2.5 py-1 text-xs rounded-[6px] hover:bg-sage-light text-ink flex items-center justify-between"
                            >
                              <span>{DEMO_ACCOUNTS[key].name}</span>
                              <span className="text-[10px] font-mono text-ink/50">{DEMO_ACCOUNTS[key].role}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 mt-2 border-t border-gray">
                      <button
                        onClick={() => {
                          disconnectWallet();
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-xs font-medium text-coral-900 hover:bg-coral/20 text-left"
                      >
                        <LogOut className="w-3.5 h-3.5 text-coral" />
                        Disconnect Wallet
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={openConnectModal}
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
