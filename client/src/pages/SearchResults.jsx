import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useDebounce } from '../hooks/useDebounce';
import { getRecentSearches, addRecentSearch, clearRecentSearches } from '../utils/searchHistory';
import { highlightMatch } from '../utils/highlight';
import FilterPanel from '../components/search/FilterPanel';
import ProjectCard from '../components/search/ProjectCard';
import WorkorderCard from '../components/search/WorkorderCard';
import ResourceCard from '../components/search/ResourceCard';
import ProjectTable from '../components/search/ProjectTable';
import WorkorderTable from '../components/search/WorkorderTable';
import ResourceTable from '../components/search/ResourceTable';
import Pagination from '../components/search/Pagination';
import EmptyState from '../components/search/EmptyState';

function SearchResults({ searchQuery, onEditProject, onEditWorkorder, onViewResource }) {
    // State management
    const [query, setQuery] = useState(searchQuery || '');
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'projects' | 'workorders' | 'resources'
    const [viewMode, setViewMode] = useState(localStorage.getItem('search_view_mode') || 'cards'); // 'cards' | 'table'
    const [showFilters, setShowFilters] = useState(true);
    const [sortBy, setSortBy] = useState('relevance'); // 'relevance' | 'date_desc' | 'date_asc' | 'name'
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);

    // Filter state
    const [filters, setFilters] = useState({
        // Project filters
        project_status: '',
        project_priority: '',
        department: '',
        client_name: '',
        // Workorder filters
        date_from: '',
        date_to: '',
        workorder_status: '',
        location: '',
        // Resource filters
        resource_type: '',
        resource_status: '',
        pay_type: '',
        position_group_id: '',
    });

    // Results state
    const [results, setResults] = useState({
        projects: [],
        workorders: [],
        resources: [],
    });
    const [totals, setTotals] = useState({
        projects: 0,
        workorders: 0,
        resources: 0,
    });
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Suggestions state
    const [suggestions, setSuggestions] = useState({
        projects: [],
        workorders: [],
        resources: [],
    });
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [recentSearches, setRecentSearches] = useState([]);

    // Debounced query for API calls
    const debouncedQuery = useDebounce(query, 300);

    // Input ref for focus management
    const searchInputRef = useRef(null);

    // Load recent searches on mount
    useEffect(() => {
        setRecentSearches(getRecentSearches());
    }, []);

    // Handle initial search query from props
    useEffect(() => {
        if (searchQuery && searchQuery !== query) {
            setQuery(searchQuery);
            performSearch(searchQuery);
        }
    }, [searchQuery]);

    // Fetch suggestions when typing
    useEffect(() => {
        if (debouncedQuery && debouncedQuery.length >= 2 && showSuggestions) {
            fetchSuggestions(debouncedQuery);
        } else {
            setSuggestions({ projects: [], workorders: [], resources: [] });
        }
    }, [debouncedQuery, showSuggestions]);

    // Perform search when debounced query changes
    useEffect(() => {
        if (debouncedQuery && debouncedQuery.length >= 2) {
            performSearch(debouncedQuery);
        } else {
            setResults({ projects: [], workorders: [], resources: [] });
            setTotals({ projects: 0, workorders: 0, resources: 0 });
        }
    }, [debouncedQuery, activeTab, sortBy, page, limit, filters]);

    // Save view mode preference
    useEffect(() => {
        localStorage.setItem('search_view_mode', viewMode);
    }, [viewMode]);

    const fetchSuggestions = async (q) => {
        try {
            const data = await api.searchSuggestions(q);
            setSuggestions(data);
        } catch (err) {
            console.error('Failed to fetch suggestions:', err);
        }
    };

    const performSearch = async (q) => {
        if (!q || q.length < 2) {
            setResults({ projects: [], workorders: [], resources: [] });
            setTotals({ projects: 0, workorders: 0, resources: 0 });
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const params = {
                q,
                type: activeTab,
                page,
                limit,
                sort: sortBy,
                ...filters,
            };

            const data = await api.searchAdvanced(params);
            setResults(data.results);
            setTotals(data.totals);
            setTotalPages(data.total_pages);

            // Add to recent searches
            addRecentSearch(q);
            setRecentSearches(getRecentSearches());
        } catch (err) {
            console.error('Search failed:', err);
            setError(err.message || 'Search failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (query && query.length >= 2) {
            performSearch(query);
            setShowSuggestions(false);
        }
    };

    const handleClearSearch = () => {
        setQuery('');
        setResults({ projects: [], workorders: [], resources: [] });
        setTotals({ projects: 0, workorders: 0, resources: 0 });
        searchInputRef.current?.focus();
    };

    const handleFilterChange = (filterName, value) => {
        setFilters(prev => ({
            ...prev,
            [filterName]: value,
        }));
        setPage(1); // Reset to first page when filter changes
    };

    const handleClearAllFilters = () => {
        setFilters({
            project_status: '',
            project_priority: '',
            department: '',
            client_name: '',
            date_from: '',
            date_to: '',
            workorder_status: '',
            location: '',
            resource_type: '',
            resource_status: '',
            pay_type: '',
            position_group_id: '',
        });
        setPage(1);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setPage(1);
    };

    const handleSuggestionClick = (suggestion, type) => {
        const suggestionText = type === 'projects' || type === 'workorders'
            ? suggestion.title
            : suggestion.name;
        setQuery(suggestionText);
        setShowSuggestions(false);
        performSearch(suggestionText);
    };

    const handleRecentSearchClick = (recentQuery) => {
        setQuery(recentQuery);
        setShowSuggestions(false);
        performSearch(recentQuery);
    };

    const getTotalResultCount = () => {
        if (activeTab === 'all') {
            return totals.projects + totals.workorders + totals.resources;
        }
        return totals[activeTab] || 0;
    };

    // Count active filters
    const getActiveFilterCount = () => {
        return Object.values(filters).filter(v => v !== '' && v !== null).length;
    };

    return (
        <div className="search-page">
            {/* Search Header */}
            <div className="search-header-section">
                <div className="search-input-wrapper">
                    <svg className="search-icon" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <form onSubmit={handleSearchSubmit} style={{ flex: 1 }}>
                        <input
                            ref={searchInputRef}
                            type="text"
                            className="search-input"
                            placeholder="Search projects, workorders, resources..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        />
                    </form>
                    {query && (
                        <button className="search-clear-btn" onClick={handleClearSearch}>
                            ✕
                        </button>
                    )}
                    <div className="search-keyboard-hint">⌘K</div>
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && (query.length >= 2 || recentSearches.length > 0) && (
                    <div className="suggestions-dropdown">
                        {query.length >= 2 && (suggestions.projects.length > 0 || suggestions.workorders.length > 0 || suggestions.resources.length > 0) ? (
                            <>
                                {suggestions.projects.length > 0 && (
                                    <div className="suggestions-section">
                                        <div className="suggestions-section-title">📂 Projects</div>
                                        {suggestions.projects.map(p => (
                                            <button
                                                key={p.id}
                                                className="suggestion-item"
                                                onMouseDown={() => handleSuggestionClick(p, 'projects')}
                                            >
                                                {p.title}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {suggestions.workorders.length > 0 && (
                                    <div className="suggestions-section">
                                        <div className="suggestions-section-title">📄 Workorders</div>
                                        {suggestions.workorders.map(w => (
                                            <button
                                                key={w.id}
                                                className="suggestion-item"
                                                onMouseDown={() => handleSuggestionClick(w, 'workorders')}
                                            >
                                                {w.title}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                {suggestions.resources.length > 0 && (
                                    <div className="suggestions-section">
                                        <div className="suggestions-section-title">👥 Resources</div>
                                        {suggestions.resources.map(r => (
                                            <button
                                                key={r.id}
                                                className="suggestion-item"
                                                onMouseDown={() => handleSuggestionClick(r, 'resources')}
                                            >
                                                {r.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : query.length < 2 && recentSearches.length > 0 && (
                            <div className="suggestions-section">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem', marginBottom: '0.5rem' }}>
                                    <span className="suggestions-section-title">Recent Searches</span>
                                    <button
                                        style={{ fontSize: '0.75rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}
                                        onMouseDown={() => {
                                            clearRecentSearches();
                                            setRecentSearches([]);
                                        }}
                                    >
                                        Clear
                                    </button>
                                </div>
                                {recentSearches.map((recentQuery, idx) => (
                                    <button
                                        key={idx}
                                        className="suggestion-item"
                                        onMouseDown={() => handleRecentSearchClick(recentQuery)}
                                    >
                                        {recentQuery}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Search Controls */}
            <div className="search-controls">
                {/* Tabs */}
                <div className="search-tabs">
                    <button
                        className={`search-tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => handleTabChange('all')}
                    >
                        All Results
                        {(totals.projects + totals.workorders + totals.resources) > 0 && (
                            <span className="tab-count">{totals.projects + totals.workorders + totals.resources}</span>
                        )}
                    </button>
                    <button
                        className={`search-tab ${activeTab === 'projects' ? 'active' : ''}`}
                        onClick={() => handleTabChange('projects')}
                    >
                        📂 Projects
                        {totals.projects > 0 && <span className="tab-count">{totals.projects}</span>}
                    </button>
                    <button
                        className={`search-tab ${activeTab === 'workorders' ? 'active' : ''}`}
                        onClick={() => handleTabChange('workorders')}
                    >
                        📄 Workorders
                        {totals.workorders > 0 && <span className="tab-count">{totals.workorders}</span>}
                    </button>
                    <button
                        className={`search-tab ${activeTab === 'resources' ? 'active' : ''}`}
                        onClick={() => handleTabChange('resources')}
                    >
                        👥 Resources
                        {totals.resources > 0 && <span className="tab-count">{totals.resources}</span>}
                    </button>
                </div>

                {/* View Controls */}
                <div className="view-controls">
                    <button
                        className={`filter-toggle-btn ${getActiveFilterCount() > 0 ? 'active' : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filters
                        {getActiveFilterCount() > 0 && (
                            <span className="filter-count-badge">{getActiveFilterCount()}</span>
                        )}
                    </button>

                    <select
                        className="sort-dropdown"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="relevance">Sort: Relevance</option>
                        <option value="date_desc">Sort: Newest First</option>
                        <option value="date_asc">Sort: Oldest First</option>
                        <option value="name">Sort: Name A-Z</option>
                    </select>

                    <div className="view-toggle">
                        <button
                            className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                            onClick={() => setViewMode('cards')}
                            title="Card View"
                        >
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
                            </svg>
                        </button>
                        <button
                            className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                            title="Table View"
                        >
                            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M3 3h18v4H3V3zm0 6h18v4H3V9zm0 6h18v4H3v-4z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="search-page-layout">
                {/* Filter Panel */}
                {showFilters && (
                    <FilterPanel
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        onClearAll={handleClearAllFilters}
                        activeTab={activeTab}
                    />
                )}

                {/* Results Area */}
                <div className="search-main-content">
                    {loading ? (
                        <EmptyState type="loading" viewMode={viewMode} />
                    ) : error ? (
                        <EmptyState type="error" message={error} />
                    ) : query.length < 2 ? (
                        <EmptyState type="no-query" />
                    ) : getTotalResultCount() === 0 ? (
                        <EmptyState type="no-results" />
                    ) : (
                        <>
                            {/* Results Summary */}
                            <div className="results-summary" style={{ marginBottom: '1.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>
                                Found <strong style={{ color: '#e2e8f0' }}>{getTotalResultCount()}</strong> result{getTotalResultCount() !== 1 ? 's' : ''} for "<strong style={{ color: '#e2e8f0' }}>{query}</strong>"
                            </div>

                            {/* Card View */}
                            {viewMode === 'cards' && (
                                <div className="card-grid">
                                    {(activeTab === 'all' || activeTab === 'projects') && results.projects.map(project => (
                                        <ProjectCard
                                            key={project.id}
                                            project={project}
                                            query={query}
                                            onClick={onEditProject}
                                        />
                                    ))}
                                    {(activeTab === 'all' || activeTab === 'workorders') && results.workorders.map(workorder => (
                                        <WorkorderCard
                                            key={workorder.id}
                                            workorder={workorder}
                                            query={query}
                                            onClick={onEditWorkorder}
                                        />
                                    ))}
                                    {(activeTab === 'all' || activeTab === 'resources') && results.resources.map(resource => (
                                        <ResourceCard
                                            key={resource.id}
                                            resource={resource}
                                            query={query}
                                            onClick={onViewResource}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Table View */}
                            {viewMode === 'table' && (
                                <div className="table-views">
                                    {(activeTab === 'all' || activeTab === 'projects') && results.projects.length > 0 && (
                                        <div style={{ marginBottom: '2rem' }}>
                                            {activeTab === 'all' && <h3 style={{ color: '#cbd5e1', marginBottom: '1rem', fontSize: '1.125rem' }}>📂 Projects</h3>}
                                            <ProjectTable
                                                projects={results.projects}
                                                query={query}
                                                onRowClick={onEditProject}
                                            />
                                        </div>
                                    )}
                                    {(activeTab === 'all' || activeTab === 'workorders') && results.workorders.length > 0 && (
                                        <div style={{ marginBottom: '2rem' }}>
                                            {activeTab === 'all' && <h3 style={{ color: '#cbd5e1', marginBottom: '1rem', fontSize: '1.125rem' }}>📄 Workorders</h3>}
                                            <WorkorderTable
                                                workorders={results.workorders}
                                                query={query}
                                                onRowClick={onEditWorkorder}
                                            />
                                        </div>
                                    )}
                                    {(activeTab === 'all' || activeTab === 'resources') && results.resources.length > 0 && (
                                        <div style={{ marginBottom: '2rem' }}>
                                            {activeTab === 'all' && <h3 style={{ color: '#cbd5e1', marginBottom: '1rem', fontSize: '1.125rem' }}>👥 Resources</h3>}
                                            <ResourceTable
                                                resources={results.resources}
                                                query={query}
                                                onRowClick={onViewResource}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Pagination */}
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                limit={limit}
                                total={getTotalResultCount()}
                                onPageChange={setPage}
                                onLimitChange={(newLimit) => {
                                    setLimit(newLimit);
                                    setPage(1);
                                }}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SearchResults;
