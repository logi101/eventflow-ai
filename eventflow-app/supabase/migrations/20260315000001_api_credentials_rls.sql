-- Migration: Protect api_credentials table with RLS
-- EventFlow AI - Integrations Audit Fix
-- Date: 2026-03-15
--
-- The api_credentials table stores encrypted API keys (Gemini, etc.).
-- It must only be accessible via the service role key (edge functions).
-- Authenticated users must not be able to read or write this table.

-- Enable RLS on api_credentials
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;

-- Deny all access for authenticated users (service role bypasses RLS automatically)
-- This creates an explicit deny: even authenticated users with a valid JWT
-- cannot read or modify credentials.
DROP POLICY IF EXISTS "api_credentials_deny_authenticated" ON api_credentials;
CREATE POLICY "api_credentials_deny_authenticated"
ON api_credentials
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Deny all access for anonymous users
DROP POLICY IF EXISTS "api_credentials_deny_anon" ON api_credentials;
CREATE POLICY "api_credentials_deny_anon"
ON api_credentials
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

COMMENT ON TABLE api_credentials IS
  'Stores encrypted external API credentials (Gemini, etc.). '
  'Accessible via service_role key only. RLS denies all authenticated/anon access.';
