import { Plus, Edit2, Trash2, Target, Zap, User, Building2 } from 'lucide-react'
import type { Contingency, ContingencyType, RiskLevel } from '../../../types'

const getRiskLevelColor = (level: RiskLevel) => {
  const colors = {
    low: 'bg-emerald-500/20 text-emerald-400',
    medium: 'bg-amber-500/20 text-amber-400',
    high: 'bg-orange-500/20 text-orange-400',
    critical: 'bg-red-500/20 text-red-400'
  }
  return colors[level]
}

const getRiskLevelLabel = (level: RiskLevel) => {
  const labels = { low: 'נמוך', medium: 'בינוני', high: 'גבוה', critical: 'קריטי' }
  return labels[level]
}

const getContingencyTypeLabel = (type: ContingencyType) => {
  const labels = {
    speaker_unavailable: 'דובר לא זמין',
    room_unavailable: 'חדר לא זמין',
    technical_failure: 'תקלה טכנית',
    weather: 'מזג אוויר',
    medical: 'רפואי',
    security: 'ביטחוני',
    other: 'אחר'
  }
  return labels[type]
}

interface ContingenciesTabProps {
  contingencies: Contingency[]
  onAddContingency: () => void
  onEditContingency: (contingency: Contingency) => void
  onDeleteContingency: (contingency: Contingency) => void
  onActivateContingency: () => void
}

export function ContingenciesTab({
  contingencies,
  onAddContingency,
  onEditContingency,
  onDeleteContingency,
  onActivateContingency
}: ContingenciesTabProps) {
  return (
    <div data-testid="contingencies-section">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold" data-testid="contingencies-title">תכניות חירום</h2>
        <div className="flex gap-2">
          <button className="btn-secondary" data-testid="show-risk-matrix-button">
            <Target size={18} className="inline mr-2" />
            מטריצת סיכונים
          </button>
          <button
            onClick={onAddContingency}
            className="btn-primary flex items-center gap-2"
            data-testid="add-contingency-button"
          >
            <Plus size={18} />
            הוסף תכנית חירום
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contingencies.map(contingency => (
          <div
            key={contingency.id}
            className={`border rounded-lg p-4 ${contingency.status === 'activated' ? 'border-red-500 bg-red-500/10 active' : 'border-white/10'}`}
            data-testid="contingency-card"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs ${getRiskLevelColor(contingency.risk_level)}`} data-testid="risk-level-indicator">
                  {getRiskLevelLabel(contingency.risk_level)}
                </span>
                <span className="text-sm text-zinc-400">{getContingencyTypeLabel(contingency.contingency_type)}</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onEditContingency(contingency)}
                  className="p-1 hover:bg-white/5 rounded"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDeleteContingency(contingency)}
                  className="p-1 hover:bg-red-500/10 rounded text-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <p className="font-medium mb-2">{contingency.description}</p>
            <p className="text-sm text-zinc-400 mb-3"><strong>תכנית פעולה:</strong> {contingency.action_plan}</p>

            {contingency.backup_speaker_id && (
              <div className="flex items-center gap-1 text-sm text-emerald-400 mb-2" data-testid="linked-speaker">
                <User size={14} />
                דובר גיבוי: {contingency.backup_speaker?.name}
              </div>
            )}
            {contingency.backup_room_id && (
              <div className="flex items-center gap-1 text-sm text-emerald-400 mb-2" data-testid="linked-room">
                <Building2 size={14} />
                חדר גיבוי: {contingency.backup_room?.name}
              </div>
            )}

            {contingency.status !== 'activated' && (
              <button
                className="btn-secondary w-full mt-2 text-red-400 border-red-500/30"
                data-testid="activate-contingency-button"
                onClick={onActivateContingency}
              >
                <Zap size={16} className="inline mr-2" />
                הפעל תכנית חירום
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
