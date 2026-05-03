# Tessera V2.3 — Visibility, Control, and Living Dust Recovery

## What was under-rendered
- Particle field was too dim and too sparse at rest, while filaments remained comparatively visible.
- Preset buttons had hover styling but unreliable click behavior and no robust delegation fallback.

## Visibility changes
- Increased particle population and active viewport ratio.
- Added per-particle size/opacity strata (mostly microdust, rare larger motes).
- Raised minimum lightness/alpha floors with restrained clamp logic to avoid white blowout.
- Rebalanced filament alpha so particles remain the primary visible layer.

## Control reliability changes
- Main startup now waits for DOM readiness and reports control/canvas diagnostics.
- Added direct button listeners plus delegated click handling on `#dev-controls`.
- Added startup/preset/frame diagnostics and `window.tesseraDebug()` runtime helper.

## Shader/brightness balance changes
- Verified and wired shader attributes (`aHue`, `aPhase`, `aSat`, `aSize`, `aOpacity`).
- Kept all required uniforms and included early-frame uniform diagnostics.
- Added color-preserving highlight clamp and visibility floor without oversized glow.

## Remaining unresolved
- Visual tuning is still subjective across displays; final “feel” may need tiny preset tweaks after real-device review.
