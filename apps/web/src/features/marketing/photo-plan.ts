import { suggestedPhotoPlan } from '@hold/domain'
import { evidencePhoto } from './evidence-photo'

// The walk around a car, in the order staff are led through it: the plan Hold suggests for one, named in the words
// the shop's own plan editor uses (`shop.items.suggestedViews`). docs/project-description.md section 5.
export const photoPlanKeys = suggestedPhotoPlan('car').map((view) => view.key)

// The illustration stops at the rear left wheel: the views before it are taken, the ones after it are still to come.
export const currentView = 'wheel_rear_left'

// The one view taken so far that the example's photograph can show: the car's left side, at its rear door.
export const capturedPictures: Readonly<Record<string, string>> = { side_left: evidencePhoto.crops.frame }
