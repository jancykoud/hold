import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithIntl } from '@/test/render'
import { ReadingPanel } from './reading-panel'

const refresh = vi.fn()
vi.mock('@/i18n/navigation', async (original) => ({ ...(await original<object>()), useRouter: () => ({ push: vi.fn(), refresh }) }))

const SESSION = '00000000-0000-4000-8000-0000000000c1'
const FULL = { odometerKm: 48_210, fuelEighths: 8 }

describe('reading a vehicle’s dashboard', () => {
  it('asks for the kilometres and the fuel, in eighths of a tank, and sends what a person entered', async () => {
    const record = vi.fn().mockResolvedValue({ ok: true, value: {} })
    renderWithIntl(<ReadingPanel sessionId={SESSION} reading={null} handoverReading={null} sealed={false} record={record} />)
    const panel = screen.getByRole('region', { name: 'Dashboard' })
    expect(panel).toHaveTextContent('Read both from the dashboard photograph.')
    await userEvent.type(screen.getByLabelText('Kilometres on the odometer'), '48210')
    await userEvent.selectOptions(screen.getByLabelText('Fuel in the tank'), 'Full')
    await userEvent.click(screen.getByRole('button', { name: 'Save the reading' }))
    await waitFor(() => { expect(record).toHaveBeenCalled() })
    const sent = record.mock.calls[0]?.[1] as FormData
    expect([sent.get('sessionId'), sent.get('odometerKm'), sent.get('fuelEighths')]).toEqual([SESSION, '48210', '8'])
    await waitFor(() => { expect(refresh).toHaveBeenCalled() })
  })

  it('shows what was read, and at a return what the handover read beside it', () => {
    renderWithIntl(<ReadingPanel sessionId={SESSION} reading={{ odometerKm: 48_930, fuelEighths: 5 }} handoverReading={FULL} sealed={false} record={vi.fn()} />)
    expect(screen.getByText('At handover: 48,210 km, full tank')).toBeInTheDocument()
    expect(screen.getByLabelText('Kilometres on the odometer')).toHaveValue(48_930)
    expect(screen.getByLabelText('Fuel in the tank')).toHaveValue('5')
  })

  it('says what was read and takes no change once the photographs are sealed', () => {
    renderWithIntl(<ReadingPanel sessionId={SESSION} reading={{ odometerKm: 48_930, fuelEighths: 5 }} handoverReading={null} sealed record={vi.fn()} />)
    expect(screen.getByText('48,930 km, 5/8 of a tank')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save the reading' })).not.toBeInTheDocument()
  })
})
