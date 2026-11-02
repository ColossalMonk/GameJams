# Golden Hour

Entry for the [20 Second Game Jam 2026](https://itch.io/jam/20-second-game-jam-2026). The sun is swelling and the world has 20 seconds left. Nobody minds. You're the town photographer with five shots on the roll. The design is in [DESIGN.md](DESIGN.md).

## How it plays

- Move the viewfinder with the mouse (drag on touch screens). Scroll or pinch to zoom.
- Click (or tap, or press Space) to take a photo. You have five.
- Arrow keys or WASD aim with the keyboard; Q and E zoom.
- Each evening 8–10 stories happen around town, each with one big moment at a random time. A soft chime from that side of the screen tells you something is about to happen.
- A photo scores more for catching a moment at its peak, for framing it tightly, for including the sun, and for being taken later, when the light is better.
- A chime from that side of the screen and a little gold sparkle mean a story is about to peak.
- Every story has its own sounds, and every peak you photograph adds a layer to the music: bells, then strings, then a choir.
- At 20 seconds the screen whites out and your photos come back as an album. Each photo has a caption and labels saying why it scored. A line sums up the evening, including any rare story you missed. Space starts a new evening; **Copy result** copies a spoiler-free share line.
- Every evening is a random surprise: players never pick or replay a particular one.
- The album also has a newspaper front page with your best photo, and a **Journal**: a sticker book of every story ending you've caught at its peak, across all your evenings (kept in the browser, cosmetic only).
- At the very end the paper town folds flat like a pop-up book closing. With the sun in your viewfinder you get a lens flare, and everything in the sky hangs from paper-theatre strings.

## Every evening is different

Each run is a numbered evening (1–9999), and the number seeds everything that changes:

- **which stories happen, and where.** The director picks 8–10 of the 57 stories in the catalogue and gives each one a free spot in town (rooftop, road, windows, building site, church tower, horizon, sky, pavement …).
- **who is in them.** Townspeople are generated each evening (look and name), and captions use their names.
- **the street.** The row of houses behind the café is rebuilt each evening, and becomes a building site with a tower crane when a site story is on.
- **how each story ends.** Every story has 2–3 outcomes: the dog misses, the car backfires, the piano drops, the yoga class topples, the cheese wins …
- **when each peak happens.** Peaks are spread out: never closer than 0.6 s, at most two build-ups at once, alternating sides of the screen, and something always happens in the first 3 s.
- where the sun sets, and the clouds and birds.
- **the season:** spring blossom, summer, autumn leaves and pumpkins, or winter snow with everyone in scarves.
- **the weather:** clear, fog that lifts in the first seconds, or rain that clears to a rainbow.
- **the horizon:** rolling hills, the sea with a lighthouse and sailing boats, snowy mountains, or a distant city.
- **stories landing in each other.** When a story throws something, it can land on someone in another story nearby: the bouquet in a stranger's hand, the musician's hat on someone's head, the flying sheet over the opera singer ("a ghost"), a missed frisbee or a runaway flag caught in the street. These crossovers are photo moments of their own and score ×1.3.
- **chain events.** The bell ringer's pigeons fly over and sit on the apartment roof when someone is up there. The balloon seller's balloons snag on the crane when the building site is up. The banner plane says MARRY ME when there's a proposal or a wedding.
- rare stories (about 30% each): a hot-air balloon crossing the sun, a paper plane looping the loop, early fireworks. They score ×1.5 and get a "rare" sticker.
- legendary stories (about 3% each): a UFO that came to watch, and a cloud shaped exactly like a whale. They score ×2 and get a "legendary" sticker.
- tonight's request: one kind of photo the town asks for, worth +600. Requests are only offered when tonight's stories can satisfy them. They include "Something in the air", "Something going wrong", "Something on wheels", "Someone finally finishing something", "Something falling", "One story landing in another" and "Three people in one shot".

### The stories

| Where | Stories |
|---|---|
| Pavement | musician · proposal · magician · balloon seller · lost balloon · mail carrier · library book · toddler's first steps · juggler · breakdancer · gulls and chips |
| Road and kerb | ice-cream van · bus · fire truck · wedding car · moving van · ducks crossing · marching band (rare) · old car |
| Rooftop | rooftop kiss · laundry · sky lanterns · stargazer · painter · doves |
| Windows and tower | opera singer · serenade · escaping parrot · watering plants · bell ringer |
| Café, church, wall | birthday · champagne toast · 30-year chess game · waiter's plate tower · wedding · cat |
| Park and hill | frisbee dog · yoga · dog walker · tug of war · kite · cheese rolling · sledding · paraglider |
| Building site | crane lifts a piano · lunch on a beam · last-beam flag |
| Sky and horizon | banner plane · cranes · train on the viaduct · skywriter (rare) · parachutist (rare) · balloon (rare) · paper plane (rare) · fireworks (rare) · UFO (legendary) · whale cloud (legendary) |

The album shows the evening's number, but players can't choose or replay evenings. For testing, the dev server (not the published build) accepts `?evening=123`, `?story=<id>` and `?all=1`.

## Project structure

- `src/config.js`: run length, shot count, viewfinder limits, timings
- `src/core/Stage3D.js`: renderer, fixed theatre camera, bloom / tone mapping / grain
- `src/core/Viewfinder.js`: mouse and touch aiming, zoom, shooting
- `src/world/paper.js`: paper texture and the card factory everything is built from
- `src/world/shapes.js`: 2D shapes the cards are cut from
- `src/world/Sky.js`: the 20-second keyframes: sky, swelling sun, light, town lights
- `src/world/Town.js`: the static diorama, its `SLOTS` (where stories can happen), clouds and birds
- `src/world/Facades.js`: the house row rebuilt each evening, and the building site with its crane
- `src/world/Backdrop.js`: tonight's far distance (hills, sea, mountains or city)
- `src/world/Season.js`: tonight's season and weather
- `src/world/Strings.js`: paper-theatre strings on everything in the sky
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
- `src/ui/HUD.js`, `src/ui/Album.js`: film counter, photo tray, whiteout, album (newspaper page, journal) and PNG export
- `src/ui/Flare.js`: lens flare when the sun is in the viewfinder
- `src/game/Journal.js`: the cosmetic journal of caught endings, kept in localStorage
- `src/audio/Audio.js`: Tone.js pad, chimes for each moment, shutter, music layers
- `src/audio/sfx.js`: the 39 synthesised story sound effects; `src/stories/sounds.js` cues them for the earlier stories
- `src/tools/gallery.js`, `src/tools/press.js` and `tools/selftest.mjs`: development tools (below)
- `press/`: the itch.io cover, screenshots, GIF and banner; `public/favicon.svg`: the tab icon

## Running

```bash
npm install
npm run dev
```

### Look and performance

- People and props move like stop-motion (12 steps a second) while light and camera stay smooth.
- Cards have hand-cut edges, a slight tilt, and some use other paper stocks.
- The static town is baked into a few meshes when it's built, to save draw calls. Shadows redraw only on stop-motion steps.
- The resolution adapts: it starts at up to 1.5× and steps down while frames are slow. Touch devices and small machines use a low tier without sun rays or multisampling.
- Photos are developed in `src/game/PhotoLab.js`: tilt-shift blur when zoomed in, motion blur when the camera moves, bleaching near the end, and film grain and light leaks.
- `?all=1` loads every story at once, as a stress test.

### Development tools

- **Story gallery:** open the dev server with `?story=crane` (or `?story=kite&outcome=alt&peak=6`). It plays one story on its own, with a time slider, an outcome picker and the box scoring uses. Keys: Space play/pause, `[` `]` previous/next story, `o` next outcome, `r` restart.
- **Self-test:** `node tools/selftest.mjs` runs headless in Node. It plays every story and outcome to its peak, frames it like a player and checks it scores as a peak with the right caption. It does the same for every crossover and chain event. Then it plans and plays 300 evenings, looking for crashes, slot clashes and peaks too close together, and reports how many evenings have a crossover. `node tools/selftest.mjs crane` checks one story.
- **Press kit:** open the dev server with `?press=1` to render the itch cover, screenshots, banner and GIF frames from real evenings into `press/` (see `src/tools/press.js` and [ITCH.md](ITCH.md)).
- **Find an evening:** `node tools/find-evening.mjs crossover` (or a story id such as `ufo`) lists evening numbers that have one, to open with `?evening=N` on the dev server.

`npm run build` writes `dist/`. `tools\package-itch.ps1` builds and writes `golden-hour-itch.zip` for itch.io. [ITCH.md](ITCH.md) has the full release steps, the page text and the generative-AI disclosure.

## Jam notes

The game was built with help from generative AI (Claude, for code and design). This has to be disclosed on the itch.io page.
