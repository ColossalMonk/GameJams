# Golden Hour

Entry for the [20 Second Game Jam 2026](https://itch.io/jam/20-second-game-jam-2026). The sun is swelling and the world has 20 seconds left. Nobody minds. You're the town photographer with five shots on the roll. The design is in [DESIGN.md](DESIGN.md).

## How it plays

- Move the viewfinder with the mouse (drag on touch screens). Scroll or pinch to zoom.
- Click (or tap, or press Space) to take a photo. You have five.
- Nine people and animals each have one big moment at a random time. A soft chime from their side of the screen tells you something is about to happen.
- A photo scores more for catching a moment at its peak, for framing it tightly, for including the sun, and for being taken later, when the light is better.
- At 20 seconds the screen whites out and your photos come back as an album with captions. Space starts a new evening.

## Every evening is different

Each run is a numbered evening (1–9999), and the number seeds everything that changes:

- where the sun sets (which changes the light and the shadows) and how many clouds and birds there are
- when each moment happens
- how each moment turns out. About one time in three it goes the other way: the dog misses, the kite nosedives, the car backfires, the candles relight, the bouquet lands on the church roof, Sam has a ring too, the cat stares at you, the couple waves instead of kissing.
- rare events, each on roughly 30% of evenings: a hot-air balloon crossing the sun, a paper plane looping the loop, fireworks going off early. They score ×1.5 and get a "rare" sticker in the album.
- tonight's request: one kind of photo the town asks for ("Something in the air", "Something going wrong", "Three people in one shot"…), worth +600

The album shows the evening number. "Same evening again" replays it so you can try to get a better album. Adding `?evening=123` to the URL loads a specific evening.

## Project structure

- `src/config.js`: run length, shot count, viewfinder limits, timings
- `src/core/Stage3D.js`: renderer, fixed theatre camera, bloom / tone mapping / grain
- `src/core/Viewfinder.js`: mouse and touch aiming, zoom, shooting
- `src/world/paper.js`: paper texture and the card factory everything is built from
- `src/world/shapes.js`: 2D shapes the cards are cut from
- `src/world/Sky.js`: the 20-second keyframes: sky, swelling sun, light, town lights
- `src/world/Town.js`: the static diorama, plus its layout and the drifting clouds and birds
- `src/characters/Puppet.js`, `Animals.js`, `Props.js`: paper puppets, the dog and cat, props
- `src/characters/Cast.js`: who stands where, and each character's moment (build-up, peak, aftermath)
- `src/characters/Particles.js`: smoke puffs and hearts
- `src/game/Evening.js`: seeded random generator for one evening
- `src/game/Requests.js`: tonight's request and how to check it
- `src/game/Scoring.js`: what was in frame, how well, and the caption
- `src/ui/HUD.js`, `src/ui/Album.js`: film counter, photo tray, whiteout, album and PNG export
- `src/audio/Audio.js`: Tone.js pad, chimes for each moment, shutter

## Running

```bash
npm install
npm run dev
```

`npm run build` writes `dist/`. Zip the contents of `dist/` and upload it to itch.io as an HTML game.

## Jam notes

The game was built with help from generative AI (Claude, for code and design). This has to be disclosed on the itch.io page.
