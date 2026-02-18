// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - Messages Page (Full Table View)
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
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
  Wand2,
  Pencil,
  Trash2
} from 'lucide-react'
import { useMessages, useMessageStats, useGenerateMessages, useUpdateMessage, useDeleteMessage, useDeleteAllMessages } from '../../hooks/useMessages'
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
  messageDirectionLabels
} from '../../schemas/messages'
import {
  StatusBadge,
  ChannelIcon,
  DirectionBadge,
  StatsCards,
  SendMessageModal,
  MessageDetailModal,
  EditMessageModal,
  DeleteConfirmModal,
  DeleteAllConfirmModal
} from './components'

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
  const getMessagePendingState = useCallback((messageId: string): 'edit' | 'delete' | null => {
    for (const change of pendingChanges) {
      if (change.type === 'message_delete_all') return 'delete'
      if (change.type === 'message_delete' && (change.payload as { messageId: string }).messageId === messageId) return 'delete'
      if (change.type === 'message_update' && (change.payload as { messageId: string }).messageId === messageId) return 'edit'
    }
    return null
  }, [pendingChanges])

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
  ], [getMessagePendingState])

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

  const tableRows = table.getRowModel().rows

  // Compute the "now" line position among visible rows
  const nowLineRowIndex = useMemo(() => {
    const now = currentTime.getTime()

    // Collect rows with a time reference: prefer scheduled_for, fall back to sent_at or created_at
    const timedRows = tableRows
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
  }, [tableRows, currentTime])

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
              aria-label="חיפוש הודעות"
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
          <table className="w-full" aria-label="טבלת הודעות">
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
              aria-label="עמוד ראשון"
            >
              <ChevronsRight size={18} className="text-zinc-300" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 hover:bg-zinc-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="עמוד קודם"
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
              aria-label="עמוד הבא"
            >
              <ChevronLeft size={18} className="text-zinc-300" />
            </button>
            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="p-1 hover:bg-zinc-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="עמוד אחרון"
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
