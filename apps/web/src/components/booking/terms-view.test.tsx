import { screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { renderWithIntl } from '@/test/render'
import { TermsView } from './terms-view'

// docs/vehicle-plan.md step 2: a renter reads, before agreeing, which type of damage each price is for.
it('says the type of damage a price names, and nothing beside a price that names none', () => {
  renderWithIntl(
    <TermsView
      currency="EUR"
      wearPolicy="Stone chips smaller than a coin are ordinary wear."
      prices={[
        { description: 'Scratch through the paint', category: 'damage', amountCents: 180_00, damageType: 'scratch' },
        { description: 'Cracked windscreen', category: 'damage', amountCents: 420_00, damageType: 'broken_glass' },
        { description: 'Lost key', category: 'loss', amountCents: 250_00, damageType: null },
        { description: 'Torn seat', category: 'damage', amountCents: 300_00 },
      ]}
    />,
  )
  const row = (description: string) => within(screen.getByText(description).closest('li') ?? document.body)
  expect(row('Scratch through the paint').getByText('Scratch')).toBeInTheDocument()
  expect(row('Cracked windscreen').getByText('Broken glass')).toBeInTheDocument()
  for (const untyped of ['Lost key', 'Torn seat']) expect(row(untyped).queryByText(/^(Scratch|Impact|Dent|Broken glass)$/)).not.toBeInTheDocument()
})
