import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Loader2, Calendar, Clock, Star, FileQuestion, BarChart3, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { FeedbackSurvey, FeedbackResponse, SurveyFormData, SimpleEvent } from '../../types'
import { useEvent } from '../../contexts/EventContext'

export function FeedbackPage() {
  const { selectedEvent: contextEvent } = useEvent()
  const [surveys, setSurveys] = useState<FeedbackSurvey[]>([])
  const [events, setEvents] = useState<SimpleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<FeedbackSurvey | null>(null)
  const [selectedSurvey, setSelectedSurvey] = useState<FeedbackSurvey | null>(null)
  const [responses, setResponses] = useState<FeedbackResponse[]>([])
  const [filterEventId, setFilterEventId] = useState<string>(contextEvent?.id || '')
  const [viewMode, setViewMode] = useState<'list' | 'responses' | 'analytics'>('list')

  const emptyForm: SurveyFormData = {
    title: '',
    description: '',
    event_id: '',
    is_active: true,
    anonymous: false,
    starts_at: '',
    ends_at: ''
  }

  const [formData, setFormData] = useState<SurveyFormData>(emptyForm)

  async function fetchEvents() {
    const { data } = await supabase.from('events').select('id, name').order('start_date', { ascending: false })
    if (data) setEvents(data)
  }

  async function fetchSurveys() {
    setLoading(true)
    let query = supabase
      .from('feedback_surveys')
      .select('*, events(name)')
      .order('created_at', { ascending: false })

    if (filterEventId) {
      query = query.eq('event_id', filterEventId)
    }

    const { data } = await query
    if (data) {
      // Fetch response counts for each survey
      const surveysWithCounts = await Promise.all(
        data.map(async (survey) => {
          const { count } = await supabase
            .from('feedback_responses')
            .select('*', { count: 'exact', head: true })
            .eq('survey_id', survey.id)
          return { ...survey, response_count: count || 0 }
        })
      )
      setSurveys(surveysWithCounts)
    }
    setLoading(false)
  }

  // Sync with EventContext when selected event changes
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (contextEvent && filterEventId !== contextEvent.id) {
        setFilterEventId(contextEvent.id)
      }
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextEvent])

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      fetchSurveys()
      fetchEvents()
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchResponses(surveyId: string) {
    const { data } = await supabase
      .from('feedback_responses')
      .select('*, participants(first_name, last_name)')
      .eq('survey_id', surveyId)
      .order('submitted_at', { ascending: false })
    if (data) setResponses(data)
  }

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      fetchSurveys()
    })
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterEventId])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  function openCreateModal() {
    setEditingSurvey(null)
    setFormData(emptyForm)
    setShowModal(true)
  }

  function openEditModal(survey: FeedbackSurvey) {
    setEditingSurvey(survey)
    setFormData({
      title: survey.title,
      description: survey.description || '',
      event_id: survey.event_id,
      is_active: survey.is_active,
      anonymous: survey.anonymous,
      starts_at: survey.starts_at ? survey.starts_at.split('T')[0] : '',
      ends_at: survey.ends_at ? survey.ends_at.split('T')[0] : ''
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const surveyData = {
      title: formData.title,
      description: formData.description || null,
      event_id: formData.event_id,
      is_active: formData.is_active,
      anonymous: formData.anonymous,
      starts_at: formData.starts_at ? `${formData.starts_at}T00:00:00` : null,
      ends_at: formData.ends_at ? `${formData.ends_at}T23:59:59` : null
    }

    if (editingSurvey) {
      await supabase.from('feedback_surveys').update(surveyData).eq('id', editingSurvey.id)
    } else {
      await supabase.from('feedback_surveys').insert([surveyData])
    }

    setShowModal(false)
    fetchSurveys()
  }

  async function deleteSurvey(id: string) {
    if (confirm('האם למחוק את הסקר? פעולה זו תמחק גם את כל התשובות.')) {
      await supabase.from('feedback_surveys').delete().eq('id', id)
      fetchSurveys()
    }
  }

  async function toggleSurveyActive(survey: FeedbackSurvey) {
    await supabase.from('feedback_surveys').update({ is_active: !survey.is_active }).eq('id', survey.id)
    fetchSurveys()
  }

  function viewSurveyResponses(survey: FeedbackSurvey) {
    setSelectedSurvey(survey)
    fetchResponses(survey.id)
    setViewMode('responses')
  }

  function viewSurveyAnalytics(survey: FeedbackSurvey) {
    setSelectedSurvey(survey)
    fetchResponses(survey.id)
    setViewMode('analytics')
  }

  // Calculate analytics for selected survey
  function calculateAnalytics() {
    if (responses.length === 0) return null

    const analytics: Record<string, { average?: number; distribution?: Record<string, number>; responses?: string[] }> = {}

    responses.forEach(response => {
      if (!response.answers) return
      Object.entries(response.answers).forEach(([questionId, answer]) => {
        if (!analytics[questionId]) {
          analytics[questionId] = { distribution: {}, responses: [] }
        }

        if (typeof answer === 'number') {
          // Rating question
          if (!analytics[questionId].average) {
            analytics[questionId].average = 0
          }
          analytics[questionId].distribution![answer.toString()] = (analytics[questionId].distribution![answer.toString()] || 0) + 1
        } else if (typeof answer === 'string') {
          // Text or choice question
          analytics[questionId].responses!.push(answer)
          analytics[questionId].distribution![answer] = (analytics[questionId].distribution![answer] || 0) + 1
        }
      })
    })

    // Calculate averages for rating questions
    Object.keys(analytics).forEach(questionId => {
      if (analytics[questionId].distribution) {
        const dist = analytics[questionId].distribution!
        let total = 0
        let count = 0
        Object.entries(dist).forEach(([rating, c]) => {
          const num = parseFloat(rating)
          if (!isNaN(num)) {
            total += num * c
            count += c
          }
        })
        if (count > 0) {
          analytics[questionId].average = total / count
        }
      }
    })

    return analytics
  }

  const stats = {
    total: surveys.length,
    active: surveys.filter(s => s.is_active).length,
    totalResponses: surveys.reduce((sum, s) => sum + (s.response_count || 0), 0),
    anonymous: surveys.filter(s => s.anonymous).length
  }

  return (
    <div className="p-8" data-testid="feedback-panel">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold" data-testid="feedback-title">סקרי משוב</h1>
        {viewMode !== 'list' && (
          <button
            className="btn-secondary"
            onClick={() => {
              setViewMode('list')
              setSelectedSurvey(null)
            }}
          >
            ← חזרה לרשימה
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" data-testid="feedback-stats">
        <div className="premium-stats-card orange">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-zinc-400">סך הכל סקרים</p>
        </div>
        <div className="premium-stats-card green">
          <p className="text-2xl font-bold text-white">{stats.active}</p>
          <p className="text-zinc-400">סקרים פעילים</p>
        </div>
        <div className="premium-stats-card purple">
          <p className="text-2xl font-bold text-white">{stats.totalResponses}</p>
          <p className="text-zinc-400">סה"כ תשובות</p>
        </div>
        <div className="premium-stats-card">
          <p className="text-2xl font-bold text-zinc-400">{stats.anonymous}</p>
          <p className="text-zinc-400">סקרים אנונימיים</p>
        </div>
      </div>

      {viewMode === 'list' && (
        <>
          {/* Actions Bar */}
          <div className="flex flex-wrap gap-4 mb-6">
            <button className="btn-primary flex items-center gap-2" onClick={openCreateModal} data-testid="add-survey-btn">
              <Plus className="w-4 h-4" />
              סקר חדש
            </button>
            <select
              className="input w-48"
              value={filterEventId}
              onChange={(e) => setFilterEventId(e.target.value)}
              data-testid="survey-event-filter"
            >
              <option value="">כל האירועים</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          {/* Surveys List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
            </div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-12 text-zinc-400" data-testid="no-surveys">
              <FileQuestion className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">אין סקרים עדיין</p>
              <p className="text-sm">צור סקר משוב ראשון לאירוע</p>
            </div>
          ) : (
            <div className="grid gap-4" data-testid="surveys-list">
              {surveys.map(survey => (
                <div key={survey.id} className="card hover:shadow-md transition-shadow" data-testid="survey-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{survey.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          survey.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-400'
                        }`}>
                          {survey.is_active ? 'פעיל' : 'לא פעיל'}
                        </span>
                        {survey.anonymous && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                            אנונימי
                          </span>
                        )}
                      </div>
                      {survey.description && (
                        <p className="text-zinc-400 text-sm mb-2">{survey.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {survey.events?.name || 'ללא אירוע'}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {survey.response_count} תשובות
                        </span>
                        {survey.starts_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            מ-{new Date(survey.starts_at).toLocaleDateString('he-IL')}
                          </span>
                        )}
                        {survey.ends_at && (
                          <span>
                            עד {new Date(survey.ends_at).toLocaleDateString('he-IL')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg"
                        onClick={() => viewSurveyResponses(survey)}
                        title="צפייה בתשובות"
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg"
                        onClick={() => viewSurveyAnalytics(survey)}
                        title="אנליטיקה"
                      >
                        <BarChart3 className="w-5 h-5" />
                      </button>
                      <button
                        className={`p-2 rounded-lg ${survey.is_active ? 'text-orange-400 hover:bg-orange-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'}`}
                        onClick={() => toggleSurveyActive(survey)}
                        title={survey.is_active ? 'השבת' : 'הפעל'}
                      >
                        {survey.is_active ? <ThumbsDown className="w-5 h-5" /> : <ThumbsUp className="w-5 h-5" />}
                      </button>
                      <button
                        className="p-2 text-zinc-400 hover:bg-white/5 rounded-lg"
                        onClick={() => openEditModal(survey)}
                        title="עריכה"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg"
                        onClick={() => deleteSurvey(survey.id)}
                        title="מחיקה"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Responses View */}
      {viewMode === 'responses' && selectedSurvey && (
        <div data-testid="responses-view">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">תשובות לסקר: {selectedSurvey.title}</h2>
            <span className="text-zinc-400">{responses.length} תשובות</span>
          </div>
          {responses.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">אין תשובות עדיין</p>
            </div>
          ) : (
            <div className="space-y-4">
              {responses.map(response => (
                <div key={response.id} className="card">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      {selectedSurvey.anonymous ? (
                        <span className="text-zinc-400">משתתף אנונימי</span>
                      ) : response.participants ? (
                        <span className="font-medium">{response.participants.first_name} {response.participants.last_name}</span>
                      ) : (
                        <span className="text-zinc-400">משתתף לא מזוהה</span>
                      )}
                    </div>
                    <span className="text-sm text-zinc-400">
                      {new Date(response.submitted_at).toLocaleString('he-IL')}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {response.answers && Object.entries(response.answers).map(([questionId, answer]) => (
                      <div key={questionId} className="bg-white/5 p-3 rounded-lg">
                        <p className="text-sm text-zinc-400 mb-1">שאלה: {questionId}</p>
                        <p className="font-medium">
                          {typeof answer === 'number' ? (
                            <span className="flex items-center gap-1">
                              {Array.from({ length: 5 }, (_, i) => (
                                <Star key={i} className={`w-4 h-4 ${i < answer ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                              ))}
                              <span className="mr-2">{answer}/5</span>
                            </span>
                          ) : (
                            String(answer)
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics View */}
      {viewMode === 'analytics' && selectedSurvey && (
        <div data-testid="analytics-view">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">אנליטיקה: {selectedSurvey.title}</h2>
            <span className="text-zinc-400">{responses.length} תשובות</span>
          </div>
          {responses.length === 0 ? (
            <div className="text-center py-12 text-zinc-400">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">אין נתונים לניתוח</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {(() => {
                const analytics = calculateAnalytics()
                if (!analytics) return null

                return Object.entries(analytics).map(([questionId, data]) => (
                  <div key={questionId} className="card">
                    <h3 className="font-medium mb-4">שאלה: {questionId}</h3>

                    {data.average !== undefined && (
                      <div className="mb-4">
                        <p className="text-3xl font-bold text-blue-600">{data.average.toFixed(1)}</p>
                        <p className="text-zinc-400">ממוצע דירוג</p>
                      </div>
                    )}

                    {data.distribution && Object.keys(data.distribution).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-zinc-400 mb-2">התפלגות תשובות:</p>
                        {Object.entries(data.distribution).map(([value, count]) => (
                          <div key={value} className="flex items-center gap-2">
                            <span className="w-20 text-sm">{value}</span>
                            <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full"
                                style={{ width: `${(count / responses.length) * 100}%` }}
                              />
                            </div>
                            <span className="w-12 text-sm text-zinc-400">{count} ({Math.round((count / responses.length) * 100)}%)</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {data.responses && data.responses.length > 0 && !data.distribution && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-zinc-400 mb-2">תשובות טקסט:</p>
                        <ul className="space-y-1">
                          {data.responses.slice(0, 10).map((r, i) => (
                            <li key={i} className="text-sm bg-white/5 p-2 rounded">{r}</li>
                          ))}
                          {data.responses.length > 10 && (
                            <li className="text-sm text-zinc-400">...ועוד {data.responses.length - 10} תשובות</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-modal p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" data-testid="survey-modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{editingSurvey ? 'עריכת סקר' : 'סקר חדש'}</h2>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-400">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">כותרת הסקר *</label>
                <input
                  type="text"
                  name="title"
                  className="input w-full"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  data-testid="survey-title-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">תיאור</label>
                <textarea
                  name="description"
                  className="input w-full h-20"
                  value={formData.description}
                  onChange={handleInputChange}
                  data-testid="survey-description-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">אירוע *</label>
                <select
                  name="event_id"
                  className="input w-full"
                  value={formData.event_id}
                  onChange={handleInputChange}
                  required
                  data-testid="survey-event-select"
                >
                  <option value="">בחר אירוע...</option>
                  {events.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך התחלה</label>
                  <input
                    type="date"
                    name="starts_at"
                    className="input w-full"
                    value={formData.starts_at}
                    onChange={handleInputChange}
                    data-testid="survey-start-date"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך סיום</label>
                  <input
                    type="date"
                    name="ends_at"
                    className="input w-full"
                    value={formData.ends_at}
                    onChange={handleInputChange}
                    data-testid="survey-end-date"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-white/20 rounded"
                  />
                  <span className="text-sm">סקר פעיל</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="anonymous"
                    checked={formData.anonymous}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 border-white/20 rounded"
                  />
                  <span className="text-sm">סקר אנונימי</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  ביטול
                </button>
                <button type="submit" className="btn-primary" data-testid="submit-survey-btn">
                  {editingSurvey ? 'שמור שינויים' : 'צור סקר'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
