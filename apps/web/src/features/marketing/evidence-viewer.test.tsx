import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithIntl } from '@/test/render'
import { EvidenceViewer } from './evidence-viewer'

const slider = () => screen.getByRole('slider', { name: 'Slide between the handover photograph and the return photograph' })

describe('EvidenceViewer', () => {
  it('opens on the scratched door, priced from the list', () => {
    renderWithIntl(<EvidenceViewer />)
    expect(screen.getByText('Scratched door, €180')).toBeInTheDocument()
    expect(screen.getByText('€1,200 reserved · €180 taken · €1,020 released')).toBeInTheDocument()
  })

  it('shows that a clean return takes nothing', async () => {
    renderWithIntl(<EvidenceViewer />)
    await userEvent.click(screen.getByRole('button', { name: 'Clean return' }))
    expect(screen.getByText('No new marks')).toBeInTheDocument()
    expect(screen.getByText('€1,200 reserved · €0 taken · €1,200 released')).toBeInTheDocument()
    expect(screen.queryByText('Scratched door, €180')).not.toBeInTheDocument()
  })

  it('removes the outline of the new mark on a clean return', async () => {
    renderWithIntl(<EvidenceViewer />)
    expect(screen.getByText('New')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clean return' }))
    expect(screen.queryByText('New')).not.toBeInTheDocument()
  })

  it('says which outcome is showing without relying on colour', async () => {
    renderWithIntl(<EvidenceViewer />)
    expect(screen.getByRole('button', { name: 'Scratched door' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Clean return' }))
    expect(screen.getByRole('button', { name: 'Clean return' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Scratched door' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps the old scuff uncharged in both outcomes', async () => {
    renderWithIntl(<EvidenceViewer />)
    expect(screen.getByText('Scuff low on the door, not charged')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clean return' }))
    expect(screen.getByText('Scuff low on the door, not charged')).toBeInTheDocument()
  })

  it('moves the divider with the slider', () => {
    renderWithIntl(<EvidenceViewer />)
    fireEvent.change(slider(), { target: { value: '60' } })
    expect(slider()).toHaveValue('60')
    expect(screen.getByTestId('evidence-stage').style.getPropertyValue('--position')).toBe('60%')
  })

  it('labels both photographs with when they were taken', () => {
    renderWithIntl(<EvidenceViewer />)
    expect(screen.getByText(/Oct 14, 09:12/)).toBeInTheDocument()
    expect(screen.getByText(/Oct 17, 17:48/)).toBeInTheDocument()
  })

  it('describes both photographs for readers who cannot see them', () => {
    renderWithIntl(<EvidenceViewer />)
    expect(screen.getByAltText('The rear door and wheel of a white car, photographed at handover')).toBeInTheDocument()
    expect(screen.getByAltText('The same door, photographed at return')).toBeInTheDocument()
  })

  it('says the photographs are illustrative', () => {
    renderWithIntl(<EvidenceViewer />)
    expect(screen.getByText('Example rental. Illustrative photographs.')).toBeInTheDocument()
  })
})
