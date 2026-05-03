# Tessera V2 Foundation
Standalone ambient visual workbench for Tessera texture/weather sensing. It is a witness-style field instrument, not a score/dashboard/emotion detector.

## Run
```bash
cd C:\Users\fatih\OneDrive\Desktop\tessera-main
py -m http.server 8000
```
Open `http://localhost:8000/tessera-v2/index.html` then hard refresh with `Ctrl + Shift + R`.

## Controls
Buttons: Rest, Reach, Tracking, Drift, Folding, Reception, Friction, Inhabited Silence, Place, Aliveness, Nowness, Arrival, Heart Memory, Mixed Weather, Low Confidence/Fog.
Keyboard: `R T F A H M`, `P` monitor toggle, `1..4` quality low..ultra.

## Debug
Use `tesseraDebug()` in console for renderer/state/performance/fallback snapshot.

## Quality
Low/Medium/High/Ultra adjusts particles, filaments, pixel ratio cap, and update cadence.

## Next
Use `extension-v2/` for downstream integration after standalone visual taste review.
