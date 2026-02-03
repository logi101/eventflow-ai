# Phase 8: Offline & Vendor Intelligence - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers two distinct capabilities:
1. **Offline Check-in** — QR check-in that works without internet connection and syncs when connection returns
2. **Vendor Intelligence** — AI analysis of vendor quotes against budget with alternative suggestions

Check-in is the only offline feature (per v2.0 decision: "Offline mode only for check-in, not full app").

</domain>

<decisions>
## Implementation Decisions

### Offline Sync Behavior
- Automatic background sync when connection returns (no manual trigger needed)
- Sync respects existing reminder system rate limits (shared quota, prevent server overload)
- Local check-in data kept for 24 hours before requiring sync/cleanup
- Retry strategy: Claude's discretion

### Conflict Resolution
- Last-wins rule for duplicate check-ins (same participant on 2 offline devices)
- Silent resolution — no user notification when conflicts are resolved
- Check-in reversal (un-check-in): Claude's discretion on whether to allow offline or require online

### Offline/Online UX
- Connection status shown as toast on change (not persistent banner)
- Pending (unsynced) check-ins count visible only when offline
- Storage full handling: Claude's discretion
- Cold start offline (preloading participants): Claude's discretion

### Budget Alert Thresholds
- Two-tier alerts: 80% = warning (yellow), 100% = critical (red)
- Alerts appear both in-app (badge on vendor section) AND via WhatsApp to manager
- AI alternative suggestions: Claude's discretion (proactive vs on-demand)
- AI considers full comparison: price, rating, past event history, availability

### Claude's Discretion
- Sync retry strategy (silent retries, exponential backoff, etc.)
- Offline check-in visual treatment (pending badge vs no distinction)
- Check-in reversal behavior (offline vs online-only vs no reversal)
- Storage full handling strategy
- Participant list preloading/caching for cold start offline
- AI proactivity level for vendor suggestions

</decisions>

<specifics>
## Specific Ideas

- Check-in must work reliably in venue basements/parking lots with poor signal
- Budget alerts should feel urgent at 100% — manager needs to act
- Vendor suggestions should reference past event usage ("You used X vendor for Event Y with 4.5 rating")

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-offline-vendor-intelligence*
*Context gathered: 2026-02-03*
