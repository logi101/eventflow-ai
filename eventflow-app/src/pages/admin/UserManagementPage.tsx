// ═══════════════════════════════════════════════════════════════════════════
// EventFlow - User Management Page (Super Admin Only)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import { Users, UserPlus, Trash2, Loader2, AlertCircle, Shield, ShieldCheck, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface ManagedUser {
  id: string
  full_name: string
  email: string
  role: string
  created_at: string
}

export function UserManagementPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Add user form state
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'member'>('admin')

  const callManageUsers = async (action: string, payload: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Not authenticated')

    const response = await supabase.functions.invoke('manage-users', {
      body: { action, ...payload },
    })

    if (response.error) throw new Error(response.error.message)
    if (response.data?.error) throw new Error(response.data.error)
    return response.data
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await callManageUsers('list', {})
      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת משתמשים')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    setError(null)
    try {
      await callManageUsers('create', {
        email: newEmail,
        password: newPassword,
        full_name: newName,
        role: newRole,
      })
      setShowAddDialog(false)
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewRole('admin')
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת משתמש')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(true)
    setError(null)
    try {
      await callManageUsers('delete', { user_id: userId })
      setDeleteConfirm(null)
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת משתמש')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateRole = async (userId: string, role: string) => {
    setError(null)
    try {
      await callManageUsers('update_role', { user_id: userId, role })
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון תפקיד')
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <ShieldCheck className="w-4 h-4 text-orange-400" />
      case 'admin': return <Shield className="w-4 h-4 text-blue-400" />
      default: return <User className="w-4 h-4 text-zinc-400" />
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'מנהל ראשי'
      case 'admin': return 'מנהל'
      case 'member': return 'חבר'
      default: return role
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-orange-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">ניהול משתמשים</h1>
            <p className="text-zinc-400 text-sm">ניהול חשבונות והרשאות במערכת</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          הוסף משתמש
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-zinc-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>אין משתמשים במערכת</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-700/50">
                <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">שם</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">אימייל</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">תפקיד</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">תאריך יצירה</th>
                <th className="text-right px-6 py-4 text-sm font-medium text-zinc-400">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-zinc-700/30 hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(u.role)}
                      <span className="text-white font-medium">{u.full_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-300 text-sm" dir="ltr">{u.email}</td>
                  <td className="px-6 py-4">
                    {u.role === 'super_admin' ? (
                      <span className="text-orange-400 text-sm font-medium">{getRoleLabel(u.role)}</span>
                    ) : (
                      <select
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                        className="bg-zinc-800 border border-zinc-600 rounded-lg px-3 py-1.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                      >
                        <option value="admin">מנהל</option>
                        <option value="member">חבר</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4 text-zinc-400 text-sm">
                    {new Date(u.created_at).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-6 py-4">
                    {u.id !== user?.id && u.role !== 'super_admin' && (
                      <button
                        onClick={() => setDeleteConfirm(u.id)}
                        className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-red-500/10"
                        title="מחק משתמש"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-8 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-white mb-6">הוסף משתמש חדש</h2>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">שם מלא</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="input-field w-full"
                  placeholder="שם מלא"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">אימייל</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="input-field w-full"
                  placeholder="user@example.com"
                  dir="ltr"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">סיסמה זמנית</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field w-full"
                  placeholder="סיסמה זמנית"
                  dir="ltr"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">תפקיד</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'member')}
                  className="input-field w-full"
                >
                  <option value="admin">מנהל</option>
                  <option value="member">חבר</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  צור משתמש
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddDialog(false)}
                  className="px-6 py-2.5 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-zinc-700/50 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-8 w-full max-w-sm mx-4">
            <h2 className="text-xl font-bold text-white mb-4">מחיקת משתמש</h2>
            <p className="text-zinc-300 mb-6">האם אתה בטוח שברצונך למחוק משתמש זה? פעולה זו אינה ניתנת לביטול.</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDeleteUser(deleteConfirm)}
                disabled={actionLoading}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                מחק
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-600 text-zinc-300 hover:bg-zinc-700/50 transition-colors"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagementPage
