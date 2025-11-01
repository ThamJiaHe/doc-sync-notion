-- Add source_id column to documents table for Notion database integration
ALTER TABLE public.documents 
ADD COLUMN source_id text;