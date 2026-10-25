import React, { useState } from 'react';
import { ToastProvider } from './context/ToastContext.jsx';
import { WalletProvider, useWallet } from './context/WalletContext.jsx';
import Sidebar from './components/common/Sidebar.jsx';
import TopBar from './components/common/TopBar.jsx';
import Footer from './components/common/Footer.jsx';
import NetworkBanner from './components/common/NetworkBanner.jsx';
import ConnectWalletModal from './components/common/ConnectWalletModal.jsx';
import ErrorBoundary from './components/common/ErrorBoundary.jsx';

import LandingPage from './pages/LandingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CommunityPage from './pages/CommunityPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import DraftPage from './pages/DraftPage.jsx';
import AgreementDetailPage from './pages/AgreementDetailPage.jsx';
import MyAgreementsPage from './pages/MyAgreementsPage.jsx';
import PaymentsPage from './pages/PaymentsPage.jsx';
import DisputesPage from './pages/DisputesPage.jsx';
import ClientsPage from './pages/ClientsPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AdminPage from './pages/AdminPage.jsx';

function AppLayout() {
  const { isConnected } = useWallet();
  const [activePage, setActivePage] = useState('dashboard');
  const [selectedAgreementId, setSelectedAgreementId] = useState(null);
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [activeChatThreadId, setActiveChatThreadId] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [projectFilterQuery, setProjectFilterQuery] = useState('');

  const handleOpenAgreement = (id) => {
    setSelectedAgreementId(id);
    setActivePage('agreement_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDraft = (id) => {
    setSelectedDraftId(id);
    setActivePage('draft_review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateToChat = (threadId) => {
    if (threadId) setActiveChatThreadId(threadId);
    setActivePage('messages');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCreateProject = () => {
    setActivePage('projects');
    setIsCreateProjectModalOpen(true);
  };

  const isLandingView = activePage === 'landing';

  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col font-sans">
      <ConnectWalletModal />

      {isLandingView ? (
        // Fullscreen Landing Page
        <div className="flex-1 flex flex-col">
          <NetworkBanner />
          <LandingPage
            setActivePage={setActivePage}
            onOpenAgreement={handleOpenAgreement}
          />
          <Footer />
        </div>
      ) : (
        // Main App Shell with Fixed Sage Sidebar + Top Bar
        <div className="flex-1 flex">
          {/* Fixed Sage Sidebar */}
          <Sidebar
            activePage={activePage}
            setActivePage={setActivePage}
            isMobileOpen={isMobileSidebarOpen}
            setIsMobileOpen={setIsMobileSidebarOpen}
            onOpenCreateProject={handleOpenCreateProject}
          />

          {/* Main Content Area */}
          <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
            <NetworkBanner />
            <TopBar
              onToggleSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              setActivePage={setActivePage}
              onOpenCreateProject={handleOpenCreateProject}
              onSearch={(query) => setProjectFilterQuery(query)}
            />

            <main className="flex-1">
              {activePage === 'dashboard' && (
                <DashboardPage
                  onOpenAgreement={handleOpenAgreement}
                  onOpenDraft={handleOpenDraft}
                  onNavigateToProjects={() => setActivePage('projects')}
                  onOpenCreateProject={handleOpenCreateProject}
                />
              )}

              {activePage === 'projects' && (
                <CommunityPage
                  onNavigateToChat={handleNavigateToChat}
                  onOpenDraft={handleOpenDraft}
                  onOpenAgreement={handleOpenAgreement}
                  externalSearchQuery={projectFilterQuery}
                  isCreateModalForcedOpen={isCreateProjectModalOpen}
                  onCloseCreateModal={() => setIsCreateProjectModalOpen(false)}
                />
              )}

              {activePage === 'agreements' && (
                <MyAgreementsPage
                  onOpenAgreement={handleOpenAgreement}
                  onOpenDraft={handleOpenDraft}
                  onNavigateToCommunity={() => setActivePage('projects')}
                />
              )}

              {activePage === 'agreement_detail' && (
                <AgreementDetailPage
                  agreementId={selectedAgreementId}
                  onBack={() => setActivePage('agreements')}
                />
              )}

              {activePage === 'draft_review' && (
                <DraftPage
                  agreementId={selectedDraftId}
                  onProceedToWizard={(id) => {
                    setSelectedAgreementId(id);
                    setActivePage('agreement_detail');
                  }}
                />
              )}

              {activePage === 'payments' && (
                <PaymentsPage
                  onOpenAgreement={handleOpenAgreement}
                />
              )}

              {activePage === 'disputes' && (
                <DisputesPage
                  onOpenAgreement={handleOpenAgreement}
                />
              )}

              {activePage === 'messages' && (
                <ChatPage
                  activeThreadId={activeChatThreadId}
                  onOpenDraftReview={handleOpenDraft}
                />
              )}

              {activePage === 'clients' && (
                <ClientsPage
                  onOpenAgreement={handleOpenAgreement}
                  onNavigateToChat={handleNavigateToChat}
                />
              )}

              {activePage === 'analytics' && (
                <AnalyticsPage />
              )}

              {activePage === 'profile' && (
                <ProfilePage />
              )}

              {activePage === 'admin' && (
                <AdminPage />
              )}
            </main>

            <Footer />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <WalletProvider>
          <AppLayout />
        </WalletProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
