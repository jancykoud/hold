import { describe, expect, it } from 'vitest'
import type { Conversation } from './model.ts'
import { createScriptedModel } from './scripted-model.ts'

// What the scripted stand-in looks for when a person names the kind of item they want.
async function kindAskedFor(text: string): Promise<unknown> {
  const model = createScriptedModel(() => new Date('2026-11-15T10:00:00Z'))
  const reply = await model.reply({ system: '', messages: [{ role: 'user', content: [{ type: 'text', text }] }], tools: [], maxTokens: 1000 }, new AbortController().signal)
  if (reply.kind !== 'reply') throw new Error('The script always replies.')
  const call = reply.content.find((block) => block.type === 'tool_use')
  if (call?.type !== 'tool_use' || call.name !== 'find_shops') throw new Error('The script looks for a shop first.')
  return (call.input as Readonly<Record<string, unknown>>)['kind']
}

describe('the scripted assistant', () => {
  it.each([
    ['Book me a car for three days.', 'car'],
    ['I need a hatchback this weekend', 'car'],
    ['Réserve-moi une voiture pour trois jours', 'car'],
    ['Buche mir ein Auto für drei Tage', 'car'],
    ['Resérvame un coche para tres días', 'car'],
    ['A van to move a sofa, please', 'van'],
    ['Rent me a motorhome for a week', 'motorhome'],
    ['A motorbike for two days', 'motorbike'],
    ['An e-bike for three days', 'e_bike'],
    ['Two bikes for the afternoon', 'bike'],
  ])('hears "%s" as a %s', async (text, kind) => {
    expect(await kindAskedFor(text)).toBe(kind)
  })

  it('does not hear a car in a word that only contains one', async () => {
    expect(await kindAskedFor('Can I pay by card?')).toBeUndefined()
  })

  it('quotes the kind of item the person asked for, not the first one that is free', async () => {
    const answered = (id: string, name: string, input: Record<string, unknown>, result: Record<string, unknown>): Conversation => [
      { role: 'assistant', content: [{ type: 'tool_use', id, name, input }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: JSON.stringify(result), is_error: false }] },
    ]
    const period = { shop: 'ribeira', starts_at: '2026-11-16T10:00', ends_at: '2026-11-19T10:00' }
    const messages: Conversation = [
      { role: 'user', content: [{ type: 'text', text: 'Book me a car for three days.' }] },
      ...answered('a', 'check_availability', period, {
        shop: 'ribeira',
        item_types: [
          { item_type_id: 'bike-type', kind: 'bike', available: 4 },
          { item_type_id: 'car-type', kind: 'car', available: 2 },
        ],
      }),
      ...answered('b', 'get_damage_prices', { shop: 'ribeira' }, { prices: [] }),
    ]
    const model = createScriptedModel(() => new Date('2026-11-15T10:00:00Z'))
    const reply = await model.reply({ system: '', messages, tools: [], maxTokens: 1000 }, new AbortController().signal)
    expect(reply).toMatchObject({ content: [{ type: 'tool_use', name: 'quote_rental', input: { ...period, items: [{ item_type_id: 'car-type', count: 1 }] } }] })
  })
})
