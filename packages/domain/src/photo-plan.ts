import { slugOf } from './slug.ts'

// The views staff photograph for one kind of item, in the order the camera asks for them (architecture.md section
// 9.1). A plan is never changed once saved: an edit saves a new plan, so a return is always compared view by view
// with the handover it follows.

// What a shop rents, as the kinds the public pages name. Each has a suggested plan the shop adjusts.
// A kind is never renamed or removed: item types and rental outcomes are stored under it. A new one goes before `other`.
export const ITEM_CATEGORIES = [
  'bike',
  'e_bike',
  'scooter',
  'water',
  'snow',
  'camera',
  'camping',
  'event',
  'tool',
  'car',
  'van',
  'motorhome',
  'motorbike',
  'trailer',
  'boat',
  'machinery',
  'garden',
  'mobility',
  'baby',
  'instrument',
  'clothing',
  'luxury',
  'electronics',
  'drone',
  'stage',
  'sport',
  'furniture',
  'travel',
  'space',
  'other',
] as const
export type ItemCategory = (typeof ITEM_CATEGORIES)[number]

// The framing outline the camera draws over a view.
export const VIEW_OUTLINES = ['whole_side', 'front', 'rear', 'top', 'detail'] as const
export type ViewOutline = (typeof VIEW_OUTLINES)[number]

export const PHOTO_PLAN_LIMITS = { views: 12, label: 60 } as const

export type PhotoPlanViewDraft = { readonly label: string; readonly outline: ViewOutline; readonly required: boolean }

export type PhotoPlanProblem =
  | { readonly kind: 'no_views' }
  | { readonly kind: 'too_many_views' }
  | { readonly kind: 'no_required_view' }
  | { readonly kind: 'view_label_missing'; readonly view: number }
  | { readonly kind: 'view_label_too_long'; readonly view: number }
  | { readonly kind: 'view_label_repeated'; readonly view: number }

export function checkPhotoPlan(views: readonly PhotoPlanViewDraft[]): readonly PhotoPlanProblem[] {
  if (views.length === 0) return [{ kind: 'no_views' }]
  if (views.length > PHOTO_PLAN_LIMITS.views) return [{ kind: 'too_many_views' }]
  const problems: PhotoPlanProblem[] = []
  const seen = new Set<string>()
  views.forEach((view, index) => {
    const label = view.label.trim()
    const key = label.toLowerCase()
    if (label === '') problems.push({ kind: 'view_label_missing', view: index })
    else if (label.length > PHOTO_PLAN_LIMITS.label) problems.push({ kind: 'view_label_too_long', view: index })
    else if (seen.has(key)) problems.push({ kind: 'view_label_repeated', view: index })
    seen.add(key)
  })
  if (!views.some((view) => view.required)) problems.push({ kind: 'no_required_view' })
  return problems
}

// The key each view's photographs are filed under. Two labels can make one key; the later one is numbered.
export function viewKeys(views: readonly PhotoPlanViewDraft[]): readonly string[] {
  const keys = new Set<string>()
  return views.map((view, index) => {
    let key = slugOf(view.label)
    if (key === '') key = `view-${String(index + 1)}`
    if (keys.has(key)) key = `${key}-${String(index + 1)}`
    keys.add(key)
    return key
  })
}

export type SuggestedView = { readonly key: string; readonly outline: ViewOutline; readonly required: boolean }

const view = (key: string, outline: ViewOutline, required = true): SuggestedView => ({ key, outline, required })

// The keys name the suggestion, and the web app words each one in the person's language before it is saved.
const SUGGESTED: Readonly<Record<ItemCategory, readonly SuggestedView[]>> = {
  bike: [
    view('frame_left', 'whole_side'),
    view('frame_right', 'whole_side'),
    view('front_wheel', 'front'),
    view('rear_wheel', 'rear'),
    view('saddle', 'detail', false),
    view('handlebar', 'detail', false),
  ],
  e_bike: [
    view('frame_left', 'whole_side'),
    view('frame_right', 'whole_side'),
    view('front_wheel', 'front'),
    view('rear_wheel', 'rear'),
    view('display', 'detail'),
    view('battery', 'detail'),
  ],
  scooter: [view('deck_left', 'whole_side'), view('deck_right', 'whole_side'), view('front', 'front'), view('rear', 'rear'), view('display', 'detail')],
  water: [view('deck', 'top'), view('hull', 'top'), view('side_left', 'whole_side'), view('side_right', 'whole_side'), view('bow', 'front', false), view('stern', 'rear', false)],
  snow: [view('top_sheet', 'top'), view('base', 'top'), view('edges', 'detail'), view('bindings', 'detail')],
  camera: [view('front', 'front'), view('back', 'rear'), view('top', 'top'), view('lens_glass', 'detail'), view('mount', 'detail', false)],
  camping: [view('whole', 'whole_side'), view('fabric', 'detail'), view('zips', 'detail', false), view('poles', 'detail', false)],
  event: [view('front', 'front'), view('back', 'rear'), view('top', 'top'), view('detail', 'detail', false)],
  tool: [view('whole', 'whole_side'), view('working_end', 'detail'), view('cable', 'detail', false), view('serial_plate', 'detail', false)],
  // A walk around the car, then inside. The dashboard is where the mileage and the fuel are read.
  car: [
    view('front', 'front'),
    view('rear', 'rear'),
    view('side_left', 'whole_side'),
    view('side_right', 'whole_side'),
    view('front_left_corner', 'front', false),
    view('front_right_corner', 'front', false),
    view('rear_left_corner', 'rear', false),
    view('rear_right_corner', 'rear', false),
    view('windscreen', 'detail'),
    view('wheels', 'detail', false),
    view('interior', 'detail'),
    view('dashboard', 'detail'),
  ],
  van: [
    view('front', 'front'),
    view('rear', 'rear'),
    view('side_left', 'whole_side'),
    view('side_right', 'whole_side'),
    view('windscreen', 'detail'),
    view('load_area', 'detail'),
    view('interior', 'detail'),
    view('dashboard', 'detail'),
    view('wheels', 'detail', false),
  ],
  motorhome: [
    view('front', 'front'),
    view('rear', 'rear'),
    view('side_left', 'whole_side'),
    view('side_right', 'whole_side'),
    view('windscreen', 'detail'),
    view('living_area', 'detail'),
    view('kitchen', 'detail'),
    view('bathroom', 'detail', false),
    view('awning', 'detail', false),
    view('dashboard', 'detail'),
  ],
  motorbike: [
    view('side_left', 'whole_side'),
    view('side_right', 'whole_side'),
    view('front', 'front'),
    view('rear', 'rear'),
    view('tank', 'detail'),
    view('dashboard', 'detail'),
    view('exhaust', 'detail', false),
    view('wheels', 'detail', false),
  ],
  trailer: [view('side_left', 'whole_side'), view('side_right', 'whole_side'), view('hitch', 'front'), view('rear', 'rear'), view('load_area', 'top'), view('wheels', 'detail', false)],
  boat: [
    view('side_left', 'whole_side'),
    view('side_right', 'whole_side'),
    view('bow', 'front'),
    view('stern', 'rear'),
    view('deck', 'top'),
    view('engine', 'detail'),
    view('helm', 'detail'),
    view('hull', 'top', false),
  ],
  machinery: [
    view('front', 'front'),
    view('rear', 'rear'),
    view('side_left', 'whole_side'),
    view('side_right', 'whole_side'),
    view('working_end', 'detail'),
    view('controls', 'detail'),
    view('hour_meter', 'detail'),
    view('serial_plate', 'detail', false),
  ],
  garden: [view('whole', 'whole_side'), view('working_end', 'detail'), view('engine', 'detail', false), view('cable', 'detail', false)],
  mobility: [
    view('side_left', 'whole_side'),
    view('side_right', 'whole_side'),
    view('front', 'front'),
    view('rear', 'rear'),
    view('seat', 'detail'),
    view('controls', 'detail', false),
    view('battery', 'detail', false),
  ],
  baby: [
    view('front', 'front'),
    view('back', 'rear'),
    view('side_left', 'whole_side'),
    view('side_right', 'whole_side'),
    view('fabric', 'detail'),
    view('harness', 'detail'),
    view('wheels', 'detail', false),
  ],
  instrument: [view('front', 'front'), view('back', 'rear'), view('playing_surface', 'detail'), view('case', 'detail', false)],
  clothing: [view('front', 'front'), view('back', 'rear'), view('fabric', 'detail'), view('lining', 'detail', false), view('hem_and_cuffs', 'detail', false)],
  luxury: [view('front', 'front'), view('back', 'rear'), view('clasp', 'detail'), view('hallmark', 'detail', false)],
  electronics: [view('front', 'front'), view('back', 'rear'), view('screen', 'detail'), view('ports', 'detail'), view('serial_plate', 'detail', false)],
  drone: [view('top', 'top'), view('underside', 'top'), view('propellers', 'detail'), view('gimbal', 'detail'), view('controller', 'detail'), view('battery', 'detail', false)],
  stage: [view('front', 'front'), view('back', 'rear'), view('top', 'top'), view('connectors', 'detail'), view('cable', 'detail', false), view('serial_plate', 'detail', false)],
  sport: [view('whole', 'whole_side'), view('front', 'front'), view('back', 'rear'), view('detail', 'detail', false)],
  furniture: [view('front', 'front'), view('back', 'rear'), view('top', 'top'), view('side_left', 'whole_side'), view('side_right', 'whole_side'), view('detail', 'detail', false)],
  travel: [
    view('front', 'front'),
    view('back', 'rear'),
    view('side_left', 'whole_side'),
    view('side_right', 'whole_side'),
    view('locks', 'detail', false),
    view('wheels', 'detail', false),
    view('interior', 'detail', false),
  ],
  // A place is photographed room by room, then the surfaces that mark most easily.
  space: [
    view('entrance', 'front'),
    view('living_area', 'whole_side'),
    view('kitchen', 'whole_side', false),
    view('bathroom', 'whole_side', false),
    view('bedroom', 'whole_side', false),
    view('floor', 'detail'),
    view('walls', 'detail'),
    view('outside', 'whole_side', false),
  ],
  other: [view('front', 'front'), view('back', 'rear'), view('side_left', 'whole_side'), view('side_right', 'whole_side')],
}

export function suggestedPhotoPlan(category: ItemCategory): readonly SuggestedView[] {
  return SUGGESTED[category]
}
