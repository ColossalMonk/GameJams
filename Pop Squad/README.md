# Pop Squad

Pop Squad is a browser-based puzzle game where you tap colorful critters to pop them in chain reactions. The goal is to clear as many critters as possible before the grid fills up or the timer runs out.

## How it works

- Tap a critter to start a pop chain.
- Same-colored critters touching it, including diagonally, will also pop.
- Bigger critters are worth more points.
- Special critters add extra variety and scoring opportunities:
  - Rainbow: clears neighbors regardless of color
  - Bomb: clears everything around it
  - Star: gives bonus points and extra time
- The game ends if the board fills up completely or the countdown reaches zero.

## Project structure

- index.html — main game layout and overlays for menu, help, settings, and results
- css/style.css — styling for the UI, overlays, canvas, and responsive layout
- js/config.js — game constants, colors, sizes, power-ups, and difficulty settings
- js/grid.js — board state, spawning, chain logic, and special critter behavior
- js/render.js — canvas drawing, critter visuals, particles, and floating score text
- js/audio.js — synthesized sound effects and background music
- js/ui.js — overlay handling, score updates, settings controls, and button wiring
- js/main.js — game loop, timer, input handling, and game-over flow

## Running the game

Open index.html in a browser to play.

If you want to serve it locally, you can use a simple static server such as:

- Python: python -m http.server
- Then open http://localhost:8000/

## Notes

This project is fully client-side and does not require a build step. All logic is handled in plain JavaScript, with the modules loaded in order from index.html.
