import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    window.dispatchEvent(new CustomEvent('cognexa:error', { detail: { error, info } }))
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main id="main-content" className="nx-error-state" role="alert">
        <span className="nx-error-state__eyebrow">Cognexa</span>
        <h1>We hit a learning detour.</h1>
        <p>Your work is still safe. Reload the application to reconnect.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Reload application
        </button>
      </main>
    )
  }
}
