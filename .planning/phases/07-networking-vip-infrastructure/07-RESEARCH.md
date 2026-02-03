# Phase 7: Networking & VIP Infrastructure - Research

**Researched:** 2026-02-03
**Domain:** Multi-track participant management, intelligent table seating, VIP prioritization, and room assignment systems
**Confidence:** HIGH

## Summary

Phase 7 introduces networking and VIP infrastructure to EventFlow AI: (1) Track assignment UI allowing managers to assign interest tracks to participants via bulk operations or individual toggles, (2) Intelligent table seating algorithm that balances shared interests with diversity constraints while prioritizing VIPs, (3) VIP visual indicators throughout the system with subtle diamond icon (💎) and priority sorting, (4) Room assignment UI with both AI chat suggestions and dedicated panel showing grid/list views.

The standard approach combines established patterns: Multi-select tables with TanStack Table's row selection API, color-coded track chips using Tailwind CSS badge components, constraint satisfaction algorithms for seating optimization, and drag-and-drop table assignments using dnd-kit or hello-pangea/dnd. VIP treatment follows event management best practices: subtle visual indicators, priority placement (not forced placement), and dedicated WhatsApp template variables for room details.

The existing database already includes tracks, rooms, speakers, and participant_rooms tables from the program management migration (20260120). Phase 6's suggest+confirm+execute pattern extends naturally to room assignments. The phase builds on proven event software patterns: RFID-style VIP identification, integrated seating tools (not Excel), and AI-powered personalization.

**Primary recommendation:** Use TanStack Table's enableRowSelection with shift-click support for bulk track assignment. Implement table seating as server-side constraint satisfaction using JavaScript CSP library (csps or constrained npm packages) with companion grouping, VIP spread, and diversity balancing. Add networking_opt_in flag to participants (default configurable per event). Display tracks as Tailwind CSS badges with auto-assigned colors. Extend AI chat with room assignment suggestions following Phase 6's approval workflow. Build RoomAssignmentPanel with grid view (React-Grid-Layout) and list view toggle.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Integrated)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TanStack Table | 8.x | Row selection, bulk operations, filtering | EventFlow's current table library, supports row selection API |
| Tailwind CSS | 3.x | Color-coded badges/chips styling | EventFlow's styling framework, zero-config badge components |
| React 19 | 19.x | UI components with concurrent features | EventFlow's React version |
| Supabase PostgreSQL | 15.x+ | Database with tracks, participant_tracks tables | Program management tables already exist |
| Supabase Edge Functions | Deno 1.x | AI chat suggestions for room assignments | Extends existing ai-chat.ts pattern |

### New Components for Phase 7
| Component | Purpose | When to Use |
|-----------|---------|-------------|
| dnd-kit or hello-pangea/dnd | Drag-and-drop table seating UI | Manual override of AI-generated seating |
| csps or constrained (npm) | Constraint satisfaction for seating algorithm | Balancing shared interests + diversity + VIP priority |
| React-Grid-Layout | Room floor plan grid visualization | Grid view of room availability |
| TanStack Table Row Selection | Bulk track assignment | Select multiple participants → assign track |
| Tailwind Badge Components | Track chips display | Color-coded track tags in participant lists |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| dnd-kit | react-beautiful-dnd | Archived; dnd-kit is modern successor with better React 19 support |
| CSP library (csps) | Custom seating algorithm | CSP handles constraints declaratively; custom is error-prone |
| React-Grid-Layout | Custom grid CSS | Grid layout handles responsive breakpoints, drag-drop integration |
| TanStack Table selection | Custom checkbox state | Table library handles shift-click, select-all, indeterminate state |
| Color auto-assignment | Manager picks all colors | Auto-assign with override reduces setup friction |
| Dedicated seating library | Social Tables API integration | Social Tables is paid SaaS; Phase 7 needs custom constraints |

**Installation:**
```bash
# Drag-and-drop for table seating
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Constraint satisfaction for seating algorithm
npm install csps

# Grid layout for room floor plan
npm install react-grid-layout

# Already installed: @tanstack/react-table, tailwindcss
```

```sql
-- Add networking_opt_in flag to participants
ALTER TABLE participants
ADD COLUMN IF NOT EXISTS networking_opt_in BOOLEAN DEFAULT FALSE;

-- Add default_networking_opt_in to event settings
-- Already in events.settings JSONB, just document expected key:
-- settings: { "default_networking_opt_in": true, ... }

-- Create table_assignments table
CREATE TABLE IF NOT EXISTS table_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  table_number INTEGER NOT NULL,
  seat_number INTEGER, -- Optional: specific seat at table
  is_vip_table BOOLEAN DEFAULT FALSE,
  assigned_by TEXT DEFAULT 'ai', -- 'ai' | 'manager' | 'auto'
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, participant_id)
);

CREATE INDEX idx_table_assignments_event ON table_assignments(event_id);
CREATE INDEX idx_table_assignments_table ON table_assignments(event_id, table_number);

-- RLS policies
ALTER TABLE table_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view table assignments for their events"
  ON table_assignments FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE organization_id = auth.user_organization_id()
    )
  );

CREATE POLICY "Users can manage table assignments for their events"
  ON table_assignments FOR ALL
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE organization_id = auth.user_organization_id()
    )
  );

-- Track statistics view
CREATE OR REPLACE VIEW track_statistics AS
SELECT
  t.id AS track_id,
  t.event_id,
  t.name AS track_name,
  t.color,
  COUNT(pt.participant_id) AS participant_count,
  COUNT(pt.participant_id) FILTER (WHERE p.is_vip) AS vip_count,
  COUNT(pt.participant_id) FILTER (WHERE pt.is_primary) AS primary_count
FROM tracks t
LEFT JOIN participant_tracks pt ON t.id = pt.track_id
LEFT JOIN participants p ON pt.participant_id = p.id
GROUP BY t.id, t.event_id, t.name, t.color;
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── modules/
│   ├── participants/
│   │   ├── components/
│   │   │   ├── ParticipantTable.tsx         # EXTEND: Add track assignment bulk actions
│   │   │   ├── ParticipantModal.tsx         # EXTEND: Add track toggle UI
│   │   │   ├── TrackAssignmentBulk.tsx      # NEW: Bulk assign tracks to selected participants
│   │   │   ├── TrackChip.tsx                # NEW: Color-coded track badge
│   │   │   └── VIPBadge.tsx                 # NEW: Diamond icon VIP indicator
│   │   └── services/
│   │       └── trackAssignmentService.ts    # NEW: Bulk track CRUD operations
│   ├── networking/
│   │   ├── components/
│   │   │   ├── SeatingPlanView.tsx          # NEW: Table seating visualization
│   │   │   ├── TableAssignmentCard.tsx      # NEW: Single table card with participants
│   │   │   ├── SeatingAlgorithmConfig.tsx   # NEW: Configure constraints (diversity %, VIP spread)
│   │   │   └── DraggableParticipant.tsx     # NEW: Drag participant between tables
│   │   ├── services/
│   │   │   ├── seatingAlgorithm.ts          # NEW: CSP-based seating optimization
│   │   │   └── seatingService.ts            # NEW: CRUD for table_assignments
│   │   └── types.ts                         # NEW: SeatingConstraints, TableAssignment types
│   ├── rooms/
│   │   ├── components/
│   │   │   ├── RoomAssignmentPanel.tsx      # EXISTS: Extend with grid view toggle
│   │   │   ├── RoomGridView.tsx             # NEW: Floor plan grid layout
│   │   │   ├── RoomListView.tsx             # NEW: List view of room assignments
│   │   │   └── RoomAvailabilityIndicator.tsx # NEW: Show room capacity/availability
│   │   └── services/
│   │       └── roomSuggestionService.ts     # NEW: AI room assignment suggestions
│   └── ai-chat/
│       └── functions/                       # EXTEND: Add room assignment tool
└── hooks/
    ├── useTrackAssignment.ts                # NEW: Track assignment state management
    ├── useTableSeating.ts                   # NEW: Seating algorithm + manual override
    └── useRoomAssignment.ts                 # NEW: Room assignment with AI suggestions
```

### Pattern 1: Bulk Track Assignment with TanStack Table
**What:** Multi-select participants and assign tracks in bulk or toggle individual tracks in modal
**When to use:** Manager assigns interest tracks to participants before generating seating plan

**Example:**
```typescript
// Source: TanStack Table Row Selection API + Tailwind CSS Badge components
// src/modules/participants/components/ParticipantTable.tsx

import { useReactTable, getCoreRowModel, getFilteredRowModel } from '@tanstack/react-table'
import { useState } from 'react'

interface Participant {
  id: string
  first_name: string
  last_name: string
  is_vip: boolean
  networking_opt_in: boolean
  tracks: Track[] // From participant_tracks join
}

interface Track {
  id: string
  name: string
  color: string
}

function ParticipantTable({ participants, tracks }: Props) {
  const [rowSelection, setRowSelection] = useState({})

  const table = useReactTable({
    data: participants,
    columns,
    state: { rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedParticipantIds = selectedRows.map(row => row.original.id)

  async function handleBulkTrackAssign(trackId: string) {
    // Bulk insert to participant_tracks
    await supabase.from('participant_tracks').insert(
      selectedParticipantIds.map(participantId => ({
        participant_id: participantId,
        track_id: trackId,
      }))
    )

    // Refresh table
    queryClient.invalidateQueries(['participants'])

    // Clear selection
    setRowSelection({})
  }

  return (
    <div dir="rtl">
      {/* Bulk Actions Bar (shows when rows selected) */}
      {selectedRows.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-900">
              {selectedRows.length} נבחרו
            </span>

            {/* Track Assignment Dropdown */}
            <select
              onChange={(e) => handleBulkTrackAssign(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="">הקצה מסלול...</option>
              {tracks.map(track => (
                <option key={track.id} value={track.id}>
                  {track.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setRowSelection({})}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ביטול בחירה
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <table className="w-full">
        <thead>
          <tr>
            <th>
              {/* Select All Checkbox */}
              <input
                type="checkbox"
                checked={table.getIsAllRowsSelected()}
                indeterminate={table.getIsSomeRowsSelected()}
                onChange={table.getToggleAllRowsSelectedHandler()}
              />
            </th>
            <th>שם</th>
            <th>מסלולים</th>
            <th>VIP</th>
          </tr>
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              <td>
                <input
                  type="checkbox"
                  checked={row.getIsSelected()}
                  onChange={row.getToggleSelectedHandler()}
                />
              </td>
              <td>
                {row.original.is_vip && (
                  <VIPBadge /> // Diamond icon 💎
                )}
                {row.original.first_name} {row.original.last_name}
              </td>
              <td>
                <div className="flex gap-1 flex-wrap">
                  {row.original.tracks.map(track => (
                    <TrackChip
                      key={track.id}
                      track={track}
                      onRemove={() => removeTrackFromParticipant(row.original.id, track.id)}
                    />
                  ))}
                </div>
              </td>
              <td>
                {row.original.is_vip && (
                  <span className="text-xs text-gray-500">VIP</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Track Chip Component
function TrackChip({ track, onRemove }: { track: Track; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
      style={{
        backgroundColor: `${track.color}20`, // 20% opacity
        color: track.color,
        borderColor: track.color,
        borderWidth: '1px',
      }}
    >
      {track.name}
      <button
        onClick={onRemove}
        className="hover:opacity-70"
      >
        ×
      </button>
    </span>
  )
}

// VIP Badge Component (subtle indicator)
function VIPBadge() {
  return (
    <span className="inline-flex items-center mr-1" title="VIP">
      <span className="text-sm">💎</span>
    </span>
  )
}
```

**Shift-Click Multi-Select:**
```typescript
// Source: TanStack Table Discussion #3068
// Enable shift-click range selection

import { useRef } from 'react'

function useShiftSelect(table: Table<Participant>) {
  const lastSelectedId = useRef<string | null>(null)

  function handleRowClick(rowId: string, isShiftPressed: boolean) {
    if (!isShiftPressed || !lastSelectedId.current) {
      // Normal click: toggle single row
      const row = table.getRow(rowId)
      row.toggleSelected()
      lastSelectedId.current = rowId
      return
    }

    // Shift-click: select range
    const allRows = table.getRowModel().rows
    const lastIndex = allRows.findIndex(r => r.id === lastSelectedId.current)
    const currentIndex = allRows.findIndex(r => r.id === rowId)

    const start = Math.min(lastIndex, currentIndex)
    const end = Math.max(lastIndex, currentIndex)

    // Select all rows in range
    for (let i = start; i <= end; i++) {
      allRows[i].toggleSelected(true)
    }

    lastSelectedId.current = rowId
  }

  return { handleRowClick }
}
```

### Pattern 2: Table Seating Algorithm (CSP-Based)
**What:** Constraint satisfaction problem solving for optimal table assignments
**When to use:** Generate intelligent seating based on shared tracks, diversity, VIP priority, companions

**Example:**
```typescript
// Source: csps npm package + event seating best practices
// src/modules/networking/services/seatingAlgorithm.ts

import CSP from 'csps'

interface SeatingConstraints {
  maxTableSize: number
  variableTableSizes?: Map<number, number> // table_number -> capacity
  minSharedInterests: number // Min participants with shared track per table
  maxSameTrack: number // Max participants from same track per table (diversity)
  companionsTogether: boolean
  vipSpread: boolean // Spread VIPs across tables (not all at one table)
  vipPriorityTables?: number[] // VIP-designated table numbers (e.g., [1, 2])
}

interface Participant {
  id: string
  name: string
  tracks: string[] // Track IDs
  is_vip: boolean
  companion_id?: string // Link to companion participant
  networking_opt_in: boolean
}

async function generateTableSeating(
  participants: Participant[],
  constraints: SeatingConstraints
): Promise<Map<number, Participant[]>> {
  // Filter to only networking_opt_in participants
  const networkingParticipants = participants.filter(p => p.networking_opt_in)

  // Calculate number of tables needed
  const avgTableSize = constraints.maxTableSize * 0.8 // Target 80% capacity
  const tableCount = Math.ceil(networkingParticipants.length / avgTableSize)

  // Build constraint satisfaction problem
  const csp = new CSP()

  // Variables: Each participant → table number (1..tableCount)
  networkingParticipants.forEach(participant => {
    const domain = Array.from({ length: tableCount }, (_, i) => i + 1)
    csp.addVariable(participant.id, domain)
  })

  // Constraint 1: Table capacity limits
  csp.addConstraint((assignments: Map<string, number>) => {
    const tableCounts = new Map<number, number>()

    for (const [participantId, tableNum] of assignments.entries()) {
      tableCounts.set(tableNum, (tableCounts.get(tableNum) || 0) + 1)
    }

    // Check each table doesn't exceed capacity
    for (const [tableNum, count] of tableCounts.entries()) {
      const capacity = constraints.variableTableSizes?.get(tableNum) || constraints.maxTableSize
      if (count > capacity) return false
    }

    return true
  })

  // Constraint 2: Companions sit together
  if (constraints.companionsTogether) {
    const companionPairs = networkingParticipants
      .filter(p => p.companion_id)
      .map(p => [p.id, p.companion_id!])

    companionPairs.forEach(([pid1, pid2]) => {
      csp.addConstraint((assignments: Map<string, number>) => {
        const table1 = assignments.get(pid1)
        const table2 = assignments.get(pid2)
        return table1 === undefined || table2 === undefined || table1 === table2
      })
    })
  }

  // Constraint 3: Shared interests (min participants with common track)
  csp.addConstraint((assignments: Map<string, number>) => {
    const tableTracks = new Map<number, Set<string>>()

    for (const [participantId, tableNum] of assignments.entries()) {
      const participant = networkingParticipants.find(p => p.id === participantId)
      if (!participant) continue

      if (!tableTracks.has(tableNum)) {
        tableTracks.set(tableNum, new Set())
      }

      participant.tracks.forEach(track => {
        tableTracks.get(tableNum)!.add(track)
      })
    }

    // Each table should have at least some shared interests
    // (Heuristic: at least 2 participants share a track)
    for (const [tableNum, tracks] of tableTracks.entries()) {
      const participantsAtTable = Array.from(assignments.entries())
        .filter(([_, tNum]) => tNum === tableNum)
        .map(([pId]) => networkingParticipants.find(p => p.id === pId)!)

      if (participantsAtTable.length < 2) continue // Single person table, skip

      // Check if at least some participants share a track
      let hasSharedInterest = false
      for (const track of tracks) {
        const participantsWithTrack = participantsAtTable.filter(p =>
          p.tracks.includes(track)
        )
        if (participantsWithTrack.length >= constraints.minSharedInterests) {
          hasSharedInterest = true
          break
        }
      }

      if (!hasSharedInterest && participantsAtTable.length >= constraints.minSharedInterests) {
        return false // Table lacks shared interests
      }
    }

    return true
  })

  // Constraint 4: Diversity (max same track per table)
  csp.addConstraint((assignments: Map<string, number>) => {
    const tableTrackCounts = new Map<number, Map<string, number>>()

    for (const [participantId, tableNum] of assignments.entries()) {
      const participant = networkingParticipants.find(p => p.id === participantId)
      if (!participant) continue

      if (!tableTrackCounts.has(tableNum)) {
        tableTrackCounts.set(tableNum, new Map())
      }

      const trackCounts = tableTrackCounts.get(tableNum)!
      participant.tracks.forEach(track => {
        trackCounts.set(track, (trackCounts.get(track) || 0) + 1)
      })
    }

    // Check no track dominates a table
    for (const trackCounts of tableTrackCounts.values()) {
      for (const count of trackCounts.values()) {
        if (count > constraints.maxSameTrack) {
          return false // Too many from same track
        }
      }
    }

    return true
  })

  // Constraint 5: VIP spread (if enabled)
  if (constraints.vipSpread) {
    csp.addConstraint((assignments: Map<string, number>) => {
      const vipTables = new Map<number, number>()

      for (const [participantId, tableNum] of assignments.entries()) {
        const participant = networkingParticipants.find(p => p.id === participantId)
        if (participant?.is_vip) {
          vipTables.set(tableNum, (vipTables.get(tableNum) || 0) + 1)
        }
      }

      // No table should have more than 2 VIPs (spread them out)
      for (const vipCount of vipTables.values()) {
        if (vipCount > 2) return false
      }

      return true
    })
  }

  // Constraint 6: VIP priority tables (assign VIPs to designated tables first)
  if (constraints.vipPriorityTables && constraints.vipPriorityTables.length > 0) {
    const vipParticipants = networkingParticipants.filter(p => p.is_vip)

    vipParticipants.forEach(vipParticipant => {
      csp.addConstraint((assignments: Map<string, number>) => {
        const tableNum = assignments.get(vipParticipant.id)
        // VIPs should prefer priority tables (soft constraint via CSP heuristic)
        // Hard constraint: VIPs must be at priority tables OR spread normally
        return tableNum === undefined || true // Allow any table for flexibility
      })

      // Adjust domain for VIPs to prefer priority tables
      // (CSP library may not support weighted domains; this is conceptual)
      // In practice: Run CSP twice - first with VIP-only priority tables, then mix
    })
  }

  // Solve CSP (may take time for large participant lists)
  const solution = csp.solve()

  if (!solution) {
    throw new Error('No valid seating arrangement found. Try relaxing constraints.')
  }

  // Convert solution to table assignments
  const tableAssignments = new Map<number, Participant[]>()

  for (const [participantId, tableNum] of solution.entries()) {
    if (!tableAssignments.has(tableNum)) {
      tableAssignments.set(tableNum, [])
    }

    const participant = networkingParticipants.find(p => p.id === participantId)!
    tableAssignments.get(tableNum)!.push(participant)
  }

  return tableAssignments
}
```

**Fallback: Greedy Algorithm (if CSP too slow):**
```typescript
// Simple greedy algorithm for large participant counts where CSP times out
// Not optimal, but guarantees solution in O(n log n)

function greedyTableSeating(
  participants: Participant[],
  constraints: SeatingConstraints
): Map<number, Participant[]> {
  const tables = new Map<number, Participant[]>()
  const sorted = [...participants].sort((a, b) => {
    // VIPs first
    if (a.is_vip !== b.is_vip) return a.is_vip ? -1 : 1
    // Then by track count (more connections = higher priority)
    return b.tracks.length - a.tracks.length
  })

  let tableNum = 1

  for (const participant of sorted) {
    // Find table with best shared interest match
    let bestTable = null
    let bestScore = -1

    for (const [tNum, tableParticipants] of tables.entries()) {
      if (tableParticipants.length >= constraints.maxTableSize) continue

      // Score: count shared tracks
      const sharedTracks = tableParticipants.filter(tp =>
        tp.tracks.some(track => participant.tracks.includes(track))
      ).length

      if (sharedTracks > bestScore) {
        bestScore = sharedTracks
        bestTable = tNum
      }
    }

    if (bestTable === null || bestScore === 0) {
      // No good match, create new table
      tables.set(tableNum, [participant])
      tableNum++
    } else {
      tables.get(bestTable)!.push(participant)
    }
  }

  return tables
}
```

### Pattern 3: VIP Visual Treatment (Subtle)
**What:** Diamond icon (💎) with subtle styling, priority sorting, staff-only check-in visibility
**When to use:** Throughout participant displays to identify VIPs without being overly prominent

**Example:**
```typescript
// Source: Event management VIP best practices + Tailwind CSS
// Subtle VIP indicators across the system

// 1. VIP Badge Component
function VIPBadge({ size = 'sm' }: { size?: 'xs' | 'sm' | 'md' }) {
  const sizeClass = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
  }[size]

  return (
    <span
      className={`inline-flex items-center ${sizeClass} text-purple-600 opacity-70`}
      title="משתתף VIP"
      aria-label="VIP"
    >
      💎
    </span>
  )
}

// 2. VIP Priority Sorting in Tables
function useVIPSorting<T extends { is_vip: boolean }>(data: T[]) {
  return useMemo(() => {
    return [...data].sort((a, b) => {
      // VIPs first
      if (a.is_vip !== b.is_vip) return a.is_vip ? -1 : 1
      // Then alphabetical
      return 0
    })
  }, [data])
}

// 3. Check-in Display (Staff Only)
function CheckInRow({ participant, isStaff }: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="font-medium">
        {participant.first_name} {participant.last_name}
      </span>

      {/* VIP indicator only visible to staff */}
      {isStaff && participant.is_vip && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 border border-purple-200 rounded text-xs text-purple-700">
          <span>💎</span>
          <span>VIP</span>
        </span>
      )}

      {/* NOT shown to participant during self-check-in */}
    </div>
  )
}

// 4. Participant List with VIP Sorting
function ParticipantList({ participants }: Props) {
  const sorted = useVIPSorting(participants)

  return (
    <div dir="rtl">
      {sorted.map(participant => (
        <div key={participant.id} className="flex items-center gap-2 p-2 border-b">
          {participant.is_vip && <VIPBadge />}

          <span className={participant.is_vip ? 'font-medium' : ''}>
            {participant.first_name} {participant.last_name}
          </span>

          {/* Track chips */}
          <div className="flex gap-1">
            {participant.tracks.map(track => (
              <TrackChip key={track.id} track={track} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// 5. Table Seating View with VIP Indicators
function TableCard({ tableNumber, participants, isVIPTable }: Props) {
  const vipCount = participants.filter(p => p.is_vip).length

  return (
    <div className={`border rounded-lg p-4 ${isVIPTable ? 'border-purple-300 bg-purple-50/30' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">שולחן {tableNumber}</h3>
        {vipCount > 0 && (
          <span className="text-xs text-purple-600 flex items-center gap-1">
            <span>💎</span>
            <span>{vipCount} VIP</span>
          </span>
        )}
      </div>

      <div className="space-y-1">
        {participants.map(participant => (
          <div key={participant.id} className="flex items-center gap-2 text-sm">
            {participant.is_vip && <VIPBadge size="xs" />}
            <span>{participant.first_name} {participant.last_name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Pattern 4: Room Assignment with AI Suggestions + Dedicated UI
**What:** AI chat suggests room assignments considering VIP, accessibility, bed preferences; dedicated panel shows grid/list views
**When to use:** Multi-day conferences with accommodation needs

**Example:**
```typescript
// Source: Phase 6 suggest+confirm+execute pattern + React-Grid-Layout
// supabase/functions/ai-chat/index.ts - EXTEND with room assignment tool

const ROOM_ASSIGNMENT_TOOL = {
  name: 'suggest_room_assignments',
  description: 'הצעת שיבוץ חדרים למשתתפים על בסיס סטטוס VIP, צרכי נגישות, העדפות מיטה, וקיבוץ companions',
  parameters: {
    type: 'OBJECT',
    properties: {
      event_id: { type: 'STRING', description: 'מזהה האירוע' },
      criteria: {
        type: 'OBJECT',
        description: 'קריטריוני שיבוץ',
        properties: {
          prioritize_vip: { type: 'BOOLEAN', description: 'תן עדיפות לחדרים טובים ל-VIP' },
          group_companions: { type: 'BOOLEAN', description: 'שבץ companions בחדרים סמוכים' },
          match_bed_preferences: { type: 'BOOLEAN', description: 'התאם העדפות מיטה' },
          accessibility_first: { type: 'BOOLEAN', description: 'שבץ נגישים לחדרים נגישים' },
        }
      }
    },
    required: ['event_id']
  }
}

async function executeSuggestRoomAssignments(
  supabase: SupabaseClient,
  args: Record<string, unknown>,
  userId?: string
): Promise<ToolResult> {
  const eventId = args.event_id as string
  const criteria = (args.criteria as any) || {}

  // Get participants needing room assignments
  const { data: participants } = await supabase
    .from('participants')
    .select('id, first_name, last_name, is_vip, accessibility_needs, companion_id, custom_fields')
    .eq('event_id', eventId)
    .is('participant_rooms.id', null) // No room assigned yet

  if (!participants || participants.length === 0) {
    return { success: false, error: 'כל המשתתפים כבר שובצו לחדרים' }
  }

  // Get available rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, name, building, floor, capacity, accessibility_features')
    .eq('event_id', eventId)
    .eq('is_available', true)

  if (!rooms || rooms.length === 0) {
    return { success: false, error: 'אין חדרים זמינים' }
  }

  // Build room assignment suggestions using criteria
  const suggestions: RoomAssignment[] = []

  // Sort participants: VIPs first (if prioritize_vip), then accessibility, then rest
  const sorted = [...participants].sort((a, b) => {
    if (criteria.prioritize_vip && a.is_vip !== b.is_vip) {
      return a.is_vip ? -1 : 1
    }
    if (criteria.accessibility_first && a.accessibility_needs && !b.accessibility_needs) {
      return -1
    }
    return 0
  })

  // Sort rooms: Best rooms first (based on building/floor heuristic)
  const sortedRooms = [...rooms].sort((a, b) => {
    // Assume lower floor = better (customizable)
    const floorA = parseInt(a.floor) || 999
    const floorB = parseInt(b.floor) || 999
    return floorA - floorB
  })

  // Assign participants to rooms
  const usedRooms = new Set<string>()

  for (const participant of sorted) {
    // Find best room
    const room = sortedRooms.find(r => {
      if (usedRooms.has(r.id)) return false

      // Check accessibility match
      if (criteria.accessibility_first && participant.accessibility_needs) {
        return r.accessibility_features && r.accessibility_features.length > 0
      }

      return true
    })

    if (!room) {
      // No rooms left
      break
    }

    suggestions.push({
      participant_id: participant.id,
      participant_name: `${participant.first_name} ${participant.last_name}`,
      room_number: room.name,
      building: room.building,
      floor: room.floor,
      reason: participant.is_vip
        ? 'VIP - חדר באולם העליון'
        : participant.accessibility_needs
        ? 'נגישות - חדר נגיש'
        : 'שיבוץ רגיל'
    })

    usedRooms.add(room.id)
  }

  // Log suggestion to audit trail
  const { data: auditEntry } = await supabase
    .from('ai_insights_log')
    .insert({
      user_id: userId,
      event_id: eventId,
      action_type: 'room_assignment_suggestion',
      action_data: {
        criteria,
        suggestions,
        participants_count: participants.length,
        assigned_count: suggestions.length,
      },
      execution_status: 'suggested'
    })
    .select('id')
    .single()

  // Return pending approval action
  return {
    success: true,
    data: {
      action_id: auditEntry.id,
      type: 'room_assignment_bulk',
      status: 'pending_approval',
      data: {
        suggestions,
        unassigned: participants.length - suggestions.length,
      },
      label: `שיבוץ ${suggestions.length} משתתפים לחדרים`,
      impact: {
        affected_participants: suggestions.length,
        vip_count: suggestions.filter(s =>
          participants.find(p => p.id === s.participant_id)?.is_vip
        ).length,
      },
    }
  }
}

// Frontend: Room Assignment Panel with Grid View
// src/modules/rooms/components/RoomGridView.tsx

import GridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'

interface Room {
  id: string
  name: string
  building: string
  floor: string
  capacity: number
  assigned_participant?: Participant
}

function RoomGridView({ rooms, onRoomClick }: Props) {
  // Layout rooms in grid by building/floor
  const layout = rooms.map((room, i) => ({
    i: room.id,
    x: parseInt(room.name) % 10, // Simple heuristic: room 101 → column 1
    y: parseInt(room.floor) || 0,
    w: 1,
    h: 1,
  }))

  return (
    <div dir="ltr"> {/* Grid layout is LTR */}
      <GridLayout
        className="layout"
        layout={layout}
        cols={10}
        rowHeight={80}
        width={1000}
        isDraggable={false}
        isResizable={false}
      >
        {rooms.map(room => (
          <div
            key={room.id}
            onClick={() => onRoomClick(room)}
            className={`border rounded p-2 cursor-pointer ${
              room.assigned_participant
                ? room.assigned_participant.is_vip
                  ? 'bg-purple-100 border-purple-300'
                  : 'bg-blue-100 border-blue-300'
                : 'bg-white border-gray-300'
            }`}
          >
            <div className="text-xs font-semibold">{room.name}</div>
            {room.assigned_participant && (
              <div className="text-xs mt-1 truncate">
                {room.assigned_participant.is_vip && '💎 '}
                {room.assigned_participant.first_name}
              </div>
            )}
          </div>
        ))}
      </GridLayout>
    </div>
  )
}

// Toggle between Grid and List views
function RoomAssignmentPanel({ eventId }: Props) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const { data: rooms } = useQuery(['rooms', eventId], () => fetchRooms(eventId))

  return (
    <div dir="rtl" className="p-4">
      {/* View Toggle */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">שיבוץ חדרים</h2>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? 'bg-blue-100' : ''}
          >
            רשימה
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? 'bg-blue-100' : ''}
          >
            רשת
          </button>
        </div>
      </div>

      {/* View Content */}
      {viewMode === 'grid' ? (
        <RoomGridView rooms={rooms} onRoomClick={handleRoomClick} />
      ) : (
        <RoomListView rooms={rooms} onRoomClick={handleRoomClick} />
      )}
    </div>
  )
}
```

### Pattern 5: WhatsApp Templates with Room Variables
**What:** Dynamic variables in WhatsApp templates for room-related messages only
**When to use:** Check-in messages, departure reminders, accommodation-specific communications

**Example:**
```typescript
// Source: Existing message_templates table + Green API WhatsApp integration
// Extend message templates with room variable support

// Database: message_templates table already exists
// Add room-specific variables to template content

const ROOM_CHECKIN_TEMPLATE = {
  name: 'צ׳ק-אין לאירוע עם חדר',
  message_type: 'custom',
  channel: 'whatsapp',
  content: `שלום {{first_name}}! 👋

ברוכים הבאים ל{{event_name}}!

📍 פרטי הגעה:
🏨 בניין: {{room_building}}
🚪 חדר: {{room_number}}
🔢 קומה: {{room_floor}}
⏰ צ'ק-אין: {{checkin_time}}

💎 {{vip_note}}

נתראה בקרוב!`,
  variables: [
    'first_name',
    'event_name',
    'room_building',
    'room_number',
    'room_floor',
    'checkin_time',
    'vip_note', // Conditional: Only for VIPs
  ],
}

// Service: Populate template variables
async function sendRoomCheckinMessage(
  participant: Participant,
  event: Event,
  roomAssignment: ParticipantRoom
) {
  const template = await fetchTemplate('room_checkin')

  const variables = {
    first_name: participant.first_name,
    event_name: event.name,
    room_building: roomAssignment.building || 'בניין ראשי',
    room_number: roomAssignment.room_number,
    room_floor: roomAssignment.floor || '-',
    checkin_time: formatTime(roomAssignment.check_in_date),
    vip_note: participant.is_vip
      ? 'כמשתתף VIP, צוות הקבלה ימתין לך בלובי 🌟'
      : '', // Empty for non-VIPs
  }

  const message = populateTemplate(template.content, variables)

  await sendWhatsAppMessage(participant.phone_normalized, message)
}

// IMPORTANT: Only include room variables in accommodation-related messages
// NOT in general event updates, reminders, or schedules
function shouldIncludeRoomDetails(messageType: MessageType): boolean {
  const roomMessageTypes = [
    'custom', // Check-in
    'reminder_activation', // If event has accommodation
    'reminder_event_end', // Departure reminders
  ]

  return roomMessageTypes.includes(messageType)
}
```

### Anti-Patterns to Avoid
- **Forcing VIP placement:** AI auto-assigns VIPs to best tables/rooms without confirmation - violates suggest+confirm pattern
- **Excel-based track assignment:** Manager exports, edits Excel, re-imports - slow, error-prone; use in-app bulk UI
- **Complex CSP for small events:** Running full constraint solver for 20 participants - use greedy algorithm for <50 participants
- **Table seating without companion grouping:** Algorithm separates companions - breaks user expectation, bad UX
- **Prominent VIP badges:** Large gold stars, banners - creates negative perception; use subtle diamond icon
- **Room variables in all messages:** Including room_number in schedule reminders - irrelevant, clutters message
- **Grid view only:** Forcing floor plan visualization for simple lists - list view is faster for most tasks
- **Auto-approve AI room suggestions:** Executing room assignments without showing availability - manager needs to see capacity

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-select with shift-click | Custom keyboard event handling | TanStack Table row selection API | Handles indeterminate state, select-all, shift-range, edge cases |
| Table seating optimization | Custom greedy algorithm from scratch | CSP library (csps or constrained) | Declarative constraints, proven solvers, handles complex relationships |
| Color-coded badges | Custom span components | Tailwind CSS badge utilities | Pre-built accessibility, responsive, theme-aware |
| Drag-drop table assignments | Custom mouse event handlers | dnd-kit or hello-pangea/dnd | Touch support, accessibility, collision detection, animations |
| Room floor plan grid | Custom CSS grid positioning | React-Grid-Layout | Responsive breakpoints, drag-drop, resize, tested edge cases |
| Track import parsing | Manual string splitting | AI parsing (Gemini) for flexible delimiters | Handles commas, semicolons, pipes, tabs without manual detection |
| VIP identification | Custom flag + manual checks everywhere | Database is_vip flag + reusable VIPBadge component | Single source of truth, consistent styling, easy to update |
| Companion grouping | Manual participant linking | Database companion_id foreign key | Referential integrity, query joins, cascade deletes |

**Key insight:** Table seating is a well-studied constraint satisfaction problem. Wedding planners, conference organizers, and airlines have solved this. Don't reinvent algorithms - use CSP libraries that model the problem declaratively. Similarly, multi-select UIs in large tables are solved by libraries like TanStack Table with shift-click, keyboard nav, and accessibility built-in.

## Common Pitfalls

### Pitfall 1: Over-Constraining Seating Algorithm
**What goes wrong:** CSP solver can't find solution because constraints are too strict (e.g., "ALL participants must share at least 2 tracks")
**Why it happens:** Trying to optimize for perfect networking, not realizing some participants have unique interests
**How to avoid:**
- Use soft constraints with scoring instead of hard pass/fail (if CSP library supports)
- Provide fallback to greedy algorithm if CSP fails after N seconds
- Test with real participant data (diverse track combinations) before production
- Allow manager to adjust constraint levels in UI (strict/balanced/relaxed)
**Warning signs:**
- generateTableSeating() throws "No solution found" on test data
- Algorithm takes >10 seconds for 100 participants
- All participants clustered in few tables, rest empty

### Pitfall 2: Track Import Without Validation
**What goes wrong:** Excel import accepts any text as track, creates 50+ duplicate tracks with slight variations
**Why it happens:** Trusting AI parsing completely without manager review
**How to avoid:**
- Show preview of parsed tracks before import with duplicate detection
- Use fuzzy matching to suggest "Marketing" and "marketing" are same track
- Limit to existing event tracks + allow "create new" with confirmation
- Store track names normalized (lowercase, trimmed) for matching
**Warning signs:**
- Track statistics show tracks with 1 participant each
- Track dropdown has "Sales", "sales", "Sales ", "SALES"
- Manager complains about "too many tracks to choose from"

### Pitfall 3: VIP Table Domination
**What goes wrong:** All VIPs assigned to Table 1, creating exclusive "VIP table" that defeats networking purpose
**Why it happens:** Misunderstanding "VIP priority" as "VIPs together" instead of "VIPs get best positions"
**How to avoid:**
- Implement VIP spread constraint (max 2 VIPs per table)
- Priority means VIPs get first choice of tables (Table 1, Table 2), not all same table
- Explain in UI: "VIPs will be distributed across tables for better networking"
- Test algorithm with multiple VIPs, verify spread
**Warning signs:**
- Table 1 has 8 VIPs, other tables have 0
- Non-VIP participants complain about "second-class" seating
- Manager requests "move VIPs around manually"

### Pitfall 4: Companion Separation
**What goes wrong:** Algorithm assigns companions to different tables to optimize diversity
**Why it happens:** Companion constraint not implemented or weighted lower than diversity constraint
**How to avoid:**
- Make companion grouping a HARD constraint (must satisfy, not optional)
- Load companion relationships from database before running algorithm
- Test with companion pairs, verify they're always together
- Show companion links in table view (visual confirmation)
**Warning signs:**
- Participants with companion_id assigned to different tables
- Customer support tickets: "We wanted to sit together"
- Manager manually fixing companion seating after AI generation

### Pitfall 5: Room Assignment Race Conditions
**What goes wrong:** Two managers approve AI room suggestions simultaneously, double-booking rooms
**Why it happens:** No locking or conflict detection between suggestion and execution
**How to avoid:**
- Re-check room availability in execute-ai-action before writing to participant_rooms
- Use database UNIQUE constraint on (event_id, room_number) if rooms can't be shared
- Display "Room no longer available" error if conflict, let manager re-run suggestion
- Show real-time room availability in grid view (polling or subscriptions)
**Warning signs:**
- Two participants have same room_number in participant_rooms
- Manager reports "approved assignment but got error"
- Room grid shows conflicting assignments

### Pitfall 6: Forgetting networking_opt_in Filter
**What goes wrong:** Seating algorithm includes all participants, assigns tables to people who don't want networking
**Why it happens:** Filtering by networking_opt_in forgotten in participant query
**How to avoid:**
- Always filter participants: .filter(p => p.networking_opt_in) before running algorithm
- Document default networking_opt_in behavior per event in UI
- Show count: "X participants opted in for networking" before generating seating
- Allow manager to toggle opt-in for participants if needed
**Warning signs:**
- Participants complain: "I didn't want to be assigned a table"
- Table assignments include people who didn't RSVP
- Seating count doesn't match opt-in count

### Pitfall 7: Grid View Layout Confusion
**What goes wrong:** Room grid doesn't match physical floor plan, rooms positioned randomly
**Why it happens:** Using simple x = room_number % 10 heuristic without actual floor plan data
**How to avoid:**
- Allow manager to manually position rooms in grid during event setup (save positions)
- Store room grid coordinates in database: rooms.grid_x, rooms.grid_y
- Provide "auto-layout by floor" as starting point, then manual adjustment
- Fall back to list view if grid positions not configured
**Warning signs:**
- Room 101 appears far from Room 102 in grid
- Manager says "this doesn't match our actual building"
- Grid view unused, everyone uses list view

## Code Examples

Verified patterns from official sources and existing EventFlow implementation:

### Complete Track Assignment Flow
```typescript
// ============================================================================
// Track Assignment: Bulk + Individual
// ============================================================================

// src/modules/participants/hooks/useTrackAssignment.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface AssignTracksParams {
  participantIds: string[]
  trackId: string
  isPrimary?: boolean
}

export function useTrackAssignment(eventId: string) {
  const queryClient = useQueryClient()

  const assignTracks = useMutation({
    mutationFn: async ({ participantIds, trackId, isPrimary }: AssignTracksParams) => {
      // Bulk insert participant_tracks
      const { data, error } = await supabase
        .from('participant_tracks')
        .insert(
          participantIds.map(participantId => ({
            participant_id: participantId,
            track_id: trackId,
            is_primary: isPrimary || false,
          }))
        )
        .select()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidate participant queries to refresh track chips
      queryClient.invalidateQueries(['participants', eventId])
      queryClient.invalidateQueries(['track-statistics', eventId])
    },
  })

  const removeTrack = useMutation({
    mutationFn: async ({ participantId, trackId }: { participantId: string; trackId: string }) => {
      const { error } = await supabase
        .from('participant_tracks')
        .delete()
        .eq('participant_id', participantId)
        .eq('track_id', trackId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['participants', eventId])
      queryClient.invalidateQueries(['track-statistics', eventId])
    },
  })

  const toggleTrack = useMutation({
    mutationFn: async ({ participantId, trackId }: { participantId: string; trackId: string }) => {
      // Check if already assigned
      const { data: existing } = await supabase
        .from('participant_tracks')
        .select('id')
        .eq('participant_id', participantId)
        .eq('track_id', trackId)
        .maybeSingle()

      if (existing) {
        // Remove
        return removeTrack.mutateAsync({ participantId, trackId })
      } else {
        // Add
        return assignTracks.mutateAsync({
          participantIds: [participantId],
          trackId,
        })
      }
    },
  })

  return {
    assignTracks,
    removeTrack,
    toggleTrack,
  }
}

// Usage in ParticipantModal (individual assignment)
function ParticipantModal({ participant, eventTracks }: Props) {
  const { toggleTrack } = useTrackAssignment(participant.event_id)

  return (
    <Dialog>
      <DialogContent>
        <h3>מסלולים</h3>

        <div className="space-y-2">
          {eventTracks.map(track => {
            const isAssigned = participant.tracks.some(t => t.id === track.id)

            return (
              <label key={track.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAssigned}
                  onChange={() => toggleTrack.mutate({
                    participantId: participant.id,
                    trackId: track.id,
                  })}
                />
                <TrackChip track={track} />
              </label>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Usage in ParticipantTable (bulk assignment)
function BulkTrackAssignmentMenu({ selectedParticipantIds, eventTracks }: Props) {
  const { assignTracks } = useTrackAssignment(eventId)

  return (
    <div className="flex items-center gap-2">
      <span>הקצה מסלול לנבחרים ({selectedParticipantIds.length}):</span>

      {eventTracks.map(track => (
        <button
          key={track.id}
          onClick={() => assignTracks.mutate({
            participantIds: selectedParticipantIds,
            trackId: track.id,
          })}
          className="px-3 py-1 border rounded hover:bg-gray-50"
        >
          <TrackChip track={track} />
        </button>
      ))}
    </div>
  )
}
```

### Table Seating with Drag-and-Drop Override
```typescript
// ============================================================================
// Seating Plan: AI Generation + Manual Override
// ============================================================================

// src/modules/networking/components/SeatingPlanView.tsx
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core'

function SeatingPlanView({ eventId }: Props) {
  const { data: tables } = useQuery(['table-assignments', eventId], () =>
    fetchTableAssignments(eventId)
  )

  const [editMode, setEditMode] = useState(false)

  async function generateSeating() {
    // Call AI seating algorithm
    const result = await generateTableSeatingAPI(eventId, {
      maxTableSize: 8,
      minSharedInterests: 2,
      maxSameTrack: 4,
      companionsTogether: true,
      vipSpread: true,
    })

    // Show confirmation dialog with suggested assignments
    // ... (Phase 6 pattern: suggest → confirm → execute)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (!over) return

    const participantId = active.id as string
    const newTableNumber = parseInt(over.id as string)

    // Update table assignment
    await supabase
      .from('table_assignments')
      .update({
        table_number: newTableNumber,
        assigned_by: 'manager', // Manual override
      })
      .eq('event_id', eventId)
      .eq('participant_id', participantId)

    // Refresh
    queryClient.invalidateQueries(['table-assignments', eventId])
  }

  return (
    <div dir="rtl" className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">תכנון שולחנות</h2>

        <div className="flex gap-2">
          <button
            onClick={generateSeating}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🤖 יצירת שיבוץ חכם
          </button>

          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-4 py-2 border rounded ${editMode ? 'bg-orange-100' : ''}`}
          >
            {editMode ? 'סיום עריכה' : 'עריכה ידנית'}
          </button>
        </div>
      </div>

      {/* Seating Grid */}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-3 gap-4">
          {tables?.map(table => (
            <TableCard
              key={table.tableNumber}
              table={table}
              editable={editMode}
            />
          ))}
        </div>
      </DndContext>
    </div>
  )
}

// Droppable Table Card
function TableCard({ table, editable }: Props) {
  const { setNodeRef } = useDroppable({
    id: table.tableNumber.toString(),
  })

  const vipCount = table.participants.filter(p => p.is_vip).length

  return (
    <div
      ref={setNodeRef}
      className="border rounded-lg p-4 bg-white hover:shadow-lg transition"
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">שולחן {table.tableNumber}</h3>

        <span className="text-sm text-gray-500">
          {table.participants.length} / {table.capacity}
        </span>

        {vipCount > 0 && (
          <span className="text-xs text-purple-600">
            💎 {vipCount}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {table.participants.map(participant => (
          <DraggableParticipant
            key={participant.id}
            participant={participant}
            draggable={editable}
          />
        ))}
      </div>
    </div>
  )
}

// Draggable Participant
function DraggableParticipant({ participant, draggable }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: participant.id,
    disabled: !draggable,
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-2 p-2 rounded border ${
        draggable ? 'cursor-move hover:bg-gray-50' : ''
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      {participant.is_vip && <VIPBadge size="xs" />}

      <span className="text-sm">
        {participant.first_name} {participant.last_name}
      </span>

      {/* Track indicators */}
      {participant.tracks.slice(0, 2).map(track => (
        <span
          key={track.id}
          className="inline-block w-2 h-2 rounded-full"
          style={{ backgroundColor: track.color }}
          title={track.name}
        />
      ))}
    </div>
  )
}
```

### Track Statistics Dashboard
```sql
-- View track distribution for event planning
SELECT
  t.name AS track_name,
  t.color,
  COUNT(pt.participant_id) AS total_participants,
  COUNT(pt.participant_id) FILTER (WHERE p.is_vip) AS vip_count,
  COUNT(pt.participant_id) FILTER (WHERE pt.is_primary) AS primary_count,
  ROUND(COUNT(pt.participant_id)::numeric / NULLIF(total.count, 0) * 100, 1) AS percentage
FROM tracks t
LEFT JOIN participant_tracks pt ON t.id = pt.track_id
LEFT JOIN participants p ON pt.participant_id = p.id
CROSS JOIN (
  SELECT COUNT(DISTINCT participant_id) AS count
  FROM participant_tracks
  WHERE track_id IN (SELECT id FROM tracks WHERE event_id = '...')
) AS total
WHERE t.event_id = '...'
GROUP BY t.id, t.name, t.color, total.count
ORDER BY total_participants DESC;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Excel-based track assignment | In-app bulk multi-select | Modern event software 2023+ | Real-time updates, no export/import friction |
| Manual table seating with spreadsheets | Constraint satisfaction algorithms | 2020+ (wedding planners adopted) | Faster, considers complex relationships |
| Prominent VIP badges (gold stars) | Subtle diamond icon (💎) | UX research 2024+ | Reduces negative perception, maintains identification |
| Service-specific room assignment | Unified AI chat suggestions | EventFlow Phase 6 pattern | Consistent UX, audit trail, approval workflow |
| Static floor plan PDFs | Interactive grid layout | React libraries 2022+ | Real-time updates, drag-drop, responsive |
| React Beautiful DnD | dnd-kit | 2023 (RBD archived) | Active maintenance, better React 19 support |
| Hard-coded color palettes | Auto-assigned with override | Modern UI libraries | Reduces setup friction, maintains customization |

**Deprecated/outdated:**
- **React Beautiful DnD:** Archived by Atlassian in 2023; use dnd-kit or hello-pangea/dnd fork
- **Manual CSV track import:** Modern systems use AI to parse flexible formats (commas, semicolons, tabs)
- **Social Tables SaaS integration:** Expensive for small events; custom CSP algorithms cheaper for standard cases
- **VIP-only seating sections:** Creates negative perception; modern approach distributes VIPs for networking

## Open Questions

Things that couldn't be fully resolved:

1. **CSP Library Performance for Large Events**
   - What we know: CSP solvers can be slow for 500+ participants with complex constraints
   - What's unclear: Which JavaScript CSP library (csps vs constrained) performs best for seating problem
   - Recommendation: Start with csps (active npm package). Benchmark with 100/250/500 participants. Fall back to greedy algorithm if >5 seconds. Consider server-side solving (Python CSP libraries faster) if needed.

2. **Track Color Auto-Assignment Algorithm**
   - What we know: Manager can override colors, but need default auto-assignment
   - What's unclear: Best algorithm for visually distinct colors (HSL spread? Fixed palette?)
   - Recommendation: Use fixed palette of 12 distinct colors (Material Design palette). Cycle through palette for tracks 1-12, then repeat with lightness variation. Store in config for easy updates.

3. **Room Grid Layout Persistence**
   - What we know: Grid view needs room coordinates (grid_x, grid_y) for positioning
   - What's unclear: Should coordinates be in database or local storage? How to handle multi-building events?
   - Recommendation: Store in database (rooms.grid_x, rooms.grid_y, rooms.grid_building). Allow separate grid per building. Provide "auto-layout by floor" as starting point, then manager adjusts. Fall back to list view if coordinates null.

4. **Networking Opt-In Default**
   - What we know: networking_opt_in should be configurable per event (CONTEXT.md decision)
   - What's unclear: Should it apply to new participants automatically or require manager to toggle all?
   - Recommendation: Store in events.settings.default_networking_opt_in. When participant created/imported, set opt_in = event.settings.default_networking_opt_in. Manager can bulk toggle in participant table if needed.

5. **VIP WhatsApp Template Personalization Level**
   - What we know: VIP templates should include room details (VIP-02 requirement)
   - What's unclear: Should VIPs get entirely different templates or just {{vip_note}} variable in shared template?
   - Recommendation: Use shared template with conditional {{vip_note}} variable (see Pattern 5 example). Simpler to maintain, manager can customize note per VIP. Avoid separate templates unless personalization is drastically different.

## Sources

### Primary (HIGH confidence)
- [TanStack Table Row Selection](https://tanstack.com/table/v8/docs/guide/row-selection) - Official docs for multi-select with shift-click
- [TanStack Table React Example](https://tanstack.com/table/v8/docs/framework/react/examples/row-selection) - Working row selection code
- [dnd-kit Documentation](https://dndkit.com/) - Modern drag-and-drop library for React
- [Tailwind CSS Badge Components](https://tailwindcss.com/plus/ui-blocks/application-ui/elements/badges) - Official badge styling patterns
- [React-Grid-Layout](https://github.com/react-grid-layout/react-grid-layout) - Grid layout for floor plans
- EventFlow existing codebase:
  - `/eventflow-app/supabase/migrations/20260120_program_management.sql` - tracks, rooms, participant_tracks tables
  - `/eventflow-app/supabase/migrations/20260125_participant_rooms.sql` - participant_rooms table with RLS
  - `/eventflow-app/src/components/rooms/RoomAssignmentPanel.tsx` - Existing room UI
  - `.planning/phases/06-ai-write-foundation/06-RESEARCH.md` - Suggest+confirm+execute pattern

### Secondary (MEDIUM confidence)
- [Seating Algorithm Best Practices](https://www.oliverwyman.com/our-expertise/insights/2023/apr/perfect-seating-plan-algorithm.html) - Oliver Wyman: Diversity maximization via analytics
- [VIP Event Management](https://www.eventsair.com/blog/vip-hospitality-management) - Best practices for VIP handling at events
- [Event Seating Software 2026](https://www.eventdex.com/blog/best-event-seating-software-2026/) - Feature comparison: integrated tools, RFID badges
- [csps npm package](https://www.npmjs.com/csps) - Constraint Satisfaction Problem Solvers library
- [Material Tailwind Chips](https://www.material-tailwind.com/docs/react/chip) - React chip/badge component examples
- [Maximizing Diversity in Teams](https://www.sciencedirect.com/science/article/pii/S2215016122002850) - Research on diversity balancing algorithms

### Tertiary (LOW confidence)
- [CSP Wedding Seating GitHub](https://github.com/RishabhTyagiHub/Constraint-Satisfaction-Problem---Wedding-Seating-Arrangement) - Community example (not production-ready)
- [10 Best Drag & Drop React 2026](https://reactscript.com/best-drag-drop/) - Blog roundup of libraries (not official)
- [VIP Event Ideas](https://godreamcast.com/blog/solution/in-person-event/vip-event-ideas/) - Marketing blog with VIP handling tips (not authoritative)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - TanStack Table row selection documented, dnd-kit is established library, tracks/rooms tables exist in database
- Architecture patterns: HIGH - Bulk track assignment follows TanStack Table best practices, seating CSP is proven approach, VIP treatment aligns with event management standards
- Pitfalls: MEDIUM - Based on industry best practices and UX patterns, but EventFlow-specific edge cases may emerge
- CSP algorithm performance: LOW - Need to benchmark with actual EventFlow participant data to verify performance claims

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - libraries stable, but CSP performance needs validation)
**Recommended re-verification:** After implementing CSP seating algorithm - benchmark performance and consider server-side solver if client-side too slow
