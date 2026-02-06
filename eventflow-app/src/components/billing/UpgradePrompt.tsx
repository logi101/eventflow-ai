import { useState } from 'react'
import { X, ChevronLeft, Zap, Sparkles, PlayCircle, Share2, AlertTriangle, Users, MessageSquare, CheckCircle } from 'lucide-react'
import { useTier } from '../../contexts/TierContext'
import type { Feature } from '../../config/tiers'

interface UpgradePromptProps {
  feature?: Feature
  isOpen: boolean
  onClose: () => void
}

interface FeatureBenefits {
  title: string
  description: string
  icon: React.ReactElement
  benefits: string[]
}

const featureBenefits: Record<Feature, FeatureBenefits> = {
  events: {
    title: 'ניהול אירועים מתקדם',
    description: 'ניהול אירועים ללא הגבלה עם כל התכונות',
    icon: <Sparkles size={24} />,
    benefits: [
      'ניהול אירועים ללא הגבלה',
      'התאמה אישית מלאה',
      'תכונות פרימיום מלאות',
      'תמיכה בכל סוגי האירועים'
    ]
  },
  participants: {
    title: 'ניהול משתתפים מתקדם',
    description: 'ניהול משתתפים ללא הגבלה עם תכונות מתקדמות',
    icon: <Users size={24} />,
    benefits: [
      'ניהול משתתפים ללא הגבלה',
      'ייבוא/ייצוא מ-Excel',
      'ניהול מלווים',
      'QR Code למשתתפים'
    ]
  },
  messages: {
    title: 'מערכת הודעות מתקדמת',
    description: 'שליחת הודעות WhatsApp בכמויות ללא הגבלה',
    icon: <MessageSquare size={24} />,
    benefits: [
      'שליחת הודעות ללא הגבלה',
      'תבניות הודעות',
      'תזכורות אוטומטיים',
      'ניהול מענה לתגובות'
    ]
  },
  ai: {
    title: 'עוזר AI חכם',
    description: 'עוזר AI מתקדם לניהול האירוע',
    icon: <Sparkles size={24} />,
    benefits: [
      'צ\'אט AI מלא',
      'המלצות חכמות',
      'ניתוח אוטומטי',
      'תמיכה בעברית'
    ]
  },
  simulation: {
    title: 'סימולציית יום האירוע',
    description: 'בדוק מקיפה לזיהוי בעיות פוטנציאליות לפני יום האירוע',
    icon: <PlayCircle size={24} />,
    benefits: [
      '8 ולידטורים אוטומטיים לבדיקה',
      'זיהוי התנגשויות חדרות',
      'בדיקת זמנים ותקציב',
      'המלצות לתכנית B',
      'תכנון שינויים אוטומטי'
    ]
  },
  networking: {
    title: 'מנוע הנטוורקינג',
    description: 'שיבוץ חכם לשולחנות לפי תחומים משותפים',
    icon: <Share2 size={24} />,
    benefits: [
      'אלגוריתם חכם לשיבוץ',
      'הפצת משתתפים בעלי תחומים',
      'הפצה שווה לכל שולחן',
      'VIP פרוש לכל השולחנות',
      'דראג-אנד-דרופ גמישה'
    ]
  },
  budget_alerts: {
    title: 'התראות תקציב',
    description: 'התראות אוטומטיות כשהתקציב מתקרב לגבולות',
    icon: <AlertTriangle size={24} />,
    benefits: [
      'התראות בזמן אמת',
      'סטטיסטיקה של חריגות',
      'היסטוריה של התראות',
      'דוחות מפורטים',
      'המלצות לניהול עצמי'
    ]
  },
  vendor_analysis: {
    title: 'ניתוח ספקים AI',
    description: 'המלצות AI להמלצת ספקים חלופיים ואנליזת הצעות',
    icon: <Sparkles size={24} />,
    benefits: [
      'המלצת רשימת ספקים חכמה',
      'אנליזת הצעות אוטומטית',
      'הצעת חלופים בהתאם לתקציב',
      'בדיקת דירוג ספקים',
      'המלצת דוחות מפורטים'
    ]
  }
}

export function UpgradePrompt({ feature, isOpen, onClose }: UpgradePromptProps) {
  const [showComparison, setShowComparison] = useState(false)
  const { tier } = useTier()
  const isPremium = tier === 'premium' || tier === 'legacy_premium'

  if (isPremium || !isOpen) return null

  const currentFeature = feature ? featureBenefits[feature] : null

  const handleUpgrade = () => {
    // TODO: Implement upgrade flow
    window.location.href = '/settings/tiers'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute left-4 top-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="סגור"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-2xl">💎</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">שדרג לפרימיום 💎</h2>
              <p className="text-sm text-gray-600">קבל גישה לכל התכונות המתקדמות</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {!showComparison ? (
            <>
              {/* Feature-specific content */}
              {currentFeature && (
                <div className="mb-6">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 mb-4">
                    <div className="flex items-start gap-3">
                      {currentFeature.icon}
                      <div>
                        <h3 className="text-lg font-bold text-amber-900 mb-1">{currentFeature.title}</h3>
                        <p className="text-sm text-amber-800">{currentFeature.description}</p>
                      </div>
                    </div>
                  </div>

                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Zap size={16} className="text-amber-500" />
                    יתרונות התכונה:
                  </h4>
                  <ul className="space-y-2">
                    {currentFeature.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* General benefits */}
              {!currentFeature && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Zap size={16} className="text-amber-500" />
                    כל התכונות הפרימיום:
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.values(featureBenefits).map((f, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        <span className="text-green-500 font-bold">✓</span>
                        <span>{f.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing section */}
              <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-6 text-white">
                <h3 className="text-lg font-bold mb-2">תכנית משתמש</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>הרבה אירועים ללא הגבלה</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>הרבה משתתפים לאירוע</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>הודעות WhatsApp ללא הגבלה</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>הכל תכונות הפרימיום</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>תמיכה מקסימלית</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Comparison view */}
              <button
                onClick={() => setShowComparison(false)}
                className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium mb-4"
              >
                <ChevronLeft size={16} />
                חזרה להצעות השדרוג
              </button>

              <h3 className="text-lg font-bold text-gray-900 mb-4">השוואת תוכניות</h3>
              
              <div className="overflow-hidden rounded-xl border border-gray-200">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">תכונה</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700 bg-gray-100">
                        <div className="mb-1">בסיס</div>
                        <div className="text-xs text-gray-500">חינם</div>
                      </th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500">
                        <div className="mb-1">פרימיום 💎</div>
                        <div className="text-xs opacity-90">ללא הגבלה</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3 text-right text-sm text-gray-900 font-medium">אירועים לשנה</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 bg-gray-50">5</td>
                      <td className="px-4 py-3 text-center text-sm text-amber-900 bg-amber-50 font-bold">ללא הגבלה</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3 text-right text-sm text-gray-900 font-medium">משתתפים לאירוע</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 bg-gray-50">100</td>
                      <td className="px-4 py-3 text-center text-sm text-amber-900 bg-amber-50 font-bold">ללא הגבלה</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3 text-right text-sm text-gray-900 font-medium">הודעות לחודש</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 bg-gray-50">200</td>
                      <td className="px-4 py-3 text-center text-sm text-amber-900 bg-amber-50 font-bold">ללא הגבלה</td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3 text-right text-sm text-gray-900 font-medium">סימולציית יום האירוע</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 bg-gray-50">
                        <span className="flex justify-center"><X size={16} className="text-red-500" /></span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-amber-900 bg-amber-50">
                        <span className="flex justify-center"><CheckCircle size={16} className="text-green-500" /></span>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3 text-right text-sm text-gray-900 font-medium">מנוע הנטוורקינג</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 bg-gray-50">
                        <span className="flex justify-center"><X size={16} className="text-red-500" /></span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-amber-900 bg-amber-50">
                        <span className="flex justify-center"><CheckCircle size={16} className="text-green-500" /></span>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3 text-right text-sm text-gray-900 font-medium">התראות תקציב</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 bg-gray-50">
                        <span className="flex justify-center"><X size={16} className="text-red-500" /></span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-amber-900 bg-amber-50">
                        <span className="flex justify-center"><CheckCircle size={16} className="text-green-500" /></span>
                      </td>
                    </tr>
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3 text-right text-sm text-gray-900 font-medium">ניתוח ספקים AI</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600 bg-gray-50">
                        <span className="flex justify-center"><X size={16} className="text-red-500" /></span>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-amber-900 bg-amber-50">
                        <span className="flex justify-center"><CheckCircle size={16} className="text-green-500" /></span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-gray-200 bg-gray-50">
          {!showComparison ? (
            <div className="flex gap-3">
              <button
                onClick={() => setShowComparison(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors text-gray-700"
              >
                למד עוד
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleUpgrade}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
              >
                שדרג לפרימיום
                <Zap size={18} />
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => setShowComparison(false)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors text-gray-700"
              >
                חזרה להצעות השדרוג
              </button>
              <button
                onClick={handleUpgrade}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg hover:shadow-xl"
              >
                שדרג לפרימיום
                <Zap size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
