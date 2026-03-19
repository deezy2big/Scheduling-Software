import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import Sidebar from './components/Sidebar';
import Scheduler from './components/Scheduler';
import ManagementContainer from './components/ManagementContainer';
import SearchResults from './pages/SearchResults';
import ProjectDetails from './pages/ProjectDetails';
import ProjectsList from './components/ProjectsList';
import DraggableModal from './components/DraggableModal';

import api from './api';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [activeView, setActiveView] = useState('schedule');
  const [sidebarAction, setSidebarAction] = useState(null);
  const [positionGroups, setPositionGroups] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openProjectModals, setOpenProjectModals] = useState([]);
  const [activeScheduleBooks, setActiveScheduleBooks] = useState([]);

  const toggleScheduleBook = (groupId) => {
    if (groupId === '__all__') {
      setActiveScheduleBooks([]);
      return;
    }
    setActiveScheduleBooks(prev => {
      const num = Number(groupId);
      if (prev.map(Number).includes(num)) return prev.filter(id => Number(id) !== num);
      return [...prev, groupId];
    });
  };

  const removeScheduleBook = (groupId) => {
    setActiveScheduleBooks(prev => prev.filter(id => Number(id) !== Number(groupId)));
  };

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

  // Project modal management functions
  const openProjectModal = (projectId) => {
    // Check if already open
    if (openProjectModals.some(m => m.projectId === projectId)) {
      focusProjectModal(projectId);
      return;
    }

    // Check max limit
    if (openProjectModals.length >= 5) {
      alert('Maximum 5 projects can be open at once. Please close one to continue.');
      return;
    }

    // Calculate highest z-index
    const maxZ = openProjectModals.length > 0
      ? Math.max(...openProjectModals.map(m => m.zIndex))
      : 1000;

    setOpenProjectModals([...openProjectModals, {
      projectId,
      zIndex: maxZ + 1
    }]);
  };

  const closeProjectModal = (projectId) => {
    setOpenProjectModals(openProjectModals.filter(m => m.projectId !== projectId));
  };

  const focusProjectModal = (projectId) => {
    const modal = openProjectModals.find(m => m.projectId === projectId);
    if (!modal) return;

    const maxZ = Math.max(...openProjectModals.map(m => m.zIndex));
    if (modal.zIndex === maxZ) return; // Already on top

    setOpenProjectModals(openProjectModals.map(m =>
      m.projectId === projectId ? { ...m, zIndex: maxZ + 1 } : m
    ));
  };

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

    // Handle view-project action
    if (String(action).startsWith('view-project-')) {
      const projectId = action.replace('view-project-', '');
      openProjectModal(projectId);
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
      case 'projects':
        return (
          <ProjectsList
            projects={projects}
            onSelectProject={(id) => openProjectModal(id)}
            onNewProject={() => handleSidebarAction('new-project')}
          />
        );
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
            onEditProject={(project) => openProjectModal(project.id)}
          />
        );
      case 'management':
        return <ManagementContainer />;
      case 'schedule':
      default:
        return (
          <Scheduler
            sidebarAction={sidebarAction}
            onDataChange={fetchData}
            onProjectCreated={(projectId) => openProjectModal(projectId)}
            activeScheduleBooks={activeScheduleBooks}
            onRemoveScheduleBook={removeScheduleBook}
            onToggleScheduleBook={toggleScheduleBook}
          />
        );
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
        activeScheduleBooks={activeScheduleBooks}
        onToggleScheduleBook={toggleScheduleBook}
      />
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>

      {/* Project Modals */}
      {openProjectModals.map(modal => (
        <DraggableModal
          key={modal.projectId}
          title="Project Details"
          isOpen={true}
          onClose={() => closeProjectModal(modal.projectId)}
          initialSize={{ width: 900, height: 650 }}
        >
          <ProjectDetails
            projectId={modal.projectId}
            onClose={() => closeProjectModal(modal.projectId)}
          />
        </DraggableModal>
      ))}
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
