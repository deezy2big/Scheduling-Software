/**
 * CSV Utilities
 *
 * Functions for parsing and generating CSV files
 */

/**
 * Parse CSV string to array of objects
 *
 * @param {string} csvText - CSV string content
 * @param {string[]} expectedHeaders - Expected column headers (optional validation)
 * @returns {Object} - { data: [...], errors: [...] }
 */
export function parseCSV(csvText, expectedHeaders = null) {
    const errors = [];
    const data = [];

    try {
        const lines = csvText.trim().split('\n');

        if (lines.length === 0) {
            return { data: [], errors: ['CSV file is empty'] };
        }

        // Parse header row
        const headers = lines[0].split(',').map(h => h.trim());

        // Validate headers if expected headers provided
        if (expectedHeaders) {
            const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
            }
        }

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; // Skip empty lines

            const values = parseCSVLine(line);

            if (values.length !== headers.length) {
                errors.push(`Row ${i + 1}: Column count mismatch (expected ${headers.length}, got ${values.length})`);
                continue;
            }

            const row = {};
            headers.forEach((header, idx) => {
                row[header] = values[idx];
            });

            data.push(row);
        }

        return { data, errors };
    } catch (err) {
        return { data: [], errors: [`Failed to parse CSV: ${err.message}`] };
    }
}

/**
 * Parse a single CSV line, handling quoted values with commas
 *
 * @param {string} line - CSV line
 * @returns {string[]} - Array of values
 */
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
}

/**
 * Generate CSV string from array of objects
 *
 * @param {Object[]} data - Array of objects
 * @param {string[]} headers - Column headers (keys to extract from objects)
 * @returns {string} - CSV string
 */
export function generateCSV(data, headers) {
    if (!data || data.length === 0) {
        return headers.join(',');
    }

    const rows = [headers.join(',')];

    data.forEach(item => {
        const values = headers.map(header => {
            let value = item[header];

            // Handle null/undefined
            if (value === null || value === undefined) {
                return '';
            }

            // Convert arrays to comma-separated string
            if (Array.isArray(value)) {
                value = value.join('; ');
            }

            // Convert objects to JSON
            if (typeof value === 'object') {
                value = JSON.stringify(value);
            }

            // Convert to string
            value = String(value);

            // Quote values that contain commas, quotes, or newlines
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = `"${value.replace(/"/g, '""')}"`;
            }

            return value;
        });

        rows.push(values.join(','));
    });

    return rows.join('\n');
}

/**
 * Download CSV file in browser
 *
 * @param {string} csvContent - CSV string content
 * @param {string} filename - Filename for download
 */
export function downloadCSV(csvContent, filename = 'export.csv') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

/**
 * Read file as text
 *
 * @param {File} file - File object from input
 * @returns {Promise<string>} - File content as string
 */
export function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

export default {
    parseCSV,
    generateCSV,
    downloadCSV,
    readFileAsText
};
