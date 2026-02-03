-- Migration: Add structured content support for clean display template
-- This enables extracting resume content into organized sections for editing

-- Store structured resume content (JSON with contact, experience, education, skills, etc.)
ALTER TABLE resume_analyses
ADD COLUMN IF NOT EXISTS structured_content jsonb;

-- Track selected export format (classic, modern, minimalist, technical, executive)
ALTER TABLE resume_analyses
ADD COLUMN IF NOT EXISTS selected_format text;

-- Add format tracking to resume_examples for learning which formats work best
-- for different job types
ALTER TABLE resume_examples
ADD COLUMN IF NOT EXISTS resume_format text;

-- Add index for format-based queries in success matching
CREATE INDEX IF NOT EXISTS idx_resume_examples_format
ON resume_examples (resume_format)
WHERE resume_format IS NOT NULL;

-- Add index for format success rate queries (format + outcome)
CREATE INDEX IF NOT EXISTS idx_resume_examples_format_outcome
ON resume_examples (resume_format, outcome_type)
WHERE resume_format IS NOT NULL;

-- Comment on new columns for documentation
COMMENT ON COLUMN resume_analyses.structured_content IS
  'Structured JSON representation of resume content with contact, experience, education, skills sections';

COMMENT ON COLUMN resume_analyses.selected_format IS
  'User-selected export template format: classic, modern, minimalist, technical, or executive';

COMMENT ON COLUMN resume_examples.resume_format IS
  'Template format category: classic, modern, minimalist, technical, or executive - used for format recommendation learning';
