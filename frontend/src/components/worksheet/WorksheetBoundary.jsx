import { Component } from 'react'

export default class WorksheetBoundary extends Component {
  state = { error: null, stack: '' }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Worksheet crashed:', error, info.componentStack)
    this.setState({ stack: (info.componentStack || '').split('\n').slice(0, 4).join('\n') })
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className='ws-banner err' style={{ padding: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>This section hit an error.</div>
        <div style={{ fontSize: 13, marginBottom: 8, wordBreak: 'break-word' }}>{String(this.state.error.message || this.state.error)}</div>
        {this.state.stack && <pre style={{ fontSize: 11, whiteSpace: 'pre-wrap', margin: '0 0 10px' }}>{this.state.stack}</pre>}
        <button className='ws-btn' onClick={() => window.location.reload()}>Reload page</button>
      </div>
    )
  }
}