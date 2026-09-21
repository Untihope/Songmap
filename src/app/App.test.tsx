vi.mock('virtual:pwa-register/react',()=>({useRegisterSW:()=>({needRefresh:[false,()=>{}],updateServiceWorker:()=>Promise.resolve()})}))
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { App } from './App'
it('routes unknown URLs to a recoverable page', () => {
  render(<MemoryRouter initialEntries={['/missing']}><App/></MemoryRouter>)
  expect(screen.getByRole('heading', { name: 'ページが見つかりません' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'ホームへ戻る' })).toHaveAttribute('href', '/')
})
