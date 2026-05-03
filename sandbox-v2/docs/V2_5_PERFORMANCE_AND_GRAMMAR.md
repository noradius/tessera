# Tessera V2.5 — Performance Stabilization and Visual Grammar Lock

## Likely stutter causes
- Filament generation doing random-heavy connection work every frame.
- Full filament geometry updates every tick, even when visual state did not need it.
- Resize events could trigger too frequently during drag/resize.
- DPR staying high on larger displays increases overdraw and buffer cost.

## What changed
- Added a lightweight perf monitor overlay toggled by `P`.
- Added `window.tesseraDebug()` snapshot with FPS, worst frame, hitch count, quality, buffer sizes, preset, textures, and fallback state.
- Removed frame-loop logging; kept startup, preset click, and major errors.
- Added hitch detector (`>33ms`) and throttled adaptive warning log.

## Quality levels
- Added `low`, `medium`, `high`, `ultra` quality levels with controls for:
  - filament budget
  - filament update frequency
  - particle budget cap (active)
  - DPR cap
- Keyboard `1/2/3/4` sets manual override.
- Conservative adaptive downshift every 5s+ only when sustained low FPS/hitches.

## Visual grammar tuning focus
- **Rest:** reduced filament prevalence and calmer motion.
- **Tracking:** preserved relational traces with controlled filament increase.
- **Friction:** tuned for local shear/interference instead of chaos spikes.
- **Arrival:** bloom constrained to avoid permanent white blowout.
- **Heart Memory/Mixed Weather:** kept readable while preserving deep-water dust density.

## Unresolved
- No GPU-timer-query instrumentation yet (CPU frame-time only).
- Quality upshift recovery is intentionally conservative and not automatic yet.
