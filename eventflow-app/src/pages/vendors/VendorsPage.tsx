import { useState, useEffect } from 'react'
import { Plus, Search, Edit2, Trash2, Users, Phone, Mail, Globe, MapPin, Truck, X, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Vendor, VendorCategory, VendorStatus, VendorFormData } from '../../types'
import { normalizePhone, getVendorStatusColor, getVendorStatusLabel, renderStars } from '../../utils'

export function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [categories, setCategories] = useState<VendorCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<VendorStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<VendorFormData>({
    name: '',
    category_id: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    description: '',
    notes: '',
    rating: '',
    status: 'pending',
    tags: ''
  })

  useEffect(() => {
    fetchCategories()
    fetchVendors()
  }, [])

  async function fetchCategories() {
    try {
      const { data, error } = await supabase
        .from('vendor_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  async function fetchVendors() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select(`*, vendor_categories (id, name, name_en, icon)`)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Count events for each vendor
      const vendorsWithCount = await Promise.all((data || []).map(async (vendor) => {
        const { count } = await supabase
          .from('event_vendors')
          .select('id', { count: 'exact', head: true })
          .eq('vendor_id', vendor.id)
        return { ...vendor, events_count: count || 0 }
      }))

      setVendors(vendorsWithCount)
    } catch (error) {
      console.error('Error fetching vendors:', error)
    } finally {
      setLoading(false)
    }
  }

  function openCreateModal() {
    setEditingVendor(null)
    setFormData({
      name: '',
      category_id: categories[0]?.id || '',
      contact_name: '',
      email: '',
      phone: '',
      website: '',
      address: '',
      city: '',
      description: '',
      notes: '',
      rating: '',
      status: 'pending',
      tags: ''
    })
    setShowModal(true)
  }

  function openEditModal(vendor: Vendor) {
    setEditingVendor(vendor)
    setFormData({
      name: vendor.name,
      category_id: vendor.category_id || '',
      contact_name: vendor.contact_name || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      website: vendor.website || '',
      address: vendor.address || '',
      city: vendor.city || '',
      description: vendor.description || '',
      notes: vendor.notes || '',
      rating: vendor.rating?.toString() || '',
      status: vendor.status,
      tags: vendor.tags?.join(', ') || ''
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!formData.name) {
      alert('נא למלא שם ספק')
      return
    }

    setSaving(true)
    try {
      const vendorData = {
        name: formData.name,
        category_id: formData.category_id || null,
        contact_name: formData.contact_name || null,
        email: formData.email || null,
        phone: formData.phone || null,
        phone_normalized: formData.phone ? normalizePhone(formData.phone) : null,
        website: formData.website || null,
        address: formData.address || null,
        city: formData.city || null,
        description: formData.description || null,
        notes: formData.notes || null,
        rating: formData.rating ? parseFloat(formData.rating) : null,
        status: formData.status,
        tags: formData.tags ? formData.tags.split(',').map(s => s.trim()).filter(Boolean) : null
      }

      if (editingVendor) {
        const { error } = await supabase
          .from('vendors')
          .update(vendorData)
          .eq('id', editingVendor.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('vendors')
          .insert(vendorData)
        if (error) throw error
      }

      setShowModal(false)
      fetchVendors()
    } catch (error) {
      console.error('Error saving vendor:', error)
      alert('שגיאה בשמירת הספק')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(vendor: Vendor) {
    if (!confirm(`האם למחוק את "${vendor.name}"?`)) return
    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendor.id)
      if (error) throw error
      fetchVendors()
    } catch (error) {
      console.error('Error deleting vendor:', error)
      alert('שגיאה במחיקת הספק')
    }
  }

  // Filter vendors
  const filteredVendors = vendors.filter(v => {
    const matchesCategory = categoryFilter === 'all' || v.category_id === categoryFilter
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter
    const matchesSearch = searchTerm === '' ||
      v.name.includes(searchTerm) ||
      (v.contact_name && v.contact_name.includes(searchTerm)) ||
      (v.phone && v.phone.includes(searchTerm)) ||
      (v.city && v.city.includes(searchTerm))
    return matchesCategory && matchesStatus && matchesSearch
  })

  // Stats by category
  const categoryStats = categories.map(cat => ({
    ...cat,
    count: vendors.filter(v => v.category_id === cat.id).length
  }))

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" data-testid="vendors-title">ספקים</h1>
        <button
          className="btn-primary flex items-center gap-2"
          data-testid="add-vendor-btn"
          onClick={openCreateModal}
        >
          <Plus size={20} />
          הוסף ספק
        </button>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mb-6">
        <button
          className={`p-3 rounded-lg text-center transition-all ${
            categoryFilter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white hover:bg-gray-50 border'
          }`}
          onClick={() => setCategoryFilter('all')}
        >
          <p className="text-2xl">📋</p>
          <p className="text-xs font-medium mt-1">הכל ({vendors.length})</p>
        </button>
        {categoryStats.slice(0, 7).map(cat => (
          <button
            key={cat.id}
            className={`p-3 rounded-lg text-center transition-all ${
              categoryFilter === cat.id
                ? 'bg-primary-600 text-white'
                : 'bg-white hover:bg-gray-50 border'
            }`}
            onClick={() => setCategoryFilter(cat.id)}
            data-testid="category-filter"
          >
            <p className="text-2xl">{cat.icon}</p>
            <p className="text-xs font-medium mt-1 truncate">{cat.name} ({cat.count})</p>
          </button>
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex gap-4 mb-6 flex-wrap items-center">
        {/* Status Filter */}
        <div className="flex gap-2">
          {(['all', 'pending', 'approved', 'confirmed'] as const).map(status => (
            <button
              key={status}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all' ? 'הכל' : getVendorStatusLabel(status)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            className="input pr-10"
            placeholder="חיפוש ספק..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="vendors-list">
        {loading ? (
          <div className="col-span-full text-center py-12">
            <Loader2 className="animate-spin mx-auto mb-4" size={32} />
            <p className="text-gray-500">טוען ספקים...</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <Truck className="mx-auto mb-4 text-gray-400" size={48} />
            <p className="text-gray-500 text-lg">אין ספקים עדיין</p>
            <p className="text-gray-400 text-sm mt-2">לחץ על "הוסף ספק" להוספת הספק הראשון</p>
          </div>
        ) : (
          filteredVendors.map(vendor => (
            <div
              key={vendor.id}
              className="card hover:shadow-lg transition-shadow"
              data-testid={`vendor-card-${vendor.id}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                    {vendor.vendor_categories?.icon || '📦'}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{vendor.name}</h3>
                    <p className="text-sm text-gray-500">
                      {vendor.vendor_categories?.name || 'ללא קטגוריה'}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVendorStatusColor(vendor.status)}`}>
                  {getVendorStatusLabel(vendor.status)}
                </span>
              </div>

              {vendor.rating && (
                <div className="mb-3">
                  {renderStars(vendor.rating)}
                  <span className="text-sm text-gray-500 mr-2">({vendor.rating})</span>
                </div>
              )}

              <div className="space-y-2 text-sm text-gray-600">
                {vendor.contact_name && (
                  <div className="flex items-center gap-2">
                    <Users size={14} />
                    {vendor.contact_name}
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} />
                    {vendor.phone}
                  </div>
                )}
                {vendor.email && (
                  <div className="flex items-center gap-2">
                    <Mail size={14} />
                    {vendor.email}
                  </div>
                )}
                {vendor.city && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} />
                    {vendor.city}
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center gap-2">
                    <Globe size={14} />
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate">
                      {vendor.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>

              {vendor.description && (
                <p className="text-sm text-gray-500 mt-3 line-clamp-2">{vendor.description}</p>
              )}

              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <span className="text-xs text-gray-400">
                  {vendor.events_count} אירועים
                </span>
                <div className="flex gap-2">
                  <button
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    onClick={() => openEditModal(vendor)}
                    title="עריכה"
                  >
                    <Edit2 size={16} className="text-gray-600" />
                  </button>
                  <button
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    onClick={() => handleDelete(vendor)}
                    title="מחיקה"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-modal w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-2xl font-bold">
                {editingVendor ? 'עריכת ספק' : 'ספק חדש'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Category & Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">קטגוריה</label>
                  <select
                    className="input"
                    value={formData.category_id}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    <option value="">בחר קטגוריה</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">שם הספק *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">איש קשר</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.contact_name}
                    onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">טלפון</label>
                  <input
                    type="tel"
                    className="input"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">אימייל</label>
                  <input
                    type="email"
                    className="input"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">אתר אינטרנט</label>
                  <input
                    type="url"
                    className="input"
                    placeholder="https://"
                    value={formData.website}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">עיר</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">כתובת</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
              </div>

              {/* Status & Rating */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">סטטוס</label>
                  <select
                    className="input"
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as VendorStatus })}
                  >
                    <option value="pending">ממתין</option>
                    <option value="quote_requested">נשלחה בקשה</option>
                    <option value="quoted">התקבלה הצעה</option>
                    <option value="approved">אושר</option>
                    <option value="rejected">נדחה</option>
                    <option value="confirmed">מאושר סופי</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">דירוג (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    step="0.5"
                    className="input"
                    value={formData.rating}
                    onChange={e => setFormData({ ...formData, rating: e.target.value })}
                  />
                </div>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">תגיות (מופרד בפסיקים)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="חתונות, בר מצווה, כשר..."
                  value={formData.tags}
                  onChange={e => setFormData({ ...formData, tags: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">תיאור</label>
                <textarea
                  className="input min-h-[80px]"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-2">הערות פנימיות</label>
                <textarea
                  className="input min-h-[60px]"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                className="px-6 py-2 border rounded-lg hover:bg-gray-50"
                onClick={() => setShowModal(false)}
              >
                ביטול
              </button>
              <button
                className="btn-primary flex items-center gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Loader2 className="animate-spin" size={20} />}
                {editingVendor ? 'שמור שינויים' : 'הוסף ספק'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
