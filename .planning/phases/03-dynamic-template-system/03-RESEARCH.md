# Phase 3: Dynamic Template System - Research

**Researched:** 2026-01-28
**Domain:** Template Variable Substitution + Database-Driven Messaging
**Confidence:** HIGH

## Summary

This research covers implementing a dynamic template system where WhatsApp reminder messages are fetched from the `message_templates` database table instead of being hardcoded in the Edge Function. The system must support variable substitution (replacing `{{participant_name}}`, `{{event_name}}`, etc. with actual values) and maintain Hebrew RTL rendering quality.

The existing architecture has 8 reminder types with hardcoded message builders in send-reminder.ts (v6). The message_templates table exists in the schema with proper structure but is currently empty. Phase 3 adds the database layer between the reminder logic and message delivery, enabling non-technical users to customize messages without deploying code.

The standard approach uses simple string replacement (no template library needed), PostgreSQL JSONB for storing template variables metadata, and a fallback mechanism to hardcoded builders if templates are missing. This pattern is proven in production messaging systems and balances flexibility with reliability.

**Primary recommendation:** Use native String.replace() with regex for variable substitution, seed 8 default templates with is_system=true, fetch templates by message_type before sending, maintain hardcoded builders as fallback, and document available variables in template.variables JSONB field.

## Standard Stack

The established libraries/tools for this domain:

### Core Technologies
| Technology | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| String.replace() + RegExp | Native JS | Variable substitution | Zero dependencies, TypeScript native, 1-line implementation |
| PostgreSQL JSONB | Postgres 15+ | Template variable metadata | Query-efficient, validation-friendly, allows UI autocomplete |
| Supabase Edge Functions | Deno runtime | Template fetching + rendering | Already in use, consistent with existing architecture |
| message_templates table | EventFlow schema | Template storage | Existing schema, multi-tenant ready, version controlled |

### Supporting Patterns
| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| Fallback to hardcoded | Reliability when DB unavailable | Always (defensive programming) |
| Template caching | Reduce DB queries | Future optimization (not Phase 3) |
| Variable extraction | Populate template.variables field | Seed script + admin UI validation |
| message_type enum constraint | Type-safe template lookup | Already exists (17 enum values) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| String.replace() | Handlebars/Mustache | Adds 50KB+ dependency, overkill for simple {{var}} syntax, Deno import complexity |
| Simple regex | Template literals eval | Security risk (code injection), not data-driven, requires redeployment |
| JSONB variables | Hardcoded variable list | Less flexible, harder to extend, no validation for template editors |
| Database templates | Config files in repo | Requires redeployment to change messages, no per-org customization |

**Installation:**
```typescript
// No installation needed - using native JavaScript
// Template substitution pattern:
function substituteVariables(template: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => result.replace(new RegExp(`{{${key}}}`, 'g'), value),
    template
  )
}
```

## Architecture Patterns

### Recommended Data Flow
```
Cron Job Trigger
    ↓
send-reminder.ts handler
    ↓
Fetch template by message_type
    ↓
If template found:
    ├→ Extract data (event, participant, schedule)
    ├→ Build variable map
    ├→ substituteVariables(template.content, vars)
    └→ Send via send-whatsapp
If template NOT found:
    ├→ Fall back to hardcoded builder
    └→ Send via send-whatsapp
```

### Pattern 1: Template Fetching with Fallback
**What:** Query message_templates table by message_type, fall back to hardcoded if missing
**When to use:** Every reminder type handler in send-reminder.ts

**Example:**
```typescript
// Source: Best practice for database-driven messaging
async function getMessageTemplate(
  supabase: any,
  organizationId: string,
  messageType: string
): Promise<string | null> {
  // Try org-specific template first
  const { data: orgTemplate } = await supabase
    .from('message_templates')
    .select('content')
    .eq('organization_id', organizationId)
    .eq('type', messageType)
    .eq('is_active', true)
    .maybeSingle()

  if (orgTemplate) return orgTemplate.content

  // Fall back to system template
  const { data: sysTemplate } = await supabase
    .from('message_templates')
    .select('content')
    .eq('organization_id', null)
    .eq('type', messageType)
    .eq('is_active', true)
    .eq('is_system', true)
    .maybeSingle()

  return sysTemplate?.content || null
}

// Usage in reminder handler
if (type === 'activation') {
  const template = await getMessageTemplate(
    supabase,
    event.organization_id,
    'reminder_activation'
  )

  const message = template
    ? substituteVariables(template, buildVariableMap(event, participant))
    : buildActivationMessage(event, participant) // Fallback

  // Send message...
}
```

### Pattern 2: Variable Substitution
**What:** Replace {{variable}} placeholders with actual values using regex
**When to use:** After fetching template, before sending message

**Example:**
```typescript
// Source: Native JavaScript pattern (no library needed)
function substituteVariables(
  template: string,
  variables: Record<string, string>
): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => {
      // Global replace with escaped regex
      return result.replace(
        new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
        value || '' // Handle undefined/null gracefully
      )
    },
    template
  )
}

// Build variable map from domain objects
function buildVariableMap(event: any, participant: any): Record<string, string> {
  const eventDate = new Date(event.start_date)

  return {
    participant_name: participant.first_name,
    event_name: event.name,
    event_date: eventDate.toLocaleDateString('he-IL', {
      weekday: 'long', day: 'numeric', month: 'long'
    }),
    event_time: eventDate.toLocaleTimeString('he-IL', {
      hour: '2-digit', minute: '2-digit'
    }),
    event_location: [event.venue_name, event.venue_address]
      .filter(Boolean)
      .join(' - '),
    organizer_name: event.organizer_name || 'הצוות',
  }
}
```

### Pattern 3: Seed Templates with Variable Metadata
**What:** Store available variables as JSONB array for validation and UI hints
**When to use:** Seed script, template admin UI

**Example:**
```sql
-- Source: PostgreSQL JSONB best practice for template systems
INSERT INTO message_templates (
  organization_id,
  name,
  type,
  content,
  variables,
  is_system,
  is_active
) VALUES (
  NULL, -- System template
  'הזמנה לאירוע',
  'invitation',
  'שלום {{participant_name}}! 👋

את/ה מוזמן/ת ל{{event_name}}

📅 תאריך: {{event_date}}
🕐 שעה: {{event_time}}
📍 מיקום: {{event_location}}

נשמח לראותך!',
  '["participant_name", "event_name", "event_date", "event_time", "event_location"]'::jsonb,
  TRUE, -- is_system
  TRUE  -- is_active
);

-- Query templates by available variables
SELECT name, type
FROM message_templates
WHERE variables @> '["event_date"]'::jsonb
  AND is_active = true;
```

### Pattern 4: Schedule-Specific Variables (15-min reminder)
**What:** Handle schedule-specific data for session reminders
**When to use:** 15-min reminder handler (more complex than event-level reminders)

**Example:**
```typescript
// Source: Existing send-reminder.ts build15MinReminder pattern
function buildScheduleVariableMap(
  participant: any,
  schedule: any,
  roomInfo?: any
): Record<string, string> {
  const startTime = new Date(schedule.start_time)
  const endTime = new Date(schedule.end_time)

  return {
    participant_name: participant.first_name,
    session_title: schedule.title,
    session_location: schedule.location || '',
    session_room: roomInfo?.name || schedule.room || '',
    session_start_time: startTime.toLocaleTimeString('he-IL', {
      hour: '2-digit', minute: '2-digit'
    }),
    session_end_time: endTime.toLocaleTimeString('he-IL', {
      hour: '2-digit', minute: '2-digit'
    }),
    session_speaker: schedule.speaker_name || '',
  }
}

// Usage
const template = await getMessageTemplate(
  supabase,
  event.organization_id,
  'reminder_15min'
)

const message = template
  ? substituteVariables(template, buildScheduleVariableMap(participant, schedule, roomInfo))
  : build15MinReminder(participant, schedule, roomInfo)
```

### Anti-Patterns to Avoid
- **Using eval() or Function() for templates:** Security nightmare. Never execute user-provided template strings as code.
- **Complex template logic in DB:** Don't store `{{#if}}` conditionals. Keep templates simple; handle logic in TypeScript.
- **Single template per organization:** Support both org-specific AND system templates for inheritance.
- **Missing fallback logic:** Always have hardcoded builders as backup. Database/network failures shouldn't break reminders.
- **Unescaped variable values:** While unlikely in this context, sanitize participant names if they could contain special chars.
- **Forgetting Hebrew locale formatting:** Always use 'he-IL' for dates/times to maintain RTL quality.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Template syntax parser | Custom {{var}} parser with string splitting | String.replace() + RegExp | One line, handles edge cases (multiple occurrences, special chars), battle-tested |
| Variable validation | Manual string scanning for {{vars}} | PostgreSQL JSONB query `variables @> '["var"]'` | Database-level validation, supports admin UI autocomplete |
| Template caching | In-memory Map with custom TTL logic | Direct DB query with fallback | Premature optimization; query time <5ms, cache adds complexity for Phase 3 |
| RTL formatting | Custom date formatters | Intl.DateTimeFormat with 'he-IL' | Handles Hebrew calendar, proper RTL punctuation, maintained by browser vendors |
| Multi-tenant templates | Separate tables per org | Single table with organization_id + is_system flag | Scalable, supports template inheritance, standard multi-tenant pattern |

**Key insight:** Simple string replacement handles 95% of template use cases. Only add complexity (Handlebars, caching, etc.) when actual requirements demand it. The seed.sql templates use `{{var}}` syntax (not `{{#if}}`), indicating intentionally simple design.

## Common Pitfalls

### Pitfall 1: Variable Mismatch Between Template and Code
**What goes wrong:** Template uses `{{full_name}}` but code provides `participant_name`, resulting in unreplaced placeholders in sent messages
**Why it happens:**
- Template created manually without checking variable map
- Code refactored, variable names changed, templates not updated
- No validation layer between template storage and rendering
**How to avoid:**
- Store available variables in template.variables JSONB field
- Validate templates on save: extract `{{vars}}` from content, compare to variables field
- Log warning if template contains variables not in provided map
- Admin UI shows available variables from variables field
**Warning signs:**
- Users report seeing `{{variable_name}}` in actual WhatsApp messages
- Messages missing critical info (names, dates)

### Pitfall 2: Hebrew RTL Rendering Breaks with Embedded Numbers/URLs
**What goes wrong:** Date like "28 ינואר" renders as "ינואר 28" or phone numbers break line flow
**Why it happens:** Bidirectional text algorithm confused by mixed LTR (numbers) and RTL (Hebrew)
**How to avoid:**
- Use Intl.DateTimeFormat with 'he-IL' locale (handles bidi automatically)
- Format phone numbers with spaces: "050-123-4567" not "0501234567"
- Test templates with real data containing numbers, not Lorem Ipsum
- WhatsApp handles most RTL well, but avoid URLs mid-sentence
**Warning signs:**
- Numbers appear on wrong side of Hebrew text
- Punctuation (colon, comma) in wrong position
- Users complain about "jumbled" messages

### Pitfall 3: Missing Fallback to Hardcoded Builders
**What goes wrong:** Template query fails (DB down, network timeout), no message sent, participants miss reminders
**Why it happens:** Assumed DB always available, no defensive programming
**How to avoid:**
- Always check if template is null after query
- Wrap template fetch in try/catch
- Call hardcoded builder (e.g., buildActivationMessage) if template missing
- Log template miss for monitoring
**Warning signs:**
- Reminders stop sending after DB connection issue
- Logs show "template not found" with no fallback executed
- Zero messages sent during DB maintenance window

### Pitfall 4: Seeding Templates Without Proper Enum Values
**What goes wrong:** Seed script inserts template with type='reminder_activation' but enum only has 'activation'
**Why it happens:** Mismatch between schema.sql enum and seed.sql template types
**How to avoid:**
- Verify enum values before seeding: `SELECT unnest(enum_range(NULL::message_type));`
- Use EXACT enum values from schema (with 'reminder_' prefix)
- Test seed script in fresh DB before production
- Document enum-to-template mapping in RESEARCH.md
**Warning signs:**
- Seed script fails with "invalid input value for enum message_type"
- Templates inserted but never fetched (wrong type value)

### Pitfall 5: Organization-Specific Templates Override System Templates Silently
**What goes wrong:** Org creates custom template, breaks variable substitution, participants get broken messages
**Why it happens:** No validation when org saves custom template; code fetches org template first
**How to avoid:**
- Validate custom templates before saving (check variables match system template)
- Show preview with sample data before saving
- Allow org to "reset to system default"
- Log when org template used vs system template
**Warning signs:**
- Some orgs report broken messages, others fine
- Message format varies between orgs unexpectedly

### Pitfall 6: Template Content Truncated for Long Messages
**What goes wrong:** WhatsApp has 4096 char limit; long templates get truncated mid-word
**Why it happens:** No length validation when saving template
**How to avoid:**
- Validate template.content length < 3000 chars (buffer for variable expansion)
- Show character count in admin UI
- Truncate gracefully with "..." if over limit after substitution
- Consider splitting long messages (rare for reminders)
**Warning signs:**
- Users report cut-off messages
- Variable at end of template never appears in sent message

## Code Examples

Verified patterns from official sources:

### Complete Template System Implementation
```typescript
// Source: EventFlow send-reminder.ts integration pattern

// 1. Template fetcher with org + system fallback
async function getMessageTemplate(
  supabase: any,
  organizationId: string,
  messageType: string
): Promise<string | null> {
  // Org-specific template (higher priority)
  const { data: orgTemplate } = await supabase
    .from('message_templates')
    .select('content')
    .eq('organization_id', organizationId)
    .eq('type', messageType)
    .eq('is_active', true)
    .maybeSingle()

  if (orgTemplate?.content) return orgTemplate.content

  // System template (fallback)
  const { data: sysTemplate } = await supabase
    .from('message_templates')
    .select('content')
    .eq('organization_id', null)
    .eq('type', messageType)
    .eq('is_active', true)
    .eq('is_system', true)
    .maybeSingle()

  return sysTemplate?.content || null
}

// 2. Simple variable substitution (no library)
function substituteVariables(
  template: string,
  variables: Record<string, string>
): string {
  return Object.entries(variables).reduce(
    (result, [key, value]) => {
      const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      return result.replace(placeholder, value || '')
    },
    template
  )
}

// 3. Variable map builders
function buildEventVariableMap(event: any, participant: any): Record<string, string> {
  const eventDate = new Date(event.start_date)

  return {
    participant_name: participant.first_name,
    event_name: event.name,
    event_date: eventDate.toLocaleDateString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }),
    event_time: eventDate.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    }),
    event_location: [event.venue_name, event.venue_address]
      .filter(Boolean)
      .join(' - '),
  }
}

function buildScheduleVariableMap(
  participant: any,
  schedule: any
): Record<string, string> {
  const startTime = new Date(schedule.start_time)

  return {
    participant_name: participant.first_name,
    session_title: schedule.title,
    session_location: schedule.location || '',
    session_room: schedule.room || '',
    session_start_time: startTime.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    }),
  }
}

// 4. Integration into reminder handler
if (type === 'activation') {
  const { data: events } = await supabase
    .from('events')
    .select(`
      id, name, start_date, venue_name, venue_address, organization_id,
      settings,
      participants (id, first_name, phone_normalized, status)
    `)
    .eq('status', 'active')

  if (events) {
    for (const event of events) {
      if (!event.settings?.reminder_activation) continue

      // Fetch template ONCE per event
      const template = await getMessageTemplate(
        supabase,
        event.organization_id,
        'reminder_activation'
      )

      for (const participant of event.participants || []) {
        if (participant.status !== 'confirmed') continue

        results.processed++

        // Deduplication check
        const { data: existingMsg } = await supabase
          .from('messages')
          .select('id')
          .eq('event_id', event.id)
          .eq('participant_id', participant.id)
          .eq('type', 'reminder_activation')
          .maybeSingle()

        if (existingMsg) continue

        // Build message with template OR fallback
        const message = template
          ? substituteVariables(template, buildEventVariableMap(event, participant))
          : buildActivationMessage(event, participant)

        // Insert + send
        const { data: msgData } = await supabase
          .from('messages')
          .insert({
            event_id: event.id,
            participant_id: participant.id,
            type: 'reminder_activation',
            channel: 'whatsapp',
            recipient_name: participant.first_name,
            recipient_phone: participant.phone_normalized,
            content: message,
            status: 'pending',
          })
          .select()
          .maybeSingle()

        if (!msgData) {
          results.errors++
          continue
        }

        const sendResult = await sendWhatsApp(
          supabase,
          event.organization_id,
          participant.phone_normalized,
          message,
          msgData.id
        )

        if (sendResult.success) results.sent++
        else results.errors++
      }
    }
  }
}
```

### Seed Script for 8 Reminder Templates
```sql
-- Source: Derived from existing seed.sql pattern
-- Insert 8 system templates for reminder types

INSERT INTO message_templates (
  organization_id,
  name,
  type,
  channel,
  content,
  variables,
  is_system,
  is_active
) VALUES

-- 1. Activation (when event becomes active)
(
  NULL,
  'תזכורת הרשמה לאירוע',
  'reminder_activation',
  'whatsapp',
  'היי {{participant_name}}! 🎉

נרשמת בהצלחה לאירוע: {{event_name}}

📅 {{event_date}}
🕐 {{event_time}}
📍 {{event_location}}

נתראה שם! 👋',
  '["participant_name", "event_name", "event_date", "event_time", "event_location"]'::jsonb,
  TRUE,
  TRUE
),

-- 2. Week before event
(
  NULL,
  'תזכורת שבוע לפני',
  'reminder_week_before',
  'whatsapp',
  'היי {{participant_name}}! ⏰

עוד שבוע ל-{{event_name}}

📅 {{event_date}}
🕐 {{event_time}}
📍 {{event_location}}

מצפים לראותך! ✨',
  '["participant_name", "event_name", "event_date", "event_time", "event_location"]'::jsonb,
  TRUE,
  TRUE
),

-- 3. Day before event (already in seed.sql but verify type)
(
  NULL,
  'תזכורת יום לפני',
  'reminder_day_before',
  'whatsapp',
  'היי {{participant_name}}! 🔔

תזכורת: מחר {{event_name}}

📅 {{event_date}}
🕐 {{event_time}}
📍 {{event_location}}

נתראה מחר! 👋',
  '["participant_name", "event_name", "event_date", "event_time", "event_location"]'::jsonb,
  TRUE,
  TRUE
),

-- 4. Morning of event
(
  NULL,
  'תזכורת בוקר האירוע',
  'reminder_morning',
  'whatsapp',
  'בוקר טוב {{participant_name}}! ☀️

היום זה הזמן - {{event_name}}

🕐 {{event_time}}
📍 {{event_location}}

יום מעולה! 🎯',
  '["participant_name", "event_name", "event_time", "event_location"]'::jsonb,
  TRUE,
  TRUE
),

-- 5. 15 minutes before session
(
  NULL,
  'תזכורת 15 דקות',
  'reminder_15min',
  'whatsapp',
  '{{participant_name}}, בעוד 15 דקות: {{session_title}} 📍{{session_location}}',
  '["participant_name", "session_title", "session_location"]'::jsonb,
  TRUE,
  TRUE
),

-- 6. Event ended
(
  NULL,
  'תודה על ההשתתפות',
  'reminder_event_end',
  'whatsapp',
  'היי {{participant_name}},

תודה שהשתתפת ב{{event_name}}! 🙏

היה לנו כיף, ונשמח לשמוע ממך.

להתראות באירוע הבא! 👋',
  '["participant_name", "event_name"]'::jsonb,
  TRUE,
  TRUE
),

-- 7. Follow-up 3 months later
(
  NULL,
  'מעקב 3 חודשים',
  'reminder_follow_up_3mo',
  'whatsapp',
  'היי {{participant_name}},

עברו 3 חודשים מאז {{event_name}}.

נשמח לשמוע איך הלך ומה השתנה מאז. 📝

בברכה,
הצוות',
  '["participant_name", "event_name"]'::jsonb,
  TRUE,
  TRUE
),

-- 8. Follow-up 6 months later
(
  NULL,
  'מעקב 6 חודשים',
  'reminder_follow_up_6mo',
  'whatsapp',
  'היי {{participant_name}},

חצי שנה מאז {{event_name}}!

נשמח לעדכון - איך הדברים מתקדמים? 🚀

בברכה,
הצוות',
  '["participant_name", "event_name"]'::jsonb,
  TRUE,
  TRUE
);
```

### Verification Queries
```sql
-- Source: Testing pattern for template system

-- 1. Verify all 8 templates seeded
SELECT type, name, is_system
FROM message_templates
WHERE is_system = TRUE
ORDER BY
  CASE type
    WHEN 'reminder_activation' THEN 1
    WHEN 'reminder_week_before' THEN 2
    WHEN 'reminder_day_before' THEN 3
    WHEN 'reminder_morning' THEN 4
    WHEN 'reminder_15min' THEN 5
    WHEN 'reminder_event_end' THEN 6
    WHEN 'reminder_follow_up_3mo' THEN 7
    WHEN 'reminder_follow_up_6mo' THEN 8
  END;
-- Expected: 8 rows

-- 2. Test template fetching logic
SELECT
  content,
  variables
FROM message_templates
WHERE type = 'reminder_activation'
  AND organization_id IS NULL
  AND is_system = TRUE
  AND is_active = TRUE;
-- Expected: 1 row with Hebrew content

-- 3. Verify variables JSONB structure
SELECT
  type,
  jsonb_array_length(variables) as var_count,
  variables
FROM message_templates
WHERE is_system = TRUE;
-- Expected: var_count between 2 and 5

-- 4. Check for templates with missing enum values
SELECT type
FROM message_templates
WHERE type NOT IN (
  SELECT unnest(enum_range(NULL::message_type))
);
-- Expected: 0 rows (all types valid)

-- 5. Test variable substitution in SQL (sanity check)
SELECT
  type,
  replace(
    replace(content, '{{participant_name}}', 'דני'),
    '{{event_name}}', 'כנס השנתי'
  ) as sample_output
FROM message_templates
WHERE type = 'reminder_activation'
  AND is_system = TRUE;
-- Expected: Hebrew text with "דני" and "כנס השנתי"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded messages in Edge Function | DB-driven templates with fallback | Phase 3 (2026-01) | Non-technical users can customize; code remains reliable |
| Template literals with static variables | Dynamic variable maps per reminder type | Phase 3 (2026-01) | Flexible, maintainable, testable variable handling |
| Handlebars/Mustache for templates | Native String.replace() | Phase 3 (2026-01) | Zero dependencies, simpler deployment, 1-line logic |
| Single template per type | Org-specific + system template inheritance | Phase 3 (2026-01) | Multi-tenant flexibility without breaking defaults |
| Manual HTML escaping | No escaping (WhatsApp text-only) | N/A | Simpler (but remember to sanitize if adding email channel later) |

**Deprecated/outdated:**
- **Template literals with eval():** Never use. Security risk, code injection vulnerability.
- **Hardlebars {{#if}} logic in templates:** Seed.sql shows simple {{var}} syntax only. Keep logic in TypeScript.
- **Separate template tables per channel:** Use channel column instead. Single source of truth.

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal Template Fetching Strategy**
   - What we know: Fetch once per event, reuse for all participants (reduces DB queries)
   - What's unclear: Whether to cache templates across cron job invocations (5-minute intervals)
   - Recommendation: No caching in Phase 3. Template query takes <5ms. Add caching only if logs show perf issues (unlikely with <1000 events).

2. **Variable Name Conventions**
   - What we know: Existing builders use `participant.first_name`, `event.name`, `event.venue_name`
   - What's unclear: Should variables be `participant_name` or `first_name`, `event_location` or `venue_name`
   - Recommendation: Use `participant_name`, `event_name`, `event_location` (semantic, not DB field names). Clearer for non-technical template editors.

3. **Handling Missing Variables in Templates**
   - What we know: Code provides variable map, template may reference variables not in map
   - What's unclear: Should we error, warn, or silently leave placeholder?
   - Recommendation: Replace with empty string (graceful degradation). Log warning for monitoring. Admin UI validates variables on save.

4. **Multi-Tenant Template Inheritance**
   - What we know: Orgs can create custom templates, system templates serve as defaults
   - What's unclear: Should orgs "extend" system templates (add variables) or fully replace?
   - Recommendation: Full replacement in Phase 3. Inheritance (extending system templates) is feature creep; defer to user feedback.

5. **Template Versioning for Auditing**
   - What we know: Templates may change over time, messages.content stores sent message
   - What's unclear: Should we track template_id and version in messages table?
   - Recommendation: Store template_id but not version in Phase 3. messages.content has final rendered text. Add versioning only if compliance requires auditing which template version was used.

## Sources

### Primary (HIGH confidence)
- [MDN: Template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) - Native JavaScript template syntax
- [PostgreSQL JSONB Operators](https://www.postgresql.org/docs/current/functions-json.html) - Official JSONB query docs
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions) - Deno runtime patterns
- [Mustache Manual](http://mustache.github.io/) - Template syntax reference (for comparison, not usage)
- [Handlebars Guide](https://handlebarsjs.com/guide/expressions.html) - Variable substitution patterns (for comparison)

### Secondary (MEDIUM confidence)
- [String Substitution in TypeScript](https://www.webdevtutor.net/blog/typescript-string-substitution) - Native replace patterns
- [RTL Language Testing Best Practices](https://wordsprime.com/rtl-language-testing-best-practices-to-avoid-text-truncation-and-layout-misalignment/) - Hebrew rendering guidelines
- [PostgreSQL Query JSONB Arrays](https://www.datacamp.com/doc/postgresql/querying-&-filtering-json-fields) - JSONB containment operators
- [Supabase Edge Functions Best Practices](https://supabase.com/docs/guides/functions/development-environment) - Deno dependency patterns

### Tertiary (LOW confidence)
- [GitHub: gsandf/template-file](https://github.com/gsandf/template-file) - Alternative library (not used, but shows common patterns)
- [W3C: RTL Scripts](https://www.w3.org/International/questions/qa-ltr-scripts-in-rtl.en.html) - Bidirectional text handling

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Native JavaScript, existing Supabase/PostgreSQL patterns, no external dependencies
- Architecture patterns: HIGH - Verified with existing codebase (send-reminder.ts, seed.sql, schema.sql)
- Pitfalls: MEDIUM - Derived from general template system experience and WhatsApp messaging context

**Research date:** 2026-01-28
**Valid until:** 2026-03-28 (60 days - stable patterns, unlikely to change)
**Recommended re-verification:** After implementing Phase 3, if adding email/SMS channels (escaping requirements differ)
