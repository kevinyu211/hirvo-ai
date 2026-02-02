-- Migration: 00001_initial_schema
-- Description: Initial database schema for Hirvo.Ai
-- Creates all tables, RLS policies, triggers, and indexes

-- Enable extensions
create extension if not exists vector with schema extensions;

-- User profiles (extends Supabase auth.users with app-specific data)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  visa_status text,          -- 'us_citizen', 'green_card', 'h1b', 'opt_cpt', 'other', null
  created_at timestamp default now(),
  updated_at timestamp default now()
);

-- Auto-create a profile when a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security: users can only read/update their own profile
alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Resume analyses (each upload + analysis is one record)
create table resume_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  original_text text not null,
  optimized_text text,
  job_description text,
  target_role text,
  years_experience text,
  -- ATS scores
  ats_overall_score integer,
  ats_keyword_match_pct float,
  ats_formatting_score integer,
  ats_section_score integer,
  ats_issues jsonb,             -- array of flagged issues
  -- HR scores
  hr_formatting_score integer,
  hr_semantic_score float,
  hr_llm_score integer,
  hr_overall_score integer,
  hr_feedback jsonb,            -- array of HR comments
  -- Metadata
  visa_flagged boolean default false,
  file_name text,
  file_type text,               -- 'pdf' or 'docx'
  created_at timestamp default now()
);

alter table resume_analyses enable row level security;
create policy "Users can view own analyses" on resume_analyses for select using (auth.uid() = user_id);
create policy "Users can create own analyses" on resume_analyses for insert with check (auth.uid() = user_id);
create policy "Users can update own analyses" on resume_analyses for update using (auth.uid() = user_id);

-- Embeddings for semantic matching
create table resume_embeddings (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references resume_analyses(id) on delete cascade not null,
  content_type text not null,   -- 'resume_full', 'resume_section', 'job_description'
  section_name text,            -- 'experience', 'skills', 'education', etc.
  content_text text not null,
  embedding extensions.vector(1536),  -- OpenAI text-embedding-3-small dimension
  created_at timestamp default now()
);

create index on resume_embeddings using hnsw (embedding vector_cosine_ops);

alter table resume_embeddings enable row level security;
create policy "Users can view own embeddings" on resume_embeddings for select
  using (analysis_id in (select id from resume_analyses where user_id = auth.uid()));
create policy "Users can create own embeddings" on resume_embeddings for insert
  with check (analysis_id in (select id from resume_analyses where user_id = auth.uid()));

-- Reference resumes (admin-uploaded successful/ATS-proof resumes for formatting analysis)
-- These are READ-ONLY for regular users. Admins insert via service role key.
create table reference_resumes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  industry text,
  role_level text,              -- 'entry', 'mid', 'senior', 'executive'
  original_text text not null,
  formatting_patterns jsonb,    -- extracted formatting metadata (see Layer 1 description)
  embedding extensions.vector(1536),
  uploaded_by uuid references auth.users(id),
  created_at timestamp default now()
);

create index on reference_resumes using hnsw (embedding vector_cosine_ops);

alter table reference_resumes enable row level security;
create policy "Anyone can read reference resumes" on reference_resumes for select using (true);
-- Insert/update only via service role key (admin), no user-level write policy needed

-- Interview sessions (AI avatar interactions)
create table interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  analysis_id uuid references resume_analyses(id),
  session_type text not null,   -- 'visa_qa' or 'hr_interview'
  transcript jsonb,             -- array of { role, message, timestamp }
  feedback jsonb,               -- AI-generated feedback on interview performance
  duration_seconds integer,
  created_at timestamp default now()
);

alter table interview_sessions enable row level security;
create policy "Users can view own sessions" on interview_sessions for select using (auth.uid() = user_id);
create policy "Users can create own sessions" on interview_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on interview_sessions for update using (auth.uid() = user_id);
