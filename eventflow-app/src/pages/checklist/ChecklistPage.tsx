import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Loader2, Search, CheckSquare, Clock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { ChecklistItem, ChecklistFormData, TaskStatus, TaskPriority } from '../../types'
import { getTaskStatusColor, getTaskStatusLabel, getPriorityColor, getPriorityLabel } from '../../utils'
import { useEvent } from '../../contexts/EventContext'

export function ChecklistPage() {
  const { selectedEvent: contextEvent } = useEvent()
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [events, setEvents] = useState<{ id: string; name: string; status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string>(contextEvent?.id || '')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<ChecklistFormData>({
    title: '',
    description: '',
    status: 'pending',
    priority: 'medium',
    due_date: '',
    estimated_hours: '',
    estimated_cost: '',
    is_milestone: false,
    notes: ''
  })

  // Sync with EventContext when selected event changes
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (contextEvent && selectedEvent !== contextEvent.id) {
        setSelectedEvent(contextEvent.id)
      }
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextEvent])

  async function loadData() {
    setLoading(true)

    // Load events
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, name, status')
      .order('start_date', { ascending: false })

    if (eventsData) setEvents(eventsData)

    // Load checklist items - only for selected event
    if (!selectedEvent) {
      setItems([])
      setLoading(false)
      return
    }

    const { data: itemsData, error } = await supabase
      .from('checklist_items')
      .select('*, events(name)')
      .eq('event_id', selectedEvent)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error loading checklist:', error)
    } else {
      setItems(itemsData || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEvent])

  const filteredItems = items.filter(item => {
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
    const matchesPriority = selectedPriority === 'all' || item.priority === selectedPriority
    const matchesSearch = !searchTerm ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesStatus && matchesPriority && matchesSearch
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedEvent) {
      alert('נא לבחור אירוע')
      return
    }

    const taskData = {
      event_id: selectedEvent,
      title: formData.title,
      description: formData.description || null,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date || null,
      estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
      estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
      is_milestone: formData.is_milestone,
      notes: formData.notes || null
    }

    if (editingItem) {
      const { error } = await supabase
        .from('checklist_items')
        .update(taskData)
        .eq('id', editingItem.id)

      if (error) {
        alert('שגיאה בעדכון המשימה')
        return
      }
    } else {
      const { error } = await supabase
        .from('checklist_items')
        .insert(taskData)

      if (error) {
        alert('שגיאה ביצירת המשימה')
        return
      }
    }

    closeModal()
    loadData()
  }

  async function toggleStatus(item: ChecklistItem) {
    const newStatus: TaskStatus = item.status === 'completed' ? 'pending' : 'completed'
    const updateData: Partial<ChecklistItem> = {
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null
    }

    const { error } = await supabase
      .from('checklist_items')
      .update(updateData)
      .eq('id', item.id)

    if (!error) {
      loadData()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('האם למחוק את המשימה?')) return

    const { error } = await supabase
      .from('checklist_items')
      .delete()
      .eq('id', id)

    if (!error) loadData()
  }

  function openEditModal(item: ChecklistItem) {
    setEditingItem(item)
    setSelectedEvent(item.event_id)
    setFormData({
      title: item.title,
      description: item.description || '',
      status: item.status,
      priority: item.priority,
      due_date: item.due_date?.split('T')[0] || '',
      estimated_hours: item.estimated_hours?.toString() || '',
      estimated_cost: item.estimated_cost?.toString() || '',
      is_milestone: item.is_milestone,
      notes: item.notes || ''
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingItem(null)
    setFormData({
      title: '',
      description: '',
      status: 'pending',
      priority: 'medium',
      due_date: '',
      estimated_hours: '',
      estimated_cost: '',
      is_milestone: false,
      notes: ''
    })
  }

  // Stats
  const stats = {
    total: items.length,
    completed: items.filter(i => i.status === 'completed').length,
    inProgress: items.filter(i => i.status === 'in_progress').length,
    blocked: items.filter(i => i.status === 'blocked').length
  }
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  if (loading) {
    return (
      <div className="p-8 relative z-10 flex justify-center items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-emerald-400/30 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <p className="text-zinc-400 font-medium">טוען משימות...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 relative z-10">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-1/4 w-72 h-72 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white" data-testid="checklist-title">צ'קליסט</h1>
            <p className="text-zinc-400 mt-1">{stats.total} משימות | {completionRate}% הושלמו</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all duration-300"
            data-testid="add-task-btn"
          >
            <Plus className="w-5 h-5" />
            משימה חדשה
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-gray-400 to-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">סה"כ משימות</p>
            <p className="text-3xl font-bold text-white mt-1">{stats.total}</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-400 to-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">הושלמו</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-400 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">בביצוע</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{stats.inProgress}</p>
          </div>
          <div className="group relative premium-stats-card orange hover:bg-[#1a1d27] hover:shadow-xl hover:-translate-y-1 transition-all duration-500 overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <p className="text-zinc-400 text-sm font-medium">התקדמות</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-500"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <span className="text-xl font-bold text-emerald-600">{completionRate}%</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1a1d27]/60 backdrop-blur-sm rounded-2xl p-4 border border-white/10 mb-6">
          <div className="flex gap-4 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="חיפוש משימות..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 pr-10 bg-[#1a1d27] rounded-xl border border-white/10 text-zinc-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
              />
            </div>
            <select
              value={selectedEvent}
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="px-4 py-2.5 bg-[#1a1d27] rounded-xl border border-white/10 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all min-w-[180px]"
            >
              <option value="">בחר אירוע</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>{event.name}</option>
              ))}
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2.5 bg-[#1a1d27] rounded-xl border border-white/10 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            >
              <option value="all">כל הסטטוסים</option>
              <option value="pending">ממתין</option>
              <option value="in_progress">בביצוע</option>
              <option value="completed">הושלם</option>
              <option value="blocked">חסום</option>
            </select>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-4 py-2.5 bg-[#1a1d27] rounded-xl border border-white/10 text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
            >
              <option value="all">כל העדיפויות</option>
              <option value="critical">קריטית</option>
              <option value="high">גבוהה</option>
              <option value="medium">בינונית</option>
              <option value="low">נמוכה</option>
            </select>
          </div>
        </div>

        {/* Checklist Items */}
        <div className="bg-[#1a1d27] border border-white/5 rounded-2xl border border-white/10 overflow-hidden" data-testid="checklist-list">
          {filteredItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-emerald-400/20 blur-2xl rounded-full" />
                <CheckSquare className="relative mx-auto mb-4 text-gray-300" size={56} />
              </div>
              <p className="text-zinc-300 text-lg font-semibold">אין משימות עדיין</p>
              <p className="text-zinc-500 text-sm mt-2">הוסף משימה ראשונה להתחיל</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  className={`group flex items-center gap-4 p-5 ${
                    item.status === 'completed' ? 'bg-white/5' : 'hover:bg-gradient-to-r hover:from-emerald-500/10 hover:to-transparent'
                  } transition-all duration-300`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleStatus(item)}
                    className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-300 ${
                      item.status === 'completed'
                        ? 'bg-gradient-to-br from-emerald-400 to-green-500 border-emerald-400 text-white shadow-md shadow-emerald-500/30'
                        : 'border-white/20 hover:border-emerald-400 hover:bg-emerald-500/10'
                    }`}
                  >
                    {item.status === 'completed' && <CheckSquare className="w-4 h-4" />}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold text-white ${item.status === 'completed' ? 'line-through text-zinc-500' : 'group-hover:text-emerald-400'} transition-colors`}>
                        {item.title}
                      </span>
                      {item.is_milestone && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2.5 py-1 rounded-lg font-medium">אבן דרך</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-zinc-400 mt-1.5">
                      {item.events?.name && (
                        <span className="text-xs bg-white/5 px-2.5 py-1 rounded-lg">{item.events.name}</span>
                      )}
                      {item.due_date && (
                        <span className="flex items-center gap-1.5 text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-lg">
                          <Clock className="w-3 h-3" />
                          {new Date(item.due_date).toLocaleDateString('he-IL')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Priority */}
                  <span className={`text-sm font-medium ${getPriorityColor(item.priority)}`}>
                    {getPriorityLabel(item.priority)}
                  </span>

                  {/* Status Badge */}
                  <span className={`text-xs px-3 py-1.5 rounded-lg font-medium ${getTaskStatusColor(item.status)}`}>
                    {getTaskStatusLabel(item.status)}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-2.5 hover:bg-white/5 rounded-xl transition-all duration-200 hover:scale-105"
                    >
                      <Edit2 className="w-4 h-4 text-zinc-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2.5 hover:bg-red-500/10 rounded-xl transition-all duration-200 hover:scale-105"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-modal p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingItem ? 'עריכת משימה' : 'משימה חדשה'}
              </h2>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-300">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">אירוע *</label>
                <select
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                  className="input w-full"
                  required
                >
                  <option value="">בחר אירוע</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">כותרת *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">תיאור</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input w-full"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">סטטוס</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                    className="input w-full"
                  >
                    <option value="pending">ממתין</option>
                    <option value="in_progress">בביצוע</option>
                    <option value="completed">הושלם</option>
                    <option value="blocked">חסום</option>
                    <option value="cancelled">בוטל</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">עדיפות</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="input w-full"
                  >
                    <option value="low">נמוכה</option>
                    <option value="medium">בינונית</option>
                    <option value="high">גבוהה</option>
                    <option value="critical">קריטית</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך יעד</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">שעות משוערות</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                    className="input w-full"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">עלות משוערת (₪)</label>
                  <input
                    type="number"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                    className="input w-full"
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_milestone"
                    checked={formData.is_milestone}
                    onChange={(e) => setFormData({ ...formData, is_milestone: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="is_milestone" className="text-sm">אבן דרך (Milestone)</label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">הערות</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input w-full"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-medium shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:-translate-y-0.5 transition-all duration-300">
                  {editingItem ? 'עדכון' : 'יצירה'}
                </button>
                <button type="button" onClick={closeModal} className="px-6 py-2.5 border border-white/10 rounded-xl hover:bg-white/5 transition-colors font-medium">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
