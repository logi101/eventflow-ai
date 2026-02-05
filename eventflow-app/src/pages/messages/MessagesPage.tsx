// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Messages Page (Full Table View)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState
} from '@tanstack/react-table'
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  CheckCircle,
  CheckCheck,
  XCircle,
  Clock,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Plus,
  Eye,
  RotateCcw,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Bot,
  Wand2,
  Pencil,
  Trash2,
  AlertTriangle,
  Shield
} from 'lucide-react'
import { useMessages, useMessageStats, useSendMessage, useRetryMessage, useGenerateMessages, useUpdateMessage, useDeleteMessage, useDeleteAllMessages } from '../../hooks/useMessages'
import { useEvent } from '../../contexts/EventContext'
import { useGracePeriod } from '../../contexts/GracePeriodContext'
import type {
  MessageWithRelations,
  MessageStatus,
  MessageChannel,
  MessageDirection,
  MessageFilters
} from '../../schemas/messages'
import {
  messageStatusLabels,
  messageChannelLabels,
  messageStatusColors,
  messageDirectionLabels,
  messageDirectionColors
} from '../../schemas/messages'

// ────────────────────────────────────────────────────────────────────────────
// Status Badge Component
// ────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: MessageStatus }) {
  const icons: Record<MessageStatus, React.ReactNode> = {
    pending: <Clock size={14} />,
    scheduled: <Calendar size={14} />,
    sending: <Loader2 size={14} className="animate-spin" />,
    sent: <Send size={14} />,
    delivered: <CheckCircle size={14} />,
    read: <CheckCheck size={14} />,
    failed: <XCircle size={14} />,
    expired: <Clock size={14} />,
    cancelled: <X size={14} />
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${messageStatusColors[status]}`}>
      {icons[status]}
      {messageStatusLabels[status]}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Channel Icon Component
// ────────────────────────────────────────────────────────────────────────────

function ChannelIcon({ channel }: { channel: MessageChannel }) {
  const icons: Record<MessageChannel, React.ReactNode> = {
    whatsapp: <MessageSquare size={16} className="text-green-600" />,
    email: <Mail size={16} className="text-blue-600" />,
    sms: <Phone size={16} className="text-purple-600" />
  }

  return (
    <span className="flex items-center gap-1">
      {icons[channel]}
      <span className="text-sm">{messageChannelLabels[channel]}</span>
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Direction Badge Component
// ────────────────────────────────────────────────────────────────────────────

function DirectionBadge({ direction, autoReply }: { direction: MessageDirection; autoReply?: boolean }) {
  const isIncoming = direction === 'incoming'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${messageDirectionColors[direction]}`}>
      {isIncoming ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
      {messageDirectionLabels[direction]}
      {autoReply && <Bot size={12} className="mr-1 text-purple-500" />}
    </span>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Stats Cards Component
// ────────────────────────────────────────────────────────────────────────────

function StatsCards({ stats, isLoading }: { stats: ReturnType<typeof useMessageStats>['data']; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-lg p-4 bg-zinc-800 border border-zinc-700 animate-pulse">
            <div className="h-8 bg-zinc-700 rounded mb-2"></div>
            <div className="h-4 bg-zinc-700 rounded"></div>
          </div>
        ))}
      </div>
    )
  }

  if (!stats) return null

  const cards = [
    { label: 'סה"כ', value: stats.total, color: 'bg-zinc-700/50 text-zinc-300' },
    { label: 'יוצאות', value: stats.byDirection.outgoing, color: 'bg-blue-900/40 text-blue-300' },
    { label: 'נכנסות', value: stats.byDirection.incoming, color: 'bg-purple-900/40 text-purple-300' },
    { label: 'נמסרו', value: stats.delivered, color: 'bg-green-900/40 text-green-300' },
    { label: 'נקראו', value: stats.read, color: 'bg-emerald-900/40 text-emerald-300' },
    { label: 'נכשלו', value: stats.failed, color: 'bg-red-900/40 text-red-300' }
  ]

  return (
    <div className="relative grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map(card => (
        <div key={card.label} className={`relative rounded-lg p-4 border border-zinc-700 ${card.color}`}>
          <div className="text-2xl font-bold relative z-10">{card.value}</div>
          <div className="text-sm relative z-10">{card.label}</div>
        </div>
      ))}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Send Message Modal
// ────────────────────────────────────────────────────────────────────────────

function SendMessageModal({
  isOpen,
  onClose,
  eventId
}: {
  isOpen: boolean
  onClose: () => void
  eventId?: string
}) {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const sendMessage = useSendMessage()
 
  const handleSend = async () => {
    try {
      await sendMessage.mutateAsync({
        to_phone: phone,
        content: message,
        channel: 'whatsapp',
        event_id: eventId
      })
      onClose()
      setPhone('')
      setMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4 border border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">שליחת הודעה חדשה</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded">
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">מספר טלפון</label>
            <input
              type="tel"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              placeholder="0501234567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">תוכן ההודעה</label>
            <textarea
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px] text-white"
              placeholder="תוכן ההודעה..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          {sendMessage.isError && (
            <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
              שגיאה בשליחת ההודעה
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
            >
              ביטול
            </button>
            <button
              onClick={handleSend}
              disabled={!phone || !message || sendMessage.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sendMessage.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
              שלח
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Message Detail Modal
// ────────────────────────────────────────────────────────────────────────────

function MessageDetailModal({
  message,
  onClose
}: {
  message: MessageWithRelations | null
  onClose: () => void
}) {
  const retryMessage = useRetryMessage()

  if (!message) return null

  const handleRetry = async () => {
    try {
      await retryMessage.mutateAsync(message.id)
    } catch (error) {
      console.error('Retry failed:', error)
    }
  }

  // Get recipient name from participant relation or show phone
  const recipientName = message.participants
    ? (message.participants.full_name || `${message.participants.first_name} ${message.participants.last_name}`)
    : message.to_phone

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto border border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">פרטי הודעה</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded">
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <DirectionBadge direction={message.direction || 'outgoing'} autoReply={message.auto_reply} />
            <StatusBadge status={message.status} />
            <ChannelIcon channel={message.channel} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-zinc-400">נמען</label>
              <p className="font-medium text-white">{recipientName}</p>
            </div>
            <div>
              <label className="text-sm text-zinc-400">טלפון</label>
              <p className="font-medium text-white" dir="ltr">{message.to_phone || '-'}</p>
            </div>
            {message.subject && (
              <div className="col-span-2">
                <label className="text-sm text-zinc-400">נושא</label>
                <p className="font-medium text-white">{message.subject}</p>
              </div>
            )}
            <div>
              <label className="text-sm text-zinc-400">אירוע</label>
              <p className="font-medium text-white">{message.events?.name || '-'}</p>
            </div>
          </div>

          <div>
            <label className="text-sm text-zinc-400">תוכן ההודעה</label>
            <div className="mt-1 p-3 bg-zinc-800 rounded-lg whitespace-pre-wrap text-white">
              {message.content}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <label className="text-zinc-400">נוצרה</label>
              <p className="text-white">{format(new Date(message.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
            </div>
            {message.scheduled_for && (
              <div>
                <label className="text-zinc-400 flex items-center gap-1"><Calendar size={12} /> מתוזמנת ל</label>
                <p className="text-amber-300 font-medium">{format(new Date(message.scheduled_for), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
              </div>
            )}
            {message.sent_at && (
              <div>
                <label className="text-zinc-400">נשלחה</label>
                <p className="text-white">{format(new Date(message.sent_at), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
              </div>
            )}
            {message.delivered_at && (
              <div>
                <label className="text-zinc-400">נמסרה</label>
                <p className="text-white">{format(new Date(message.delivered_at), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
              </div>
            )}
            {message.read_at && (
              <div>
                <label className="text-zinc-400">נקראה</label>
                <p className="text-white">{format(new Date(message.read_at), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
              </div>
            )}
          </div>

          {message.error_message && (
            <div className="p-3 bg-red-900/40 border border-red-700 rounded-lg">
              <label className="text-sm text-red-400 font-medium">שגיאה</label>
              <p className="text-red-300">{message.error_message}</p>
            </div>
          )}

          {message.status === 'failed' && (
            <button
              onClick={handleRetry}
              disabled={retryMessage.isPending}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {retryMessage.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <RotateCcw size={18} />
              )}
              נסה שוב
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Edit Message Modal
// ────────────────────────────────────────────────────────────────────────────

function EditMessageModal({
  message,
  onClose,
  onSaveWithGrace
}: {
  message: MessageWithRelations | null
  onClose: () => void
  onSaveWithGrace: (messageId: string, content: string, subject: string | null) => void
}) {
  const [content, setContent] = useState(message?.content || '')
  const [subject, setSubject] = useState(message?.subject || '')

  // Reset form when message changes
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (message) {
        setContent(message.content || '')
        setSubject(message.subject || '')
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [message])

  if (!message) return null

  const handleSave = () => {
    onSaveWithGrace(message.id, content, subject || null)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4 border border-zinc-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Pencil size={20} />
            עריכת הודעה
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded">
            <X size={20} className="text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">נושא</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              placeholder="נושא ההודעה (אופציונלי)"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">תוכן ההודעה</label>
            <textarea
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px] text-white"
              placeholder="תוכן ההודעה..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>

          <div className="p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg text-amber-300 text-sm">
            השינוי ייכנס לתוקף בעוד 60 שניות - ניתן לבטל
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={!content}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Pencil size={18} />
              שמור
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Delete Confirmation Modal (Single Message)
// ────────────────────────────────────────────────────────────────────────────

function DeleteConfirmModal({
  message,
  onClose,
  onConfirm,
  isPending
}: {
  message: MessageWithRelations | null
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  if (!message) return null

  const recipientName = message.participants
    ? (message.participants.full_name || `${message.participants.first_name} ${message.participants.last_name}`)
    : message.to_phone

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-sm mx-4 border border-red-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-900/40 rounded-full">
            <Trash2 size={24} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">מחיקת הודעה</h2>
        </div>

        <p className="text-zinc-300 mb-2">
          האם למחוק את ההודעה ל<strong className="text-white">{recipientName}</strong>?
        </p>
        <div className="p-3 bg-zinc-800 rounded-lg text-sm text-zinc-400 mb-4 max-h-[80px] overflow-hidden">
          {message.content}
        </div>
        <p className="text-red-400 text-sm mb-4">פעולה זו אינה הפיכה</p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
          >
            ביטול
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            מחק
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Delete All Confirmation Modal (Admin Confirmation)
// ────────────────────────────────────────────────────────────────────────────

function DeleteAllConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  messageCount,
  eventName
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isPending: boolean
  messageCount: number
  eventName?: string
}) {
  const [confirmText, setConfirmText] = useState('')
  const CONFIRM_WORD = 'מחק הכל'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-lg p-6 w-full max-w-md mx-4 border border-red-700">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-900/40 rounded-full">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white">מחיקת כל ההודעות</h2>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-800 rounded-lg">
            <Shield size={18} className="text-red-400 shrink-0" />
            <p className="text-red-300 text-sm">
              פעולה זו דורשת אישור מנהל - מחיקה בלתי הפיכה
            </p>
          </div>

          <p className="text-zinc-300">
            {eventName ? (
              <>פעולה זו תמחק <strong className="text-white">{messageCount}</strong> הודעות מהאירוע <strong className="text-orange-400">{eventName}</strong></>
            ) : (
              <>פעולה זו תמחק <strong className="text-white">{messageCount}</strong> הודעות מכל האירועים</>
            )}
          </p>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1">
              הקלד "<span className="text-red-400 font-bold">{CONFIRM_WORD}</span>" לאישור
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white"
              placeholder={CONFIRM_WORD}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              dir="rtl"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { onClose(); setConfirmText('') }}
            className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600"
          >
            ביטול
          </button>
          <button
            onClick={() => { onConfirm(); setConfirmText('') }}
            disabled={confirmText !== CONFIRM_WORD || isPending}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Trash2 size={18} />
            )}
            מחק הכל
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────────
// Main Messages Page
// ────────────────────────────────────────────────────────────────────────────

export function MessagesPage() {
  // Get selected event from context
  const { selectedEvent } = useEvent()
  const { queueChange, pendingChanges } = useGracePeriod()

  // State
  const [filters, setFilters] = useState<MessageFilters>({})
  const [showAllMessages, setShowAllMessages] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'scheduled_for', desc: false }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [showSendModal, setShowSendModal] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<MessageWithRelations | null>(null)
  const [editingMessage, setEditingMessage] = useState<MessageWithRelations | null>(null)
  const [deletingMessage, setDeletingMessage] = useState<MessageWithRelations | null>(null)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const nowLineRef = useRef<HTMLTableRowElement>(null)

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  // Data
  const { data: messages = [], isLoading, error, refetch } = useMessages({
    ...filters,
    event_id: showAllMessages ? undefined : selectedEvent?.id
  })
  const { data: stats, isLoading: statsLoading } = useMessageStats(showAllMessages ? undefined : selectedEvent?.id)
  const generateMessages = useGenerateMessages()
  const deleteMessage = useDeleteMessage()
  const deleteAllMessages = useDeleteAllMessages()
  const updateMessage = useUpdateMessage()

  // Grace period: queue message edit
  const handleEditWithGrace = (messageId: string, content: string, subject: string | null) => {
    const msg = messages.find(m => m.id === messageId)
    const recipientName = msg?.participants?.full_name || msg?.to_phone || ''

    queueChange({
      type: 'message_update',
      eventId: msg?.event_id || '',
      description: `עדכון הודעה ל${recipientName}`,
      payload: { messageId, content, subject },
      executeFn: async () => {
        await updateMessage.mutateAsync({ id: messageId, content, subject })
      }
    })
  }

  const handleDeleteMessage = async () => {
    if (!deletingMessage) return
    const msgToDelete = deletingMessage
    setDeletingMessage(null)

    // Queue with 60s grace period
    queueChange({
      type: 'message_delete',
      eventId: msgToDelete.event_id || '',
      description: `מחיקת הודעה ל${msgToDelete.participants?.full_name || msgToDelete.to_phone || 'לא ידוע'}`,
      payload: { messageId: msgToDelete.id },
      executeFn: async () => {
        await deleteMessage.mutateAsync(msgToDelete.id)
      }
    })
  }

  const handleDeleteAll = async () => {
    const eventId = showAllMessages ? undefined : selectedEvent?.id
    setShowDeleteAllModal(false)

    // Queue with 60s grace period
    queueChange({
      type: 'message_delete_all',
      eventId: eventId || '',
      description: `מחיקת ${messages.length} הודעות`,
      payload: { eventId },
      messageImpact: {
        messagesToCreate: 0,
        messagesToUpdate: 0,
        messagesToDelete: messages.length,
        affectedParticipants: 0
      },
      executeFn: async () => {
        await deleteAllMessages.mutateAsync(eventId)
      }
    })
  }

  const handleGenerateMessages = async () => {
    if (!selectedEvent?.id) return
    try {
      const result = await generateMessages.mutateAsync(selectedEvent.id)
      if (result?.created_messages > 0) {
        refetch()
      }
    } catch (err) {
      console.error('Failed to generate messages:', err)
    }
  }

  // Helper: check pending state for a message
  const getMessagePendingState = (messageId: string): 'edit' | 'delete' | null => {
    for (const change of pendingChanges) {
      if (change.type === 'message_delete_all') return 'delete'
      if (change.type === 'message_delete' && (change.payload as { messageId: string }).messageId === messageId) return 'delete'
      if (change.type === 'message_update' && (change.payload as { messageId: string }).messageId === messageId) return 'edit'
    }
    return null
  }

  // Table columns definition
  const columns = useMemo<ColumnDef<MessageWithRelations>[]>(() => [
    {
      accessorKey: 'created_at',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-zinc-300"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          תאריך
          {column.getIsSorted() === 'asc' ? <ChevronUp size={14} /> : column.getIsSorted() === 'desc' ? <ChevronDown size={14} /> : null}
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap text-zinc-300">
          {format(new Date(row.original.created_at), 'dd/MM/yy HH:mm', { locale: he })}
        </span>
      )
    },
    {
      accessorKey: 'scheduled_for',
      header: ({ column }) => (
        <button
          className="flex items-center gap-1 text-zinc-300"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          <Calendar size={14} />
          מתוזמנת ל
          {column.getIsSorted() === 'asc' ? <ChevronUp size={14} /> : column.getIsSorted() === 'desc' ? <ChevronDown size={14} /> : null}
        </button>
      ),
      cell: ({ row }) => {
        const scheduledFor = row.original.scheduled_for
        if (!scheduledFor) return <span className="text-sm text-zinc-600">-</span>
        return (
          <span className="text-sm whitespace-nowrap text-amber-300 font-medium">
            {format(new Date(scheduledFor), 'dd/MM/yy HH:mm', { locale: he })}
          </span>
        )
      }
    },
    {
      accessorKey: 'direction',
      header: 'כיוון',
      cell: ({ row }) => (
        <DirectionBadge
          direction={row.original.direction || 'outgoing'}
          autoReply={row.original.auto_reply}
        />
      ),
      filterFn: 'equals'
    },
    {
      accessorKey: 'recipient',
      header: 'נמען / שולח',
      cell: ({ row }) => {
        const participant = row.original.participants
        const isIncoming = row.original.direction === 'incoming'
        const name = participant
          ? (participant.full_name || `${participant.first_name} ${participant.last_name}`)
          : '-'
        const phone = isIncoming ? row.original.from_phone : row.original.to_phone
        return (
          <div>
            <div className="font-medium text-white">{name}</div>
            <div className="text-xs text-zinc-400" dir="ltr">{phone}</div>
          </div>
        )
      }
    },
    {
      accessorKey: 'channel',
      header: 'ערוץ',
      cell: ({ row }) => <ChannelIcon channel={row.original.channel} />,
      filterFn: 'equals'
    },
    {
      accessorKey: 'subject',
      header: 'נושא',
      cell: ({ row }) => (
        <span className="text-sm text-zinc-300">{row.original.subject || '-'}</span>
      )
    },
    {
      accessorKey: 'content',
      header: 'תוכן',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate text-sm text-zinc-400">
          {row.original.content}
        </div>
      )
    },
    {
      accessorKey: 'status',
      header: 'סטטוס',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
      filterFn: 'equals'
    },
    {
      accessorKey: 'events.name',
      header: 'אירוע',
      cell: ({ row }) => (
        <span className="text-sm text-zinc-300">{row.original.events?.name || '-'}</span>
      )
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const pending = getMessagePendingState(row.original.id)
        if (pending) {
          return (
            <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
              pending === 'delete'
                ? 'bg-red-900/50 text-red-300'
                : 'bg-amber-900/50 text-amber-300'
            }`}>
              {pending === 'delete' ? 'ממתין למחיקה' : 'ממתין לעדכון'}
            </span>
          )
        }
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setSelectedMessage(row.original)
              }}
              className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
              title="צפה בפרטים"
            >
              <Eye size={16} className="text-zinc-400 hover:text-blue-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setEditingMessage(row.original)
              }}
              className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
              title="ערוך הודעה"
            >
              <Pencil size={16} className="text-zinc-400 hover:text-yellow-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setDeletingMessage(row.original)
              }}
              className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
              title="מחק הודעה"
            >
              <Trash2 size={16} className="text-zinc-400 hover:text-red-400" />
            </button>
          </div>
        )
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [pendingChanges, getMessagePendingState])

  // Table instance
  const table = useReactTable({
    data: messages,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 20 }
    }
  })

  // Compute the "now" line position among visible rows
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const nowLineRowIndex = useMemo(() => {
    const rows = table.getRowModel().rows
    const now = currentTime.getTime()

    // Collect rows with a time reference: prefer scheduled_for, fall back to sent_at or created_at
    const timedRows = rows
      .map((row, idx) => ({
        idx,
        time: row.original.scheduled_for || row.original.sent_at || row.original.created_at
      }))
      .filter(r => r.time)

    if (timedRows.length === 0) return -1

    // Determine visual sort direction from the data
    const firstTime = new Date(timedRows[0].time!).getTime()
    const lastTime = new Date(timedRows[timedRows.length - 1].time!).getTime()
    const isAscending = firstTime <= lastTime

    if (isAscending) {
      // Find first future row — now line goes before it
      for (const { idx, time } of timedRows) {
        if (new Date(time!).getTime() > now) return idx
      }
      // All in the past — line goes after the last row
      return timedRows[timedRows.length - 1].idx + 1
    } else {
      // Descending: find first past row — now line goes before it
      for (const { idx, time } of timedRows) {
        if (new Date(time!).getTime() <= now) return idx
      }
      // All in the future — line goes after the last row
      return timedRows[timedRows.length - 1].idx + 1
    }
  }, [table.getRowModel().rows, currentTime])

  // Auto-scroll to the now line on first render
  useEffect(() => {
    if (nowLineRef.current) {
      nowLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [nowLineRowIndex])

  // Loading state
  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-4 text-red-300">
          שגיאה בטעינת ההודעות
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-zinc-900 min-h-screen relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-white" data-testid="messages-title">הודעות</h1>
          {selectedEvent && !showAllMessages && (
            <div className="text-sm text-zinc-400">
              <span className="text-orange-400">{selectedEvent.name}</span> - אירוע נוכחי
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedEvent && (
            <button
              onClick={() => setShowAllMessages(!showAllMessages)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors relative z-10 ${
                showAllMessages
                  ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {showAllMessages ? (
                <>
                  <span>אירוע נוכחי</span>
                </>
              ) : (
                <>
                  <span>הצג הכל</span>
                </>
              )}
            </button>
          )}
          {selectedEvent && !showAllMessages && (
            <button
              onClick={handleGenerateMessages}
              disabled={generateMessages.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 relative z-10"
              title="יצירת הודעות מתוזמנות לכל המשתתפים"
            >
              {generateMessages.isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Wand2 size={18} />
              )}
              צור הודעות
            </button>
          )}
          {messages.length > 0 && (
            <button
              onClick={() => setShowDeleteAllModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-900/40 text-red-300 border border-red-700 rounded-lg hover:bg-red-900/60 relative z-10"
              title="מחק את כל ההודעות"
            >
              <Trash2 size={18} />
              מחק הכל
            </button>
          )}
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-zinc-700 rounded-lg relative z-10"
            title="רענן"
          >
            <RefreshCw size={20} className="text-zinc-300" />
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 relative z-10"
          >
            <Plus size={18} />
            הודעה חדשה
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="relative z-10">
        <StatsCards stats={stats} isLoading={statsLoading} />
      </div>

      {/* Filters Bar */}
      <div className="bg-zinc-800 rounded-lg shadow mb-4 p-4 border border-zinc-700">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px] relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="חיפוש..."
              value={globalFilter}
              onChange={e => setGlobalFilter(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-zinc-700 border border-zinc-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${showFilters ? 'bg-blue-900/40 border-blue-500' : 'hover:bg-zinc-700 border-zinc-600'}`}
          >
            <Filter size={18} className="text-zinc-300" />
            סינון
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-zinc-700 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">סטטוס</label>
              <select
                value={filters.status || ''}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value as MessageStatus || undefined }))}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
              >
                <option value="">הכל</option>
                {Object.entries(messageStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">ערוץ</label>
              <select
                value={filters.channel || ''}
                onChange={e => setFilters(f => ({ ...f, channel: e.target.value as MessageChannel || undefined }))}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
              >
                <option value="">הכל</option>
                {Object.entries(messageChannelLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">כיוון</label>
              <select
                value={filters.direction || ''}
                onChange={e => setFilters(f => ({ ...f, direction: e.target.value as MessageDirection || undefined }))}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white"
              >
                <option value="">הכל</option>
                {Object.entries(messageDirectionLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilters({})}
                className="px-4 py-2 text-zinc-400 hover:bg-zinc-700 rounded-lg"
              >
                נקה סינון
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-zinc-800 rounded-lg shadow overflow-hidden border border-zinc-700" data-testid="messages-panel">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-700 border-b border-zinc-600">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-right text-sm font-medium text-zinc-300"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-400">
                    אין הודעות להצגה
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, rowIndex) => {
                  const isIncoming = row.original.direction === 'incoming'
                  const pendingState = getMessagePendingState(row.original.id)
                  const isPendingDelete = pendingState === 'delete'
                  const isPendingEdit = pendingState === 'edit'
                  const showNowLine = nowLineRowIndex === rowIndex

                  return (
                  <React.Fragment key={row.id}>
                    {showNowLine && (
                      <tr ref={nowLineRef} className="bg-transparent">
                        <td colSpan={columns.length} className="p-0">
                          <div className="relative flex items-center py-1.5">
                            <div
                              className="absolute -right-[2px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-red-500 z-10 border-2 border-red-400"
                              style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.2)' }}
                            />
                            <div className="w-full flex items-center gap-3 pr-6">
                              <span className="text-xs font-bold text-red-400 bg-red-500/15 px-2.5 py-1 rounded-lg border border-red-500/30 shrink-0">
                                עכשיו {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className="flex-1 h-[2px] bg-gradient-to-l from-red-500 to-red-500/20 rounded-full" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr
                      className={`cursor-pointer transition-all relative ${
                        isPendingDelete
                          ? 'opacity-40 bg-red-900/10'
                          : isPendingEdit
                            ? 'bg-amber-900/10'
                            : isIncoming
                              ? 'bg-purple-900/20 hover:bg-purple-900/30'
                              : 'hover:bg-zinc-700'
                      }`}
                      onClick={() => setSelectedMessage(row.original)}
                    >
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className={`px-4 py-3 ${
                            isPendingDelete ? 'line-through decoration-red-400' : ''
                          } ${
                            cell.column.id === row.getVisibleCells()[0]?.column.id && (isPendingDelete || isPendingEdit)
                              ? isPendingDelete
                                ? 'border-r-4 border-r-red-500'
                                : 'border-r-4 border-r-amber-500'
                              : ''
                          }`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                    {/* Now line after the last row if needed */}
                    {nowLineRowIndex === rowIndex + 1 && rowIndex === table.getRowModel().rows.length - 1 && (
                      <tr ref={nowLineRef} className="bg-transparent">
                        <td colSpan={columns.length} className="p-0">
                          <div className="relative flex items-center py-1.5">
                            <div
                              className="absolute -right-[2px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-red-500 z-10 border-2 border-red-400"
                              style={{ boxShadow: '0 0 8px rgba(239, 68, 68, 0.5), 0 0 20px rgba(239, 68, 68, 0.2)' }}
                            />
                            <div className="w-full flex items-center gap-3 pr-6">
                              <span className="text-xs font-bold text-red-400 bg-red-500/15 px-2.5 py-1 rounded-lg border border-red-500/30 shrink-0">
                                עכשיו {currentTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <div className="flex-1 h-[2px] bg-gradient-to-l from-red-500 to-red-500/20 rounded-full" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  )})
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-700">
          <div className="text-sm text-zinc-400">
            מציג {table.getRowModel().rows.length} מתוך {messages.length} הודעות
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="p-1 hover:bg-zinc-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsRight size={18} className="text-zinc-300" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 hover:bg-zinc-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} className="text-zinc-300" />
            </button>
            <span className="text-sm text-zinc-300">
              עמוד {table.getState().pagination.pageIndex + 1} מתוך {table.getPageCount()}
            </span>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 hover:bg-zinc-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} className="text-zinc-300" />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-1 hover:bg-zinc-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft size={18} className="text-zinc-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SendMessageModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        eventId={showAllMessages ? undefined : selectedEvent?.id}
      />
      <MessageDetailModal message={selectedMessage} onClose={() => setSelectedMessage(null)} />
      <EditMessageModal message={editingMessage} onClose={() => setEditingMessage(null)} onSaveWithGrace={handleEditWithGrace} />
      <DeleteConfirmModal
        message={deletingMessage}
        onClose={() => setDeletingMessage(null)}
        onConfirm={handleDeleteMessage}
        isPending={deleteMessage.isPending}
      />
      <DeleteAllConfirmModal
        isOpen={showDeleteAllModal}
        onClose={() => setShowDeleteAllModal(false)}
        onConfirm={handleDeleteAll}
        isPending={deleteAllMessages.isPending}
        messageCount={messages.length}
        eventName={!showAllMessages ? selectedEvent?.name : undefined}
      />
    </div>
  )
}

export default MessagesPage