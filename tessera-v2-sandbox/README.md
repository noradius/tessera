# Tessera V2 Sandbox

A modular local browser sandbox for experimenting with Tessera V2 pulse behavior and visuals.

## Run

Open `index.html` in a modern browser.

## Modules

- `src/state.js`: Owns target/current parameter values and smoothing updates.
- `src/pulseEngine.js`: Derives pulse + weather values only.
- `src/renderer.js`: Owns canvas rendering, halo/weather body, particles, filaments, and arrival choreography.
- `src/ui.js`: Owns controls, seed, presets, public/developer mode, recording mode, reset/rest actions.
- `src/main.js`: Wires modules and runs animation loop.
