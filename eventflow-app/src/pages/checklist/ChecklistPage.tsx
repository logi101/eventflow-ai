import { useState } from 'react'
import { Plus, Search, Edit2, Trash2, CheckSquare, Clock, X, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { ChecklistItem, ChecklistFormData, TaskStatus, TaskPriority } from '../../types'
import { getTaskStatusColor, getTaskStatusLabel, getPriorityColor, getPriorityLabel } from '../../utils'

export function ChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [events, setEvents] = useState<{ id: string; name: string; status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string>('all')
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

  async function loadData() {
    setLoading(true)

    // Load events
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, name, status')
      .order('start_date', { ascending: false })

    if (eventsData) setEvents(eventsData)

    // Load checklist items
    const { data: itemsData, error } = await supabase
      .from('checklist_items')
      .select('*, events(name)')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error loading checklist:', error)
    } else {
      setItems(itemsData || [])
    }

    setLoading(false)
  }

  const filteredItems = items.filter(item => {
    const matchesEvent = selectedEvent === 'all' || item.event_id === selectedEvent
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus
    const matchesPriority = selectedPriority === 'all' || item.priority === selectedPriority
    const matchesSearch = !searchTerm ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description?.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesEvent && matchesStatus && matchesPriority && matchesSearch
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedEvent || selectedEvent === 'all') {
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
      <div className="p-8 flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" data-testid="checklist-title">צ'קליסט</h1>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
          data-testid="add-task-btn"
        >
          <Plus className="w-4 h-4 ml-2" />
          משימה חדשה
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-gray-500 text-sm">סה"כ משימות</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="card">
          <p className="text-gray-500 text-sm">הושלמו</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="card">
          <p className="text-gray-500 text-sm">בביצוע</p>
          <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
        </div>
        <div className="card">
          <p className="text-gray-500 text-sm">התקדמות</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <span className="text-lg font-bold">{completionRate}%</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="חיפוש משימות..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pr-10 w-full"
          />
        </div>
        <select
          value={selectedEvent}
          onChange={(e) => setSelectedEvent(e.target.value)}
          className="input min-w-[180px]"
        >
          <option value="all">כל האירועים</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>{event.name}</option>
          ))}
        </select>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="input"
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
          className="input"
        >
          <option value="all">כל העדיפויות</option>
          <option value="critical">קריטית</option>
          <option value="high">גבוהה</option>
          <option value="medium">בינונית</option>
          <option value="low">נמוכה</option>
        </select>
      </div>

      {/* Checklist Items */}
      <div className="card" data-testid="checklist-list">
        {filteredItems.length === 0 ? (
          <p className="text-gray-500 text-center py-8">אין משימות עדיין</p>
        ) : (
          <div className="space-y-2">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  item.status === 'completed' ? 'bg-gray-50 opacity-75' : 'bg-white'
                } hover:shadow-sm transition-shadow`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleStatus(item)}
                  className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                    item.status === 'completed'
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-primary'
                  }`}
                >
                  {item.status === 'completed' && <CheckSquare className="w-4 h-4" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${item.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                      {item.title}
                    </span>
                    {item.is_milestone && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">אבן דרך</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    {item.events?.name && (
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{item.events.name}</span>
                    )}
                    {item.due_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(item.due_date).toLocaleDateString('he-IL')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Priority */}
                <span className={`text-sm ${getPriorityColor(item.priority)}`}>
                  {getPriorityLabel(item.priority)}
                </span>

                {/* Status Badge */}
                <span className={`text-xs px-2 py-1 rounded-full ${getTaskStatusColor(item.status)}`}>
                  {getTaskStatusLabel(item.status)}
                </span>

                {/* Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 hover:bg-gray-100 rounded text-gray-500"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 hover:bg-red-50 rounded text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
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
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
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
                <button type="submit" className="btn-primary flex-1">
                  {editingItem ? 'עדכון' : 'יצירה'}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary">
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
