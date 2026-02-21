import { useState } from 'react'
import { Settings, Users, Heart, Star, Accessibility, Save, Loader2 } from 'lucide-react'
import type { RoomPolicy, GenderSeparationPolicy } from '@/types'
import { useRoomAssignments } from '../hooks/useRoomAssignments'
import { toast } from 'sonner'

const GENDER_OPTIONS: { value: GenderSeparationPolicy; label: string; description: string }[] = [
  { value: 'mixed', label: 'מעורב', description: 'גברים ונשים יכולים לשתף חדר' },
  { value: 'full_separation', label: 'הפרדה מלאה', description: 'גברים ונשים בחדרים נפרדים לחלוטין' },
  { value: 'male_separate', label: 'גברים בנפרד', description: 'גברים בחדרים נפרדים, נשים יכולות להתמזג' },
  { value: 'female_separate', label: 'נשים בנפרד', description: 'נשים בחדרים נפרדים, גברים יכולים להתמזג' },
]

export function RoomPolicySettings() {
  const { roomPolicy, updatePolicy } = useRoomAssignments()
  const [localPolicy, setLocalPolicy] = useState<RoomPolicy | null>(null)
  const policy = localPolicy ?? roomPolicy ?? {
    gender_separation: 'mixed' as GenderSeparationPolicy,
    couple_same_room: true,
    vip_priority: true,
    accessible_priority: true,
  }

  function handleChange(changes: Partial<RoomPolicy>) {
    setLocalPolicy({ ...policy, ...changes })
  }

  function handleSave() {
    updatePolicy.mutate(policy, {
      onSuccess: () => {
        toast.success('הגדרות שמורות')
        setLocalPolicy(null)
      },
      onError: () => toast.error('שגיאה בשמירה'),
    })
  }

  const isDirty = localPolicy !== null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings size={18} className="text-zinc-400" />
          <h3 className="text-base font-semibold text-white">הגדרות מדיניות חדרים</h3>
        </div>
        {isDirty && (
          <button
            onClick={handleSave}
            disabled={updatePolicy.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium transition-colors"
          >
            {updatePolicy.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            שמור הגדרות
          </button>
        )}
      </div>

      {/* Gender separation */}
      <div className="bg-zinc-800/50 border border-white/10 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-blue-400" />
          <h4 className="text-sm font-semibold text-white">הפרדת מגדרים</h4>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {GENDER_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                policy.gender_separation === opt.value
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-white/10 hover:border-white/20 hover:bg-white/5'
              }`}
            >
              <input
                type="radio"
                name="gender_separation"
                value={opt.value}
                checked={policy.gender_separation === opt.value}
                onChange={() => handleChange({ gender_separation: opt.value })}
                className="mt-0.5 accent-blue-500"
              />
              <div>
                <p className="text-sm font-medium text-white">{opt.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Toggles */}
      <div className="bg-zinc-800/50 border border-white/10 rounded-xl p-5 space-y-4">
        <h4 className="text-sm font-semibold text-white mb-1">העדפות שיבוץ</h4>

        <PolicyToggle
          icon={<Heart size={16} className="text-pink-400" />}
          label="שיבוץ בני זוג לחדר משותף"
          description='משתתפים עם "מלווה" ישובצו לחדר double/king משותף'
          checked={policy.couple_same_room}
          onChange={v => handleChange({ couple_same_room: v })}
        />
        <div className="border-t border-white/5" />
        <PolicyToggle
          icon={<Star size={16} className="text-amber-400" />}
          label="עדיפות VIP לחדרי suite/vip"
          description="משתתפי VIP יקבלו חדרי vip/suite לפני הקצאה כללית"
          checked={policy.vip_priority}
          onChange={v => handleChange({ vip_priority: v })}
        />
        <div className="border-t border-white/5" />
        <PolicyToggle
          icon={<Accessibility size={16} className="text-emerald-400" />}
          label="עדיפות נגישות לחדרים נגישים"
          description="משתתפים עם צרכי נגישות יקבלו חדרים מותאמים ראשונים"
          checked={policy.accessible_priority}
          onChange={v => handleChange({ accessible_priority: v })}
        />
      </div>
    </div>
  )
}

function PolicyToggle({
  icon, label, description, checked, onChange,
}: {
  icon: React.ReactNode
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-zinc-400 mt-0.5">{description}</p>
        </div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-zinc-600'
        }`}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-0.5' : 'translate-x-5'
          }`}
          style={{ right: checked ? 'auto' : '2px', left: checked ? '2px' : 'auto' }}
        />
      </button>
    </div>
  )
}
