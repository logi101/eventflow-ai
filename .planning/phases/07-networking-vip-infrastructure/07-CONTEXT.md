# Phase 7: Networking & VIP Infrastructure - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Manager can assign interest tracks to participants, generate intelligent table seating based on shared interests and diversity, and ensure VIP priority throughout the system. Includes room assignment suggestions via AI chat and dedicated UI.

**Requirements:** NETW-01 through NETW-06, VIP-01, VIP-02, ROOM-01 through ROOM-03

</domain>

<decisions>
## Implementation Decisions

### Track Assignment UI
- Both bulk and individual assignment methods available
  - Bulk: Select multiple participants → assign track to all
  - Individual: Open participant modal → toggle tracks on/off
- System provides default tracks + manager can create custom tracks per event
- Participants can belong to multiple tracks (no limit)
- Tracks displayed as color-coded tags/chips in participant lists
- Tracks can be imported from Excel via column (AI parses format automatically)
- Track names in whatever language they're written/imported
- Colors auto-assigned by system, manager can override if needed
- Track statistics summary dashboard showing distribution per track
- networking_opt_in default is configurable per event (manager chooses)
- Claude's Discretion: Default track names for new events

### Seating Algorithm Behavior
- Algorithm balances both shared interests AND diversity at each table
- VIPs spread across tables but get priority placement (best positions)
- Variable table sizes supported (different tables can have different capacities)
- Companions who came together sit together (relationship preserved)
- Claude's Discretion: Specific balancing algorithm implementation

### VIP Visual Treatment
- Subtle indicator (not bold/prominent)
- Diamond icon (💎) for VIP status
- VIPs sorted to top of participant lists by default
- Check-in shows VIP status to staff only (not visible to participant)
- Claude's Discretion: Exact color shade and badge styling

### Room Assignment Flow
- Both chat commands AND dedicated UI available for room assignments
- AI considers ALL criteria: VIP status, accessibility needs, bed preferences, companion grouping
- Room availability displayed in both grid (floor plan) AND list views (user can toggle)
- WhatsApp messages include full room details (room number, building, floor, check-in time) but ONLY for accommodation-related messages (check-in, departure reminders)
- Claude's Discretion: Grid layout implementation details

</decisions>

<specifics>
## Specific Ideas

- Track import should use AI to parse any format (comma, semicolon, etc.) - user said "AI will figure it out"
- Room details in WhatsApp only for relevant message types: sleeping arrangements, check-in, departure

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-networking-vip-infrastructure*
*Context gathered: 2026-02-03*
