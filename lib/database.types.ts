export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          visa_status: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          visa_status?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          visa_status?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      resume_analyses: {
        Row: {
          id: string;
          user_id: string;
          original_text: string;
          optimized_text: string | null;
          job_description: string | null;
          target_role: string | null;
          years_experience: string | null;
          ats_overall_score: number | null;
          ats_keyword_match_pct: number | null;
          ats_formatting_score: number | null;
          ats_section_score: number | null;
          ats_issues: Json | null;
          hr_formatting_score: number | null;
          hr_semantic_score: number | null;
          hr_llm_score: number | null;
          hr_overall_score: number | null;
          hr_feedback: Json | null;
          visa_flagged: boolean;
          file_name: string | null;
          file_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          original_text: string;
          optimized_text?: string | null;
          job_description?: string | null;
          target_role?: string | null;
          years_experience?: string | null;
          ats_overall_score?: number | null;
          ats_keyword_match_pct?: number | null;
          ats_formatting_score?: number | null;
          ats_section_score?: number | null;
          ats_issues?: Json | null;
          hr_formatting_score?: number | null;
          hr_semantic_score?: number | null;
          hr_llm_score?: number | null;
          hr_overall_score?: number | null;
          hr_feedback?: Json | null;
          visa_flagged?: boolean;
          file_name?: string | null;
          file_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          original_text?: string;
          optimized_text?: string | null;
          job_description?: string | null;
          target_role?: string | null;
          years_experience?: string | null;
          ats_overall_score?: number | null;
          ats_keyword_match_pct?: number | null;
          ats_formatting_score?: number | null;
          ats_section_score?: number | null;
          ats_issues?: Json | null;
          hr_formatting_score?: number | null;
          hr_semantic_score?: number | null;
          hr_llm_score?: number | null;
          hr_overall_score?: number | null;
          hr_feedback?: Json | null;
          visa_flagged?: boolean;
          file_name?: string | null;
          file_type?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      resume_embeddings: {
        Row: {
          id: string;
          analysis_id: string;
          content_type: string;
          section_name: string | null;
          content_text: string;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          content_type: string;
          section_name?: string | null;
          content_text: string;
          embedding?: number[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          analysis_id?: string;
          content_type?: string;
          section_name?: string | null;
          content_text?: string;
          embedding?: number[] | null;
          created_at?: string;
        };
        Relationships: [];
      };
      reference_resumes: {
        Row: {
          id: string;
          title: string;
          industry: string | null;
          role_level: string | null;
          original_text: string;
          formatting_patterns: Json | null;
          embedding: number[] | null;
          uploaded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          industry?: string | null;
          role_level?: string | null;
          original_text: string;
          formatting_patterns?: Json | null;
          embedding?: number[] | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          industry?: string | null;
          role_level?: string | null;
          original_text?: string;
          formatting_patterns?: Json | null;
          embedding?: number[] | null;
          uploaded_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      interview_sessions: {
        Row: {
          id: string;
          user_id: string;
          analysis_id: string | null;
          session_type: string;
          transcript: Json | null;
          feedback: Json | null;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          analysis_id?: string | null;
          session_type: string;
          transcript?: Json | null;
          feedback?: Json | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          analysis_id?: string | null;
          session_type?: string;
          transcript?: Json | null;
          feedback?: Json | null;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      resume_examples: {
        Row: {
          id: string;
          job_description: string;
          job_description_embedding: number[] | null;
          company_name: string | null;
          job_title: string | null;
          industry: string | null;
          role_level: string | null;
          resume_text: string;
          resume_embedding: number[] | null;
          outcome_type: string;
          outcome_detail: string | null;
          required_skills: string[] | null;
          candidate_skills: string[] | null;
          candidate_experience_years: number | null;
          is_quality_example: boolean | null;
          quality_reasoning: string | null;
          formatting_patterns: Json | null;
          content_patterns: Json | null;
          notable_patterns: Json | null;
          source: string;
          pair_id: string | null;
          uploaded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_description: string;
          job_description_embedding?: number[] | null;
          company_name?: string | null;
          job_title?: string | null;
          industry?: string | null;
          role_level?: string | null;
          resume_text: string;
          resume_embedding?: number[] | null;
          outcome_type: string;
          outcome_detail?: string | null;
          required_skills?: string[] | null;
          candidate_skills?: string[] | null;
          candidate_experience_years?: number | null;
          is_quality_example?: boolean | null;
          quality_reasoning?: string | null;
          formatting_patterns?: Json | null;
          content_patterns?: Json | null;
          notable_patterns?: Json | null;
          source?: string;
          pair_id?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_description?: string;
          job_description_embedding?: number[] | null;
          company_name?: string | null;
          job_title?: string | null;
          industry?: string | null;
          role_level?: string | null;
          resume_text?: string;
          resume_embedding?: number[] | null;
          outcome_type?: string;
          outcome_detail?: string | null;
          required_skills?: string[] | null;
          candidate_skills?: string[] | null;
          candidate_experience_years?: number | null;
          is_quality_example?: boolean | null;
          quality_reasoning?: string | null;
          formatting_patterns?: Json | null;
          content_patterns?: Json | null;
          notable_patterns?: Json | null;
          source?: string;
          pair_id?: string | null;
          uploaded_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
