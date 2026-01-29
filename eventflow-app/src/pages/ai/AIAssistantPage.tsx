import { useState, useEffect, useRef } from 'react'
import { Bot, Send, Loader2, MessageCircle, UserPlus, CheckSquare, PieChart, Target, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useEvent } from '../../contexts/EventContext'

// AI Chat Message Types
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  action?: {
    type: 'add_participant' | 'add_checklist' | 'add_schedule' | 'add_vendor' | 'update_event' | 'send_message'
    status: 'pending' | 'completed' | 'failed'
    data?: {
      name?: string
      title?: string
      [key: string]: unknown
    }
  }
}

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

export function AIAssistantPage() {
  const { selectedEvent, refreshEvents } = useEvent()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(7)

  // Add a new message
  const addMessage = (role: 'user' | 'assistant' | 'system', content: string, action?: ChatMessage['action']) => {
    const newMessage: ChatMessage = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      action
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage
  }

  // Simulate AI response based on user input
  const getAIResponse = async (userMessage: string): Promise<{ content: string; action?: ChatMessage['action'] }> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000))

    const lowerMessage = userMessage.toLowerCase()

    // Check for action intents
    if (lowerMessage.includes('הוסף משתתף') || lowerMessage.includes('הוסף אורח')) {
      // Extract name if provided
      const nameMatch = userMessage.match(/(?:בשם|שנקרא)\s+(.+?)(?:\s|$)/i)
      if (nameMatch && selectedEvent) {
        return {
          content: `אני יכול להוסיף משתתף חדש לאירוע "${selectedEvent.name}". האם תרצה שאמשיך?`,
          action: { type: 'add_participant', status: 'pending', data: { name: nameMatch[1] } }
        }
      }
      return {
        content: selectedEvent
          ? `בוודאי! ספר לי את פרטי המשתתף שתרצה להוסיף לאירוע "${selectedEvent.name}" - שם, טלפון ואימייל (אופציונלי).`
          : 'כדי להוסיף משתתף, קודם יש לבחור אירוע. לחץ על אירוע מרשימת האירועים בתפריט הצדדי.'
      }
    }

    if (lowerMessage.includes('הוסף משימה') || lowerMessage.includes('משימה חדשה') || lowerMessage.includes('צ\'קליסט')) {
      return {
        content: selectedEvent
          ? `מה המשימה שתרצה להוסיף לאירוע "${selectedEvent.name}"? תאר את המשימה ואני אוסיף אותה לרשימה.`
          : 'כדי להוסיף משימה, קודם יש לבחור אירוע.'
      }
    }

    if (lowerMessage.includes('הוסף לוז') || lowerMessage.includes('הוסף פריט') || lowerMessage.includes('תוכניה')) {
      return {
        content: selectedEvent
          ? `אשמח להוסיף פריט ללו"ז של "${selectedEvent.name}". ספר לי: מה הנושא, מתי מתחיל ומתי נגמר?`
          : 'כדי להוסיף ללו"ז, קודם יש לבחור אירוע.'
      }
    }

    if (lowerMessage.includes('שלח הודעה') || lowerMessage.includes('וואטסאפ') || lowerMessage.includes('whatsapp')) {
      return {
        content: selectedEvent
          ? `אני יכול לעזור לשלוח הודעות WhatsApp למשתתפי "${selectedEvent.name}". מה תרצה לכתוב?`
          : 'כדי לשלוח הודעות, קודם יש לבחור אירוע עם משתתפים.'
      }
    }

    if (lowerMessage.includes('סטטוס') || lowerMessage.includes('מה המצב')) {
      if (selectedEvent) {
        return {
          content: `📊 סטטוס האירוע "${selectedEvent.name}":\n\n` +
            `• תאריך: ${new Date(selectedEvent.start_date).toLocaleDateString('he-IL')}\n` +
            `• מיקום: ${selectedEvent.venue_name || 'לא הוגדר'}\n` +
            `• משתתפים: ${selectedEvent.participants_count || 0}\n` +
            `• סטטוס: ${selectedEvent.status === 'active' ? 'פעיל' : selectedEvent.status === 'planning' ? 'בתכנון' : selectedEvent.status}\n\n` +
            `איך אוכל לעזור עם האירוע?`
        }
      }
      return { content: 'בחר אירוע כדי לראות את הסטטוס שלו.' }
    }

    if (lowerMessage.includes('עזרה') || lowerMessage.includes('מה אתה יכול')) {
      return {
        content: `🤖 אני יכול לעזור לך ב:\n\n` +
          `📋 **ניהול משתתפים**\n• הוספת משתתפים חדשים\n• עדכון פרטי משתתפים\n• יבוא רשימות מאקסל\n\n` +
          `📅 **ניהול לו"ז**\n• הוספת פריטים ללו"ז\n• עדכון זמנים ומיקומים\n• הקצאת מרצים\n\n` +
          `✅ **משימות**\n• יצירת משימות חדשות\n• מעקב התקדמות\n• תזכורות\n\n` +
          `📱 **תקשורת**\n• שליחת הודעות WhatsApp\n• הכנת תבניות הודעות\n\n` +
          `פשוט ספר לי מה אתה צריך!`
      }
    }

    if (lowerMessage.includes('רעיונות') || lowerMessage.includes('הצע') || lowerMessage.includes('המלצות')) {
      return {
        content: selectedEvent
          ? `💡 הנה כמה רעיונות לאירוע "${selectedEvent.name}":\n\n` +
            `1. **פעילות פתיחה** - שוברת קרח לחימום האווירה\n` +
            `2. **הפסקות networking** - זמן לקשרים בין המשתתפים\n` +
            `3. **סיכום יומי** - דגשים עיקריים בסוף כל יום\n` +
            `4. **תיבת שאלות** - מקום לשאלות אנונימיות\n` +
            `5. **מתנות לזכרון** - משהו קטן לסוף האירוע\n\n` +
            `רוצה שארחיב על אחד מהרעיונות?`
          : 'בחר אירוע ואשמח להציע רעיונות מותאמים!'
      }
    }

    // Default response
    return {
      content: selectedEvent
        ? `אני כאן לעזור עם "${selectedEvent.name}"! אתה יכול:\n\n` +
          `• להוסיף משתתפים או משימות\n` +
          `• לשאול על סטטוס האירוע\n` +
          `• לבקש רעיונות והמלצות\n` +
          `• לנהל את הלו"ז והתוכניה\n\n` +
          `מה תרצה לעשות?`
        : 'שלום! 👋 אני העוזר החכם של EventFlow.\n\n' +
          'כדי שאוכל לעזור לך בצורה הטובה ביותר, בחר אירוע מהתפריט הצדדי.\n\n' +
          'אחרי שתבחר אירוע, אוכל לעזור לך עם:\n' +
          '• הוספת משתתפים ומשימות\n' +
          '• ניהול הלו"ז\n' +
          '• שליחת הודעות\n' +
          '• ועוד הרבה!'
    }
  }

  // Execute action
  const executeAction = async (action: ChatMessage['action'], messageId: string) => {
    if (!action || !selectedEvent) return

    setMessages(prev => prev.map(m =>
      m.id === messageId
        ? { ...m, action: { ...m.action!, status: 'pending' as const } }
        : m
    ))

    try {
      switch (action.type) {
        case 'add_participant': {
          const names = action.data?.name?.split(' ') || ['חדש', 'משתתף']
          const { error: err1 } = await supabase.from('participants').insert({
            event_id: selectedEvent.id,
            first_name: names[0],
            last_name: names.slice(1).join(' ') || '',
            status: 'invited'
          })
          if (err1) throw err1
          addMessage('assistant', `✅ המשתתף "${action.data?.name}" נוסף בהצלחה לאירוע!`)
          refreshEvents()
          break
        }

        case 'add_checklist': {
          const { error: err2 } = await supabase.from('checklist_items').insert({
            event_id: selectedEvent.id,
            title: action.data?.title || 'משימה חדשה',
            status: 'pending',
            priority: 'medium'
          })
          if (err2) throw err2
          addMessage('assistant', `✅ המשימה נוספה בהצלחה!`)
          break
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, action: { ...m.action!, status: 'completed' as const } }
          : m
      ))
    } catch (error) {
      console.error('Action failed:', error)
      setMessages(prev => prev.map(m =>
        m.id === messageId
          ? { ...m, action: { ...m.action!, status: 'failed' as const } }
          : m
      ))
      addMessage('assistant', '❌ מצטער, לא הצלחתי לבצע את הפעולה. נסה שוב.')
    }
  }

  // Handle send message
  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    addMessage('user', userMessage)
    setIsLoading(true)

    try {
      const response = await getAIResponse(userMessage)
      addMessage('assistant', response.content, response.action)

      // If there's a pending action, ask for confirmation
      if (response.action?.status === 'pending') {
        // Auto-execute after a small delay for demo purposes
        // In production, you'd want explicit user confirmation
      }
    } catch (error) {
      addMessage('assistant', 'מצטער, משהו השתבש. נסה שוב.')
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  // Quick action handlers
  const handleQuickAddParticipant = () => {
    setInput('הוסף משתתף חדש')
    inputRef.current?.focus()
  }

  const handleQuickAddTask = () => {
    setInput('הוסף משימה חדשה')
    inputRef.current?.focus()
  }

  const handleQuickStatus = () => {
    setInput('מה הסטטוס של האירוע?')
    handleSend()
  }

  const handleQuickIdeas = () => {
    setInput('הצע לי רעיונות לאירוע')
    inputRef.current?.focus()
  }

  // Suggestion click handler
  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    inputRef.current?.focus()
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
          <div className="group relative bg-[#1a1d27] border border-white/10 rounded-2xl shadow-xl overflow-hidden" data-testid="ai-chat">
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
                  <div className="bg-[#1a1d27]/30 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/20">
                    <p className="text-white/60 text-xs mb-0.5">אירוע פעיל</p>
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
                <AIActionButton icon={PieChart} label="סטטוס" onClick={handleQuickStatus} />
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
                      : ['מה אתה יכול לעשות?', 'איך מתחילים?', 'עזרה']
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

                        {/* Action buttons for pending actions */}
                        {message.action?.status === 'pending' && (
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => executeAction(message.action, message.id)}
                              className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-sm hover:bg-emerald-500/30 transition-all flex items-center gap-1"
                            >
                              <CheckCircle size={14} />
                              אשר
                            </button>
                            <button
                              onClick={() => setMessages(prev => prev.map(m =>
                                m.id === message.id ? { ...m, action: undefined } : m
                              ))}
                              className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-all flex items-center gap-1"
                            >
                              <XCircle size={14} />
                              בטל
                            </button>
                          </div>
                        )}

                        {message.action?.status === 'completed' && (
                          <div className="mt-2 flex items-center gap-1 text-emerald-400 text-xs">
                            <CheckCircle size={12} />
                            הפעולה בוצעה בהצלחה
                          </div>
                        )}

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
