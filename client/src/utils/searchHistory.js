const STORAGE_KEY = 'rms_recent_searches';
const MAX_RECENT = 10;

/**
 * Get recent searches from localStorage
 * @returns {string[]} Array of recent search queries
 */
export const getRecentSearches = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Error reading recent searches:', error);
        return [];
    }
};

/**
 * Add a search query to recent searches
 * @param {string} query - The search query to add
 */
export const addRecentSearch = (query) => {
    if (!query || query.length < 2) return;

    try {
        const recent = getRecentSearches();
        // Remove duplicates (case-insensitive)
        const filtered = recent.filter(q => q.toLowerCase() !== query.toLowerCase());
        // Add new query to the beginning
        const updated = [query, ...filtered].slice(0, MAX_RECENT);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('Error saving recent search:', error);
    }
};

/**
 * Clear all recent searches
 */
export const clearRecentSearches = () => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error('Error clearing recent searches:', error);
    }
};

/**
 * Remove a specific search from recent searches
 * @param {string} query - The search query to remove
 */
export const removeRecentSearch = (query) => {
    try {
        const recent = getRecentSearches();
        const filtered = recent.filter(q => q !== query);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error('Error removing recent search:', error);
    }
};
