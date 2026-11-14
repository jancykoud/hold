# Hold: the plan for vehicles

What Hold builds next so a vehicle rental business can use it for its condition reports. Draft 1, 14 November 2026.

This is a plan, not a design. Each step gets its design in `architecture.md` or `extensions.md` when it is built, as every change does (`AGENTS.md` section 1). Read `project-description.md` for what Hold is.

---

## 1. Where this comes from

Hold began as a deposit and damage system for small rental shops. On 14 November 2026 its lead market became the condition report of a rented vehicle: bodywork and glazing compared between departure and return, for vehicle rental companies and fleet managers, sold as a licence with a monthly subscription.

Nothing Hold is changes. The hold that replaces a deposit, the photographs compared at return, the person who approves every charge and the renter's right to reply are what a vehicle condition report needs. What changes is which market Hold is built for first, and so what is built first. The thirty kinds of item stay; the car stops being one kind among them.

## 2. What the code does today, and what it lacks

Read from the code on 14 November 2026.

| A vehicle condition report needs | Hold today |
|---|---|
| Departure and return compared, new damage found and outlined | Built, for any item |
| A person approving every charge, and the renter seeing the evidence | Built |
| A claim the renter can contest, and an evidence pack | Built |
| A deposit held without being charged | Built, on PayPal |
| A walk around a car in photographs | A suggested plan of twelve views; a plan cannot hold more (`PHOTO_PLAN_LIMITS.views`) |
| Damage named as a body shop names it | A finding has a class (new damage, known mark, wear, missing part, uncertain) and no type of damage |
| Mileage and fuel at departure and return | Nothing. The price list has four categories: damage, loss, lateness, cleaning |
| An accuracy stated for vehicles | Nothing. The evaluation set is 300 pairs of one item, a city e-bike, 288 of them synthetic and 12 real, and no run is accepted |
| A rental with no deposit, for a business with its own payments | Not possible. A rental passes through `awaiting_hold` |
| A video of the walk around | Nothing. Photographs only |
| A phone app | In the repository (`apps/mobile`); the web app is what is demonstrated |

## 3. The steps, in order

| # | Step | What is built | Size |
|---|---|---|---|
| 1 | The vehicle's photo plan | A plan of up to 24 views. The car's suggested plan in full: the walk around, four corners, four wheels, windscreen, roof, the inside, the dashboard. The comparison's ceiling grows with the plan | Medium. **Built, 15 November 2026** |
| 2 | Types of damage | Each finding carries a type: scratch, impact, dent, broken glass, missing part. Shown on the claim and matched to the price list | Medium |
| 3 | Mileage and fuel | Both read at departure and at return and entered by staff. Two more price categories. Claim lines worked out by plain code from the readings and the published price | Medium |
| 4 | Accuracy on vehicles | Pairs of photographs of real vehicles, a tuning half and a gate half. A first measured figure, published with its counts | Large, and it waits on photographs |
| 5 | A rental with no deposit | A rental may go out with no PayPal hold: the condition report alone, and an invoice if there is damage | Large |
| 6 | Video | The phone films the walk around; code takes the plan's views from it | Large |

**Why this order.**

- Steps 1 to 3 make Hold usable by a vehicle rental business. They add to the model and change none of its rules.
- Step 4 is the product. Until Hold has a measured figure on real bodywork it states none (`project-description.md` section 6.11), and a comparison is not sold on a promise. It is the longest step and it does not wait on the code, so it starts now, beside steps 1 to 3.
- Step 5 changes the rental's state machine and touches the rules of `AGENTS.md` section 6. It is raised and designed before it is built, and it waits for a business that asks for it.
- Step 6 is comfort. It rests on every step before it.

## 4. Each step, and when it is done

**1. The vehicle's photo plan. Built on 15 November 2026**, except the handover and return of a long plan walked on a phone, which is checked by the capture tests of a six-view plan and not yet by one of nineteen. A plan holds up to 24 views and the car's suggested plan has nineteen. Building it showed that a comparison stopped at ten model calls whatever the plan, so a plan of more than ten views, the car's twelve among them, always went to a person; the ceiling now grows with the plan (`architecture.md` section 10). Done when a shop saves a plan of 24 views and no more, the car's suggested plan asks for every view above, a handover and a return of 24 views complete on a phone at 360 pixels wide, and the comparison pairs each view of the return with its handover twin.

**2. Types of damage.** Done when every damage finding has one type from a list in `packages/domain`, a price list entry can name the type it prices, a claim line shows it, the model's answer is checked against the list like every other field, and a finding with no type still reaches a person.

**3. Mileage and fuel.** Done when staff enter both at handover and at return, a return with fewer kilometres than its handover is refused, the excess and the missing fuel are priced by plain code from the price list the renter accepted, each such line cites the two readings and their dashboard photographs, and no reading is taken from a model without a person confirming it.

**4. Accuracy on vehicles.** Done when the evaluation set holds pairs of real vehicles in both halves, the gate half is never read while tuning, a run on it is accepted, and the public page gives the figure for vehicles with its counts, clean returns wrongly flagged first.

**5. A rental with no deposit.** Done when a shop that chooses it hands over with no hold, every rule of section 6 of `AGENTS.md` still holds for the rentals that do have one, nothing is charged without a claim a person approved, and what is owed is asked for by invoice.

**6. Video.** Done when a walk filmed on a phone yields every required view of the plan sharp enough to compare, a view the video missed is asked for again as a photograph, and the evidence kept is the frames compared, sealed as photographs are.

## 5. What this needs from outside the code

- **Photographs of real vehicles**, at departure and at return, with damage and without, in the light and weather a rental business works in. Some hundreds of pairs, from one or two rental businesses willing to take them. Synthetic damage drawn on a clean photograph proves nothing about real bodywork.
- **A decision on mileage.** Entered by hand from the dashboard photograph, which is the plan above, or read by the model and confirmed by a person, which is more comfortable and has to be measured first.
- **More of the comparison model from AWS.** A vehicle's comparison looks at up to 24 pairs of photographs where a bike's looks at six, so it spends about four times the tokens. The account's daily limit for the comparison model was measured at about 940,000 tokens on 29 October 2026 (`tech-stack.md` section 18); what one vehicle's comparison spends is not measured yet, and at that limit a day holds few of them. A rental business needs the limit raised before its first day.
- **A decision on step 5:** built after the first three steps, or when a first customer asks.

## 6. What is not in this plan

Checking a driving licence, selling insurance, and fines or tolls that arrive after the return stay with the rental business and its partners (`project-description.md` section 3.2). What stands between any build of Hold and real money is in `project-description.md` section 15, and comes before every step here that touches a real customer.
