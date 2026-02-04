import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-900 text-white" dir="rtl">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-500 mb-4">שגיאה באפליקצייה</h1>
            <p className="text-zinc-300 mb-4">
              קרה לפתוח את הקונסול (F12) כדי לראות את השגיאה המלאה.
            </p>
            <pre className="bg-zinc-800 p-4 rounded text-left text-sm overflow-auto max-w-2xl">
              {this.state.error?.toString()}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
            >
              טען חדש
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
