import type { ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  showClose?: boolean
}

export type { ModalProps }

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true
}: ModalProps) {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-xl',
    xl: 'max-w-2xl',
    '2xl': 'max-w-4xl'
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className={`glass-modal w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto rounded-2xl`}>
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-[#0f1117]/95 backdrop-blur-xl rounded-t-2xl">
          <h2 className="text-2xl font-semibold text-white">
            {title}
          </h2>
          {showClose && (
            <button onClick={onClose} className="p-2 hover:bg-[#1a1d27]/10 rounded-xl transition-colors">
              <X size={24} className="text-zinc-400" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {children}
        </div>
      </div>
    </div>
  )
}
