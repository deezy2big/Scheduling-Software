import React from 'react';

/**
 * Escape special regex characters
 * @param {string} string - The string to escape
 * @returns {string} - Escaped string safe for regex
 */
const escapeRegex = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Highlight matching text within a string
 * @param {string} text - The text to highlight matches in
 * @param {string} query - The search query to highlight
 * @returns {JSX.Element|string} - JSX with highlighted matches or original text
 */
export const highlightMatch = (text, query) => {
    if (!text || !query) return text;

    const terms = query
        .toLowerCase()
        .split(/\s+/)
        .filter(t => t.length > 0)
        .map(escapeRegex);

    if (terms.length === 0) return text;

    // Create regex pattern matching any of the terms
    const pattern = terms.join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');

    // Split text by matches
    const parts = text.split(regex);

    return (
        <span>
            {parts.map((part, index) => {
                // Check if this part matches any search term
                const isMatch = terms.some(term =>
                    part.toLowerCase().includes(term.toLowerCase())
                );

                return isMatch ? (
                    <mark key={index} className="search-highlight">
                        {part}
                    </mark>
                ) : (
                    <span key={index}>{part}</span>
                );
            })}
        </span>
    );
};

/**
 * Get a text snippet with highlighted matches and context
 * @param {string} text - The full text
 * @param {string} query - The search query
 * @param {number} contextLength - Characters of context before/after match (default: 50)
 * @returns {JSX.Element|string} - Snippet with highlights
 */
export const getHighlightedSnippet = (text, query, contextLength = 50) => {
    if (!text || !query) return text;

    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    // Find first match
    const matchIndex = lowerText.indexOf(lowerQuery);

    if (matchIndex === -1) {
        // No match found, return beginning of text
        const snippet = text.substring(0, contextLength * 2) + (text.length > contextLength * 2 ? '...' : '');
        return snippet;
    }

    // Calculate snippet boundaries
    const start = Math.max(0, matchIndex - contextLength);
    const end = Math.min(text.length, matchIndex + query.length + contextLength);

    const snippet =
        (start > 0 ? '...' : '') +
        text.substring(start, end) +
        (end < text.length ? '...' : '');

    return highlightMatch(snippet, query);
};

export default highlightMatch;
