# Golden Hour — Design

Entry for the [20 Second Game Jam 2026](https://itch.io/jam/20-second-game-jam-2026) (Oct 23 – Nov 16, 2026). Theme: 🌍 **The End of the World is Nice**.

> The sun is swelling and Earth has 20 seconds left. Nobody is panicking. The town is out for one last perfect evening, and you're the photographer with five shots left on the roll.

**Status:** Roadmap Phases 1 and 2 are done. The town now runs on a story system: 30 stories in a catalogue, 8–10 chosen per evening by a director, with generated townspeople, a street rebuilt each evening, and stories that land in each other. The fixed cast described below was the first playable; see [ROADMAP.md](ROADMAP.md) for the current plan.

## Jam rules that affect design

- A run lasts **≤ 20s** from the first frame of play. The album screen after the run doesn't count, but nothing that needs input can happen there except "play again".
- Must run in the browser on itch.io (plain HTML/JS + canvas, like the other games in this repo).
- **Disclose generative AI** on the itch page (including AI-written code).

## Core loop

- **Verb:** move the mouse/finger to aim the viewfinder, click/tap to take a photo.
- **5 shots.** After each shot there's a short film-advance (~0.4s) with a shutter click and flash.
- **One street, one screen.** A side-on street at dusk: rooftops, a café, a park corner, a hill with the horizon and the sun behind it. Everything visible at once, so there's nothing to explore, only things to notice.
- The viewfinder is a fixed-size rectangle (about 1/5 of the screen). What's inside it when you click is the photo.

## The 20 seconds

| Time | Sky | What's happening |
|---|---|---|
| 0–4s | Late-afternoon blue, sun slightly too large | The town is calm; the first small moments start (cat yawns, a kid gets a kite out) |
| 4–9s | Gold | Most moments happen here; plenty of choice |
| 9–14s | Orange → pink, sun filling a quarter of the sky | The big moments (proposal, bouquet toss, car finally starts) |
| 14–18s | Deep red, everyone turns to face the sun | One last group moment: the whole street waves / holds hands |
| 18–20s | Sun fills the sky → white | The last chance for a photo, scored highest for light but hard to frame |
| 20s | Whiteout | → Album |

Unused shots at the end are lost; the album shows an empty frame with "you were too busy watching".

## Moments

About 10 characters, each on a short animation loop, with **one key moment** at a random time in each run. A moment has a brief peak (~0.6s) that scores best.

- Couple on a rooftop → kiss
- Kid with a kite → kite lifts off
- Dog and a frisbee → mid-air catch
- Old man and his car → engine finally starts (puff of smoke, arms up)
- Grandma's birthday → candles blown out
- Street musician → final chord, hat in the air
- Cat on a wall → huge yawn
- Wedding on the church steps → bouquet toss
- Someone on one knee → proposal (yes!)
- ~~Kid with an ice cream → drops it, dog eats it~~ (cut from the first playable; 9 moments built)

Moment start times are randomised each run so you can't memorise a route; peaks are spaced so two never land in the same half-second.

## Replay variety: evenings

The town is small and finite, so variety comes from what happens in it, not more places. Each run is a seeded **evening**:

| Changes per evening | How |
|---|---|
| Sun position | sets anywhere from behind the church to over the hill; the light angle follows |
| Clouds and birds | count and placement |
| Moment timing | random peak inside each moment's window, kept ≥0.6s apart |
| Moment outcome | each moment has a second ending (~35%) with its own animation and captions |
| Rare events | balloon crossing the sun, paper plane loop, early fireworks (~30% each, ×1.5 score) |
| Tonight's request | one photo goal per evening, +600, drawn only from requests the evening can satisfy |

Alternate endings: the cat stares at you · the kite nosedives · Biscuit misses · Lou's hat never comes back · trick candles relight · the car backfires · the bouquet lands on the church roof · Sam brought a ring too · June and Theo wave at you instead of kissing.

## Scoring a photo

- **Subjects in frame:** points per character fully inside the viewfinder.
- **Moment timing:** big bonus for clicking during a moment's peak, smaller bonus just before/after.
- **Light:** multiplier rises as the sky warms (×1 blue → ×3 white).
- **Sun in frame:** a bonus once the sun is large.
- **Composition (optional, if time allows):** a small bonus when the main subject sits near a rule-of-thirds line.

The total score is the sum of the five photos; the album shows each photo's score.

## The album (end screen)

- The screen fades to white, then an album opens with the five photos as polaroids, each with a **caption generated from its contents**, e.g. "Mr. Okafor finally got it running." / "Biscuit, mid-catch." / "Everyone on Elm Street, waving." / a blurry miss: "…something happened here."
- A title at the top based on the total: "A Nice Ending", "Picture Perfect", "The Last Great Album".
- **Space / tap to play again.** No menu.
- Bonus: a "save album" button that downloads the album as a PNG for sharing.

## Hook in frame 1

The first frame shows the street, the oversized sun, and the viewfinder under the cursor with "5" shots remaining in the corner. Something is clearly about to happen in the first second (the kite kid running, the dog crouching). No text beyond "📷 5".

## Art and sound

- **Art direction: paper diorama in 3D.** The town is a paper theatre / pop-up book: every building, hill and person is a cut-out paper card (thin extruded shape, paper-fibre texture, pale paper core on the edges) standing in layers at different depths. A real sun light lowers and turns gold → red, and the cards cast long moving shadows on the layers behind them. Bloom, vignette and film grain on top.
- Characters are **paper puppets** with hinged limbs (rotate the cards), so moments are animated in code with no sprite frames.
- **Stack:** Vite + three.js + postprocessing + Tone.js (same as BALAM).
- **Sound:** quiet evening ambience, a gentle tune that slowly swells, a satisfying shutter click. The sound fades out to silence just before the whiteout.

## Scope cuts if time runs short

1. Drop composition scoring.
2. Fewer moments (6 is enough).
3. Fixed captions per moment instead of generated ones.
4. Drop the PNG download.

## Decisions

- **Art:** paper diorama in 3D (see above).
- **Zoom:** yes. Scroll wheel / pinch changes the viewfinder size. A tight frame scores more for filling it with a subject; a wide frame catches more people.
- **Touch:** from the start. Drag to aim, pinch to zoom, tap to shoot where you tap.
- **Viewfinder:** square, like instant film. A photo is the exact crop of the rendered frame inside the viewfinder.
- **Start:** a title card over the live scene ("tap to begin") unlocks audio; the 20s clock starts on that tap. Replay skips the title.
