import { describe, expect, it } from 'vitest'
import { checkPhotoPlan, ITEM_CATEGORIES, PHOTO_PLAN_LIMITS, suggestedPhotoPlan, viewKeys } from './photo-plan.ts'
import type { PhotoPlanViewDraft } from './photo-plan.ts'

const view = (label: string, required = true): PhotoPlanViewDraft => ({ label, outline: 'whole_side', required })

describe('a photo plan', () => {
  it('is accepted with labelled views, one of them required', () => {
    expect(checkPhotoPlan([view('Frame, left side'), view('Display', false)])).toEqual([])
  })

  it('names every problem, by view', () => {
    expect(checkPhotoPlan([view(' ', false), view('Battery', false), view('battery', false), view('x'.repeat(PHOTO_PLAN_LIMITS.label + 1), false)])).toEqual([
      { kind: 'view_label_missing', view: 0 },
      { kind: 'view_label_repeated', view: 2 },
      { kind: 'view_label_too_long', view: 3 },
      { kind: 'no_required_view' },
    ])
  })

  it('needs at least one view, and no more than the limit', () => {
    expect(checkPhotoPlan([])).toEqual([{ kind: 'no_views' }])
    const many = Array.from({ length: PHOTO_PLAN_LIMITS.views + 1 }, (_, index) => view(`View ${String(index)}`))
    expect(checkPhotoPlan(many)).toEqual([{ kind: 'too_many_views' }])
  })

  it('gives each view a stable key from its label, numbering a key two labels share', () => {
    expect(viewKeys([view('Frame, left side'), view('Rear wheel'), view('Rear-wheel!'), view('!!!')])).toEqual(['frame-left-side', 'rear-wheel', 'rear-wheel-3', 'view-4'])
  })

  it('suggests a plan for every category, each one the camera can accept', () => {
    for (const category of ITEM_CATEGORIES) {
      const suggestion = suggestedPhotoPlan(category)
      expect(suggestion.length).toBeGreaterThan(0)
      expect(checkPhotoPlan(suggestion.map((suggested) => ({ ...suggested, label: suggested.key })))).toEqual([])
    }
  })

  it('keeps every kind a shop already uses, and ends on the one for anything else', () => {
    expect(ITEM_CATEGORIES.slice(0, 9)).toEqual(['bike', 'e_bike', 'scooter', 'water', 'snow', 'camera', 'camping', 'event', 'tool'])
    expect(ITEM_CATEGORIES.at(-1)).toBe('other')
    expect(new Set(ITEM_CATEGORIES).size).toBe(ITEM_CATEGORIES.length)
  })

  it('names the kinds a large rental business offers, from vehicles to places', () => {
    const kinds: readonly string[] = ITEM_CATEGORIES
    for (const kind of ['car', 'van', 'motorhome', 'motorbike', 'trailer', 'boat', 'machinery', 'garden', 'mobility', 'baby', 'instrument', 'clothing', 'luxury', 'electronics', 'drone', 'stage', 'sport', 'furniture', 'travel', 'space']) {
      expect(kinds).toContain(kind)
    }
  })

  it('suggests a walk around a car that ends on the dashboard, where the mileage and the fuel are read', () => {
    expect(suggestedPhotoPlan('car').map((suggested) => suggested.key)).toEqual(['front', 'rear', 'side_left', 'side_right', 'front_left_corner', 'front_right_corner', 'rear_left_corner', 'rear_right_corner', 'windscreen', 'wheels', 'interior', 'dashboard'])
  })

  it('suggests the six e-bike views the guided handover shows', () => {
    expect(suggestedPhotoPlan('e_bike').map((suggested) => suggested.key)).toEqual(['frame_left', 'frame_right', 'front_wheel', 'rear_wheel', 'display', 'battery'])
  })
})
