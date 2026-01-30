# Phase 3: Dynamic Template System - Research

**Researched:** 2026-01-30
**Domain:** Database-driven template systems with variable substitution in Edge Functions
**Confidence:** HIGH

## Summary

This phase wires the existing `message_templates` table to the `send-reminder` Edge Function, replacing hardcoded message builders with dynamic template fetching and variable substitution. The system already has 8 templates seeded in the database (via migration `20260128000002_seed_reminder_templates.sql`) with proper tone, RTL Hebrew formatting, and documented variables.

The technical approach is straightforward: fetch template from database by `message_type`, replace `{{variable_name}}` placeholders with actual values using JavaScript regex, and send the resulting message via WhatsApp. The main considerations are fallback behavior for missing variables, template caching strategy, and error handling.

Current state analysis shows:
- Templates already seeded with correct content and tone
- Database schema properly supports template storage with `message_type` enum matching
- Edge Function has hardcoded builders that closely match DB templates
- Variable substitution is a standard JavaScript pattern with well-established best practices

**Primary recommendation:** Use simple regex-based variable substitution with fallback to empty string for missing values, fetch templates per batch (not per send), and keep hardcoded builders as emergency fallback during transition.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | 2.x | Database client for Edge Functions | Official Supabase SDK, first-class Deno support |
| Deno | 2.1.4+ | Runtime for Edge Functions | Native Supabase Edge Functions runtime (all regions run Deno 2.x) |
| PostgreSQL | 15+ | Database with ENUM types | Supabase's underlying database |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native RegExp | ES2020+ | Template variable substitution | Built-in, no dependencies needed |
| Template literals | ES6+ | String formatting | Native JavaScript feature |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Regex substitution | Handlebars/Mustache | External dependency in Edge Function, overkill for simple `{{var}}` syntax |
| Fetch per send | Cache all templates in memory | Memory usage vs DB calls, batch caching is middle ground |
| Database templates | Hardcoded only | Loses flexibility, but simpler - already committed to DB templates |

**Installation:**
```bash
# No additional dependencies needed - uses native Supabase client and JavaScript features
```

## Architecture Patterns

### Recommended Edge Function Structure
```
send-reminder/
├── index.ts                 # Main handler with reminder type routing
├── template-engine.ts       # Template fetching & variable substitution (NEW)
└── whatsapp-sender.ts       # Existing sendWhatsApp function
```

### Pattern 1: Template Fetching with Caching
**What:** Fetch all active templates at the start of the function invocation, cache them in memory for the batch.
**When to use:** For batch operations like reminder sending where multiple messages use the same templates.
**Example:**
```typescript
// Fetch templates once per invocation
const templates = await fetchTemplatesForOrg(organizationId);
const templateCache = new Map(templates.map(t => [t.message_type, t]));

// Reuse throughout batch
for (const participant of participants) {
  const template = templateCache.get('reminder_day_before');
  const message = substituteVariables(template.content, variables);
}
```

### Pattern 2: Variable Substitution with Fallback
**What:** Replace `{{variable_name}}` with values from data object, using nullish coalescing for missing values.
**When to use:** Every template rendering operation.
**Example:**
```typescript
// Source: JavaScript regex best practices (verified pattern)
function substituteVariables(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    // Use nullish coalescing for proper null/undefined handling
    return data[key] ?? '';
  });
}
```

### Pattern 3: Database Query with Type Safety
**What:** Query `message_templates` table filtered by `message_type` and `organization_id`.
**When to use:** At the start of reminder batch processing.
**Example:**
```typescript
// Query system templates (organization_id is NULL for system templates)
const { data: template } = await supabase
  .from('message_templates')
  .select('content, variables')
  .eq('message_type', reminderType)
  .eq('is_active', true)
  .is('organization_id', null)  // System templates
  .maybeSingle();

// Or org-specific templates (future enhancement)
// .eq('organization_id', orgId)
```

### Anti-Patterns to Avoid
- **Fetching template per message send:** Causes N+1 database queries, fetch once per batch instead.
- **Using `||` operator for fallbacks:** Treats falsy values (0, false, '') as missing, use `??` nullish coalescing.
- **Complex regex in template:** Keep templates simple, do calculations before substitution.
- **Ignoring RTL formatting:** Hebrew text needs proper emoji/punctuation placement for WhatsApp.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting for Hebrew | Custom parser | `toLocaleDateString('he-IL')` | Built-in Intl API handles Hebrew calendar, RTL, proper month names |
| Time formatting | String manipulation | `toLocaleTimeString('he-IL', options)` | Handles timezone (Asia/Jerusalem), 24h format correctly |
| Phone normalization | Regex replace | Existing schema function `normalize_phone()` | Already handles Israeli 0xx -> 972xx conversion |
| Variable substitution library | Import template engine | Native `String.replace()` with regex | Simple `{{var}}` syntax doesn't need Handlebars/Mustache overhead |

**Key insight:** The existing codebase already has proper date/time formatting and phone normalization. Don't rebuild these - reuse the patterns from `buildDayBeforeMessage()` and `buildMorningMessage()`.

## Common Pitfalls

### Pitfall 1: Missing Variable Behavior
**What goes wrong:** Template has `{{venue_name}}` but venue_name is null in database, message shows "{{venue_name}}" to user.
**Why it happens:** Naive substitution doesn't handle missing keys in data object.
**How to avoid:** Use fallback in substitution function: `data[key] ?? ''` removes placeholder completely.
**Warning signs:** User reports seeing `{{}}` placeholders in WhatsApp messages.

### Pitfall 2: Template Not Found
**What goes wrong:** Database query returns null, code crashes trying to access `template.content`.
**Why it happens:** Migration not run, template deleted accidentally, wrong `message_type` value.
**How to avoid:**
1. Check if template exists before use
2. Fall back to hardcoded builder if template missing
3. Log error for investigation
**Warning signs:** Edge Function crashes only for specific reminder types.

### Pitfall 3: Schema Column Mismatch
**What goes wrong:** Migration renames `content_template` to `content` but code still queries old column name.
**Why it happens:** Migration in 20260128000002 conditionally renames columns, may not match all environments.
**How to avoid:** Verify schema before querying - migration handles both column names gracefully.
**Warning signs:** Database error "column content_template does not exist" or "column content does not exist".

### Pitfall 4: RTL Text Corruption in WhatsApp
**What goes wrong:** Hebrew text displays with broken word order or emoji in wrong positions.
**Why it happens:** WhatsApp Web and iOS have known RTL issues, mixing LTR punctuation with RTL text.
**How to avoid:**
- Keep emoji at start/end of lines, not mid-sentence
- Test on actual WhatsApp (not just logs)
- Use Unicode RTL mark (U+200F) if needed for complex mixed content
**Warning signs:** Text looks correct in logs but garbled in WhatsApp.

### Pitfall 5: Timezone Confusion
**What goes wrong:** Event at 19:00 sends reminder with "07:00" (AM/PM confusion or wrong timezone).
**Why it happens:** JavaScript Date defaults to browser/system timezone, not Israel time.
**How to avoid:** Always use `toLocaleTimeString('he-IL', { timeZone: 'Asia/Jerusalem' })`.
**Warning signs:** Times off by hours in messages, especially for events entered in different timezones.

### Pitfall 6: Variable Name Typos
**What goes wrong:** Template has `{{event_name}}` but code passes `eventName` (camelCase vs snake_case).
**Why it happens:** Inconsistent naming convention between template variables and code.
**How to avoid:**
- Document variable names in `variables` JSONB column (already done in migration)
- Use exact names from seeded templates: `participant_name`, `event_name`, `event_date`, `event_time`, `event_location`
**Warning signs:** Some variables substitute correctly, others show as empty.

## Code Examples

Verified patterns from official sources and existing codebase:

### Template Substitution Function
```typescript
// Source: JavaScript regex patterns (verified), existing send-reminder.ts
function substituteVariables(
  template: string,
  data: Record<string, string | null | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    // Nullish coalescing handles null and undefined, not falsy values
    return data[key] ?? '';
  });
}
```

### Fetch Template from Database
```typescript
// Source: Supabase docs pattern, existing codebase
async function fetchTemplate(
  supabase: SupabaseClient,
  messageType: string
): Promise<string | null> {
  const { data: template, error } = await supabase
    .from('message_templates')
    .select('content')
    .eq('message_type', messageType)
    .eq('is_active', true)
    .is('organization_id', null)  // System templates only
    .maybeSingle();

  if (error || !template) {
    console.error(`Template not found for ${messageType}:`, error);
    return null;
  }

  return template.content;
}
```

### Build Variables Object
```typescript
// Source: Existing buildDayBeforeMessage() pattern
function buildTemplateVariables(event: any, participant: any): Record<string, string> {
  const eventDate = new Date(event.start_date);

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
      minute: '2-digit',
      timeZone: 'Asia/Jerusalem'
    }),
    event_location: [
      event.venue_name || '',
      event.venue_address || ''
    ].filter(Boolean).join(' ')
  };
}
```

### Complete Integration Pattern
```typescript
// Replacement for hardcoded buildDayBeforeMessage()
async function renderReminderMessage(
  supabase: SupabaseClient,
  reminderType: string,
  event: any,
  participant: any
): Promise<string> {
  // 1. Fetch template (with fallback)
  const templateContent = await fetchTemplate(supabase, reminderType);

  if (!templateContent) {
    // Fallback to hardcoded builder (emergency)
    console.warn(`Using hardcoded fallback for ${reminderType}`);
    return buildDayBeforeMessage(event, participant);
  }

  // 2. Build variables
  const variables = buildTemplateVariables(event, participant);

  // 3. Substitute
  return substituteVariables(templateContent, variables);
}
```

### Batch Template Caching
```typescript
// Optimization: fetch all templates once per batch
async function fetchTemplateBatch(
  supabase: SupabaseClient,
  messageTypes: string[]
): Promise<Map<string, string>> {
  const { data: templates } = await supabase
    .from('message_templates')
    .select('message_type, content')
    .in('message_type', messageTypes)
    .eq('is_active', true)
    .is('organization_id', null);

  const cache = new Map<string, string>();
  templates?.forEach(t => cache.set(t.message_type, t.content));
  return cache;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded message builders | Database-driven templates | Phase 3 (current) | Allows runtime template editing without code deployment |
| Concatenated strings | Template literals with `${}` | ES6 (2015) | Cleaner syntax but still hardcoded |
| `||` for fallbacks | `??` nullish coalescing | ES2020 (2020) | Properly handles 0, false, '' as valid values |
| Single regex replace | Global regex `replace(/pattern/g)` | Always available | Must use `g` flag for multiple occurrences |

**Deprecated/outdated:**
- **Template column name `content_template`**: Migration renames to `content` for consistency (handled in 20260128000002).
- **`type` column**: Renamed to `message_type` to match enum type name (handled in migration).
- **Deno 1.x standard library imports**: Use `Deno.serve` instead of `https://deno.land/std@0.168.0/http/server.ts` (current code still uses old pattern, acceptable for now).

## Open Questions

Things that couldn't be fully resolved:

1. **Organization-specific template override**
   - What we know: Schema supports `organization_id` column, system templates have NULL
   - What's unclear: Should Phase 3 implement org-specific template lookup (fall back system -> org)?
   - Recommendation: Start with system templates only (simpler), add org override in Phase 4

2. **Template validation on insert**
   - What we know: Templates use `{{variable_name}}` syntax, variables documented in JSONB
   - What's unclear: Should we validate that template only uses declared variables?
   - Recommendation: Document variables but don't validate in Phase 3, add validation trigger in future phase

3. **Caching duration**
   - What we know: Templates don't change often, Edge Functions are stateless
   - What's unclear: How long should template cache persist? Per invocation? Per minute?
   - Recommendation: Cache per function invocation only (safest, simplest)

4. **Error handling strategy during transition**
   - What we know: Hardcoded builders work, DB templates exist
   - What's unclear: Remove hardcoded builders immediately or keep as fallback?
   - Recommendation: Keep hardcoded builders as fallback for Phase 3, remove in Phase 4 after validation

5. **WhatsApp bold syntax in templates**
   - What we know: WhatsApp supports `*bold*` syntax, templates don't currently use it
   - What's unclear: Should we add bold formatting to seeded templates?
   - Recommendation: Test current templates first, add bold in follow-up if needed (current templates work well)

## Sources

### Primary (HIGH confidence)
- Existing codebase: `/eventflow-scaffold/functions/send-reminder.ts` - Current hardcoded implementation
- Existing codebase: `/supabase/migrations/20260128000002_seed_reminder_templates.sql` - Seeded templates
- Existing codebase: `/eventflow-scaffold/schema.sql` - Database schema with message_type enum
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions) - Official documentation for Edge Functions with Deno
- [TypeScript Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html) - Official TypeScript documentation

### Secondary (MEDIUM confidence)
- [Supabase PostgreSQL Templates](https://supabase.com/blog/postgresql-templates) - Database template patterns
- [MDN Template Literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) - JavaScript template literal reference
- [JavaScript Regex Variable Substitution](https://dirask.com/posts/JavaScript-insert-variable-into-template-text-with-regular-expression-aDZya1) - Community pattern for `{{var}}` replacement
- [WhatsApp Text Formatting](https://faq.whatsapp.com/539178204879377/?cms_platform=web) - Official WhatsApp formatting guide

### Tertiary (LOW confidence)
- [RTL WhatsApp Issues](https://github.com/omertuc/RTL-Whatsapp) - Community workaround for RTL (browser only, not API relevant)
- [Handling Null and Undefined Best Practices](https://medium.com/javascript-scene/handling-null-and-undefined-in-javascript-1500c65d51ae) - Community article on fallback patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses native Supabase SDK and JavaScript features, no external dependencies
- Architecture: HIGH - Simple fetch + substitute pattern, verified in existing codebase
- Pitfalls: HIGH - Identified from existing code review and common template engine issues

**Research date:** 2026-01-30
**Valid until:** 2026-02-28 (30 days - stable domain, unlikely to change)

**Notes:**
- All 8 templates verified as seeded in database migration
- Variable names documented in migration match existing hardcoded builders
- Phase boundary well-defined: wire existing templates, don't add new features
- Claude's discretion items have clear recommendations based on research
