-- Migration: 00002_resume_examples
-- Description: Add resume examples table for self-improving system
-- Stores positive/negative example pairs with auto-labeled metadata

-- Resume examples table for self-improving system
create table resume_examples (
  id uuid primary key default gen_random_uuid(),

  -- The job this was for
  job_description text not null,
  job_description_embedding extensions.vector(1536),
  company_name text,
  job_title text,
  industry text,                    -- 'technology', 'finance', 'healthcare', 'retail', 'manufacturing', 'consulting', 'other'
  role_level text,                  -- 'entry', 'mid', 'senior', 'executive'

  -- The resume
  resume_text text not null,
  resume_embedding extensions.vector(1536),

  -- Outcome: positive or negative
  outcome_type text not null,       -- 'positive' or 'negative'
  outcome_detail text,              -- 'interview', 'offer', 'rejected_ats', 'rejected_hr', 'ghosted'

  -- Auto-labeled metadata (from LLM)
  required_skills text[],           -- Skills extracted from JD
  candidate_skills text[],          -- Skills extracted from resume
  candidate_experience_years float,
  is_quality_example boolean default true,
  quality_reasoning text,

  -- Extracted patterns (computed on insert)
  formatting_patterns jsonb,
  content_patterns jsonb,
  notable_patterns jsonb,           -- LLM-identified patterns

  -- Source tracking
  source text not null default 'admin_upload',  -- 'admin_upload', 'user_feedback'
  pair_id uuid,                     -- Links positive/negative pairs for same JD
  uploaded_by uuid references auth.users(id),
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Vector indexes for similarity search (HNSW for fast approximate nearest neighbor)
create index resume_examples_jd_embedding_idx on resume_examples
  using hnsw (job_description_embedding extensions.vector_cosine_ops);
create index resume_examples_resume_embedding_idx on resume_examples
  using hnsw (resume_embedding extensions.vector_cosine_ops);

-- Index for finding pairs
create index resume_examples_pair_idx on resume_examples (pair_id) where pair_id is not null;

-- Index for filtering by industry, role level, outcome
create index resume_examples_filters_idx on resume_examples (industry, role_level, outcome_type);

-- Index for quality examples only
create index resume_examples_quality_idx on resume_examples (is_quality_example) where is_quality_example = true;

-- Enable Row Level Security
alter table resume_examples enable row level security;

-- Authenticated users can read all examples (for the learned patterns system)
create policy "Authenticated users can read examples" on resume_examples
  for select using (auth.role() = 'authenticated');

-- Insert/update/delete only via service role (admin backend)
-- No user-level write policies - all writes go through admin API with service role key

-- Add is_admin column to profiles for admin access control
alter table profiles add column if not exists is_admin boolean default false;

-- Create index for admin lookup
create index profiles_is_admin_idx on profiles (is_admin) where is_admin = true;

-- Function to update updated_at timestamp
create or replace function update_resume_examples_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger resume_examples_updated_at
  before update on resume_examples
  for each row execute procedure update_resume_examples_updated_at();

-- Comment the table for documentation
comment on table resume_examples is 'Stores positive/negative resume examples for the self-improving optimization system';
comment on column resume_examples.outcome_type is 'Whether this resume succeeded (positive) or failed (negative) for the job';
comment on column resume_examples.pair_id is 'Links examples that were for the same job description for contrastive analysis';
comment on column resume_examples.content_patterns is 'Extracted patterns: action verbs, quantification, achievements, structure';
comment on column resume_examples.notable_patterns is 'LLM-identified notable patterns worth learning from';
