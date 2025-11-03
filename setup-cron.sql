-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable http extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS http;

-- Schedule daily rollover at 2 AM UTC
-- This will automatically move overdue tasks to today
SELECT cron.schedule(
  'daily-task-rollover',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ihheipfihcgtzhujcmdn.supabase.co/functions/v1/daily-rollover',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloaGVpcGZpaGNndHpodWpjbWRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NjQ0MzEsImV4cCI6MjA3NTM0MDQzMX0.wWNhyAYovdswvFlu1Qp8Gqp88YVnHKlY_5hwJzeV8TE'
    )
  );
  $$
);

-- Verify the cron job was created
SELECT
  jobid,
  schedule,
  command,
  jobname,
  active
FROM cron.job
WHERE jobname = 'daily-task-rollover';
