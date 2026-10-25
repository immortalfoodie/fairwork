import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  FileCheck2,
  CreditCard,
  Scale,
  MessageSquare,
  Users,
  BarChart3,
  ShieldAlert,
  User,
  ShieldCheck,
  X,
  Zap,
  Search,
  DollarSign,
  Wallet
} from 'lucide-react';
import { useWallet } from '../../context/WalletContext.jsx';
import AddressChip from '../ui/AddressChip.jsx';

export default function Sidebar({
  activePage,
  setActivePage,
  isMobileOpen,
  setIsMobileOpen,
  onOpenCreateProject,
}) {
  const { address, user, isOwner, isConnected, openConnectModal, isMock, toggleAppMode } = useWallet();

  const role = (user?.role || 'CLIENT').toUpperCase();
  const isClient = role === 'CLIENT';
  const isFreelancer = role === 'FREELANCER';

  // Role-specific navigation items
  const navItems = isFreelancer
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'projects', label: 'Find Work', icon: Search },
        { id: 'agreements', label: 'My Contracts', icon: FileCheck2 },
        { id: 'payments', label: 'Earnings', icon: DollarSign },
        { id: 'disputes', label: 'Disputes', icon: Scale },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
        { id: 'clients', label: 'My Clients', icon: Users },
        { id: 'analytics', label: 'Performance', icon: BarChart3 },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'projects', label: 'Hire Talent', icon: Briefcase },
        { id: 'agreements', label: 'Agreements', icon: FileCheck2 },
        { id: 'payments', label: 'Spending', icon: Wallet },
        { id: 'disputes', label: 'Disputes', icon: Scale },
        { id: 'messages', label: 'Messages', icon: MessageSquare },
        { id: 'clients', label: 'Freelancers', icon: Users },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      ];

  if (isOwner) {
    navItems.push({ id: 'admin', label: 'Admin Council', icon: ShieldAlert });
  }

  const handleNavClick = (id) => {
    setActivePage(id);
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  const content = (
    <div className="flex flex-col h-full bg-sage border-r border-gray w-64 select-none">
      {/* Brand Header */}
      <div className="p-6 pb-4 border-b border-gray/60">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleNavClick('landing')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-8 h-8 rounded-[8px] bg-forest text-ivory flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-coral" />
            </div>
            <div>
              <span className="font-heading font-bold text-xl tracking-tight text-ink block leading-none">
                SANKALP
              </span>
              <span className="text-[11px] font-sans font-medium text-forest/80 tracking-wide mt-1 block">
                Bridging Work and Trust
              </span>
            </div>
          </button>

          {setIsMobileOpen && (
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden p-1.5 text-ink/60 hover:text-ink rounded-lg"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Role Badge */}
      <div className="px-4 py-2.5">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-xs font-heading font-semibold ${
          isFreelancer
            ? 'bg-forest/10 text-forest border border-forest/20'
            : 'bg-coral/10 text-coral border border-coral/20'
        }`}>
          {isFreelancer ? <Zap className="w-3.5 h-3.5" /> : <Briefcase className="w-3.5 h-3.5" />}
          {isFreelancer ? 'Freelancer Mode' : 'Client Mode'}
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-2 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id ||
            (item.id === 'agreements' && (activePage === 'agreement_detail' || activePage === 'draft_review'));

          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-forest text-ivory shadow-sm'
                  : 'text-ink/80 hover:text-ink hover:bg-sage-light/70'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-coral' : 'text-forest'}`} />
              <span className="font-heading font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mode Status Pill */}
      <div className="px-3 pt-2">
        <button
          onClick={() => toggleAppMode && toggleAppMode()}
          className={`w-full flex items-center justify-between p-2 rounded-[8px] border text-xs font-heading font-semibold transition-all cursor-pointer ${
            !isMock
              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100 shadow-xs'
              : 'bg-amber-50 border-amber-300 text-amber-950 hover:bg-amber-100 shadow-xs'
          }`}
          title="Click to toggle between Live and Demo modes"
        >
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${!isMock ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{!isMock ? 'Live EVM Mode' : 'Demo Mode'}</span>
          </div>
          <span className="text-[10px] uppercase font-mono px-1 rounded bg-black/5 text-ink/60">Switch</span>
        </button>
      </div>

      {/* User profile section at the bottom */}
      <div className="p-3.5 m-3 bg-white/80 border border-gray rounded-card shadow-sm">
        {isConnected ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleNavClick('profile')}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left min-w-0"
              >
                <div className="w-7 h-7 rounded-full bg-forest text-ivory flex items-center justify-center font-heading font-bold text-xs shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-heading font-semibold text-ink truncate">
                    {user?.name || 'Verified Member'}
                  </div>
                  <div className={`text-[10px] font-sans font-medium ${
                    isFreelancer ? 'text-forest' : 'text-coral'
                  }`}>
                    {user?.role || 'CLIENT'}
                  </div>
                </div>
              </button>
            </div>
            {address && (
              <AddressChip address={address} showExplorer={false} className="w-full justify-between" />
            )}
          </div>
        ) : (
          <div className="text-center py-1">
            <p className="text-xs text-ink/70 mb-2">Connect wallet to transact</p>
            <button
              onClick={openConnectModal}
              className="w-full text-xs font-heading font-semibold py-1.5 px-3 bg-coral text-ink border border-ink shadow-brutal-sm rounded-[8px] hover:translate-x-[1px] hover:translate-y-[1px]"
            >
              Connect Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-0 bottom-0 z-30 w-64">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-xs"
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative z-10 w-64 h-full shadow-2xl animate-slide-in">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
