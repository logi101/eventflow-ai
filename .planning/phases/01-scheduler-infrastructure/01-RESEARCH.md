# Phase 1: Scheduler Infrastructure - Research

**Researched:** 2026-01-28
**Domain:** PostgreSQL pg_cron + Supabase Edge Functions
**Confidence:** HIGH

## Summary

This research covers implementing automated reminder scheduling using PostgreSQL's pg_cron extension to trigger Supabase Edge Functions. The standard approach combines three Supabase-native technologies: pg_cron for scheduling, pg_net for HTTP requests, and Vault for secure credential storage.

The existing send-reminder.ts Edge Function already implements reminder logic for three types (day_before, morning, 15_min). Phase 1 focuses on creating the database infrastructure to invoke this function on schedule, establishing patterns that extend to all eight planned reminder types.

**Primary recommendation:** Use pg_cron + pg_net + Vault pattern for secure, database-native scheduling. Enable extensions via Dashboard (not SQL), store credentials in Vault with descriptive names, create wrapper functions for reusability, and monitor via cron.job_run_details table.

## Standard Stack

The established libraries/tools for this domain:

### Core Extensions
| Extension | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| pg_cron | 1.6.4+ | Schedule recurring jobs in PostgreSQL | Official Supabase cron solution, native to Postgres, auto-revive in latest versions |
| pg_net | Latest | Async HTTP requests from PostgreSQL | Supabase-built, designed for Edge Function invocation, non-blocking |
| vault | Latest | Encrypted secret storage in PostgreSQL | Supabase-native, authenticated encryption, secure credential access |

### Supporting Tools
| Tool | Purpose | When to Use |
|------|---------|-------------|
| Supabase Dashboard | Enable extensions, view cron job history | Initial setup, monitoring, debugging |
| Supabase CLI | Create migrations, deploy functions | Version control, team collaboration |
| cron.job_run_details | Job execution history | Monitoring, debugging failures |
| pg_stat_activity | Verify pg_cron worker status | Troubleshooting scheduler issues |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg_cron | External cron (Linux crontab) | Requires separate server, more complex auth, not database-native |
| pg_net | http extension (pgsql-http) | Synchronous (blocks queries), less Supabase-integrated |
| Vault | Environment variables | Less secure, harder to rotate, exposed in logs |
| Dashboard | SQL-only setup | Works but less visual feedback, harder to debug |

**Installation:**
```sql
-- Enable via Dashboard (Recommended):
-- Database → Extensions → Search "pg_cron" → Enable
-- Database → Extensions → Search "pg_net" → Enable
-- Database → Extensions → Search "vault" → Enable

-- Or via SQL:
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vault WITH SCHEMA extensions;
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;
```

## Architecture Patterns

### Recommended Project Structure
```
supabase/
├── migrations/
│   ├── 20260128000001_enable_extensions.sql
│   ├── 20260128000002_setup_vault_secrets.sql
│   ├── 20260128000003_create_trigger_reminder_function.sql
│   └── 20260128000004_schedule_reminder_jobs.sql
└── functions/
    └── send-reminder/
        └── index.ts                    # Already exists
```

### Pattern 1: Secure Credential Storage with Vault
**What:** Store Supabase URL and service_role_key in Vault, retrieve at runtime
**When to use:** Always for pg_cron jobs calling Edge Functions (prevents credential exposure in logs)

**Example:**
```sql
-- Source: https://supabase.com/docs/guides/database/vault
-- Store secrets (run once, ideally via secure console)
SELECT vault.create_secret(
  'https://your-project.supabase.co',
  'supabase_url',
  'Supabase project URL for Edge Function calls'
);

SELECT vault.create_secret(
  'your-service-role-key-here',
  'service_role_key',
  'Service role key for bypassing RLS in cron jobs'
);

-- Retrieve in cron job
SELECT
  (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') AS url,
  (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key') AS key;
```

### Pattern 2: Reusable Trigger Function
**What:** Create database function that wraps net.http_post for Edge Function invocation
**When to use:** When multiple cron jobs need to call the same Edge Function with different parameters

**Example:**
```sql
-- Source: Derived from https://supabase.com/docs/guides/functions/schedule-functions
CREATE OR REPLACE FUNCTION trigger_reminder_job(reminder_type TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id BIGINT;
BEGIN
  -- Call Edge Function via pg_net
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url')
           || '/functions/v1/send-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    ),
    body := jsonb_build_object('type', reminder_type)
  ) INTO request_id;

  RETURN request_id;
END;
$$;
```

### Pattern 3: Cron Job Scheduling
**What:** Use cron.schedule() to invoke trigger function at specified intervals
**When to use:** For each reminder type with its own schedule

**Example:**
```sql
-- Source: https://github.com/citusdata/pg_cron
-- Every 5 minutes (check for 15-minute and morning reminders)
SELECT cron.schedule(
  'check_reminders_due',           -- Job name
  '*/5 * * * *',                   -- Every 5 minutes (UTC)
  'SELECT trigger_reminder_job(''15_min'');'
);

-- Daily at 6:00 AM UTC (for day_before reminders - checks events happening tomorrow)
SELECT cron.schedule(
  'check_day_before_reminders',
  '0 6 * * *',                     -- 6:00 AM UTC = 8:00 AM Israel time
  'SELECT trigger_reminder_job(''day_before'');'
);

-- Daily at 2:00 AM UTC (for morning reminders - events happening today)
SELECT cron.schedule(
  'check_morning_reminders',
  '0 2 * * *',                     -- 2:00 AM UTC = 4:00 AM Israel time
  'SELECT trigger_reminder_job(''morning'');'
);
```

### Pattern 4: Monitoring and Verification
**What:** Query cron tables to verify jobs are running and check for errors
**When to use:** After initial setup, periodic monitoring, debugging failures

**Example:**
```sql
-- Source: https://supabase.com/docs/guides/troubleshooting/pgcron-debugging-guide-n1KTaz
-- Check job configuration
SELECT * FROM cron.job ORDER BY jobid;

-- Check recent job executions
SELECT
  jobid,
  runid,
  job_pid,
  database,
  username,
  command,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE start_time > NOW() - INTERVAL '1 day'
ORDER BY start_time DESC
LIMIT 20;

-- Check for failures
SELECT * FROM cron.job_run_details
WHERE status NOT IN ('succeeded', 'running')
  AND start_time > NOW() - INTERVAL '5 days'
ORDER BY start_time DESC;

-- Verify pg_cron worker is running
SELECT
  pid AS process_id,
  usename AS database_user,
  application_name,
  backend_start AS when_process_began,
  state
FROM pg_stat_activity
WHERE application_name ILIKE 'pg_cron scheduler';
```

### Anti-Patterns to Avoid
- **Hardcoded credentials in SQL:** Exposes secrets in logs and version control. Always use Vault.
- **Using anon_key for cron jobs:** Anon key enforces RLS, which prevents accessing all events. Use service_role_key.
- **Inline HTTP calls in cron.schedule:** Makes debugging harder and duplicates code. Use wrapper functions.
- **Forgetting UTC timezone:** pg_cron uses UTC. Convert to Israel time when scheduling (UTC+2 or UTC+3 with DST).
- **No error monitoring:** Jobs fail silently. Always check cron.job_run_details regularly.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Job scheduling | Custom Node.js cron with node-cron | pg_cron | Database-native, survives app restarts, no separate process needed |
| HTTP requests from DB | Custom webhook table + polling | pg_net | Async, built for Supabase, handles retries, non-blocking |
| Secret storage | Environment variables | Vault | Encrypted at rest, secure in backups, no log exposure |
| Job monitoring | Custom logging table | cron.job_run_details | Built-in, automatic, includes error messages |
| Timezone handling | Manual UTC conversion in code | pg_cron UTC + explicit conversion | Consistent, documented, prevents DST bugs |
| Auth tokens for Edge Functions | Generated JWTs | service_role_key from Vault | Simpler, no JWT library needed, officially supported |

**Key insight:** Supabase provides first-class scheduling infrastructure. Using external tools (AWS Lambda, Vercel Cron, Render Cron) adds complexity, costs, and auth challenges without meaningful benefits for database-triggered jobs.

## Common Pitfalls

### Pitfall 1: Jobs Not Running
**What goes wrong:** Cron jobs show in cron.job table but never execute, or pg_cron worker dies
**Why it happens:**
- pg_cron scheduler process crashed (Postgres restart, resource exhaustion)
- Too many concurrent jobs (>32 exceeds connection limit)
- Long-running jobs block others (10+ minute jobs)
**How to avoid:**
- Check pg_stat_activity for 'pg_cron scheduler' process
- Limit concurrent jobs to 8 (Supabase recommendation)
- Keep jobs under 10 minutes
- Upgrade to Postgres 15.6.1.122+ for auto-revive
**Warning signs:**
- No entries in cron.job_run_details for recent intervals
- Jobs stuck in 'running' status

### Pitfall 2: Authentication Failures
**What goes wrong:** Edge Function returns 401 Unauthorized or 403 Forbidden
**Why it happens:**
- Using anon_key instead of service_role_key (RLS blocks access)
- Hardcoded key expired or rotated
- Vault secret name typo or missing secret
**How to avoid:**
- Always use service_role_key for cron jobs (bypasses RLS)
- Store keys in Vault with consistent naming (e.g., 'service_role_key', not 'SERVICE_KEY')
- Test Vault retrieval separately before scheduling
**Warning signs:**
- status = 'failed' with "unauthorized" in return_message
- Edge Function logs show auth errors

### Pitfall 3: Timezone Confusion
**What goes wrong:** Reminders send at wrong time (e.g., 6 AM instead of 8 AM local time)
**Why it happens:** pg_cron interprets all cron expressions in UTC, not local timezone
**How to avoid:**
- Document timezone conversions in migration comments
- Israel time is UTC+2 (standard) or UTC+3 (DST)
- Schedule "8 AM Israel" as "0 6 * * *" (6 AM UTC) for standard time
- Consider DST transitions (March/October) - may need job updates
**Warning signs:**
- Users report reminders at unexpected times
- Participants in different timezones get same UTC time

### Pitfall 4: Duplicate Message Sending
**What goes wrong:** Participants receive multiple identical reminders
**Why it happens:**
- Job runs multiple times due to retry logic
- Edge Function doesn't check for existing messages
- Cron expression triggers more frequently than intended
**How to avoid:**
- Use idempotency checks in Edge Function (existing send-reminder.ts already does this)
- Test cron expression at https://crontab.guru before scheduling
- Monitor message table for duplicate type + participant_id + event_id
**Warning signs:**
- Participants complain about spam
- cron.job_run_details shows overlapping executions

### Pitfall 5: Silent Failures
**What goes wrong:** Jobs appear to run but no reminders send
**Why it happens:**
- Edge Function errors not logged to cron.job_run_details
- pg_net request succeeds but Edge Function returns 500
- Net timeout (6 hours default) exceeded
**How to avoid:**
- Check Edge Function logs separately (Supabase Dashboard → Functions → Logs)
- Monitor net._http_response table for response status codes
- Set up alerts on failed jobs (query cron.job_run_details for status != 'succeeded')
- Add custom logging to trigger_reminder_job function
**Warning signs:**
- status = 'succeeded' but no messages in messages table
- Participants don't receive reminders

### Pitfall 6: Migration Order Dependencies
**What goes wrong:** Migration fails because extensions or functions don't exist yet
**Why it happens:** Migrations run in filename order; later migrations reference earlier objects
**How to avoid:**
1. Enable extensions first (separate migration)
2. Create Vault secrets second (manual or seed script)
3. Create functions third (depend on extensions)
4. Schedule cron jobs last (depend on functions)
**Warning signs:**
- Migration error: "extension does not exist"
- Migration error: "function does not exist"

## Code Examples

Verified patterns from official sources:

### Complete Setup Flow
```sql
-- Migration 1: Enable Extensions
-- Source: https://supabase.com/docs/guides/database/extensions/pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vault WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Migration 2: Store Vault Secrets (run via secure console, not migration file)
-- Source: https://supabase.com/docs/guides/database/vault
SELECT vault.create_secret(
  'https://your-project.supabase.co',
  'supabase_url',
  'Supabase project URL'
);

SELECT vault.create_secret(
  'your-service-role-key',
  'service_role_key',
  'Service role key for cron jobs'
);

-- Migration 3: Create Trigger Function
-- Source: https://supabase.com/docs/guides/functions/schedule-functions
CREATE OR REPLACE FUNCTION trigger_reminder_job(reminder_type TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  request_id BIGINT;
  project_url TEXT;
  auth_key TEXT;
BEGIN
  -- Retrieve secrets
  SELECT decrypted_secret INTO project_url
  FROM vault.decrypted_secrets WHERE name = 'supabase_url';

  SELECT decrypted_secret INTO auth_key
  FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  -- Call Edge Function
  SELECT net.http_post(
    url := project_url || '/functions/v1/send-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || auth_key
    ),
    body := jsonb_build_object('type', reminder_type)
  ) INTO request_id;

  RETURN request_id;
END;
$$;

-- Migration 4: Schedule Jobs
-- Source: https://github.com/citusdata/pg_cron
-- Every 5 minutes for 15-minute warnings
SELECT cron.schedule(
  'check_reminders_15min',
  '*/5 * * * *',
  $$SELECT trigger_reminder_job('15_min');$$
);

-- Daily at 6:00 AM UTC for day-before reminders
SELECT cron.schedule(
  'check_reminders_day_before',
  '0 6 * * *',
  $$SELECT trigger_reminder_job('day_before');$$
);

-- Daily at 2:00 AM UTC for morning reminders
SELECT cron.schedule(
  'check_reminders_morning',
  '0 2 * * *',
  $$SELECT trigger_reminder_job('morning');$$
);
```

### Manual Testing
```sql
-- Source: Standard pg_cron pattern
-- Test function directly (bypasses schedule)
SELECT trigger_reminder_job('day_before');

-- Check if request was sent
SELECT * FROM net._http_response
WHERE id = (SELECT trigger_reminder_job('morning'))
LIMIT 1;

-- View recent job runs
SELECT * FROM cron.job_run_details
WHERE start_time > NOW() - INTERVAL '1 hour'
ORDER BY start_time DESC;

-- Unschedule a job
SELECT cron.unschedule('check_reminders_15min');

-- Reschedule with different interval
SELECT cron.schedule(
  'check_reminders_15min',
  '*/3 * * * *',  -- Changed to every 3 minutes
  $$SELECT trigger_reminder_job('15_min');$$
);
```

### Monitoring Dashboard Query
```sql
-- Source: https://supabase.com/docs/guides/troubleshooting/pgcron-debugging-guide-n1KTaz
-- Create view for monitoring dashboard
CREATE OR REPLACE VIEW cron_job_status AS
SELECT
  j.jobid,
  j.jobname,
  j.schedule,
  j.command,
  j.active,
  d.runid,
  d.status,
  d.return_message,
  d.start_time,
  d.end_time,
  (d.end_time - d.start_time) AS duration
FROM cron.job j
LEFT JOIN LATERAL (
  SELECT * FROM cron.job_run_details
  WHERE jobid = j.jobid
  ORDER BY start_time DESC
  LIMIT 1
) d ON true
ORDER BY j.jobid;

-- Query the view
SELECT * FROM cron_job_status;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JWT generation with pgjwt | service_role_key from Vault | Q4 2024 | pgjwt deprecated in Postgres 17; simpler auth pattern |
| Manual cron expressions | Dashboard UI for scheduling | Q3 2024 | Easier for non-technical users, but SQL still preferred for version control |
| pg_cron 1.4.x | pg_cron 1.6.4+ | Q2 2024 | Auto-revive on crash, better error messages, bug fixes |
| Static anon/service keys | New sb_publishable_*/sb_secret_* keys | Q1 2026 | Enhanced security, easier rotation (backward compatible) |
| http extension | pg_net | 2023 | Async, non-blocking, Supabase-native |
| ENV vars for secrets | Vault | 2023 | Encrypted at rest, not exposed in logs, better for compliance |

**Deprecated/outdated:**
- **pgjwt extension:** Deprecated in Postgres 17, replaced by service_role_key pattern
- **http extension (pgsql-http):** Still works but synchronous; pg_net preferred for Supabase
- **Hardcoded credentials:** Never recommended but commonly seen in old tutorials; use Vault

## Open Questions

Things that couldn't be fully resolved:

1. **DST Handling for Israel Timezone**
   - What we know: pg_cron uses UTC; Israel is UTC+2 (standard) or UTC+3 (DST)
   - What's unclear: Best practice for handling DST transitions automatically
   - Recommendation: Schedule jobs in UTC with clear documentation. Consider two schedules (winter/summer) if critical, or accept 1-hour drift twice/year.

2. **Optimal Interval for 15-Minute Reminders**
   - What we know: Current plan is every 5 minutes; send-reminder.ts checks for sessions starting in 15-20 minutes
   - What's unclear: Whether 5-minute polling is necessary or wasteful
   - Recommendation: Start with 5 minutes (12 checks/hour), monitor cron.job_run_details for duration. If jobs complete in <1s with no matches, consider 10-minute interval.

3. **Service Role Key Rotation Strategy**
   - What we know: Vault stores service_role_key; keys can be rotated in Supabase Dashboard
   - What's unclear: Best practice for updating Vault secret after rotation without downtime
   - Recommendation: Use vault.update_secret() with new key. No cron job restart needed (reads on each execution). Test in staging first.

4. **Companion Reminder Timing**
   - What we know: send-reminder.ts sends companion reminders immediately after participant reminders
   - What's unclear: Whether companions should receive reminders at same time or offset
   - Recommendation: Keep current behavior (same time) for Phase 1. User feedback in Phase 2+ may inform changes.

## Sources

### Primary (HIGH confidence)
- [Supabase pg_cron Extension Docs](https://supabase.com/docs/guides/database/extensions/pg_cron) - Extension overview
- [Supabase Cron Guide](https://supabase.com/docs/guides/cron) - Complete scheduling guide
- [Supabase pg_net Docs](https://supabase.com/docs/guides/database/extensions/pg_net) - HTTP requests from Postgres
- [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions) - Official pattern for cron + Edge Functions
- [Supabase Vault Docs](https://supabase.com/docs/guides/database/vault) - Secure secret storage
- [pg_cron Debugging Guide](https://supabase.com/docs/guides/troubleshooting/pgcron-debugging-guide-n1KTaz) - Official troubleshooting
- [pg_cron GitHub](https://github.com/citusdata/pg_cron) - Extension source and examples

### Secondary (MEDIUM confidence)
- [Supabase API Keys Guide](https://supabase.com/docs/guides/api/api-keys) - service_role vs anon_key
- [Edge Function Limits](https://supabase.com/docs/guides/functions/limits) - Timeout and execution limits
- [Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations) - Best practices

### Tertiary (LOW confidence)
- [Medium: pg_cron with Edge Functions](https://medium.com/@samuelmpwanyi/how-to-set-up-cron-jobs-with-supabase-edge-functions-using-pg-cron-a0689da81362) - Community tutorial (2024)
- [Cron.guru](https://crontab.guru/) - Cron expression validation (not Supabase-specific)
- [GitHub Discussion: pg_cron auth patterns](https://github.com/supabase/cli/issues/4287) - Community discussion on auth evolution

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Supabase documentation, current as of 2026
- Architecture patterns: HIGH - Verified with official docs and source code
- Pitfalls: MEDIUM - Derived from debugging guide and community discussions; some based on code analysis

**Research date:** 2026-01-28
**Valid until:** 2026-02-28 (30 days - stable technology)
**Recommended re-verification:** Before implementing additional reminder types beyond day_before/morning/15_min
