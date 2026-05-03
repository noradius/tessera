# Tessera V2 Audit (Orientation Pass)

## 1) What is currently alive
- The core Tessera visual language already exists in `tessera_v1_baseline.html`, `tessera_v2.html`, and the extension engine: suspended particulate field, spectral hue motion, and intermittent white connective filaments.
- The extension path is real (`manifest.json`, content/background/options scripts), proving Tessera can already inhabit conversational surfaces.
- The texture vocabulary and phased documents establish a conceptual scaffold that is distinct from sentiment or productivity framing.

## 2) Visual mechanisms to preserve
- Spectral plankton-like particles in deep black-blue space.
- Murmuration-like local coherence and breathing drift.
- Temporary white ligaments/contact lines (not static graph edges).
- Quiet rest-state beauty and rare dramatic events (especially Arrival-like bloom/compression).
- Ambiguity: texture as weather, not labels in the field.

## 3) Technical structures already useful
- Existing Three.js GPU particle pipeline with shader-based softness.
- Spatial hashing and localized neighbor lookup from extension engine.
- Existing texture object model (13 textures) and event phase logic hints.
- Extension-side architecture (MV3 + content/background/options) as downstream integration target.

## 4) What feels too prototype-like
- Visual/state/event logic tightly bundled in single large files, making tuning risky.
- Sandbox-independent tuning ergonomics are limited.
- State smoothing and confidence ambiguity behavior can be more explicit and modular.

## 5) Corruption risks (dashboard/detector drift)
- Over-exposing texture values as user-facing labels.
- Over-triggering high-drama states (Arrival inflation).
- Deterministic one-to-one mapping from text features to named states.
- UI controls becoming product UI instead of dev instrumentation.

## 6) Minimum meaningful V2
- Standalone sandbox that runs without APIs.
- Extracted/portable V2 engine module + separate state smoothing module.
- Preset harness for tuning weather/climate/event mappings.
- Documentation of preserved visual principles and protected anti-goals.

## 7) Delay until after V2
- Deep DOM extraction hardening for multiple chat layouts.
- Advanced API cadence/cost policy automation.
- Rich options/settings UX.
- Full extension replacement migration.
