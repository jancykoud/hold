import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithIntl } from '@/test/render'
import { BothSides } from './both-sides'

const shop = () => within(screen.getByRole('figure', { name: 'Jonas, at the counter' }))
const renter = () => within(screen.getByRole('figure', { name: 'Priya, the renter' }))

describe('BothSides', () => {
  it('shows the shop and the renter the same finding at the same price', () => {
    renderWithIntl(<BothSides />)
    for (const side of [shop(), renter()]) {
      expect(side.getByText('Scratched door')).toBeInTheDocument()
      expect(side.getByText('€180')).toBeInTheDocument()
    }
  })

  it('shows both sides that the old scuff costs nothing', () => {
    renderWithIntl(<BothSides />)
    for (const side of [shop(), renter()]) {
      expect(side.getByText('Scuff low on the door')).toBeInTheDocument()
      expect(side.getByText('€0')).toBeInTheDocument()
    }
  })

  it('gives the shop the approval', () => {
    renderWithIntl(<BothSides />)
    expect(shop().getByText('1 new mark found')).toBeInTheDocument()
    expect(shop().getByText('Approve claim · €180')).toBeInTheDocument()
  })

  it('gives the renter a way to accept and a way to disagree', () => {
    renderWithIntl(<BothSides />)
    expect(renter().getByText('The shop is asking for €180')).toBeInTheDocument()
    expect(renter().getByText('Accept')).toBeInTheDocument()
    expect(renter().getByText('I disagree')).toBeInTheDocument()
    expect(renter().getByText('€180 taken, €1,020 released')).toBeInTheDocument()
  })

  it('joins the two screens with one hold', () => {
    renderWithIntl(<BothSides />)
    const hold = within(screen.getByRole('group', { name: 'Hold 2291' }))
    expect(hold.getByText('€1,200.00')).toBeInTheDocument()
    expect(hold.getByText('€180.00')).toBeInTheDocument()
    expect(hold.getByText('€1,020.00')).toBeInTheDocument()
  })

  it('draws the screens as pictures, with no control that could be pressed', () => {
    renderWithIntl(<BothSides />)
    expect(screen.queryAllByRole('button')).toEqual([])
  })
})
