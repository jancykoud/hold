import { describe, expect, it } from 'vitest'
import { DEMO_SHOP, DEMO_WORDS, demoWords } from './demo-shop.ts'

// The demo's words follow the demo's own order, so a list that is one short would misname a price or a view.
describe('the demo shop’s words', () => {
  it.each(['fr', 'de', 'es'])('name every price, every view and every sample item in %s', (language) => {
    const words = demoWords(language)
    expect(words.language).toBe(language)
    expect(words.prices).toHaveLength(DEMO_SHOP.priceList.length)
    expect(words.bike.views).toHaveLength(DEMO_SHOP.bookable.views.length)
    expect(words.car.views).toHaveLength(DEMO_SHOP.vehicle.views.length)
    expect(Object.keys(words.sampleItems).sort()).toEqual(Object.keys(DEMO_WORDS.sampleItems).sort())
    for (const word of [...words.prices, ...words.bike.views, ...words.car.views, words.bike.name, words.car.name, words.dropPoint, words.wearPolicy, ...Object.values(words.sampleItems)]) expect(word.trim()).not.toBe('')
    // Every sentence a sample shows is written, and none is left in English.
    const sentences = (value: unknown): string[] => (typeof value === 'string' ? [value] : Object.values(value as object).flatMap(sentences))
    const english = new Set(sentences(DEMO_WORDS.sampleTexts))
    for (const sentence of sentences(words.sampleTexts)) {
      expect(sentence.trim()).not.toBe('')
      expect(english.has(sentence)).toBe(false)
    }
    expect(sentences(words.sampleTexts)).toHaveLength(english.size)
    // No two prices and no two views of one plan read alike: a plan's labels must differ, and so must a list's entries.
    for (const list of [words.prices, words.bike.views, words.car.views]) expect(new Set(list).size).toBe(list.length)
  })

  it('are English for a language the site is not written in', () => {
    expect(demoWords('pt')).toBe(DEMO_WORDS)
    expect(demoWords('en')).toBe(DEMO_WORDS)
  })
})
