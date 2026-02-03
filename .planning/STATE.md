# GSD State

## Current Position

Phase: 9 (Day Simulation & Real-Time Operations) COMPLETE ✅
Plan: 6 of 6 (all plans complete)
Status: Phase 9 complete - simulation and contingency fully integrated into EventDetailPage with all success criteria met
Last activity: 2026-02-03 — Completed 09-06 (EventDetailPage Integration)

Progress: ████████████████████ 100% (20/20 total plans) - ALL PHASES COMPLETE

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** The event manager has full control while AI handles the complexity
**Current focus:** Milestone v2.0 — Intelligent Production & Networking Engine (Phase 7 done, ready for Phase 8)

## Accumulated Context

### Key Decisions
- pg_cron for scheduling (native Supabase solution)
- Templates from message_templates table (dynamic, editable)
- 8 reminder types covering full event lifecycle
- Vault for secure credential storage (service_role_key + project URL)
- 30s timeout for Edge Function calls from pg_net
- Added `message_type` column (enum) to messages table for proper deduplication
- Both `message_type` and `subject` populated for backward compatibility
- Follow-up reminders default to false (opt-in by manager)
- Follow-up date windows are 4 days wide for cron timing tolerance
- Template engine uses org-specific lookup first, then system fallback
- Variable substitution via regex with empty string fallback for missing values
- Hardcoded message builders kept as emergency fallback
- Fixed Zod schema follow-up defaults from true→false (opt-in alignment)
- v2.0: Enhanced AI chat (not autonomous agent) — suggest + confirm pattern
- v2.0: Manager assigns participant tracks (not self-service)
- v2.0: Offline mode only for check-in (not full app)
- v2.0: ALL changes must be additive — no breaking existing functionality
- v2.0: Phase numbering continues from v1.0 (starts at Phase 6)
- v2.0: 4 phases covering 36 requirements across 8 feature categories
- Phase 6: Database-level conflict detection for rooms (EXCLUDE USING GIST), application-level for speakers (warn but don't block)
- Phase 6: ai_insights_log with JSONB action_data for flexibility across different AI action types
- Phase 6: RLS policies on ai_insights_log enforce organization isolation for AI operations
- Phase 6: AI chat extended with schedule management tools (create, update, delete)
- Phase 6: detectScheduleConflicts checks room/speaker overlap + capacity warnings
- Phase 6: All schedule suggestions return pending_approval (never auto-execute)
- Phase 6: VIP impact assessed for all schedule changes (vip_affected flag in action_data)
- Phase 6: ai-chat has 10 tools total (7 existing + 3 new schedule tools)
- Phase 6: execute-ai-action Edge Function enforces RLS and re-checks conflicts at execution time
- Phase 6: AIConfirmationDialog with RTL Hebrew UI shows conflicts, VIP warnings, and risk assessment
- Phase 6: Approve button disabled when error-level conflicts exist (safety first)
- Phase 6: Risk levels: critical (error conflicts) > high (VIPs/warnings) > medium (notifications) > low
- Phase 6: Full suggest → confirm → execute flow complete end-to-end
- Phase 7: networking_opt_in defaults to false (explicit opt-in, privacy-first)
- Phase 7: table_assignments tracks table_number (required), seat_number (optional)
- Phase 7: assigned_by field tracks source: 'ai', 'manager', or 'auto'
- Phase 7: VIP indicator uses subtle diamond emoji (💎) with purple-600 at 70% opacity
- Phase 7: VIPBadge component has three size variants: xs, sm, md
- Phase 7: useVIPSorting hook is generic - works with any type having is_vip field
- Phase 7: Greedy seating algorithm chosen over CSP library for v1 (sufficient for <500 participants)
- Phase 7: Companions processed as atomic groups (cannot be separated during assignment)
- Phase 7: VIP spread with max 2 VIPs per table distributes networking opportunities
- Phase 7: Shared interests scoring based on track overlap count
- Phase 7: Manual override requires edit mode toggle (disabled by default for safety)
- Phase 7: 8px pointer activation distance prevents accidental drags
- Phase 7: Manual moves attributed as 'manager' in assigned_by for audit trail
- Phase 7: Track chip uses 20% opacity background with full-color border
- Phase 7: Bulk track assignment via fixed bottom bar with auto-clear on success
- Phase 7: useTrackAssignment hook uses upsert with ignoreDuplicates for idempotency
- Phase 7: AI room suggestions follow suggest+confirm pattern (pending_approval status)
- Phase 7: RoomAssignmentPanel has 3 view modes: participant | list | grid
- Phase 7: Room-centric data transformation for grid/list visualization
- Phase 7: VIP prioritization in room matching (VIP room type → accessible → standard)
- Phase 8: Dexie.js 4.x chosen as IndexedDB wrapper (ecosystem standard for React/TypeScript)
- Phase 8: 24-hour TTL for cached data to comply with Safari ITP
- Phase 8: Last-wins rule for duplicate check-ins (update timestamp on conflict)
- Phase 8: Store participants individually (not as array) to avoid UI blocking
- Phase 8: synced boolean and syncRetries number for sync tracking
- Phase 8: Use 0 instead of false for Dexie indexed boolean fields (IndexableType constraint)
- Phase 8: Budget alerts use two-tier thresholds (80% warning, 100% critical)
- Phase 8: BudgetAlertThreshold as const object (not enum) for erasableSyntaxOnly compatibility
- Phase 8: Separate budget_alert_history table for alert deduplication and acknowledgment tracking
- Phase 8: Trigger-based duplicate prevention - one unacknowledged alert per item+type
- Phase 8: Alert delivery tracking via sent_via field (app, whatsapp, or both)
- Phase 8: Rate limit: 10 requests/minute shared across all sync operations (localStorage tracking)
- Phase 8: Exponential backoff: 200ms base with 30% jitter, max 5s delay, 5 retry attempts
- Phase 8: Pending count badge only visible when offline (per CONTEXT.md)
- Phase 8: Connection status as toast notification (3s auto-hide), not persistent banner
- Phase 8: Auto-sync triggered by window 'online' event with 1s stability delay
- Phase 8: Offline-first pattern: IndexedDB write first, then sync if online
- Phase 8: Budget alerts use dual-channel delivery (in-app + WhatsApp)
- Phase 8: checkNow flag controls whether alerts trigger WhatsApp (prevents spam on read-only checks)
- Phase 8: useBudgetAlertCount as lightweight hook for badge-only UI (1min stale time)
- Phase 8: 5-minute polling interval for budget alerts (balances freshness with API quota)
- Phase 8: Undo check-in is online-only to prevent sync conflicts (safest approach)
- Phase 8: Check-in success shows "(ממתין לסנכרון)" suffix when offline
- Phase 8: Per-participant sync indicators skipped (expensive IndexedDB lookups, global count sufficient)
- Phase 8: setupAutoSync() called in main.tsx for app-wide initialization
- Phase 8: AI vendor analysis is on-demand (manager clicks "Analyze") not automatic
- Phase 8: Gemini prompts and responses in Hebrew for Israeli market
- Phase 8: Vendor alternatives include past event usage context ("You used X for Event Y")
- Phase 8: Budget alert badges show two-tier states (warning yellow, critical red)
- Phase 9: Append-only audit log: RLS policies only allow INSERT and SELECT (no UPDATE/DELETE)
- Phase 9: Three severity levels for simulation: critical (must fix), warning (recommended), info (suggestions)
- Phase 9: Eight issue categories: room, speaker, capacity, timing, equipment, vip, catering, backtoback
- Phase 9: Execution status lifecycle: suggested → approved → executed (or rejected/failed)
- Phase 9: Backup speaker tracking: backup_speaker_id + original_speaker_id on schedules table
- Phase 9: Supabase foreign key relationships return arrays - extract first element in transformers
- Phase 9: Validators are pure functions with deterministic IDs (hash of content, not random UUID)
- Phase 9: Parallel validator execution via Promise.all for performance
- Phase 9: Three-level deterministic sorting: severity > category > id
- Phase 9: date-fns areIntervalsOverlapping() with inclusive:false (back-to-back sessions OK)
- Phase 9: Unused vendors parameter in validateCateringGaps kept for API consistency
- Phase 9: Equipment validation uses placeholder empty assigned array (table doesn't exist yet)
- Phase 9: Promise.allSettled for parallel WhatsApp notifications (graceful failure handling)
- Phase 9: VIP-first notification sorting with personalized messages (first name prefix)
- Phase 9: Impact summary calculated twice: before suggestion (estimated) and after execution (actual)
- Phase 9: All notification attempts logged to messages table (sent/failed status with error_message)
- Phase 9: Hebrew-only notification messages for 5 contingency types (speaker, room, time, cancel, adjust)
- Phase 9: useSimulation hook uses direct supabase import from @/lib/supabase (no auth-helpers-react package)
- Phase 9: Smart section expansion - first non-empty severity section auto-expands for UX
- Phase 9: Three-state trigger button: Run / Running / Run Again with icon changes
- Phase 9: Critical issues warning banner shows recommendation but doesn't block (manager override allowed)
- Phase 9: Contingency hooks follow existing pattern: supabase from @/lib/supabase, user from useAuth()
- Phase 9: BackupSpeakerSelector shows preassigned backup first, then all speakers (excluding current)
- Phase 9: ContingencyConfirmDialog follows Phase 6 suggest+confirm pattern with Framer Motion
- Phase 9: ContingencyHistory uses render function for status icons (not dynamic component creation)
- Phase 9: ImpactPreview shows VIP warning banner only when VIPs affected
- Phase 9: ContingencyPanel provides full backup activation workflow with suggest/execute/reject
- Phase 9: Simulation tab added between seating and changes tabs for logical flow
- Phase 9: Drawer pattern (not modal) for contingency panel to maintain schedule context visibility
- Phase 9: Fix actions navigate to program tab with smooth scroll and 3s highlight ring
- Phase 9: Contingency button added to schedule list view alongside edit/delete actions
- Phase 9: Type assertion used for backup_speaker_id pending migration 009 application

### Blockers
None - all deployments complete! ✅

### Technical Notes
- Edge Function send-reminder deployed as v14 with template engine + all 8 handlers + throttle + retry
- All 8 cron jobs active and verified
- Deduplication uses `message_type` column (enum-based)
- Settings flags in events.settings JSONB control per-event reminder behavior
- message_templates table wired to send-reminder via getMessageTemplate()
- substituteVariables() handles {{var}} replacement with empty string fallback
- Test mode available: `body.mode === 'test'` sends single message to manager's phone
- push_subscriptions table created with RLS (3 policies)
- send-push-notification Edge Function deployed (RFC 8291 encryption, --no-verify-jwt)
- VAPID keys set as Supabase secrets
- AI chat types define 80+ action types (most not yet implemented)
- chatService.ts routes all conversations to Gemini except /help and skill triggers
- participant_rooms table + RoomAssignmentPanel.tsx exist for room management
- Program management tables exist: tracks, rooms, speakers, time_blocks
- Migration 006 ready: ai_insights_log table, btree_gist extension, no_room_overlap constraint, check_speaker_conflicts function
- Idempotent migration with validation queries - safe to run multiple times
- Migration 007 ready: networking_opt_in column, table_assignments table, track_statistics view
- table_assignments has RLS policies for multi-tenant isolation
- Migration 009 ready: contingency_audit_log table (append-only), backup_speaker_id columns, RLS policies
- contingency_audit_log has 5 indexes for query performance (event, status, time, type, composite)
- VIPBadge.tsx and useVIPSorting.ts created for VIP visual treatment
- VIP WhatsApp templates created in seed-vip-templates.sql
- Seating algorithm: O(n² × t) greedy with companion grouping and constraint satisfaction
- SeatingService provides 6 CRUD operations: fetch, save, saveAll, update, delete, deleteAll
- DndContext with @dnd-kit/core enables drag-drop seating plan UI
- SeatingPlanView: 3-column responsive grid with algorithm generation button
- TrackChip component: color-coded badges with xs/sm/md sizes and optional remove button
- TrackAssignmentBulk component: fixed bottom bar for bulk track operations
- useTrackAssignment hook: assignTracks, removeTrack, toggleTrack mutations with query invalidation
- RoomGridView: CSS grid layout (2-6 columns responsive) with VIP color coding
- RoomListView: filterable table (All/Assigned/Available) with status badges and VIP indicators
- ai-chat suggest_room_assignments tool logs to ai_insights_log with pending_approval
- TrackAssignmentBulk auto-hides when no selections (selectedParticipantIds.length === 0)
- Seating tab only loads confirmed participants (status='confirmed')
- VIP sorting applied to entire filtered list in GuestsPage
- Tab-specific data loading via useEffect on activeTab change pattern
- Dexie.js 4.3.0 and dexie-react-hooks 4.2.0 installed for IndexedDB
- IndexedDB schema: OfflineCheckIn (auto-increment ID, sync tracking) and CachedParticipant (24h TTL)
- src/modules/checkin/db: schema.ts, db.ts, operations.ts, index.ts
- CRUD operations: addOfflineCheckIn, getPendingCheckIns, markCheckInSynced, cacheParticipants, getCachedParticipants
- TTL pattern: expiresAt = cachedAt + PARTICIPANT_TTL_MS (24 hours)
- TypeScript verbatimModuleSyntax: use type-only imports (import { type ... })
- useOnlineStatus hook: navigator.onLine + window online/offline events for connection detection
- useSyncQueue hook: useLiveQuery from dexie-react-hooks for real-time pending count tracking
- syncService: Rate-limited sync with exponential backoff, max 5 retries per check-in
- useOfflineCheckIn hook: Write IndexedDB first, sync if online, optimistic TanStack Query updates
- ConnectionStatus component: Toast on connection change (3s auto-hide), pending badge only offline
- setupAutoSync() registers window 'online' listener for automatic background sync

### Completed Milestones
- v1.0: Automated Reminders (5 phases, 20 requirements, all complete — shipped 2026-02-02)

### Completed Phases (v1.0)
- Phase 1: Scheduler Infrastructure (4/4 plans complete)
- Phase 2: Reminder Types Implementation (4/4 plans complete)
- Phase 3: Dynamic Template System (2/2 plans complete)
- Phase 4: Manager Controls (audit-only, all pre-existing, 1 bug fixed)
- Phase 5: Reliability & Production Readiness (2/2 plans complete)

### Completed Plans (v2.0)
- Phase 6, Plan 1: Database foundation for AI write operations (06-01-SUMMARY.md)
- Phase 6, Plan 2: AI chat schedule management tools (06-02-SUMMARY.md)
- Phase 6, Plan 3: Execute AI action Edge Function (06-03-SUMMARY.md)
- Phase 6, Plan 4: Frontend confirmation UI (06-04-SUMMARY.md)
- Phase 7, Plan 1: Database foundation for networking & VIP (07-01-SUMMARY.md)
- Phase 7, Plan 2: VIP visual treatment components (07-02-SUMMARY.md)
- Phase 7, Plan 3: Track assignment UI (07-03-SUMMARY.md)
- Phase 7, Plan 4: Seating algorithm with drag-drop (07-04-SUMMARY.md)
- Phase 7, Plan 5: AI room assignments + grid/list views (07-05-SUMMARY.md)
- Phase 7, Plan 6: UI integration gap closure (07-06-SUMMARY.md)
- Phase 8, Plan 1: Database foundation for budget alerts (08-01-SUMMARY.md)
- Phase 8, Plan 2: Dexie.js IndexedDB setup (08-02-SUMMARY.md)
- Phase 8, Plan 3: Offline sync service and online status (08-03-SUMMARY.md)
- Phase 8, Plan 4: Budget threshold alert system (08-04-SUMMARY.md)
- Phase 8, Plan 5: AI vendor analysis and intelligence UI (08-05-SUMMARY.md)
- Phase 8, Plan 3: Offline sync service and online status (08-03-SUMMARY.md)
- Phase 8, Plan 4: Budget threshold alert system (08-04-SUMMARY.md)
- Phase 8, Plan 5: Vendor budget tracking UI (08-05-SUMMARY.md)
- Phase 8, Plan 6: Offline check-in UI integration (08-06-SUMMARY.md)
- Phase 9, Plan 1: Database & Types Foundation (09-01-SUMMARY.md)
- Phase 9, Plan 2: Simulation Validators & Engine (09-02-SUMMARY.md)
- Phase 9, Plan 3: Contingency Services (09-03-SUMMARY.md)
- Phase 9, Plan 4: Simulation UI & Hooks (09-04-SUMMARY.md)
- Phase 9, Plan 5: Contingency UI & Hooks (09-05-SUMMARY.md)
- Phase 9, Plan 6: EventDetailPage Integration (09-06-SUMMARY.md)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 001 | iOS PWA Push Notifications | 2026-01-30 | complete | [001-ios-pwa-push-notifications](./quick/001-ios-pwa-push-notifications/) |

## Session Continuity

Last session: 2026-02-03
Stopped at: Phase 9, Plan 6 complete - ALL PHASES COMPLETE ✅
Resume file: None

---
*State updated: 2026-02-03*
*Next: Run /gsd:audit-milestone to verify all requirements, then /gsd:complete-milestone to archive v2.0*
