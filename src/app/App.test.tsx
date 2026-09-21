import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { App } from './App'
it('routes unknown URLs to a recoverable page', () => {
  render(<MemoryRouter initialEntries={['/missing']}><App/></MemoryRouter>)
  expect(screen.getByRole('heading', { name: 'ページが見つかりません' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'ホームへ戻る' })).toHaveAttribute('href', '/')
})
