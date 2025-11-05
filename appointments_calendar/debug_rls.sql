-- Test RLS enforcement with explicit role checks
-- First, let's verify RLS is enabled and check policies

-- Check if RLS is enabled on tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('calendar_connections', 'calendar_events', 'bookings');

-- Check current policies  
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('calendar_connections', 'calendar_events', 'bookings')
ORDER BY tablename, policyname;

-- Test the session variable mechanism
SELECT current_setting('app.current_provider_id', true) as current_setting_test;

-- Set a test value and check it
SELECT set_config('app.current_provider_id', 'test-provider-rls-123', true);
SELECT current_setting('app.current_provider_id', false) as after_setting;

-- Test the policy condition directly
SELECT 
  id, 
  "providerId",
  email,
  CASE WHEN "providerId" = current_setting('app.current_provider_id', false) 
       THEN 'MATCHES' 
       ELSE 'NO_MATCH' 
  END as policy_test
FROM calendar_connections 
LIMIT 10;