import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import UserManagement from './pages/UserManagement';
import ActivityLogs from './pages/ActivityLogs';
import Sidebar from './components/Sidebar';
import Scheduler from './components/Scheduler';
import ResourceManager from './components/ResourceManager';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [activeView, setActiveView] = useState('schedule');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (activeView) {
      case 'resources':
        return <ResourceManager />;
      case 'users':
        return <UserManagement />;
      case 'logs':
        return <ActivityLogs />;
      case 'schedule':
      default:
        return <Scheduler />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
