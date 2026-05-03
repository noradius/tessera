# Tessera V2.4 — Golden Workbench Recovery

## What was broken
- Controls looked interactive but click behavior could fail silently when engine init failed.
- Visual output could appear nearly blank (faint filaments, missing particle body).
- Shader/runtime fragility could cause blank-screen ambiguity.

## New boot sequence (explicit stages)
1. **DOM + controls first**: resolve canvas/controls/buttons, attach delegated click handler, log every preset click.
2. **Safe renderer**: initialize a reliable visible particle field (Three.js `PointsMaterial`) so rest state is always visible.
3. **Tessera renderer**: upgrade to shader-based spectral dust + filaments; if this fails, safe mode stays visible.

## Why controls are guaranteed to attach
- Event delegation is attached on `#dev-controls` before engine init.
- Control click logging and preset state updates are independent from WebGL success.
- CSS enforces control layering (`z-index: 10`, `pointer-events: auto`) above canvas/overlay.

## How blank-screen failure is prevented
- Safe mode is always enabled first after renderer creation.
- Tessera mode is attempted separately; failure logs error and keeps safe mode.
- Runtime shader errors are logged and do not remove control behavior.

## Visual recovery
- Rest now shows visible, fine dust immediately.
- Tessera mode adds spectral variation, deep-water atmosphere, murmuration motion, and subtle relational filaments.
- Presets are intentionally stronger in sandbox for visual legibility and tuning.

## Run
```txt
cd C:\Users\fatih\OneDrive\Desktop\tessera-main
py -m http.server 8000
```
Open:
`http://localhost:8000/sandbox-v2/index.html`

Hard refresh after changes:
`Ctrl + Shift + R`

## Remaining refinement
- Further tune per-preset choreography timing and filament behavior curves.
- Add optional debug panel overlay (currently console-focused diagnostics only).
