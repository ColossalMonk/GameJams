# Golden Hour

Entry for the [20 Second Game Jam 2026](https://itch.io/jam/20-second-game-jam-2026). The sun is swelling and the world has 20 seconds left. Nobody minds. You're the town photographer with five shots on the roll. The design is in [DESIGN.md](DESIGN.md).

## How it plays

- Move the viewfinder with the mouse (drag on touch screens). Scroll or pinch to zoom.
- Click (or tap, or press Space) to take a photo. You have five.
- Nine people and animals each have one big moment at a random time. A soft chime from their side of the screen tells you something is about to happen.
- A photo scores more for catching a moment at its peak, for framing it tightly, for including the sun, and for being taken later, when the light is better.
- At 20 seconds the screen whites out and your photos come back as an album with captions. Space plays again.

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
