import { useState } from 'react'
import { Hotel, LayoutGrid, Settings, BedDouble, Building2, Plus, Trash2, Loader2 } from 'lucide-react'
import { useEvent } from '@/contexts/EventContext'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { RoomAssignmentPanel } from '@/components/rooms'
import { RoomPolicySettings } from '@/modules/rooms/components/RoomPolicySettings'
import { AutoAssignmentPanel } from '@/modules/rooms/components/AutoAssignmentPanel'

type Tab = 'inventory' | 'assignments' | 'settings'

const ROOM_TYPES = ['standard', 'suite', 'accessible', 'vip'] as const
const BED_CONFIGS = ['single', 'double', 'twin', 'king'] as const

interface RoomRow {
  id: string
  name: string
  building: string | null
  floor: string | null
  room_type: string
  bed_configuration: string
  capacity: number
  is_active: boolean
}

export function RoomManagementPage() {
  const { selectedEvent } = useEvent()
  const eventId = selectedEvent?.id
  const [activeTab, setActiveTab] = useState<Tab>('assignments')
  const [showAddForm, setShowAddForm] = useState(false)
  const queryClient = useQueryClient()

  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ['rooms-list', eventId],
    queryFn: async () => {
      if (!eventId) return []
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name, building, floor, room_type, bed_configuration, capacity, is_active')
        .eq('event_id', eventId)
        .order('name')
      if (error) throw error
      return data as RoomRow[]
    },
    enabled: !!eventId,
  })

  if (!selectedEvent) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500">
        <p>בחר אירוע תחילה</p>
      </div>
    )
  }

  return (
    <div className="space-y-0" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-900 border border-zinc-700 rounded-t-xl">
        <div className="flex items-center gap-3">
          <Hotel size={20} className="text-blue-400" />
          <div>
            <h1 className="text-lg font-bold text-white">ניהול חדרים ולינה</h1>
            <p className="text-xs text-zinc-500">{selectedEvent.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Building2 size={14} />
          <span>{rooms.filter(r => r.is_active).length} חדרים פעילים</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-x border-zinc-700 bg-zinc-900/50">
        <TabButton id="assignments" active={activeTab} onClick={setActiveTab} icon={<BedDouble size={15} />} label="סידורי שינה" />
        <TabButton id="inventory" active={activeTab} onClick={setActiveTab} icon={<LayoutGrid size={15} />} label="מלאי חדרים" />
        <TabButton id="settings" active={activeTab} onClick={setActiveTab} icon={<Settings size={15} />} label="הגדרות" />
      </div>

      {/* Content */}
      <div className="border-x border-b border-zinc-700 rounded-b-xl bg-zinc-900/30 p-6 min-h-[500px]">
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <AutoAssignmentPanel />
            <div className="border-t border-white/5 pt-6">
              {eventId && <RoomAssignmentPanel eventId={eventId} />}
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            rooms={rooms}
            loading={loadingRooms}
            eventId={eventId}
            showAddForm={showAddForm}
            setShowAddForm={setShowAddForm}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['rooms-list', eventId] })}
          />
        )}

        {activeTab === 'settings' && (
          <RoomPolicySettings />
        )}
      </div>
    </div>
  )
}

function TabButton({ id, active, onClick, icon, label }: {
  id: Tab
  active: Tab
  onClick: (t: Tab) => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
        active === id
          ? 'border-blue-500 text-blue-400'
          : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
      }`}
    >
      {icon}{label}
    </button>
  )
}

// ── Inventory Tab ─────────────────────────────────────────────────────────────
function InventoryTab({ rooms, loading, eventId, showAddForm, setShowAddForm, onRefresh }: {
  rooms: RoomRow[]
  loading: boolean
  eventId: string | undefined
  showAddForm: boolean
  setShowAddForm: (v: boolean) => void
  onRefresh: () => void
}) {
  const [batchForm, setBatchForm] = useState({
    prefix: '',
    from: 1,
    to: 10,
    building: '',
    floor: '',
    room_type: 'standard',
    bed_configuration: 'double',
    capacity: 2,
  })
  const [saving, setSaving] = useState(false)

  async function handleBatchAdd() {
    if (!eventId || batchForm.from > batchForm.to) return
    setSaving(true)
    try {
      const rows = []
      for (let n = batchForm.from; n <= batchForm.to; n++) {
        rows.push({
          event_id: eventId,
          name: `${batchForm.prefix}${n}`,
          building: batchForm.building || null,
          floor: batchForm.floor || null,
          room_type: batchForm.room_type,
          bed_configuration: batchForm.bed_configuration,
          capacity: batchForm.capacity,
          is_active: true,
        })
      }
      const { error } = await supabase.from('rooms').insert(rows)
      if (error) throw error
      toast.success(`נוספו ${rows.length} חדרים`)
      setShowAddForm(false)
      onRefresh()
    } catch {
      toast.error('שגיאה בהוספת חדרים')
    } finally {
      setSaving(false)
    }
  }

  const ROOM_TYPE_LABELS: Record<string, string> = {
    standard: 'רגיל',
    suite: 'סוויטה',
    accessible: 'נגיש',
    vip: 'VIP',
  }
  const BED_LABELS: Record<string, string> = {
    single: 'יחיד',
    double: 'זוגי',
    twin: 'שני יחידים',
    king: 'קינג',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <LayoutGrid size={16} className="text-zinc-400" />
          מלאי חדרים ({rooms.length})
        </h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <Plus size={14} />
          הוסף חדרים
        </button>
      </div>

      {/* Batch add form */}
      {showAddForm && (
        <div className="bg-zinc-800/50 border border-white/10 rounded-xl p-4 space-y-4">
          <h4 className="text-sm font-semibold text-white">הוספת טווח חדרים</h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="קידומת (למשל 1, A)" value={batchForm.prefix} onChange={v => setBatchForm(f => ({ ...f, prefix: v }))} placeholder="1" />
            <Field label="מ-חדר" type="number" value={String(batchForm.from)} onChange={v => setBatchForm(f => ({ ...f, from: Number(v) }))} />
            <Field label="עד-חדר" type="number" value={String(batchForm.to)} onChange={v => setBatchForm(f => ({ ...f, to: Number(v) }))} />
            <Field label="בניין" value={batchForm.building} onChange={v => setBatchForm(f => ({ ...f, building: v }))} placeholder="מגדל A" />
            <Field label="קומה" value={batchForm.floor} onChange={v => setBatchForm(f => ({ ...f, floor: v }))} placeholder="3" />
            <Field label="קיבולת (אנשים)" type="number" value={String(batchForm.capacity)} onChange={v => setBatchForm(f => ({ ...f, capacity: Number(v) }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="סוג חדר" value={batchForm.room_type} onChange={v => setBatchForm(f => ({ ...f, room_type: v }))}>
              {ROOM_TYPES.map(t => <option key={t} value={t}>{ROOM_TYPE_LABELS[t]}</option>)}
            </SelectField>
            <SelectField label="תצורת מיטה" value={batchForm.bed_configuration} onChange={v => setBatchForm(f => ({ ...f, bed_configuration: v }))}>
              {BED_CONFIGS.map(t => <option key={t} value={t}>{BED_LABELS[t]}</option>)}
            </SelectField>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 border border-zinc-600 text-zinc-300 rounded-lg hover:bg-zinc-700 text-sm transition-colors">ביטול</button>
            <button
              onClick={handleBatchAdd}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              הוסף {Math.max(0, batchForm.to - batchForm.from + 1)} חדרים
            </button>
          </div>
        </div>
      )}

      {/* Rooms table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-zinc-500">
          <Loader2 size={20} className="animate-spin mr-2" /> טוען...
        </div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500 gap-3">
          <Hotel size={32} className="opacity-40" />
          <p className="text-sm">אין חדרים במלאי</p>
          <button onClick={() => setShowAddForm(true)} className="text-blue-400 hover:text-blue-300 text-sm underline">הוסף חדרים</button>
        </div>
      ) : (
        <div className="bg-zinc-800/30 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-800/50 text-xs text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-right">חדר</th>
                <th className="px-4 py-3 text-right">בניין</th>
                <th className="px-4 py-3 text-right">קומה</th>
                <th className="px-4 py-3 text-right">סוג</th>
                <th className="px-4 py-3 text-right">מיטה</th>
                <th className="px-4 py-3 text-right">קיבולת</th>
                <th className="px-4 py-3 text-right">סטטוס</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rooms.map(room => (
                <RoomTableRow key={room.id} room={room} roomTypeLabels={ROOM_TYPE_LABELS} bedLabels={BED_LABELS} onRefresh={onRefresh} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function RoomTableRow({ room, roomTypeLabels, bedLabels, onRefresh }: {
  room: RoomRow
  roomTypeLabels: Record<string, string>
  bedLabels: Record<string, string>
  onRefresh: () => void
}) {
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`למחוק חדר ${room.name}?`)) return
    setDeleting(true)
    const { error } = await supabase.from('rooms').update({ is_active: false }).eq('id', room.id)
    if (error) toast.error('שגיאה במחיקה')
    else { toast.success('חדר הוסר'); onRefresh() }
    setDeleting(false)
  }

  const typeColors: Record<string, string> = {
    vip: 'text-amber-400 bg-amber-500/10',
    suite: 'text-purple-400 bg-purple-500/10',
    accessible: 'text-emerald-400 bg-emerald-500/10',
    standard: 'text-zinc-400 bg-zinc-700/50',
  }

  return (
    <tr className="hover:bg-white/5 transition-colors">
      <td className="px-4 py-3 font-mono font-medium text-white">{room.name}</td>
      <td className="px-4 py-3 text-zinc-300">{room.building ?? '—'}</td>
      <td className="px-4 py-3 text-zinc-300">{room.floor ?? '—'}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[room.room_type] ?? typeColors.standard}`}>
          {roomTypeLabels[room.room_type] ?? room.room_type}
        </span>
      </td>
      <td className="px-4 py-3 text-zinc-300 text-xs">{bedLabels[room.bed_configuration] ?? room.bed_configuration}</td>
      <td className="px-4 py-3 text-zinc-300">{room.capacity}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className={`text-xs ${room.is_active ? 'text-emerald-400' : 'text-zinc-600'}`}>
            {room.is_active ? '● פעיל' : '○ לא פעיל'}
          </span>
          <button onClick={handleDelete} disabled={deleting} className="text-zinc-600 hover:text-red-400 transition-colors p-1">
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        </div>
      </td>
    </tr>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-blue-500"
      />
    </div>
  )
}

function SelectField({ label, value, onChange, children }: {
  label: string; value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
      >
        {children}
      </select>
    </div>
  )
}
