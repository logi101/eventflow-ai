import { toast } from 'sonner'

export { toast }

export function confirmAction(message: string): Promise<boolean> {
  return new Promise(resolve => {
    toast(message, {
      duration: Infinity,
      action: { label: 'אישור', onClick: () => resolve(true) },
      cancel: { label: 'ביטול', onClick: () => resolve(false) },
      onDismiss: () => resolve(false),
    })
  })
}
