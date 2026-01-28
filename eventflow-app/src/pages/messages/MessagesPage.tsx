// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Messages Page (Full Table View)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react'
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
  Bot
} from 'lucide-react'
import { useMessages, useMessageStats, useSendMessage, useRetryMessage } from '../../hooks/useMessages'
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
    sent: <Send size={14} />,
    delivered: <CheckCircle size={14} />,
    read: <CheckCheck size={14} />,
    failed: <XCircle size={14} />
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

function StatsCards({ stats }: { stats: ReturnType<typeof useMessageStats>['data'] }) {
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
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map(card => (
        <div key={card.label} className={`rounded-lg p-4 ${card.color}`}>
          <div className="text-2xl font-bold">{card.value}</div>
          <div className="text-sm">{card.label}</div>
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
  onClose
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const sendMessage = useSendMessage()

  const handleSend = async () => {
    try {
      await sendMessage.mutateAsync({
        to_phone: phone,
        content: message,
        channel: 'whatsapp'
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
// Main Messages Page
// ────────────────────────────────────────────────────────────────────────────

export function MessagesPage() {
  // State
  const [filters, setFilters] = useState<MessageFilters>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [showSendModal, setShowSendModal] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<MessageWithRelations | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Data
  const { data: messages = [], isLoading, error, refetch } = useMessages(filters)
  const { data: stats } = useMessageStats()

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
      cell: ({ row }) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setSelectedMessage(row.original)
          }}
          className="p-1 hover:bg-zinc-700 rounded"
          title="צפה בפרטים"
        >
          <Eye size={16} className="text-zinc-300" />
        </button>
      )
    }
  ], [])

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
    <div className="p-6 max-w-7xl mx-auto bg-zinc-900 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white" data-testid="messages-title">הודעות</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 hover:bg-zinc-700 rounded-lg"
            title="רענן"
          >
            <RefreshCw size={20} className="text-zinc-300" />
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={18} />
            הודעה חדשה
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} />

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
                table.getRowModel().rows.map(row => {
                  const isIncoming = row.original.direction === 'incoming'
                  return (
                  <tr
                    key={row.id}
                    className={`cursor-pointer ${isIncoming ? 'bg-purple-900/20 hover:bg-purple-900/30' : 'hover:bg-zinc-700'}`}
                    onClick={() => setSelectedMessage(row.original)}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
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
      <SendMessageModal isOpen={showSendModal} onClose={() => setShowSendModal(false)} />
      <MessageDetailModal message={selectedMessage} onClose={() => setSelectedMessage(null)} />
    </div>
  )
}

export default MessagesPage