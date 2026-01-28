import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import UserManagement from './pages/UserManagement';
import ActivityLogs from './pages/ActivityLogs';
import Sidebar from './components/Sidebar';
import Scheduler from './components/Scheduler';
import ResourceManager from './components/ResourceManager';
import SearchResults from './pages/SearchResults';

import api from './api';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [activeView, setActiveView] = useState('schedule');
  const [sidebarAction, setSidebarAction] = useState(null);
  const [positionGroups, setPositionGroups] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch groups for the sidebar
  const fetchData = React.useCallback(() => {
    if (isAuthenticated) {
      Promise.all([
        api.getPositionGroups(),
        api.getProjects()
      ]).then(([groups, projectsData]) => {
        setPositionGroups(groups);
        setProjects(projectsData);
      }).catch(err => console.error("Failed to load sidebar data:", err));
    }
  }, [isAuthenticated]);

  // Fetch groups for the sidebar
  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Keyboard shortcut: ⌘K / Ctrl+K to open search
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setActiveView('search');
        setSearchQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSidebarAction = (action) => {
    // If it's a filtering action (e.g. clicking a group in sidebar)
    if (String(action).startsWith('filter-group-')) {
      const groupId = action.replace('filter-group-', '');
      setSelectedGroupId(parseInt(groupId));
      setActiveView('resources');
      return;
    }

    // Reset filter if navigating to main resources page
    if (action === 'view-all-resources') {
      setSelectedGroupId(null);
      setActiveView('resources');
      return;
    }

    // If it's a scheduling action or project action, ensure we are on the schedule view
    if (['new-project', 'new-workorder', 'manage-groups'].includes(action) ||
      String(action).startsWith('edit-workorder-') ||
      String(action).startsWith('new-workorder-project-')) {
      setActiveView('schedule');
    }
    setSidebarAction(action);

    // Clear the action after a short delay
    setTimeout(() => setSidebarAction(null), 100);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setActiveView('search');
  };

  const renderContent = () => {
    switch (activeView) {
      case 'search':
        return (
          <SearchResults
            searchQuery={searchQuery}
            onEditWorkorder={(id) => {
              setActiveView('schedule');
              setTimeout(() => setSidebarAction(`edit-workorder-${id}`), 100);
            }}
            onViewResource={(id) => {
              // Show all resources, but maybe filter/highlight later
              setSelectedGroupId(null);
              setActiveView('resources');
            }}
          />
        );
      case 'resources':
        return <ResourceManager initialGroupId={selectedGroupId} />;
      case 'users':
        return <UserManagement />;
      case 'logs':
        return <ActivityLogs />;
      case 'schedule':
      default:
        return <Scheduler sidebarAction={sidebarAction} onDataChange={fetchData} />;
    }
  };

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

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onAction={handleSidebarAction}
        positionGroups={positionGroups}
        selectedGroupId={selectedGroupId}
        projects={projects}
        onSearch={handleSearch}
      />
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
