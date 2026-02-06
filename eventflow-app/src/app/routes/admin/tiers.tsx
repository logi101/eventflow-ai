import { useState, useEffect, useCallback } from 'react'
import { Search, Edit2, ShieldCheck, AlertTriangle, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react'
import { useAuth } from '../../../contexts/AuthContext'
import { useTier } from '../../../contexts/TierContext'
import type { Tier } from '../../../config/tiers'
import { supabase } from '../../../lib/supabase'

interface Organization {
  id: string
  name: string
  tier: Tier
  trial_ends_at: string | null
  trial_started_at: string | null
  current_usage: {
    events_count?: number
    participants_count?: number
    messages_sent?: number
    ai_messages_sent?: number
    period_start?: string
  } | null
  tier_limits: Record<string, unknown> | null
  tier_updated_at: string | null
  tier_updated_by: string | null
  created_at: string
}

export function AdminTiersPage() {
  const { userProfile, loading: authLoading } = useAuth()
  const { refreshQuota } = useTier()

  // Check if user is admin
  const isAdmin = userProfile?.role === 'super_admin'

  // State
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingTier, setEditingTier] = useState<Tier>('base')
  const [editReason, setEditReason] = useState('')

  const PAGE_SIZE = 20

  // Load organizations
  const loadOrganizations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      let query = supabase
        .from('organizations')
        .select(`
          id,
          name,
          tier,
          trial_ends_at,
          trial_started_at,
          current_usage,
          tier_limits,
          tier_updated_at,
          tier_updated_by,
          created_at
        `)
        .order('name', { ascending: true })

      // Apply search filter
      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`)
      }

      const from = (currentPage - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      // Get total count
      const { count } = await query

      // Get paginated data
      const { data, error: fetchError } = await query
        .range(from, to)

      if (fetchError) throw fetchError

      setOrganizations(data || [])
      setTotalPages(Math.ceil((count || 0) / PAGE_SIZE))
    } catch (err) {
      console.error('Error loading organizations:', err)
      setError('שגיאה בטעינת הנתונים')
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm])

  // Load organizations on mount and when page/search changes
  useEffect(() => {
    if (isAdmin && !authLoading) {
      loadOrganizations()
    }
  }, [isAdmin, authLoading, loadOrganizations])

  // Refresh quota after tier changes
  const handleRefreshQuota = async (orgId: string) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ tier_limits: null }) // Force re-calculation
        .eq('id', orgId)

      if (error) throw error

      refreshQuota()
    } catch (err) {
      console.error('Error refreshing quota:', err)
    }
  }

  // Handle search
  const handleSearch = (term: string) => {
    setSearchTerm(term)
    setCurrentPage(1)
  }

  // Open edit modal
  const openEditModal = (org: Organization) => {
    setSelectedOrg(org)
    setEditingTier(org.tier)
    setEditReason('')
    setShowEditModal(true)
  }

  // Close edit modal
  const closeEditModal = () => {
    setSelectedOrg(null)
    setEditingTier('base')
    setEditReason('')
    setShowEditModal(false)
  }

  // Handle tier change
  const handleUpdateTier = async () => {
    if (!selectedOrg || !editReason.trim()) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.functions.invoke('admin-set-tier', {
        body: {
          organizationId: selectedOrg.id,
          newTier: editingTier,
          reason: editReason
        }
      })

      if (error) throw new Error(error.message || 'Failed to update tier')

      // Refresh data
      await loadOrganizations()
      closeEditModal()

      // Refresh quota context for changed org
      if (selectedOrg.id) {
        await handleRefreshQuota(selectedOrg.id)
      }
    } catch (err: unknown) {
      console.error('Error updating tier:', err)
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון המדרג')
    } finally {
      setLoading(false)
    }
  }

  const getTierLabel = (tier: string): string => {
    switch (tier) {
      case 'base': return 'בסיס'
      case 'premium': return 'פרימיום'
      case 'legacy_premium': return 'פרימיום (לגאיה)'
      default: return tier
    }
  }

  const getTierColor = (tier: string): string => {
    switch (tier) {
      case 'base': return 'bg-gray-100 text-gray-800'
      case 'premium': return 'bg-amber-100 text-amber-800'
      case 'legacy_premium': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTrialStatus = (org: Organization): { status: string; days: number | null } => {
    if (!org.trial_ends_at) {
      return { status: 'ללא בניסיון', days: null }
    }

    const now = new Date()
    const trialEnd = new Date(org.trial_ends_at)

    if (trialEnd > now) {
      const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysLeft > 5) {
        return { status: 'פעיל', days: daysLeft }
      } else {
        return { status: 'נגמה לסיום', days: daysLeft }
      }
    } else {
      return { status: 'הסתיים', days: 0 }
    }
  }

  // Loading state
  if (authLoading) {
    return (
      <div className="p-12 text-center text-zinc-500">
        <div className="animate-spin inline-block mb-4">
          <div className="w-8 h-8 border-4 border-zinc-200 border-t-orange-500 rounded-full" />
        </div>
        <p>טוען טוען פרטיל...</p>
      </div>
    )
  }

  // Access denied
  if (!isAdmin) {
    return (
      <div className="p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
          <X size={32} className="text-red-600" />
        </div>
        <h2 className="text-2xl font-bold text-red-900 mb-2">אין לך גישה</h2>
        <p className="text-gray-600">דף זה מיועדד למנהלי בלבד</p>
      </div>
    )
  }

  return (
    <div className="p-6" dir="rtl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניהול תוכנות</h1>
          <p className="text-gray-600">ניהול ושינוי גישה לארגניזציות</p>
        </div>
        <button
          onClick={loadOrganizations}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="רענן"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-red-900">שגיאה</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              סגור
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search size={18} className="absolute right-3 top-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="חפש לפי שם הארגניזציה..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pr-10 pl-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                שם הארגניזציה
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                תוכנה
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                שימוש
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                עודכון לאחרים
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                פעולות
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500">
                  <RefreshCw className="animate-spin mx-auto" size={24} />
                </td>
              </tr>
            ) : organizations.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500">
                  לא נמצאו ארגניזציות
                </td>
              </tr>
              ) : organizations.map((org) => (
              <tr key={org.id} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="px-4 py-3 text-right">
                  <span className="font-medium text-gray-900">{org.name}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getTierColor(org.tier)}`}
                  >
                    {getTierLabel(org.tier)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-600">
                  {org.current_usage && (
                    <div className="space-y-1">
                      <div>אירועים: <strong>{org.current_usage.events_count || 0}</strong></div>
                      <div>משתתפים: <strong>{org.current_usage.participants_count || 0}</strong></div>
                      <div>הודעות: <strong>{org.current_usage.messages_sent || 0}</strong></div>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-600">
                  {org.tier_updated_at ? new Date(org.tier_updated_at).toLocaleDateString('he-IL') : '-'}
                </td>
                <td className="px-4 py-3 text-center text-sm text-gray-600">
                  {org.tier_updated_by || '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => openEditModal(org)}
                      className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium"
                    >
                      <Edit2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={18} />
            </button>
            <span className="text-sm text-gray-600">
              עמוד {currentPage} מתוך {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closeEditModal}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={24} className="text-blue-600" />
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">שנה תוכנה</h2>
                    <p className="text-sm text-gray-600">
                      {selectedOrg.name} ({selectedOrg.id.slice(0, 8)}...)
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeEditModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="סגור"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Current tier info */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-700">תוכנה נוכחית:</span>
                  <span
                    className={`inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getTierColor(selectedOrg.tier)}`}
                  >
                    {getTierLabel(selectedOrg.tier)}
                  </span>
                </div>
                {selectedOrg.trial_ends_at && (
                  <div className="text-sm text-gray-600">
                    {getTrialStatus(selectedOrg).status} ({getTrialStatus(selectedOrg).days !== null ? `(${getTrialStatus(selectedOrg).days} ימים)` : ''})
                  </div>
                )}
              </div>

              {/* Usage metrics */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <span className="font-medium text-gray-700 mb-2">שימוש נוכחי:</span>
                {selectedOrg.current_usage && (
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                    <div>אירועים: <strong>{selectedOrg.current_usage.events_count || 0}</strong></div>
                    <div>משתתפים: <strong>{selectedOrg.current_usage.participants_count || 0}</strong></div>
                    <div>הודעות: <strong>{selectedOrg.current_usage.messages_sent || 0}</strong></div>
                    <div>AI הודעות: <strong>{selectedOrg.current_usage.ai_messages_sent || 0}</strong></div>
                    <div>התחלה: <strong>{selectedOrg.current_usage.period_start ? new Date(selectedOrg.current_usage.period_start).toLocaleDateString('he-IL') : '-'}</strong></div>
                  </div>
                )}
              </div>

              {/* New tier selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">בחר תוכנה חדש:</label>
                <div className="space-y-2">
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      editingTier === 'base'
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value="base"
                      checked={editingTier === 'base'}
                      onChange={() => setEditingTier('base')}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">בסיס</span>
                    <span className="text-xs text-gray-500">חינם (5 אירועים, 100 משתתפים)</span>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      editingTier === 'premium'
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value="premium"
                      checked={editingTier === 'premium'}
                      onChange={() => setEditingTier('premium')}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">פרימיום 💎</span>
                    <span className="text-xs text-gray-500">ללא הגבלה</span>
                  </label>

                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      editingTier === 'legacy_premium'
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500'
                        : 'bg-white border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="tier"
                      value="legacy_premium"
                      checked={editingTier === 'legacy_premium'}
                      onChange={() => setEditingTier('legacy_premium')}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">פרימיום (לגאיה)</span>
                    <span className="text-xs text-gray-500">ללא הגבלה</span>
                  </label>
                </div>
              </div>

              {/* Reason field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">סיבת השינוי:</label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="הסבר למה אתה מבצע את השינוי..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 pt-4 border-t border-gray-200 bg-gray-50 flex gap-3">
              <button
                onClick={closeEditModal}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors text-gray-700"
                disabled={loading}
              >
                בטל
              </button>
              <button
                onClick={handleUpdateTier}
                disabled={loading || !editReason.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span className="mr-2">מעדכן...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>עדכן שינוי</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
