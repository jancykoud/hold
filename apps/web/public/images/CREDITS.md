# Photograph credits

The photographs come from Wikimedia Commons, each dedicated to the public domain by its author (CC0), and one pair, kept for a single sample, from Unsplash, whose license allows free commercial use without attribution. Credit is given anyway, here and in the site footer.

Since 15 November 2026 the six photographs of the item itself are of a car, a white saloon parked in a street, where they were of a bike's frame: vehicle rental is the lead market (`docs/vehicle-plan.md`). `scripts/sample-photos.ts` makes all six from the one photograph, so they can be made again.

| File | Source | Photographer | Edits |
|---|---|---|---|
| `flank-handover.jpg` | https://commons.wikimedia.org/wiki/File:Moscow,_Honda_Civic_sedan,_Apr_2026_03.jpg | Retired electrician, dedicated to the public domain (CC0) | The rear door, the fuel flap and the rear wheel cut out at 21:9. The maker's badge on the wheel's hub covered. A faint scuff drawn low on the door. |
| `flank-return.jpg` | Same photograph | Retired electrician | As above, plus a scratch drawn across the door. |
| `fleet.jpg` | https://commons.wikimedia.org/wiki/File:Autoranta_Oulu_20250902.jpg | Estormiz, dedicated to the public domain (CC0) | The car park cut out at 16:9, 1600 by 900, leaving out a company's sign at the left edge. Since 15 November 2026 it stands where a photograph of bikes on racks stood, for shops and behind the sign-in page. |
| `sample-handover.jpg` | Same photograph | Retired electrician | The same cut as `flank-handover.jpg`, 1600 pixels wide. The sample photograph staff can use in a demonstration, said to be one on screen. |
| `sample-return-damage.jpg` | Same photograph | Retired electrician | The same cut, with a chip in the paint drawn on the door, about 110 pixels long: an uneven patch of primer grey with bare metal at its middle and paint flakes. The sample a return can use to show damage, said to be one on screen. |
| `sample-return-contested.jpg` | Same photograph | Retired electrician | The same cut, with a scratch drawn on the door, running on from the faint scuff, which stays visible at its lower end. The sample a return can use for a claim the renter contests, said to be one on screen. |
| `sample-bike-handover.jpg`, `sample-bike-return-damage.jpg` | https://unsplash.com/photos/blue-bicycle-frame-handlebars-and-front-wheel-on-black-LEOTyGdbpu4 | Florian (falmdesign) | The demonstration's pair until 15 November 2026: a bike's frame cropped to 21:9, resized to 1600 pixels wide and brightened, the maker's names retouched out, a faint scuff drawn on the down tube, and in the second a chip in the paint. Kept for the one sample claim on a bike, which the advocates' recorded run argues. |
| `sample-drop-point.jpg` | Same photograph | Retired electrician | The whole photograph at 1200 by 900, the hubs' badges covered: the car where a renter left it, in the sample return made with nobody at the counter, said to be a sample on screen. |
| `driver.jpg` | https://commons.wikimedia.org/wiki/File:Woman_hand_steering_wheel_(Unsplash).jpg | Daniela Cuevas, dedicated to the public domain (CC0) | Cut to 16:9, 1600 by 900, the wheel's hub left out. Since 15 November 2026 it stands where a rider's view over a bike's handlebars stood, for renters. |

The scratches, the scuff and the chip on the door are drawn on. They are not real damage. The site says "Illustrative photographs" beside them.

Replace `flank-handover.jpg` and `flank-return.jpg` with a real handover and return pair, of a real mark, before a first customer. `docs/tech-stack.md` section 16, item 4 asks for that pair. Keep the 21:9 crop, and update the mark positions in `src/features/marketing/evidence-photo.ts`.

## The films

`public/video/hero-wide.mp4`, `public/video/hero-tall.mp4`, `hero/hero-wide-still.webp` and `hero/hero-tall-still.webp` are Hold's own work, remade on 15 November 2026 when vehicle rental became the lead market: a Three.js scene of a coupé modelled in code, of Hold's own drawing and with no maker's badge or shape, rendered frame by frame in a browser and encoded with ffmpeg. No photograph, model or music from anyone else is in them. The still is frame 210 of the 360, where the brackets have closed on the scratch in the door and the finding's card is shown. Until that date the film showed a city bike and an e-scooter.

The scene's source is `apps/web/scripts/hero-film/scene.mjs`, and `render.mjs` beside it draws the frames. Three.js is not one of Hold's dependencies, so its folder is named when the film is made:

```sh
cd apps/web
node scripts/hero-film/render.mjs --three <folder of the three package> --out /tmp/wide
node scripts/hero-film/render.mjs --three <folder of the three package> --out /tmp/tall --size 720x1280
ffmpeg -framerate 30 -i /tmp/wide/frame-%04d.png -c:v libx264 -pix_fmt yuv420p -crf 24 -preset slow -movflags +faststart -an public/video/hero-wide.mp4
ffmpeg -framerate 30 -i /tmp/tall/frame-%04d.png -c:v libx264 -pix_fmt yuv420p -crf 24 -preset slow -movflags +faststart -an public/video/hero-tall.mp4
cwebp -q 82 /tmp/wide/frame-0210.png -o public/images/hero/hero-wide-still.webp
cwebp -q 82 /tmp/tall/frame-0210.png -o public/images/hero/hero-tall-still.webp
```

`public/video/how-wide.mp4`, `public/video/how-tall.mp4`, `hero/how-wide-still.webp` and `hero/how-tall-still.webp` are made the same way, from `apps/web/scripts/hero-film/how.mjs`, and were remade on 15 November 2026 with the car where an e-bike stood: three people modelled in code (Priya, Jonas and Tomás), the same coupé, the counter and the owner's desk, Hold's MCP server and PayPal's sandbox as two panels at the back, and every screen drawn in code in Hold's colours, in the type of the machine that renders it. The still is frame 372 of the 1,185, the hold just authorized.

```sh
node scripts/hero-film/render.mjs --film how --three <folder of the three package> --out /tmp/how-wide
node scripts/hero-film/render.mjs --film how --three <folder of the three package> --out /tmp/how-tall --size 720x1280
```

Then ffmpeg and cwebp as above, with `how-` in place of `hero-` and frame 372 for the stills.
