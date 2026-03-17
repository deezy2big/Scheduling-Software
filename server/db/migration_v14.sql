-- Migration v14: Spreadsheet Resource Import Indexes
-- Adds indexes to support fast search by billing code, name, and category

-- Index on types.abbreviation for fast billing code lookup
CREATE INDEX IF NOT EXISTS idx_types_abbreviation ON types(abbreviation);

-- Composite index for type search (name + abbreviation)
CREATE INDEX IF NOT EXISTS idx_types_name_abbr ON types(name, abbreviation);
