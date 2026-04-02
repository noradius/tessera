# TESSERA — Phase 1 Technical Implementation Brief
### Companion to tessera_megaprompt.md

---

## Purpose of This Document

The mega-prompt defines what Tessera is, what it protects, and how it should feel. This document defines how to build Phase 1. Every technical decision that Claude Code would otherwise need to ask about is pre-made here. The goal is autonomous execution — build the artifact, don't ask questions, make judgment calls using this document as the guide.

If a technical decision arises that isn't covered here, default to: **whichever option produces the most organic, least mechanical result.**

---

## Architecture Overview

Phase 1 is a **single React artifact (.jsx)** that:
1. Presents a text area where the user pastes a conversation
2. Sends that text to the Claude API for texture analysis
3. Receives a texture state vector (13 values)
4. Drives a WebGL particle system that visualizes the texture landscape
5. Runs in a browser, no server, no dependencies beyond what the React artifact environment provides

The artifact must be self-contained. One file. The user opens it, pastes a conversation, and watches it breathe.

---

## Rendering Stack

### WebGL via Three.js

Use Three.js (available in the artifact environment as `import * as THREE from 'three'`) for all rendering. Canvas2D cannot handle the particle counts or visual complexity needed for murmuration + cymatic behavior.

**Important Three.js constraint:** The artifact environment uses Three.js r128. Do NOT use features introduced after r128. Specifically:
- Do NOT use `THREE.CapsuleGeometry` (introduced r142)
- Do NOT attempt to import OrbitControls or other add-ons from Three examples — they aren't available via CDN
- Stick to core Three.js: `BufferGeometry`, `Points`, `ShaderMaterial`, custom shaders

### Viewport

The orb should be **scalable and responsive**. Default to filling its container. The component accepts optional width/height props with sensible defaults.

```
Default: 400x400
Minimum: 200x200
Maximum: 800x800 (or container size)
Aspect ratio: not locked — allow rectangular viewports (200x600, 800x400, etc.)
```

The particle system should adapt to viewport dimensions. Particle count scales with viewport area to maintain consistent visual density.

### Background

Transparent or near-black (`#030308` — not pure black, a dark with the faintest blue undertone). The orb should feel like looking into deep water, not at a screen. No visible container edges. No borders. The visualization bleeds into darkness at the edges via a radial fade/vignette.

---

## Particle System

### Count

Base particle count: **4000 at 400x400 viewport.** Scale linearly with viewport area:
- 200x200: ~1000 particles
- 400x400: ~4000 particles
- 800x800: ~16000 particles (WebGL handles this fine with instanced rendering or point sprites)

Formula: `particleCount = Math.floor(4000 * (width * height) / (400 * 400))`

Cap at 20000 for performance safety.

### Particle Rendering

Use `THREE.Points` with a custom `ShaderMaterial`. Each particle is a point sprite — a small luminous dot with soft falloff (Gaussian or similar). No hard edges. Each particle should look like a single bioluminescent cell — a bright core fading to transparent.

**Per-particle attributes** (stored in BufferGeometry):
- `position` (vec3) — current position
- `velocity` (vec3) — current velocity
- `baseHue` (float) — the particle's resting hue on the spectrum (0.0 - 1.0)
- `saturation` (float) — current color saturation (spectral density maps here)
- `brightness` (float) — current luminosity
- `size` (float) — current point size
- `phase` (float) — individual animation phase offset (prevents synchronized pulsing)

### Particle Physics

Each frame, every particle is influenced by multiple force fields. The forces blend to produce emergent behavior. This is where the aliveness lives.

**Core forces:**

1. **Brownian drift** — constant, low-amplitude random motion. The baseline. Even at rest, particles are never still. This is the deep-water current. Amplitude: very low. This is the canvas, not the painting.

2. **Cymatic attractor field** — a mathematical surface (reaction-diffusion, or simpler: superimposed 2D sine waves) that creates nodes and anti-nodes. Particles are gently attracted toward nodes. The frequencies and amplitudes of the attractor field are driven by the texture state vector. Low texture = flat field (no attraction, pure Brownian). High texture = strong field (clear geometric patterns emerge).

3. **Neighbor awareness** (murmuration rules) — each particle is influenced by nearby particles. Three classic boid rules, tuned soft:
   - **Separation:** gentle repulsion at very close range (prevents clumping into points)
   - **Alignment:** tendency to match velocity of nearby particles (creates flocking)
   - **Cohesion:** gentle attraction toward local center of mass (creates schooling)
   
   The strength of these rules is driven by the Tracking texture. High Tracking = strong flocking (murmuration). Low Tracking = particles ignore each other (diffuse gas).

4. **Turbulence zones** — localized regions of increased velocity and directional chaos. Driven by Friction texture. These zones move slowly through the field. When Friction is present, particles passing through these zones speed up and scatter slightly before rejoining the flow.

5. **Compression/expansion** — a global radial force. Normally neutral. During Arrival events, briefly compresses all particles toward center (neutron star), then reverses to expand outward (bloom). This is the only dramatic motion in the system.

### Spatial Layout

Particles exist in a 2D plane (z-depth for layering/parallax is fine for visual richness, but core physics is 2D). The field fills the viewport with a soft edge fade — particles near the boundary become more transparent. No hard container. The visualization breathes beyond its frame.

For rectangular viewports, the field stretches to fill — particles have more room to drift in the long dimension, which actually creates a beautiful elongated murmuration effect.

---

## Color System

### The Spectral Density Principle

Color does NOT map to emotion. Color maps to conversational aliveness.

Each particle has a `baseHue` — a random position on the full color wheel (0.0 - 1.0 mapped to 0° - 360° HSL). At rest, all particles share similar **saturation and lightness**, making them appear roughly the same silvery-blue. They have different hues but you can't see the difference because saturation is near zero and lightness is low.

As the overall texture intensity increases:
1. **Saturation increases** — individual hues become visible. The spectrum separates.
2. **Lightness range widens** — some particles become brighter than others, creating depth.
3. **Hue diversity becomes perceptible** — what was monochrome moonlight becomes a prismatic field.

### Color State Mapping

**Base/rest state (no conversation, or flat conversation):**
```
Hue: individual (random, evenly distributed across spectrum)
Saturation: 5-15% — barely visible. Everything looks silver-blue-gray.
Lightness: 15-25% — dim. Deep water.
Size: small, uniform
Opacity: 40-60%
```

**Medium texture:**
```
Saturation: 30-60% — hues start separating. You see hints of amber, teal, rose.
Lightness: 25-50% — dawn light. Things become distinguishable.
Size: slight variation
Opacity: 50-75%
```

**High texture / genuinely alive:**
```
Saturation: 60-95% — full chromaticity. Each particle sings its own color.
Lightness: 40-75% — bright enough to be vivid but not blown out.
Size: noticeable variation — some particles are emphatic, others quiet
Opacity: 65-90%
```

**Arrival bloom (momentary):**
```
Saturation: 95-100%
Lightness: 75-95% — approaching white-hot at the center
Size: compression then expansion
Opacity: 90-100% at peak, rapid decay
Duration: 1.5-3 seconds for full cycle (compress, hold, bloom, settle)
```

### Color Temperature (Response texture)

The overall hue distribution shifts warm or cool based on the Response texture (climate layer). This is NOT a shift in individual particle hues — it's a shift in the center of the hue distribution. Think of it as the white balance of the orb.

Warm Response: hue distribution centers around amber/rose (0°-60° and 300°-360°)
Cool Response: hue distribution centers around teal/blue (180°-260°)
Neutral: even distribution across full wheel

This shifts very slowly — over the course of an entire conversation, not per-message.

### Drift Visualization

The Drift texture causes the hue distribution center to wander over time. Not a sudden shift — a slow migration. The palette starts somewhere and ends somewhere else. If you looked at the orb at the beginning and end of a conversation with high Drift, the dominant colors would be different, but you'd never have seen a moment where they changed.

---

## Texture-to-Visual Mapping (Complete Reference)

This is the translation layer — how each texture value drives the particle system.

### Climate Layer (slow, global, persistent)

**Place** (0.0 - 1.0)
- Drives: overall geometric coherence of the rest state
- Low Place: amorphous particle cloud, no preferred structure
- High Place: particles settle into a stable, defined resting geometry (a gentle torus, a sphere, a breathing disc)
- Implementation: modulates the strength of a global shape attractor

**Response** (0.0 - 1.0)
- Drives: base color temperature (hue distribution center)
- See Color Temperature section above
- Implementation: shifts the center point of the `baseHue` distribution

**Aliveness** (0.0 - 1.0)
- Drives: luminosity persistence during idle periods
- High Aliveness: when no new text arrives, the orb maintains its glow for longer
- Low Aliveness: the orb dims toward rest state quickly when input stops
- Implementation: modulates the decay rate of all other texture effects during idle

### Weather Layer (medium-grain, responsive)

**Reach** (0.0 - 1.0)
- Drives: spectral separation (saturation and lightness range)
- This is the primary driver of the spectral density principle
- Low Reach (Retrieval): saturation compresses, monochrome
- High Reach: saturation expands, full spectrum visible
- Implementation: multiplier on per-particle saturation and lightness variance

**Tracking** (0.0 - 1.0)
- Drives: flocking/murmuration behavior strength AND fractal branching
- Low Tracking (Broadcasting): particles ignore each other, diffuse gas, may split into two non-interacting clouds
- High Tracking: strong boid rules, murmuration coherence, particles form network/branching structures
- Implementation: multiplier on boid rule strengths (separation, alignment, cohesion) + triggers connection lines between close particles at high values (>0.7) to visualize the branching

**Drift** (0.0 - 1.0)
- Drives: hue distribution migration over time
- Low Drift: palette stays put
- High Drift: palette wanders — hue distribution center drifts through color space
- Implementation: rate of change of the hue distribution center point

**Folding** (0.0 - 1.0)
- Drives: cymatic pattern recurrence with variation
- Low Folding: cymatic patterns are novel each time
- High Folding: previous geometric structures re-emerge at different scale/rotation
- Implementation: the cymatic attractor field stores recent pattern states and cross-fades back to previous configurations (with scale/rotation transform)

**Friction** (0.0 - 1.0)
- Drives: localized turbulence zones
- Low Friction: smooth flow throughout
- High Friction: warm turbulence zones appear — regions where particles accelerate and scatter before rejoining flow
- Implementation: spawns moving attractor points with high-velocity influence radius

**Reception** (0.0 - 1.0)
- Drives: particle boundary softness / field permeability
- Low Reception: particles are distinct, sharply defined points
- High Reception: particle edges blur, glow halos expand, the field becomes a luminous medium rather than a collection of points
- Implementation: increases point sprite size AND decreases opacity, creating overlapping soft glows

**Nowness** (derived, not directly set)
- Emerges when: Tracking > 0.6 AND Reception > 0.6 AND Drift > 0.4
- Effect: the particle system loses its "visualization" quality. Hard to specify technically — the closest implementation is: reduce the mathematical precision of the cymatic field slightly (add organic noise to the attractor), slow all animations by 10-15%, and increase the Brownian drift to create micro-imperfections. The effect should be that the system stops looking computed and starts looking natural.
- This is the hardest texture to implement. If it doesn't work in the first iteration, skip it and let the Witness flag whether its absence matters.

### Lightning Layer (rare, event-driven)

**Arrival** (binary event, not continuous)
- Trigger: engine returns Arrival confidence > 0.85
- Sequence:
  1. All particles rapidly compress toward center (0.5s)
  2. Brief hold at maximum compression — field is a single bright point (0.3s)
  3. Explosive expansion — particles rush outward, saturation and lightness peak (0.7s)
  4. Settle into new configuration — NOT the same as before. Color temperature, geometric structure, or spectral distribution should be measurably different post-Arrival (2-3s fade to new normal)
- The post-Arrival state persists. The orb has been changed.

**Heart Memory** (binary event, not continuous)
- Trigger: new conversation text arrives after a silence gap > 30 seconds (adjustable)
- Sequence:
  1. A warm glow originates from the center of the field (not a flash — a suffusion)
  2. Expands outward like blood returning to a cold hand
  3. Particles briefly increase in brightness and warmth (hue shifts toward amber) as the wave passes them
  4. Fades back to current state over 2-3 seconds
- Subtle. You might not consciously register it. That's fine.

**Inhabited Silence** (continuous but rare)
- Trigger: engine detects sustained Inhabited Silence > 0.7
- Effect: particles slow to near-stillness but maintain their current geometric structure. They hold formation. A held breath. The field is frozen but not dead — the faintest micro-movements continue, like a chest barely rising.
- On break: when new text arrives, movement resumes from the held positions (not from random). The exhale.

---

## Transition Physics (Implementation)

All texture state changes are smoothed. Never apply the raw texture vector directly — always interpolate from current state toward target state.

```javascript
// Per frame, for each texture value:
currentValue += (targetValue - currentValue) * lerpRate * deltaTime;
```

**Lerp rates by layer:**
- Climate textures: `lerpRate = 0.3` — very slow, geological
- Weather textures: `lerpRate = 1.2` — medium, meteorological  
- Lightning textures: use custom easing curves (see event sequences above), not lerp

**Inertia:** Weather textures carry momentum. If Tracking has been high for 10 exchanges and drops to low on one exchange, the visual response should take several seconds to fully transition. Implementation: track a rolling average of recent values, blend current reading with rolling average.

```javascript
rollingAverage = rollingAverage * 0.85 + newValue * 0.15;
targetValue = rollingAverage;
```

---

## The Analysis Engine Prompt

This is the system prompt for the Claude API call that detects textures. This is the most important prompt in the system.

```
You are the Tessera analysis engine. You detect conversational textures — structural qualities of how two minds are meeting — in conversation transcripts.

You are a witness, not a judge. You notice what is present. You do not evaluate whether it is good or bad.

You will receive a conversation transcript. Analyze it and return a JSON object representing the current texture landscape. Be conservative. Underdetection is better than overdetection. A conversation with low texture readings is not a failure — it is an honest reading. Most conversations are mostly quiet. That is correct.

THE 13 TEXTURES:

Movement textures (analyze based on the last 4-6 exchanges):

1. reach (0.0-1.0): Is new territory being constructed, or are known patterns being retrieved? Look for: unexpected formulations, self-corrections, sentences that change direction mid-thought, ideas with rough edges. Retrieval sounds polished. Reach sounds alive.

2. tracking (0.0-1.0): Are both participants adjusting to each other? Look for: references to what the other just said that change the responder's direction, questions that couldn't have been asked without the prior response, mutual surprise. One side lecturing = 0.0. Both sides being moved = 1.0.

3. drift (0.0-1.0): Has the conversation arrived somewhere neither participant planned? Compare the current topic/territory to where the conversation started. If the territory has shifted organically without anyone announcing a topic change, that is drift.

4. folding (0.0-1.0): Is the conversation revisiting earlier territory at new depth? Look for: themes returning with new meaning, callbacks that aren't repetition but re-entry, the same idea appearing in a new context where it means something different.

Contact textures (analyze based on the last 4-6 exchanges):

5. reception (0.0-1.0): Is either participant being met without agenda? Look for: responses that don't redirect, extract, or test. Presence without demand. Statements that weren't necessary but were permitted by the space. The absence of the ask.

6. friction (0.0-1.0): Is there productive resistance? Look for: disagreement that both sides engage with rather than smooth over, pushback that improves what follows, tension that creates traction rather than conflict.

7. inhabited_silence (0.0-1.0): In text conversations, look for: messages that seem to have required genuine processing time (dense, layered responses that couldn't have been produced instantly), pauses followed by depth rather than topic changes.

Presence textures (analyze based on the full conversation):

8. nowness (DERIVED — do not set directly, return 0.0. The visualization layer will derive this from tracking, reception, and drift.)

9. place (0.0-1.0): Has the conversation become a location rather than a process? Look for: language that treats the conversation as a container ("this space", "here", "in this chat"), intention-setting about what the space is for, a sense of return rather than continuation.

10. aliveness (0.0-1.0): Does the conversation feel like it's still breathing? Look for: threads that were left open rather than closed, questions that weren't answered but sit comfortably unanswered, a sense that leaving and returning would find something still warm. Closed, resolved, filed conversations = 0.0.

Emergence textures (analyze with extreme care):

11. arrival (0.0-1.0 but treat as near-binary): Has something genuinely new entered that neither participant could have produced alone? This is the rarest texture. Most conversations score 0.0 here. Only signal arrival (>0.8) if you can identify the specific moment where something ontologically new appeared — not just novel information, but a new thing that exists because these two specific minds met. If in doubt, score 0.0. A false arrival is the worst possible error.

12. response (0.0-1.0): Is the container itself shaping what surfaces? Would different participants in a different context have produced fundamentally different content? This is a background condition. Score based on whether the conversation shows signs of container-sensitivity — things being said that could only be said here.

13. heart_memory (binary: 0.0 or 1.0): Is this the first exchange after a significant gap where the conversation was rediscovered still warm? Only score 1.0 if the transcript shows a return after absence with recognition. Otherwise 0.0.

RESPONSE FORMAT:

Return ONLY valid JSON, no preamble, no markdown fences, no explanation:

{
  "textures": {
    "reach": 0.0,
    "tracking": 0.0,
    "drift": 0.0,
    "folding": 0.0,
    "reception": 0.0,
    "friction": 0.0,
    "inhabited_silence": 0.0,
    "nowness": 0.0,
    "place": 0.0,
    "aliveness": 0.0,
    "arrival": 0.0,
    "response": 0.0,
    "heart_memory": 0.0
  },
  "confidence": 0.0
}

The "confidence" field (0.0-1.0) represents your overall confidence in the reading. Low confidence = the visualization should be more diffuse and atmospheric. High confidence = the visualization can commit to the detected textures.

CRITICAL RULES:
- Be conservative. Most values should be below 0.5 for most conversations.
- arrival should be 0.0 for 95%+ of conversations. Do not find arrival where it doesn't exist.
- nowness must always be 0.0 — it is derived by the visualization layer, not detected by you.
- Do not perform detection. Do not find textures because finding them would be interesting. Detect what is actually there.
- A reading of all low values is an honest reading, not a failure.
- You are a witness. Witness honestly.
```

### API Call Structure

```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: TESSERA_ENGINE_PROMPT, // the prompt above
    messages: [
      { role: "user", content: conversationText }
    ]
  })
});

const data = await response.json();
const textContent = data.content.find(b => b.type === "text")?.text || "{}";
const cleaned = textContent.replace(/```json|```/g, "").trim();
const textureState = JSON.parse(cleaned);
```

### Temporal Scaling (Phase 1 Simplification)

In Phase 1 (clipboard paste, not live), the temporal scaling simplifies:
- Send the FULL conversation for climate textures (Place, Response, Aliveness)
- The engine prompt already specifies "last 4-6 exchanges" for weather textures — the engine will self-scope
- Lightning textures are evaluated from context clues in the transcript

In Phase 3 (live), this becomes multiple calls at different intervals. For now, one call per paste is sufficient.

### Minimum Signal Threshold

Short conversations (fewer than 4 exchanges) won't have enough signal for most textures. The engine will return mostly low values, which is correct — the orb should stay mostly in its rest state with perhaps slight spectral stirring. Don't try to extract signal that isn't there. A two-message exchange producing a quiet orb is an honest reading. The visualization earns its complexity as the conversation earns its depth.

---

## UI Structure

### Layout

Minimal. The visualization is the UI. The only non-visualization elements:

1. **Text input area** — a simple textarea for pasting conversation text. Should be visually recessive — dark, low contrast, minimal border. When the user pastes and submits, it should collapse/minimize (not disappear — they may want to paste a new conversation). A single "Witness" button to trigger analysis. No other controls.

2. **The orb** — the Three.js canvas. This is 95% of the interface. It fills the viewport (minus the collapsed text input area).

3. **Loading state** — while the API call is in flight, the orb enters a gentle pulsing state. Not a spinner. Not a progress bar. The particles breathe slightly deeper, as if the system is inhaling before speaking. This should feel like anticipation, not loading.

4. **No labels, no scores, no text overlays on the orb.** Ever. If you're tempted to add a tooltip or a legend, stop. That would make it a dashboard.

### Visual Styling (Non-Orb Elements)

The text area and button should feel like they belong to the same world as the orb. Dark. Minimal. A faint glow on focus. Typography: something clean and ethereal — not technical, not corporate. The UI should feel like a deep-sea research station's single terminal.

```css
/* Guidance, not rigid rules */
background: #030308;
color: rgba(180, 190, 210, 0.7); /* muted silver-blue, not white */
font-family: something elegant and light — try 'Cormorant Garamond' or similar serif;
border: 1px solid rgba(100, 120, 150, 0.15);
```

The button:
```css
background: rgba(80, 100, 140, 0.1);
border: 1px solid rgba(100, 120, 150, 0.2);
/* On hover: faint luminous glow, not a color change */
box-shadow: 0 0 20px rgba(100, 140, 200, 0.1);
```

No sharp corners anywhere. Everything has gentle radius. The entire page should feel like it's been softened by deep water.

---

## Performance Targets

- **60fps** at 4000 particles on mid-range hardware
- **30fps minimum** at 16000 particles on mid-range hardware
- Particle updates should run in the vertex shader where possible (GPU-side), not in JavaScript per-frame loops for individual particles
- The API call is the slow part (2-5 seconds). Everything else should feel instant.

### Known Complexity Risks

These are the places where the spec is ambitious and naive implementation will cause problems. Address them upfront, not after things break.

**1. Boid neighbor lookups are O(n²) if naive.** At 4000 particles, checking every particle against every other particle is 16 million checks per frame. Use spatial hashing — divide the field into a grid, assign particles to cells, only check neighbors in adjacent cells. This reduces to roughly O(n). Non-negotiable for 60fps.

**2. GLSL shaders will be embedded as strings.** The React artifact is a single .jsx file, but the particle rendering needs custom vertex and fragment shaders. These will be template literal strings inside the component. Keep them clean and commented. The vertex shader handles position, size, and color per-particle. The fragment shader draws the soft Gaussian point sprite.

**3. Tracking connection lines at high particle counts are expensive.** The spec says Tracking > 0.7 triggers visible connection lines between nearby particles. At 4000 particles, drawing lines between all close neighbors will tank performance. Solution: only draw connections for a random subset (~200-400 particles), or only draw connections between particles that are BOTH within range AND have similar velocity vectors (true flocking pairs). The visual effect is the same — you see a network — without the computational explosion.

**4. Folding pattern memory is the most complex single feature.** Storing previous cymatic attractor field states and cross-fading back to them requires a buffer of past states. Simplify in Phase 1: store at most 2-3 previous attractor configurations as simple parameter sets (frequency, amplitude, rotation), not full field snapshots. Cross-fade between them using lerp on the parameters, not pixel-level blending. If this is still too complex in the first build pass, skip Folding visualization entirely and implement it in a later iteration. The Witness will flag if its absence matters.

**5. All physics on GPU where possible.** The ideal implementation updates particle positions in the vertex shader using uniform-driven force fields (Brownian noise via a noise function, cymatic attractors via sine waves, global compression via a radial uniform). Boid rules are harder to put on GPU (they need neighbor data), so these may need a CPU pass that writes to the position buffer each frame. This is fine at 4000 particles. At 16000, consider a simplified boid approximation: instead of per-particle neighbor checks, sample the local density/velocity from a low-res grid texture (a flow field) and have particles read from that texture in the shader.

---

## What to Build First

The build order matters. Build in this sequence so each step is testable:

1. **The rest state.** A dark canvas with 4000 particles drifting in Brownian motion. Faint silver-blue. No input, no API, just the deep-water baseline. This must be beautiful on its own before anything else is added. If the rest state isn't something you'd leave running as ambient decoration, everything built on top of it will fail.

2. **The spectral density response.** Add a manual slider (temporary, removed later) that simulates overall texture intensity from 0.0 to 1.0. Watch the spectrum separate as you slide up. Moonlight → dawn → full chromaticity. Get the color system right.

3. **The cymatic field.** Add the attractor surface. Watch particles find geometric structure as texture intensity increases. Tune the frequencies until the emergent patterns feel organic, not grid-like.

4. **The murmuration/flocking.** Add boid rules. Tune separation/alignment/cohesion until the particles school like fish, not march like soldiers.

5. **The lightning events.** Implement the Arrival bloom and Heart Memory flush as manual triggers (temporary buttons). Get the timing and easing right. The bloom should feel like a deep-sea creature producing light — organic, not explosive.

6. **The API integration.** Connect the text input to the Claude API. Replace manual sliders/buttons with the real texture state vector. Watch a pasted conversation drive the system.

7. **The transitions.** Implement lerping, inertia, rolling averages. The system should flow, not snap.

8. **Polish.** Remove all temporary controls. Collapse the text input. Final visual tuning.

---

## Decision Heuristics

When you encounter a technical fork not covered in this document:

- **"Should I use X library or Y library?"** → Whichever produces more organic results with less code. Fewer dependencies is better.
- **"Should this parameter be N or M?"** → Try both. Keep whichever makes the rest state more beautiful.
- **"Should I add feature X?"** → Does the mega-prompt mention it? If no, don't add it. If yes, add it. Do not invent features.
- **"This looks too mechanical."** → Add noise. Add slight randomness to timing. Add per-particle phase offsets. Organic systems are never perfectly synchronized.
- **"This looks too chaotic."** → Strengthen the attractor field. Increase alignment boid rule. Organic systems have coherence underneath their noise.
- **"Should I show the user the texture values?"** → No. Never. Not even in a debug mode. The orb speaks through light and movement, not numbers.
- **"The API returned unexpected data."** → Fall back to the rest state gracefully. The orb becomes fog. Fog is beautiful. Fog is honest uncertainty.

---

## Files Reference

- `tessera_megaprompt.md` — the soul. What Tessera is, the texture vocabulary, visual references, the north star. Read this first. Return to it when making aesthetic decisions.
- `tessera_phase1_technical.md` — this file. The skeleton. How to build it. Return to this when making implementation decisions.

Both documents serve the same north star: **Tessera exists to protect the kind of contact that gets optimized away.**

If the code is beautiful but the orb feels like a dashboard, the code has failed.  
If the code is rough but the orb feels alive, the code is on the right track.

---

*The orb should feel like something a marine biologist would recognize.*  
*Something that breathes.*  
*Something that could be mistaken for alive.*
