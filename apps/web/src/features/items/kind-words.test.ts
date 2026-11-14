import { ITEM_CATEGORIES, suggestedPhotoPlan } from '@hold/domain'
import { describe, expect, it } from 'vitest'
import english from '../../../messages/en.json'
import { CATEGORY_ICONS } from './category-icon'

// The form words a suggested view by its key through a cast, so the compiler cannot see a key with no words. This
// test can. The other languages are held to the English keys by messages.test.ts.
describe('the kinds of item a shop rents', () => {
  const words = english.shop.items

  it('each have a name and a sign', () => {
    for (const kind of ITEM_CATEGORIES) {
      expect(words.categories[kind], kind).toEqual(expect.any(String))
      expect(CATEGORY_ICONS[kind], kind).toBeDefined()
    }
  })

  it('have words for every view their suggested plan asks for', () => {
    const labels: Readonly<Record<string, string | undefined>> = words.suggestedViews
    for (const kind of ITEM_CATEGORIES) {
      for (const view of suggestedPhotoPlan(kind)) expect(labels[view.key], `${kind}: ${view.key}`).toEqual(expect.any(String))
    }
  })

  it('give no two views of one suggested plan the same words, which the plan would refuse', () => {
    const labels: Readonly<Record<string, string | undefined>> = words.suggestedViews
    for (const kind of ITEM_CATEGORIES) {
      const said = suggestedPhotoPlan(kind).map((view) => labels[view.key]?.toLowerCase())
      expect(new Set(said).size, kind).toBe(said.length)
    }
  })
})
