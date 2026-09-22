import { Component, type ReactNode } from 'react'

export class AppBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <main className="page stack" role="alert"><h1>画面を読み込めませんでした</h1><p>保存済みのデータは削除していません。再読み込みしてもう一度お試しください。</p><button onClick={() => location.reload()}>再読み込み</button></main>
    return this.props.children
  }
}
