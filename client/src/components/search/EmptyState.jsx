import React from 'react';

/**
 * EmptyState component - Displays various empty/loading states
 * @param {string} type - Type of empty state: 'no-query' | 'no-results' | 'loading' | 'error'
 * @param {string} viewMode - Current view mode: 'cards' | 'table'
 * @param {string} message - Optional custom message
 */
const EmptyState = ({ type = 'no-query', viewMode = 'cards', message }) => {
    // Loading skeleton for card view
    const CardSkeleton = () => (
        <div className="search-card skeleton-card">
            <div className="skeleton-color-bar"></div>
            <div className="skeleton-content">
                <div className="skeleton-title"></div>
                <div className="skeleton-text"></div>
                <div className="skeleton-text short"></div>
                <div className="skeleton-footer">
                    <div className="skeleton-badge"></div>
                    <div className="skeleton-badge"></div>
                </div>
            </div>
        </div>
    );

    // Loading skeleton for table view
    const TableSkeleton = () => (
        <div className="search-table-container">
            <table className="search-table skeleton-table">
                <thead>
                    <tr>
                        <th><div className="skeleton-text short"></div></th>
                        <th><div className="skeleton-text"></div></th>
                        <th><div className="skeleton-text"></div></th>
                        <th><div className="skeleton-text"></div></th>
                        <th><div className="skeleton-text short"></div></th>
                    </tr>
                </thead>
                <tbody>
                    {[...Array(8)].map((_, index) => (
                        <tr key={index}>
                            <td><div className="skeleton-circle"></div></td>
                            <td><div className="skeleton-text"></div></td>
                            <td><div className="skeleton-text short"></div></td>
                            <td><div className="skeleton-text"></div></td>
                            <td><div className="skeleton-badge"></div></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    // Render loading state
    if (type === 'loading') {
        return (
            <div className="empty-state loading-state">
                {viewMode === 'cards' ? (
                    <div className="card-grid">
                        {[...Array(6)].map((_, index) => (
                            <CardSkeleton key={index} />
                        ))}
                    </div>
                ) : (
                    <TableSkeleton />
                )}
            </div>
        );
    }

    // Render no-query state
    if (type === 'no-query') {
        return (
            <div className="empty-state no-query-state">
                <div className="empty-state-icon">🔍</div>
                <h2 className="empty-state-title">Start Your Search</h2>
                <p className="empty-state-message">
                    {message || 'Enter a search term to find projects, workorders, and resources'}
                </p>
                <div className="empty-state-hints">
                    <div className="hint-item">
                        <span className="hint-icon">💡</span>
                        <span>Try searching for project names, client names, or job codes</span>
                    </div>
                    <div className="hint-item">
                        <span className="hint-icon">⌨️</span>
                        <span>Use ⌘K (Mac) or Ctrl+K (Windows) to quickly focus the search</span>
                    </div>
                    <div className="hint-item">
                        <span className="hint-icon">🎯</span>
                        <span>Filter results by type, status, date range, and more</span>
                    </div>
                </div>
            </div>
        );
    }

    // Render no-results state
    if (type === 'no-results') {
        return (
            <div className="empty-state no-results-state">
                <div className="empty-state-icon">📭</div>
                <h2 className="empty-state-title">No Results Found</h2>
                <p className="empty-state-message">
                    {message || 'We couldn\'t find any matches for your search'}
                </p>
                <div className="empty-state-suggestions">
                    <h3>Try these suggestions:</h3>
                    <ul>
                        <li>Check your spelling</li>
                        <li>Use more general search terms</li>
                        <li>Try different keywords</li>
                        <li>Clear or adjust your filters</li>
                        <li>Switch to a different tab (All, Projects, Workorders, Resources)</li>
                    </ul>
                </div>
            </div>
        );
    }

    // Render error state
    if (type === 'error') {
        return (
            <div className="empty-state error-state">
                <div className="empty-state-icon error">⚠️</div>
                <h2 className="empty-state-title">Something Went Wrong</h2>
                <p className="empty-state-message">
                    {message || 'We encountered an error while searching. Please try again.'}
                </p>
                <button
                    className="retry-btn"
                    onClick={() => window.location.reload()}
                >
                    Retry Search
                </button>
            </div>
        );
    }

    // Default fallback
    return (
        <div className="empty-state">
            <p>{message || 'No content to display'}</p>
        </div>
    );
};

export default EmptyState;
