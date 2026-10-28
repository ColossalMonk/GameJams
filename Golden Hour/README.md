# Golden Hour

Entry for the [20 Second Game Jam 2026](https://itch.io/jam/20-second-game-jam-2026). The sun is swelling and the world has 20 seconds left. Nobody minds. You're the town photographer with five shots on the roll. The design is in [DESIGN.md](DESIGN.md).

## How it plays

- Move the viewfinder with the mouse (drag on touch screens). Scroll or pinch to zoom.
- Click (or tap, or press Space) to take a photo. You have five.
- Each evening 8–10 stories happen around town, each with one big moment at a random time. A soft chime from that side of the screen tells you something is about to happen.
- A photo scores more for catching a moment at its peak, for framing it tightly, for including the sun, and for being taken later, when the light is better.
- At 20 seconds the screen whites out and your photos come back as an album with captions. Space starts a new evening.

## Every evening is different

Each run is a numbered evening (1–9999), and the number seeds everything that changes:

- **which stories happen, and where.** The director picks 8–10 of the 28 stories in the catalogue and gives each one a free spot in town (rooftop, road, windows, building site, church tower, horizon, sky, pavement …).
- **who is in them.** Townspeople are generated each evening (look and name), and captions use their names.
- **the street.** The row of houses behind the café is rebuilt each evening, and becomes a building site with a tower crane when a site story is on.
- **how each story ends.** Every story has 2–3 outcomes: the dog misses, the car backfires, the piano drops, the yoga class topples, the cheese wins …
- **when each peak happens.** Peaks are spread out: never closer than 0.6 s, at most two build-ups at once, alternating sides of the screen, and something always happens in the first 3 s.
- where the sun sets, and the clouds and birds.
- rare stories (about 30% each): a hot-air balloon crossing the sun, a paper plane looping the loop, early fireworks. They score ×1.5 and get a "rare" sticker.
- tonight's request: one kind of photo the town asks for ("Something in the air", "Something going wrong", "Three people in one shot"…), worth +600.

### The stories

| Where | Stories |
|---|---|
| Pavement | musician · proposal · magician · balloon seller · lost balloon |
| Road and kerb | ice-cream van · bus · fire truck (with a window) · old car |
| Rooftop, windows, tower | rooftop kiss · laundry · opera singer · bell ringer |
| Café, church, wall | birthday · wedding · cat |
| Park and hill | frisbee dog · yoga · kite · cheese rolling |
| Building site | crane lifts a piano · lunch on a beam · last-beam flag |
| Sky and horizon | banner plane · train on the viaduct · balloon (rare) · paper plane (rare) · fireworks (rare) |

The album shows the evening number. "Same evening again" replays it so you can try to get a better album. Adding `?evening=123` to the URL loads a specific evening.

## Project structure

- `src/config.js`: run length, shot count, viewfinder limits, timings
- `src/core/Stage3D.js`: renderer, fixed theatre camera, bloom / tone mapping / grain
- `src/core/Viewfinder.js`: mouse and touch aiming, zoom, shooting
- `src/world/paper.js`: paper texture and the card factory everything is built from
- `src/world/shapes.js`: 2D shapes the cards are cut from
- `src/world/Sky.js`: the 20-second keyframes: sky, swelling sun, light, town lights
- `src/world/Town.js`: the static diorama, its `SLOTS` (where stories can happen), clouds and birds
- `src/world/Facades.js`: the house row rebuilt each evening, and the building site with its crane
- `src/characters/Puppet.js`, `Animals.js`, `Props.js`: paper puppets, the dog and cat, props
- `src/people/Residents.js`: tonight's townspeople (looks and names)
- `src/director/Director.js`: picks tonight's stories, gives them slots, outcomes and peak times
- `src/stories/Story.js`: the story format (see its doc comment); `Show.js` runs tonight's stories
- `src/stories/catalogue/`: one file per story; register new ones in `registry.js` or a batch `index-*.js`
- `src/stories/props/`: props shared by stories
- `src/characters/Particles.js`: smoke puffs and hearts
- `src/game/Evening.js`: seeded random generator for one evening
- `src/game/Requests.js`: tonight's request and how to check it
- `src/game/Scoring.js`: what was in frame, how well, and the caption
- `src/ui/HUD.js`, `src/ui/Album.js`: film counter, photo tray, whiteout, album and PNG export
- `src/audio/Audio.js`: Tone.js pad, chimes for each moment, shutter
- `src/tools/gallery.js` and `tools/selftest.mjs`: development tools (below)

## Running

```bash
npm install
npm run dev
```

### Development tools

- **Story gallery:** open the dev server with `?story=crane` (or `?story=kite&outcome=alt&peak=6`). It plays one story on its own, with a time slider, an outcome picker and the box scoring uses. Keys: Space play/pause, `[` `]` previous/next story, `o` next outcome, `r` restart.
- **Self-test:** `node tools/selftest.mjs` runs headless in Node. It plays every story and outcome to its peak, frames it like a player and checks it scores as a peak with the right caption, then plans and plays 300 evenings looking for crashes, slot clashes and peaks too close together. `node tools/selftest.mjs crane` checks one story.

`npm run build` writes `dist/`. Zip the contents of `dist/` and upload it to itch.io as an HTML game.

## Jam notes

The game was built with help from generative AI (Claude, for code and design). This has to be disclosed on the itch.io page.
