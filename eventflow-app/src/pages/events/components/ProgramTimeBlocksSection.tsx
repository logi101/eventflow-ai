import { Plus, Edit2, Trash2, Coffee, Clock, Users, Mic, UserCheck } from 'lucide-react'
import type { TimeBlock, BlockType } from '../../../types'

const getBlockTypeLabel = (type: BlockType) => {
  const labels = {
    session: 'מפגש',
    break: 'הפסקה',
    registration: 'רישום',
    networking: 'נטוורקינג',
    meal: 'ארוחה',
    other: 'אחר'
  }
  return labels[type]
}

const getBlockTypeIcon = (type: BlockType) => {
  const icons: Record<BlockType, React.ReactNode> = {
    session: <Mic size={16} />,
    break: <Coffee size={16} />,
    registration: <UserCheck size={16} />,
    networking: <Users size={16} />,
    meal: <Coffee size={16} />,
    other: <Clock size={16} />
  }
  return icons[type]
}

interface ProgramTimeBlocksSectionProps {
  timeBlocks: TimeBlock[]
  onAddBlock: () => void
  onEditBlock: (block: TimeBlock) => void
  onDeleteBlock: (block: TimeBlock) => void
}

export function ProgramTimeBlocksSection({
  timeBlocks,
  onAddBlock,
  onEditBlock,
  onDeleteBlock
}: ProgramTimeBlocksSectionProps) {
  return (
    <div className="card mb-6" data-testid="time-blocks-section">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">בלוקי זמן</h2>
        <button
          onClick={onAddBlock}
          className="btn-primary flex items-center gap-2"
          data-testid="add-time-block-button"
        >
          <Plus size={18} />
          הוסף בלוק זמן
        </button>
      </div>

      <div className="space-y-2">
        {timeBlocks.map(block => (
          <div key={block.id} className="border rounded-lg p-3 flex items-center justify-between" data-testid="time-block-card">
            <div className="flex items-center gap-3">
              <span className="text-zinc-400" data-testid="block-type-icon">{getBlockTypeIcon(block.block_type)}</span>
              <div>
                <h4 className="font-medium">{block.title}</h4>
                <p className="text-sm text-zinc-400">
                  {new Date(block.start_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })} -
                  {new Date(block.end_time).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <span className="text-xs bg-white/5 px-2 py-1 rounded">{getBlockTypeLabel(block.block_type)}</span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onEditBlock(block)}
                className="p-1 hover:bg-white/5 rounded"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => onDeleteBlock(block)}
                className="p-1 hover:bg-red-500/10 rounded text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
