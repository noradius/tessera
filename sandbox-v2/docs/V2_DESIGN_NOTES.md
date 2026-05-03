# Tessera V2 Design Notes

This pass implements **Option 4 (hybrid)**: a standalone sandbox plus an extension-ready modular engine path.

## Preserved center
- The field remains an ambient witness.
- No labels, scores, gauges, or emotion claims inside the visual.
- White contact ligaments are retained as temporary relational traces.

## V2 structure
- `tessera-state.js`: weather/climate/event smoothing with conservative arrival handling.
- `tessera-engine.js`: reusable render/motion module separated from preset and UI controls.
- `tessera-presets.js`: dev-only texture presets.
- `main.js`: minimal harness for sandbox tuning.

## Extension path
- Engine module is designed to be mountable inside extension orb/panel later.
- Next pass can wire content/background analysis output into `TesseraState.setPreset()` or direct texture targets.
