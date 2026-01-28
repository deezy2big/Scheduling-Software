import React from 'react';

/**
 * Pagination component - Smart pagination controls with page size selector
 * @param {number} currentPage - Current page number (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {number} limit - Current page size
 * @param {number} total - Total number of results
 * @param {Function} onPageChange - Callback when page changes
 * @param {Function} onLimitChange - Callback when page size changes
 */
const Pagination = ({ currentPage, totalPages, limit, total, onPageChange, onLimitChange }) => {
    // Calculate showing range
    const getShowingRange = () => {
        const start = (currentPage - 1) * limit + 1;
        const end = Math.min(currentPage * limit, total);
        return { start, end };
    };

    // Generate page numbers to display (smart pagination)
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 7; // Maximum page numbers to show

        if (totalPages <= maxVisible) {
            // Show all pages if total is small
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Smart pagination: 1 ... 5 6 7 ... 20
            if (currentPage <= 3) {
                // Near beginning: 1 2 3 4 5 ... 20
                for (let i = 1; i <= 5; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                // Near end: 1 ... 16 17 18 19 20
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                // Middle: 1 ... 5 6 7 ... 20
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    const handlePageClick = (page) => {
        if (page !== '...' && page !== currentPage) {
            onPageChange(page);
            // Scroll to top smoothly
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleFirstPage = () => {
        if (currentPage !== 1) {
            onPageChange(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleLastPage = () => {
        if (currentPage !== totalPages) {
            onPageChange(totalPages);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleLimitChange = (e) => {
        const newLimit = parseInt(e.target.value, 10);
        onLimitChange(newLimit);
        // Reset to page 1 when changing limit
        onPageChange(1);
    };

    const { start, end } = getShowingRange();
    const pageNumbers = getPageNumbers();

    // Don't show pagination if there are no results or only one page
    if (total === 0 || totalPages <= 1) {
        return null;
    }

    return (
        <div className="pagination-container">
            {/* Results info */}
            <div className="pagination-info">
                Showing {start}-{end} of {total} results
            </div>

            {/* Page controls */}
            <div className="pagination-controls">
                <button
                    className="pagination-btn"
                    onClick={handleFirstPage}
                    disabled={currentPage === 1}
                    title="First page"
                >
                    ⟨⟨
                </button>

                <button
                    className="pagination-btn"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                    title="Previous page"
                >
                    ⟨
                </button>

                <div className="pagination-pages">
                    {pageNumbers.map((page, index) => (
                        <button
                            key={index}
                            className={`pagination-page-btn ${
                                page === currentPage ? 'active' : ''
                            } ${page === '...' ? 'ellipsis' : ''}`}
                            onClick={() => handlePageClick(page)}
                            disabled={page === '...'}
                        >
                            {page}
                        </button>
                    ))}
                </div>

                <button
                    className="pagination-btn"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    title="Next page"
                >
                    ⟩
                </button>

                <button
                    className="pagination-btn"
                    onClick={handleLastPage}
                    disabled={currentPage === totalPages}
                    title="Last page"
                >
                    ⟩⟩
                </button>
            </div>

            {/* Page size selector */}
            <div className="pagination-limit">
                <label htmlFor="page-size">Per page:</label>
                <select
                    id="page-size"
                    value={limit}
                    onChange={handleLimitChange}
                    className="pagination-limit-select"
                >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                </select>
            </div>
        </div>
    );
};

export default Pagination;
