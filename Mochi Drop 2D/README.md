# Mochi Drop 2D

Mochi Drop 2D is a compact browser-based merge game inspired by fruit-merge puzzle mechanics. The goal is simple: drop fruits into the jar, merge matching fruits into larger ones, and grow your stack without letting it overflow the danger line.

## What this project is

This project is a self-contained HTML, CSS, and JavaScript game with no build step or external dependencies. It is designed to be opened and played directly in a browser, while still keeping the code organized into separate modules for gameplay, rendering, UI, audio, and input.

## Gameplay loop

- Move to aim the next fruit.
- Tap or click to drop it into the jar.
- Merge identical fruits to create the next tier.
- Score points as you grow larger fruits.
- Avoid letting the stack cross the pink danger line.
- Reach the watermelon to push your run to the max.

## Project structure

- index.html — main page structure and screen layout
- css/style.css — all visual styling, screen transitions, and layout
- js/data.js — fruit tier definitions and drop pool
- js/state.js — shared game state and configuration
- js/dom.js — canvas sizing and DOM helpers
- js/audio.js — Web Audio-based sound effects
- js/effects.js — particles, screen shake, and toast feedback
- js/physics.js — the fruit simulation, collisions, and merges
- js/render.js — all drawing logic for the game canvas and previews
- js/ui.js — intro, pause, game over, settings, and guide screen behavior
- js/input.js — pointer-based aiming and dropping
- js/main.js — game lifecycle, navigation, and animation loop

## Running the game

You can run it locally in either of these ways:

1. Open index.html directly in a browser.
2. Serve the folder with a simple static server, such as:
   - Python: `python -m http.server`
   - Then open `http://localhost:8000/`.

## Notes on the code organization

This project intentionally uses multiple JavaScript files rather than a single script. Each file handles a distinct concern, which makes the game easier to read and extend. The scripts are loaded in a specific order in index.html because later files depend on earlier ones.

## Controls

- Mouse or touch to aim and drop
- Pause button during play
- Settings and fruit guide from the menus

## License

This project is part of the GameJams workspace and is maintained as a standalone browser game experiment.
