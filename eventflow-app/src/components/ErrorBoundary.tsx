import React from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Sentry } from '../lib/sentry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } })
    this.setState({
      error,
      errorInfo
    })
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 px-6" dir="rtl" role="alert" aria-live="assertive">
            <div className="max-w-2xl w-full">
              <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-8 text-center">
                <div className="flex justify-center mb-4">
                  <AlertTriangle className="w-12 h-12 text-red-400" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">שגיאה בטעינת הדף</h1>
                <p className="text-zinc-300 mb-6">
                  אנחנו מצטערים, אך אירעה שגיאה בעת טעינת הדף. אנא נסה שוב.
                </p>

                {this.state.error && (
                  <div className="bg-red-950/40 rounded-lg p-4 text-left mb-6 text-xs text-red-200 font-mono overflow-auto max-h-48">
                    <div className="font-bold mb-2">פרטי השגיאה:</div>
                    <div>{this.state.error.toString()}</div>
                    {this.state.errorInfo && (
                      <div className="mt-2">
                        <div className="font-bold">Stack Trace:</div>
                        <div>{this.state.errorInfo.componentStack}</div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={this.resetError}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  נסה שוב
                </button>
              </div>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
