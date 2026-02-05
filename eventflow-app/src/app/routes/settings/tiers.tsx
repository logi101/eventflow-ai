import { useTier } from '../../../contexts/TierContext'
import { Check, X, ArrowRight, Zap, Users, MessageSquare, Sparkles, PlayCircle, Share2, AlertTriangle } from 'lucide-react'

export function TierComparisonPage() {
  const { tier, loading } = useTier()
  const isPremium = tier === 'premium' || tier === 'legacy_premium'

  if (loading) {
    return (
      <div className="p-12 text-center text-zinc-500">
        <div className="animate-spin inline-block mb-4">
          <div className="w-8 h-8 border-4 border-zinc-200 border-t-orange-500 rounded-full" />
        </div>
        <p>טוען דף השוואה...</p>
      </div>
    )
  }

  const handleUpgrade = () => {
    // TODO: Implement upgrade flow
    console.log('Upgrade clicked')
  }

  const features = [
    {
      name: 'אירועים',
      icon: <Zap size={18} />,
      base: '5 אירועים לשנה',
      premium: 'ללא הגבלה'
    },
    {
      name: 'משתתפים',
      icon: <Users size={18} />,
      base: '100 משתתפים לאירוע',
      premium: 'ללא הגבלה'
    },
    {
      name: 'הודעות',
      icon: <MessageSquare size={18} />,
      base: '200 הודעות לחודש',
      premium: 'ללא הגבלה'
    },
    {
      name: 'צאט AI',
      icon: <Sparkles size={18} />,
      base: '50 הודעות לחודש',
      premium: 'ללא הגבלה'
    },
    {
      name: 'סימולציית יום האירוע',
      icon: <PlayCircle size={18} />,
      base: <X size={18} className="text-red-500" />,
      premium: <Check size={18} className="text-green-500" />
    },
    {
      name: 'מנוע הנטוורקינג',
      icon: <Share2 size={18} />,
      base: <X size={18} className="text-red-500" />,
      premium: <Check size={18} className="text-green-500" />
    },
    {
      name: 'התראות תקציב',
      icon: <AlertTriangle size={18} />,
      base: <X size={18} className="text-red-500" />,
      premium: <Check size={18} className="text-green-500" />
    },
    {
      name: 'ניתוח ספקים',
      icon: <Sparkles size={18} />,
      base: <X size={18} className="text-red-500" />,
      premium: <Check size={18} className="text-green-500" />
    }
  ]

  return (
    <div className="p-6" dir="rtl">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">השוואת תוכניות</h1>
          <p className="text-gray-600">בחר את התוכנית המתאימה ביותר לצרכים שלך</p>
        </div>

        {/* Comparison Table */}
        <div className="overflow-hidden rounded-2xl border border-gray-200">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">תכונה</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 bg-gray-100">
                  <div className="mb-1">בסיס</div>
                  <div className="text-xs text-gray-500">חינם</div>
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500">
                  <div className="mb-1">פרימיום 💎</div>
                  <div className="text-xs opacity-90">ללא הגבלה</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr key={index} className="border-t border-gray-200">
                  <td className="px-6 py-4 text-right text-sm text-gray-900 flex items-center justify-end gap-2">
                    {feature.icon}
                    <span className="font-medium">{feature.name}</span>
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-600 bg-gray-50">
                    {typeof feature.base === 'string' ? feature.base : feature.base}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-amber-900 bg-amber-50 font-medium">
                    {typeof feature.premium === 'string' ? feature.premium : feature.premium}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* CTA Section */}
        {!isPremium && (
          <div className="mt-12 text-center">
            <div className="max-w-md mx-auto p-8 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200">
              <div className="text-4xl mb-4">💎</div>
              <h2 className="text-2xl font-bold text-amber-900 mb-3">שדרג לפרימיום עכשיו</h2>
              <p className="text-amber-800 mb-6">
                קבל גישה לכל התכונות הפרימיום - ללא הגבלה
              </p>
              <button
                onClick={handleUpgrade}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
              >
                שדרג עכשיו
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {isPremium && (
          <div className="mt-12 text-center">
            <div className="max-w-md mx-auto p-8 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200">
              <div className="text-4xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-green-900 mb-3">תודה רבה על השדרוג!</h2>
              <p className="text-green-800">
                אתה נהנה מכל התכונות הפרימיום
              </p>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">שאלות נפוצות</h2>
          
          <div className="space-y-4">
            <details className="group">
              <summary className="cursor-pointer p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">מה קורה כשאני מגיע את המכסה?</span>
                  <ChevronLeft size={18} className="text-gray-500 group-open:rotate-180 transition-transform" />
                </div>
              </summary>
              <div className="px-4 pb-4 text-gray-600 text-sm">
                כשמגיעים את המכסה, עדיין תוכלו להמשיך להשתמש במערכת אבל לא תוכלו ליצור אירועים, להוסיף משתתפים, או לשלוח הודעות נוספות. תקבלו התראה 7 ימים לפני סיום החודש.
              </div>
            </details>

            <details className="group">
              <summary className="cursor-pointer p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">האם אפשר לשדרג באמצע החודש?</span>
                  <ChevronLeft size={18} className="text-gray-500 group-open:rotate-180 transition-transform" />
                </div>
              </summary>
              <div className="px-4 pb-4 text-gray-600 text-sm">
                כן! כשתשדרגו, המכסה תוחשב באופן פרופורציונלי לימים שנותרו בחודש.
              </div>
            </details>

            <details className="group">
              <summary className="cursor-pointer p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">האם אפשר לבטל את המנוי?</span>
                  <ChevronLeft size={18} className="text-gray-500 group-open:rotate-180 transition-transform" />
                </div>
              </summary>
              <div className="px-4 pb-4 text-gray-600 text-sm">
                כן, תוכלו לבטל את המנוי בכל עת. לאחר הביטול, תחזרו לגרסת הבסיס בסוף התקופה הנוכחית.
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}

// ChevronLeft icon component (if not in lucide-react)
function ChevronLeft({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m15 18-6-6 6" />
      <path d="m9 6 6-6-6" />
    </svg>
  )
}
