import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Bot, Send, Loader2, MessageCircle, UserPlus, CheckSquare, PieChart, Target, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react'
import { useEvent } from '../../contexts/EventContext'
import { chatService } from '../../services/chatService'
import type { ChatMessage, ChatAction, PageContext } from '../../types/chat'

// AI Action Button Component
function AIActionButton({
  label,
  icon: Icon,
  onClick,
  disabled
}: {
  label: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-2 px-3 py-2 bg-violet-500/10 border border-violet-500/30 rounded-lg text-sm text-violet-400 hover:bg-violet-500/20 hover:border-violet-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Icon size={16} />
      {label}
    </button>
  )
}

// Action status labels in Hebrew
const ACTION_STATUS_LABELS: Record<string, string> = {
  event_created: 'האירוע נוצר בהצלחה',
  participants_added: 'המשתתפים נוספו בהצלחה',
  participants_listed: 'רשימת משתתפים נטענה',
  event_updated: 'האירוע עודכן בהצלחה',
  checklist_added: 'פריטי הצ\'קליסט נוספו',
  checklist_completed: 'המשימה סומנה כהושלמה',
  vendors_assigned: 'הספקים שויכו בהצלחה',
  vendors_found: 'נמצאו ספקים רלוונטיים',
  events_found: 'נמצאו אירועים דומים',
  schedule_suggested: 'הוצע לוח זמנים',
  whatsapp_sent: 'ההודעות נשלחו בהצלחה',
  schedule_items_added: 'פריטי הלו"ז נוספו בהצלחה',
  schedule_item_updated: 'פריט הלו"ז עודכן',
}

export function AIAssistantPage() {
  const { selectedEvent, refreshEvents } = useEvent()
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Generate unique ID
  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  // Build page context for chatService
  const buildPageContext = (): PageContext => ({
    currentPage: 'dashboard',
    eventId: selectedEvent?.id,
    eventName: selectedEvent?.name,
    availableCommands: []
  })

  // Handle send message - uses real Gemini via chatService
  const handleSend = async (overrideMessage?: string) => {
    const messageText = overrideMessage || input.trim()
    if (!messageText || isLoading) return

    if (!overrideMessage) setInput('')

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const response = await chatService.processMessage({
        message: messageText,
        context: buildPageContext(),
        agent: 'general',
        conversationHistory: messages.slice(-10)
      })

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        actions: response.actions,
        metadata: response.metadata,
      }
      setMessages(prev => [...prev, assistantMessage])

      // Update suggestions from response
      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions)
      }

      // If there are completed mutation actions, refresh events data
      const hasMutations = response.actions?.some(a =>
        ['event_created', 'participants_added', 'event_updated', 'checklist_added',
         'checklist_completed', 'vendors_assigned', 'whatsapp_sent',
         'schedule_items_added', 'schedule_item_updated'].includes(a.type)
      )
      if (hasMutations) {
        refreshEvents()
        // Invalidate messages + participant_schedules caches (AI may have created these)
        queryClient.invalidateQueries({ queryKey: ['messages'] })
        queryClient.invalidateQueries({ queryKey: ['participant_schedules'] })
      }
    } catch (error) {
      console.error('[AI Page] Send error:', error)
      const errorMsg = error instanceof Error ? error.message : 'שגיאה בלתי צפויה'
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `שגיאה בתקשורת עם העוזר: **${errorMsg}**\n\nבדוק את חיבור האינטרנט ונסה שוב.`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  // Quick action handlers
  const handleQuickAddParticipant = () => {
    setInput('הוסף משתתף חדש לאירוע')
    inputRef.current?.focus()
  }

  const handleQuickAddTask = () => {
    setInput('הוסף משימה חדשה לצ\'קליסט')
    inputRef.current?.focus()
  }

  const handleQuickStatus = () => {
    handleSend('מה הסטטוס המלא של האירוע? תן לי סיכום עם כל הפרטים')
  }

  const handleQuickIdeas = () => {
    setInput('הצע לי רעיונות יצירתיים לאירוע')
    inputRef.current?.focus()
  }

  // Suggestion click handler
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    inputRef.current?.focus()
  }

  // Render action badges for completed backend actions
  const renderActions = (actions?: ChatAction[]) => {
    if (!actions || actions.length === 0) return null

    return (
      <div className="mt-3 flex flex-wrap gap-2">
        {actions.map((action) => {
          const label = action.labelHebrew || ACTION_STATUS_LABELS[action.type] || action.label
          const isCompleted = action.completed || ['event_created', 'participants_added', 'event_updated',
            'checklist_added', 'checklist_completed', 'vendors_assigned', 'whatsapp_sent',
            'schedule_items_added', 'schedule_item_updated'].includes(action.type)
          const isNavigation = action.type === 'navigate' && action.targetPage

          if (isNavigation) {
            return (
              <button
                key={action.id}
                onClick={() => {
                  // Navigate via custom event
                  const navEvent = new CustomEvent('chat-navigate', {
                    detail: { page: action.targetPage, params: action.data as Record<string, string> }
                  })
                  window.dispatchEvent(navEvent)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/15 text-violet-400 rounded-lg text-xs hover:bg-violet-500/25 transition-all border border-violet-500/20"
              >
                <ExternalLink size={12} />
                {label}
              </button>
            )
          }

          if (isCompleted) {
            return (
              <span
                key={action.id}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs border border-emerald-500/20"
              >
                <CheckCircle size={12} />
                {label}
              </span>
            )
          }

          return (
            <span
              key={action.id}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-500/10 text-zinc-400 rounded-lg text-xs border border-zinc-500/20"
            >
              {label}
            </span>
          )
        })}
      </div>
    )
  }

  return (
    <div className="p-8 relative z-10">
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 right-20 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-orange-500/3 rounded-full blur-3xl" />
      </div>

      <div className="relative p-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-violet-400/80 text-sm font-medium mb-1">בינה מלאכותית</p>
          <h1 className="text-3xl font-bold text-white" data-testid="ai-title">עוזר AI</h1>
          <p className="text-zinc-400 mt-1">העוזר החכם שלך לתכנון אירועים</p>
        </div>

        {/* Chat Card */}
        <div className="max-w-4xl mx-auto">
          <div className={`group relative bg-[#1a1d27] rounded-2xl shadow-xl overflow-hidden ${selectedEvent ? 'border-2 border-red-500/80 shadow-red-500/10' : 'border border-white/10'}`} data-testid="ai-chat">
            {/* Gradient Header with Event Context */}
            <div className="relative bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#1a1d27]/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                    <Bot className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">EventFlow AI</h2>
                    <p className="text-white/80 text-sm">מומחה לתכנון והפקת אירועים</p>
                  </div>
                </div>

                {/* Event Context Badge */}
                {selectedEvent && (
                  <div className="bg-[#1a1d27]/30 backdrop-blur-sm rounded-xl px-4 py-2 border border-red-400/40">
                    <p className="text-red-300/80 text-xs mb-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                      מחובר לאירוע
                    </p>
                    <p className="text-white font-semibold flex items-center gap-2">
                      {selectedEvent.event_types?.icon && <span>{selectedEvent.event_types.icon}</span>}
                      {selectedEvent.name}
                    </p>
                  </div>
                )}
              </div>

              {/* Decorative circles */}
              <div className="absolute top-4 left-4 w-20 h-20 bg-[#1a1d27]/10 rounded-full blur-xl" />
              <div className="absolute bottom-0 right-10 w-32 h-32 bg-[#1a1d27]/5 rounded-full blur-2xl" />
            </div>

            {/* Quick Actions Bar */}
            {selectedEvent && (
              <div className="px-6 py-3 bg-[#161922] border-b border-white/10 flex items-center gap-3 overflow-x-auto">
                <span className="text-xs text-zinc-500 whitespace-nowrap">פעולות מהירות:</span>
                <AIActionButton icon={UserPlus} label="הוסף משתתף" onClick={handleQuickAddParticipant} />
                <AIActionButton icon={CheckSquare} label="משימה חדשה" onClick={handleQuickAddTask} />
                <AIActionButton icon={PieChart} label="סטטוס" onClick={handleQuickStatus} disabled={isLoading} />
                <AIActionButton icon={Target} label="רעיונות" onClick={handleQuickIdeas} />
              </div>
            )}

            {/* Chat History */}
            <div className="h-[400px] p-6 overflow-y-auto bg-[#161922]" data-testid="chat-history">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-violet-500/20 to-purple-500/15 rounded-2xl flex items-center justify-center mb-4">
                    <MessageCircle className="w-10 h-10 text-violet-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-300 mb-2">התחל שיחה</h3>
                  <p className="text-zinc-400 max-w-sm mb-2">
                    {selectedEvent
                      ? `שאל אותי כל שאלה על האירוע "${selectedEvent.name}"`
                      : 'בחר אירוע מהתפריט כדי להתחיל'}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-6 justify-center">
                    {(selectedEvent
                      ? ['מה הסטטוס של האירוע?', 'הוסף משתתף חדש', 'הצע רעיונות לאירוע', 'הוסף משימה לצ\'קליסט']
                      : ['עזרי לי לתכנן אירוע חדש', 'חפשי ספקים מומלצים', 'מה אתה יכול לעשות?']
                    ).map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="px-4 py-2 bg-[#1a1d27] border border-violet-500/30 rounded-full text-sm text-violet-400 hover:bg-violet-500/10 hover:border-violet-400 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-violet-500/20 text-white'
                            : 'bg-[#1a1d27] border border-white/10 text-zinc-200'
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>

                        {/* Render action badges from Gemini function calling */}
                        {renderActions(message.actions)}

                        <div className="mt-1 text-[10px] text-zinc-500">
                          {message.timestamp.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-end">
                      <div className="bg-[#1a1d27] border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                        <span className="text-zinc-400 text-sm">חושב...</span>
                      </div>
                    </div>
                  )}

                  {/* Dynamic suggestions after response */}
                  {!isLoading && suggestions.length > 0 && messages.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-center pt-2">
                      {suggestions.slice(0, 3).map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-3 py-1.5 bg-[#1a1d27] border border-violet-500/20 rounded-full text-xs text-violet-400/80 hover:bg-violet-500/10 hover:border-violet-400 transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-[#1a1d27]/80">
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                  placeholder={selectedEvent ? `שאל על "${selectedEvent.name}"...` : "בחר אירוע כדי להתחיל..."}
                  data-testid="ai-input"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40 hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  data-testid="ai-send-btn"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={20} />}
                </button>
              </form>
            </div>
          </div>

          {/* No Event Selected Warning */}
          {!selectedEvent && (
            <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
              <div>
                <p className="text-amber-400 font-medium">לא נבחר אירוע</p>
                <p className="text-zinc-400 text-sm mt-1">
                  בחר אירוע מהתפריט הצדדי כדי שאוכל לעזור לך לנהל אותו - להוסיף משתתפים, משימות, לו"ז ועוד.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
