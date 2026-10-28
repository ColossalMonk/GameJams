# Golden Hour — Roadmap

Plan for turning the first playable (9 fixed stories, 3 rare events, seeded evenings) into a game where every evening is a different town, a different cast and a different set of stories. Written 2026-10-28; the jam closes **2026-11-16**. Mitosis is on hold until this is done.

## Goals

1. **Every evening feels new.** No two evenings share the same street, cast and stories.
2. **Every photo looks good.** Lean further into the paper-diorama look.
3. **A new player understands it in one run, and a returning player always has a reason to go again.**
4. **Adding a story is cheap.** About 40 lines of data plus a gallery check, so the catalogue can reach ~50.

## Jam rules that shape this plan

From the jam FAQ:

- **20 seconds of gameplay**, not counting titles, menus or cutscenes. The pop-up book opening and the album can be longer, but should be short or skippable.
- **Each run must be "a separate, self-contained, 20-second experience".** Pick-ups, upgrades and learned skills can't carry over. So:
  - The **journal** may only *record* what you've photographed (a sticker book outside the game). It must never unlock stories, change odds or affect scoring.
  - **Hints** have to show on every run, the same for everyone. They can be subtle, and players can switch them off in settings, but they must not fade out automatically across runs.
- **Other modes are fine** as long as the default is the 20-second version (relevant to the daily evening, which is still 20 seconds).
- **Generative AI** has to be disclosed in the itch page's AI disclosure field.

---

## Architecture changes

### Slots and stories (replaces the hand-written `Cast.js`)

```
src/
  stories/
    Story.js          story runtime: build-up / peak / aftermath driven by p = t − peak
    registry.js       imports every story file, validates them
    catalogue/*.js    one file per story (kite.js, crane.js, bannerPlane.js …)
  town/
    Slots.js          the slot list for the current place, with positions and capacity
    Facades.js        procedural house fronts (height, colour, roof, windows, balconies, shop sign)
    Places/           elmStreet.js (current town), seaside.js (stretch)
  people/
    Residents.js      procedural townspeople: look, name, pronoun-free caption names
    Puppet.js         + expressions (eyebrows, mouth shapes), profile view, hats, glasses
  director/
    Director.js       picks tonight's stories, assigns slots and peaks, enforces pacing
    Crossovers.js     thrown or falling things that land in other stories
  game/ …             Evening, Requests, Scoring (as now)
  tools/
    gallery.html      ?story=crane: one story alone, with a time scrubber and outcome picker
```

A story is data plus a small amount of code:

```js
export default {
  id: 'crane',
  slot: 'site',                     // where it can go
  places: ['elm', 'city'],          // which towns it fits
  rarity: 'common',                 // common | rare (~30%) | legendary (1–3%)
  window: [6, 14], dur: 0.9,
  cast: [{ role: 'operator' }, { role: 'worker', kid: false }],
  props: ['crane', 'piano'],
  outcomes: {
    main: { weight: 3, tags: ['air'],         caption: { peak: '{worker} guides the piano in.', … } },
    swing:{ weight: 1, tags: ['air', 'oops'], caption: { peak: "The piano, swinging toward {neighbour}'s window.", … }, throws: 'piano?' },
    drop: { weight: 1, tags: ['oops'],        caption: { peak: '{operator}, letting go.', … }, throws: 'piano' },
  },
  build(scene, slot, actors) { … },  // create meshes once
  update(p, ctx) { … },              // pose for this frame; ctx has outcome, wall time, particles, emit()
};
```

`{worker}` and other `{role}` placeholders are filled with tonight's resident names.

### Director (replaces the random peak picking in `Cast.reset`)

1. Pick the place and season, then build the street from facades and fill in its slots.
2. Generate 14–18 residents.
3. Choose **8–10 stories**: each one needs a free slot that fits, rarity is rolled, and no story appears twice.
4. Schedule the peaks to a pacing curve: one small story in the first 3 s, the density rising through 6–14 s, one big story late, then the group wave.
5. Constraints:
   - at most **2 build-ups overlapping**
   - peaks ≥ 0.6 s apart
   - consecutive peaks alternate between the left, middle and right of the screen where possible
6. Roll an outcome for each story, then work out crossovers (below).
7. Pick tonight's request from those the evening can satisfy (as now).

### Crossovers

- Stories that **throw** something (bouquet, frisbee, hat, balloons, piano, cork, laundry, cheese wheel) send it to a **landing point** offered by another story or slot: a person, a table, a roof or a vehicle.
- The landing story gets a small reaction pose and a crossover caption, e.g. "Biscuit caught the bouquet." or "Grandma Rosa's cake, now with a frisbee."
- **Chain events:**
  - the church bell sends pigeons across the rooftop
  - the balloon seller's balloons snag on the crane
  - the banner plane says "MARRY ME" on the evening someone proposes
- Crossovers are rolled once per evening from the seed, so a replay of the same evening plays out identically.

---

## Story catalogue (target ≈ 50)

★ = already built (ported to the new format in Phase 1). Every story is someone *finally* doing something before the end.

| # | Story | Slot | Outcomes | Notes |
|---|---|---|---|---|
| 1 | ★ Kite takes off | hill | flies · nosedive | |
| 2 | ★ Frisbee dog | park | catch · miss | throws frisbee |
| 3 | ★ Last chord, hat in the air | pavement | hat returns · hat gone | throws hat |
| 4 | ★ Birthday candles | café | out · trick candles | landing: cake |
| 5 | ★ Old car starts | road-parked | starts · backfires | |
| 6 | ★ Bouquet toss | church | crowd · roof | throws bouquet |
| 7 | ★ Proposal | pavement | yes · both brought rings | |
| 8 | ★ Rooftop kiss | rooftop | kiss · wave at you | landing: rooftop |
| 9 | ★ Cat on the wall | wall | yawn · stare | landing: cat |
| 10 | ★ Hot-air balloon across the sun | high sky | — | rare |
| 11 | ★ Paper plane loop | low sky | — | rare |
| 12 | ★ Early fireworks | horizon | — | rare |
| 13 | Tower crane lifts a piano | site | placed · swings · dropped | throws piano |
| 14 | Lunch on a steel beam | site | sandwich · drops sandwich (gulls) | |
| 15 | Last beam, flag goes up | site | flag · flag blows away | |
| 16 | Banner plane | high sky | MARRY ME · THANKS FOR EVERYTHING · BYE! · banner tears | text ties to tonight's stories |
| 17 | Skywriter heart | high sky | heart · lopsided heart | rare |
| 18 | Flock of cranes (birds) | high sky | V formation · one goes the wrong way | |
| 19 | Paper lanterns released | rooftop → sky | rise · one lands in a tree | |
| 20 | Parachutist | high sky | lands in park · lands on the bus | rare, throws person |
| 21 | Lost balloon drifts up | low sky | escapes · caught by the crane | |
| 22 | Gulls steal chips | low sky / pavement | steal · chips defended | |
| 23 | Laundry blows off the line | rooftop | sheet flies · whole line | throws laundry |
| 24 | Telescope stargazer | rooftop | sees the moon · sees you | |
| 25 | Doves released | rooftop | released · one won't leave | |
| 26 | Painter at an easel | rooftop | finishes the sunset · paints you | |
| 27 | Opera high note | window | note · window shatters | |
| 28 | Balcony serenade | window + pavement | flower thrown · bucket of water | throws flower |
| 29 | Parrot escapes | window | flies off · lands on someone | throws parrot |
| 30 | Watering plants | window | waters · waters a passer-by | |
| 31 | Ice-cream van, last cone | road | sold · dropped (dog eats it) | |
| 32 | Bus arrives, everyone gets off | road | off to watch · driver too | |
| 33 | Wedding car with cans | road | drives by · cans come loose | |
| 34 | Moving van loses the sofa | road | sofa falls · someone sits on it | |
| 35 | Fire truck rescues a cat | road + window | rescued · cat climbs down itself | |
| 36 | Ducks crossing | road | cross · traffic queues | |
| 37 | Marching band | road | crescendo · tuba stuck | rare |
| 38 | Street magician | pavement | rabbit · doves everywhere | |
| 39 | Juggler | pavement | perfect · drops everything | throws balls |
| 40 | Balloon seller lets go | pavement → sky | all float up · one kid keeps one | throws balloons |
| 41 | Breakdancer | pavement | freeze · spins out | |
| 42 | Toddler's first steps | pavement | walks · sits down | |
| 43 | Dog walker, six dogs | pavement | tangled · runs off with the walker | |
| 44 | Chess, 30 years in | café | checkmate · board flipped | |
| 45 | Waiter's plate tower | café | delivered · topples | |
| 46 | Champagne toast | café | cork flies · spray | throws cork |
| 47 | Bell ringer | church tower | bell · pigeons burst out | chain: pigeons |
| 48 | Yoga class | park | tree pose · domino topple | |
| 49 | Tug of war | park | win · rope snaps | |
| 50 | Cheese rolling | hill | chased · cheese wins | throws cheese |
| 51 | Sledding on cardboard | hill | glides · tumbles | |
| 52 | Paraglider | hill → sky | takes off · stays on the hill | |
| 53 | Train on the viaduct | horizon | passengers wave · train stops to watch | |
| 54 | Mail carrier, the last letter | pavement | delivered · letter blows away | throws letter |
| 55 | Library book, 40 years late | pavement | returned · fine paid in coins | |
| 56 | UFO came to watch | high sky | waves · takes a photo of you | legendary |
| 57 | Whale-shaped cloud | high sky | spouts | legendary |

Phase 1 delivers #1–12 ported plus 13–16, 21, 23, 27, 31, 32, 35, 38, 40, 47, 48, 50 and 53 (16 new). Phase 4 delivers the rest. Anything unfinished is cut by Nov 13.

---

## Phases

Estimates are focused working days. Dates assume work starts 2026-10-29.

### Phase 1 — Story system and the first big content batch (Oct 29 – Nov 2, ~5 days) — ✅ done 2026-10-28

1. **Story format and runtime** (`Story.js`, `registry.js`); port the 12 existing stories into it with no change in behaviour. The check is that evenings 7, 42 and 9001 play identically before and after.
2. **Gallery tool** (`tools/gallery.html`): pick a story, an outcome and a slot, then scrub time. It also shows the scoring focus box.
3. **Slots** for Elm Street: existing positions plus **building site** (replaces one background house), **road lane** (vehicles cross left↔right at z ≈ −0.6), **windows / balconies** (3–4 on the apartment and houses), **horizon** (viaduct across the far hills), more **pavement** spots, **church tower**.
4. **Residents**: procedural look (skin, hair style and colour, outfit palette, hat, glasses, beard, kid or adult, height) and a name pool. Captions use `{role}` names.
5. **Facades**: procedural house row (width, height, colour, roof, window grid, balcony, shop sign) seeded by the evening, so the street skyline changes.
6. **Director v1**: story selection by slot, pacing curve, overlap limits, left/middle/right alternation.
7. **16 new stories** (listed above), each with 2–3 outcomes and captions.
8. **Scoring update**: focus boxes come from the story definition; tags and requests work unchanged.

*Done when:* any evening number produces 8–10 stories on a street that looks different, the gallery shows every story and outcome, and a stress mode (`?all=1`) runs all stories at once at ≥ 50 fps on a laptop.

*Status:* everything above is built: 28 stories with 63 outcomes. Every outcome passes `tools/selftest.mjs`, and each of the 16 new stories was checked at its peak in the gallery (one outcome each). Not done: the `?all=1` stress mode and the fps check (moved to the Phase 3 performance work). Implementation notes:
- Pavement, road and building-site stories size themselves to their slot.
- Stories get `ctx.tonight` (tonight's story ids) for simple coordination; the lunch-on-a-beam story uses it to make room for the piano.
- Suggestions for Phase 2:
  - Force the banner plane to MARRY ME when a proposal or wedding is on.
  - Give the bell ringer's pigeons a rooftop landing point.
  - Export the lamp-post positions from `Town.js`, so stories don't hard-code them.
  - Dispose per-evening textures in `Show.dispose`.

### Phase 2 — Crossovers, rarity and requests (Nov 3 – 4, ~2 days) — ✅ done 2026-10-28

1. **Landing system**: throwable props, landing points, reaction poses, crossover captions.
2. **Chain events**: bell → pigeons, balloons → crane, banner text ← proposal or wedding.
3. **Rarity tiers**: common / rare (~30%) / legendary (1–3%). The album sticker says "rare" or "legendary".
4. **More requests** using new tags: "Something on wheels", "Someone finally finishing something", "A crossover" (two stories in one photo), "Something falling".

*Done when:* in 50 seeded evenings, ≥ 60% contain at least one crossover and none have two stories fighting over a slot.

*Status:* done. In 300 seeded evenings, 65% have a crossover or chain event, with no slot clashes.
- **Throws:** five outcomes throw (the bouquet, a missed frisbee, the musician's lost hat, the flying sheet, the runaway flag).
  - An outcome declares `throws: { lands, kinds, caption }`.
  - The director pairs it with a story nearby whose peak is clear of the landing.
  - `Show` points the throw's `ctx.cross` at a hand, head or mouth, makes the target react, and adds the landing as a moment worth ×1.3.
- **Chains:**
  - bell → rooftop pigeons
  - balloons → crane
  - banner says MARRY ME when a proposal or wedding is on
- **Story-added moments:** stories can add extra photo moments with `ctx.moment()`.
- **Rarity:** legendary tier (3%, ×2, rainbow sticker), with two legendary stories: a UFO and a whale cloud.
- **New tags and requests:** `wheels`, `finally` and `falling` tags, and requests for them plus "One story landing in another". Every tag request is only offered when tonight can satisfy it.
- **Checks:** `tools/selftest.mjs` checks every throw against every kind of target, and both chains.
- **Tool:** `tools/find-evening.mjs` finds evenings with a given story or a crossover.

### Phase 3 — Art pass (Nov 5 – 7, ~3 days)

1. **Light**
   - god rays from the sun (postprocessing `GodRaysEffect`)
   - lens flare when the sun is in the viewfinder
   - characters silhouette as the sun fills the sky
   - stars appear in the last 3 s
   - a tissue-paper sun with light showing through
2. **Handmade feel**
   - **stop-motion stepping**: puppet poses update at 12 fps while light and camera stay smooth
   - torn, uneven paper edges (edge-noise shader on cards)
   - slight card wobble
   - visible strings on sky objects
   - paper stocks: kraft, watercolour, corrugated for the building site, newsprint for one house, tissue for the sun and lanterns
3. **Characters**: eyebrows and 4 mouth shapes; profile pose for stories that need it; hats, glasses, scarves.
4. **Photos**
   - depth-of-field blur outside the subject when zoomed in tight
   - motion blur when the viewfinder was moving fast at the shutter
   - mild overexposure in late photos
5. **Opening and ending**: the title is a pop-up book opening; at 20 s the world folds shut like a book, and the album is that book. Both are skippable with a tap.
6. **Performance**
   - merge static town geometry
   - instance repeated cards (windows, bricks, flags)
   - shadow map only over the stage
   - a "low" quality tier for phones (no god rays, half-resolution bloom)

*Done when:* side-by-side screenshots of the same evening before and after are clearly richer, and a mid-range phone holds ≥ 45 fps.

### Phase 4 — Content wave 2 and sound (Nov 8 – 10, ~3 days)

1. The remaining ~25 stories from the catalogue, prioritising ones that **throw**, **cross over** or fill an empty slot.
2. **Sound for each story**: bark, sputter, bell, train whistle, crowd "aww", splash, crash, kazoo. These are short Tone.js synths or small audio files.
3. **Music that responds**: every peak you catch adds a layer (bells, then strings, then choir). The swell at the whiteout reflects how well you did.

### Phase 5 — UX and ending (Nov 11 – 12, ~2 days)

1. **Hints, the same every run**: a small paper "!" glint above a story ~1 s before its peak, plus the existing chime. There's a setting to turn glints off.
2. **Viewfinder**: shots-left counter in its corner; a small ✓ on the tray thumbnail when you caught a peak.
3. **Album**
   - score labels under each photo ("Peak ✓", "Tight framing", "Sun", "Rare ×1.5", "Crossover")
   - an **epilogue line** that ties the evening's stories together ("That evening, Biscuit missed, Rosa won, and a balloon crossed the sun.")
   - optional **newspaper front page** with a headline written from your best photo
4. **Daily evening**: a "Today's evening" button seeded by the date, a "Play evening #___" box on the title card, and a copyable share line ("Golden Hour · Evening No. 4821 · 4,310 · 4/5 peaks").
5. **Journal (cosmetic only)**: a sticker book of stories and outcomes you've photographed, stored in localStorage and opened from the album. It must not unlock or change anything, per the jam rule.
6. **Accessibility**: arrow keys and WASD to aim; reduced-motion option (no stop-motion jitter, no camera parallax); larger caption option; colour-blind-safe request tick.
7. **Portrait phones**: a vertical framing instead of the "turn your phone" hint, if it reads well. Otherwise keep the hint.

### Phase 6 — Seasons, weather and a second place (Nov 13 – 14, ~2 days, stretch)

1. **Seasons**: spring (blossom petals), summer (current look), autumn (leaves, pumpkins), winter (snow, scarves, lights earlier). Each one changes the palette and adds particles and decorations.
2. **Weather**: clear, light fog lifting, rain clearing to a rainbow (rare).
3. **Seaside town** (if time allows): pier, lighthouse, boats, gulls, beach slots. About 15 of the stories are tagged to fit it.

### Phase 7 — Release (Nov 15 – 16)

1. Playtest 10+ evenings by hand; tune scoring thresholds, pacing curve and rarity.
2. Test on a phone (touch, pinch, performance tier), Chrome, Firefox and Safari.
3. Build, zip `dist/`, upload to itch. Fill in the AI disclosure field, cover image, screenshots, and a short GIF of a balloon crossing the sun.
4. Update README and DESIGN.

---

## Cut line (if time runs short, drop in this order)

1. Seaside town
2. Seasons and weather (keep autumn only, since it suits the timing)
3. Newspaper front page (keep the epilogue line)
4. Journal
5. Content wave 2 below 40 total stories
6. Portrait layout

Never cut: the story system, director, residents, facades, crossovers, gallery tool, and the light and stop-motion art pass.

## Risks

| Risk | Mitigation |
|---|---|
| Too much happening to read in 20 s | Director overlap limit; idle characters stay still; every story reads as a silhouette in 1 s |
| Phones can't draw 50 stories' worth of cards | Build only tonight's 8–10 stories' meshes; merge static geometry; low tier |
| A story format rewrite breaks what works | Port the 12 existing stories first and check evenings 7/42/9001 behave the same |
| 50 stories is a lot of animation code | Shared pose library (wave, cheer, facepalm, kneel, throw, point, clap, flinch) and prop motions (arc, drift, fall, swing) |
| Crossovers create nonsense | Landing points are opt-in per story; captions written per landing type |
| Running out of time | Cut line above; Phase 1 and 3 are what matter most |
