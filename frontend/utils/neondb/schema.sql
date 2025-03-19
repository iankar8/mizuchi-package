-- Schema for recent searches and extension activity tracking

-- Create extension for UUID generation if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create recent_searches table
CREATE TABLE IF NOT EXISTS recent_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  searched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source VARCHAR(50) NOT NULL DEFAULT 'web', -- 'web', 'extension', 'mobile'
  metadata JSONB, -- Additional metadata like page URL, context, etc.
  CONSTRAINT unique_recent_search UNIQUE(user_id, symbol) -- Only store the most recent search per symbol
);

-- Create index for faster retrieval
CREATE INDEX IF NOT EXISTS idx_recent_searches_user_id ON recent_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_searches_searched_at ON recent_searches(searched_at);

-- Create extension_activity table for tracking Chrome extension usage
CREATE TABLE IF NOT EXISTS extension_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  activity_type VARCHAR(50) NOT NULL, -- 'page_visit', 'scan', 'watchlist_add', etc.
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  page_url TEXT,
  details JSONB -- Store additional activity details
);

-- Create index for extension activity
CREATE INDEX IF NOT EXISTS idx_extension_activity_user_id ON extension_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_extension_activity_occurred_at ON extension_activity(occurred_at);

-- Function to upsert recent searches (update if exists, insert if not)
CREATE OR REPLACE FUNCTION upsert_recent_search(
  p_user_id UUID,
  p_symbol VARCHAR(20),
  p_company_name VARCHAR(255),
  p_source VARCHAR(50) DEFAULT 'web',
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
  search_id UUID;
BEGIN
  -- Update if exists
  UPDATE recent_searches 
  SET 
    searched_at = NOW(),
    company_name = p_company_name,
    source = p_source,
    metadata = p_metadata
  WHERE 
    user_id = p_user_id AND symbol = p_symbol
  RETURNING id INTO search_id;
  
  -- Insert if not exists
  IF search_id IS NULL THEN
    INSERT INTO recent_searches (user_id, symbol, company_name, source, metadata)
    VALUES (p_user_id, p_symbol, p_company_name, p_source, p_metadata)
    RETURNING id INTO search_id;
  END IF;
  
  RETURN search_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log extension activity
CREATE OR REPLACE FUNCTION log_extension_activity(
  p_user_id UUID,
  p_activity_type VARCHAR(50),
  p_page_url TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO extension_activity (user_id, activity_type, page_url, details)
  VALUES (p_user_id, p_activity_type, p_page_url, p_details)
  RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies for recent_searches
ALTER TABLE recent_searches ENABLE ROW LEVEL SECURITY;

-- Users can only see their own searches
CREATE POLICY recent_searches_select_policy ON recent_searches
  FOR SELECT USING (user_id = auth.uid());

-- Users can only insert their own searches
CREATE POLICY recent_searches_insert_policy ON recent_searches
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can only update their own searches
CREATE POLICY recent_searches_update_policy ON recent_searches
  FOR UPDATE USING (user_id = auth.uid());

-- RLS for extension_activity
ALTER TABLE extension_activity ENABLE ROW LEVEL SECURITY;

-- Users can only see their own activity
CREATE POLICY extension_activity_select_policy ON extension_activity
  FOR SELECT USING (user_id = auth.uid());

-- Users can only insert their own activity
CREATE POLICY extension_activity_insert_policy ON extension_activity
  FOR INSERT WITH CHECK (user_id = auth.uid());