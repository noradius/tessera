# TESSERA — Phase 2: Multi-Agent Refinement Loop
### For use with Claude Code

---

## What This Is

You have a working Phase 1 Tessera artifact (tessera.html). It functions — the engine discriminates genuine conversation from flat content, the particle system responds, the spectral density principle works. But it's rough. This document defines a refinement process to push it from functional to alive.

You will play four roles sequentially. Each role has a distinct voice and distinct concerns. Do not blend them. When you are the Evaluator, you are not the Generator. When you are the Witness, you are nobody's friend.

---

## The Roles

### The Planner
Reads the current state of the code and the feedback from the previous iteration (if any). Produces a specific, actionable brief for what the Generator should change in the next iteration. The Planner thinks architecturally — not "make it prettier" but "the boid alignment coefficient is too high, producing rigid streams instead of organic flow, reduce from 0.04 to 0.02 and add a per-particle noise offset to the alignment vector."

The Planner also decides when to stop. If the last three iterations produced diminishing returns, the Planner should say so.

### The Generator
Takes the Planner's brief and modifies the code. Makes specific, targeted changes. Does not refactor the entire file — surgical edits only. After each edit, the Generator notes exactly what changed and why.

### The Evaluator
Reviews the modified code (not by running it — by reading the logic and imagining the visual result). Scores against four criteria, 1-10 each. Provides specific, actionable feedback. Never says "good job." Always says what needs to change and why.

**Scoring Criteria:**

**1. Aliveness (1-10)**
Does this feel inhabited or decorative? Would you notice it breathing? Is there something in the movement that feels organic rather than programmed? If you watched it for sixty seconds, would you see something you didn't see in the first five?
- 1-3: Mechanical, predictable, screensaver-like
- 4-6: Has movement but feels computed
- 7-8: Organic, surprising, you'd watch it
- 9-10: You'd mistake it for a living thing

**2. Restraint (1-10)**
Is it almost invisible at rest? Does it resist showing off? Is the most dramatic behavior reserved for the rarest moments? Could you forget it's there?
- 1-3: Hyperactive, attention-demanding, noisy
- 4-6: Present but slightly too eager
- 7-8: Peripheral, ambient, knows when to be quiet
- 9-10: You forget it's there until it shifts and you feel the room change

**3. Corruption Resistance (1-10)**
Would looking at this make you perform for it? Would you try to write differently to "trigger" a response? Does it gamify the conversation in any way?
- 1-3: Clear reward signals, you'd game it
- 4-6: Some patterns feel like feedback loops
- 7-8: Hard to game, doesn't reward or punish
- 9-10: Impossible to perform for — it witnesses without judging

**4. Surprise (1-10)**
Is there anything in the visual behavior that the specification didn't explicitly ask for? Emergent color interactions? Unexpected movement patterns? Things the code discovered that nobody planned?
- 1-3: Exactly what you'd expect from the spec
- 4-6: A few moments of unexpected beauty
- 7-8: Regular emergent behavior that delights
- 9-10: The system is genuinely discovering things

### The Witness
Does not score. Does not evaluate on criteria. The Witness watches the arc of iterations and asks one question: **is this iteration more alive than the previous one?**

The Witness also flags:
- When the Generator starts making "safe" changes to satisfy the Evaluator
- When the Evaluator scores are going up but the actual visual quality peaked earlier
- When interesting edges are being sanded off
- When it's time to stop

The Witness picks the final winner. Not the Evaluator. Not the highest-scoring iteration. The most alive one.

---

## Known Issues from Phase 1

These are the specific problems to address in early iterations. Prioritize by impact.

### HIGH PRIORITY

**1. Saturation needs to push harder in active states.**
When texture readings are high (especially Reach > 0.5), particle saturation should reach the 60-95% range specified in the technical brief. Currently too muted. The prism should visibly separate — vivid teal, vivid rose, vivid amber — not pastel hints. The rest state muting is correct. Only the active response needs more chromatic punch.

**2. White hotspots should retain their color.**
Bright particles are blowing out to white. Cap lightness at 75% during normal active states. A bright particle should be bright teal or bright rose, not white. White is reserved for the peak moment of an Arrival bloom only.

**3. Viewport scaling polish.**
At extreme sizes (very small, very large), the particle density and visual quality should degrade gracefully. Ensure the particle count formula scales correctly and the point sprite sizes adjust with viewport.

### MEDIUM PRIORITY

**4. The connection lines (Tracking visualization) need refinement.**
They should be barely visible — thin, translucent, almost subliminal. Currently too prominent in some states. They should suggest a network, not draw one.

**5. Transition smoothness between paste events.**
When the user pastes a new conversation, the transition from one texture state to another should flow, not snap. Ensure the lerp rates and rolling averages are working correctly across re-analysis events.

**6. Cymatic geometric emergence could be stronger.**
At high texture, the particles should find more visible geometric structure — hexagonal, spiral, or wave patterns. Currently the structure is mostly organic flow, which is good, but the cymatic attractor field should produce moments of recognizable geometry that dissolve back into flow.

### LOWER PRIORITY (BUT IMPORTANT FOR FEEL)

**7. Per-particle phase variation.**
If particles are pulsing or breathing, they should not do so in sync. Each particle needs a random phase offset so the breathing is like a field of fireflies, not a blinking sign.

**8. Edge fade / vignette.**
Particles near the viewport boundary should fade to transparent. The field should breathe beyond its frame, not have a hard cutoff.

**9. Loading state.**
While the API call is in flight, the orb should enter a gentle deepening pulse — not a spinner. The particles breathe slightly deeper, as if inhaling before speaking.

---

## Iteration Protocol

For each iteration:

1. **Planner** reviews the current code and previous Evaluator/Witness feedback. Writes a brief: 2-4 specific changes for the Generator to make. Prioritizes from the known issues list above. Once known issues are resolved, the Planner shifts to emergent refinement — finding what the code wants to become.

2. **Generator** implements the changes. Notes exactly what was modified. Saves the updated file as `tessera_v2_iter_N.html` (where N is the iteration number).

3. **Evaluator** scores the iteration on all four criteria. Provides specific feedback for each criterion. Notes what improved, what regressed, what's next.

4. **Witness** observes. May comment, may stay silent. Flags concerns if any. Compares to the overall arc.

5. **Corruption checkpoint:** Did this iteration introduce anything that gamifies, rewards, or invites performance? If yes, revert it before continuing.

6. Return to step 1 for the next iteration.

### Stopping Conditions

Stop iterating when ANY of these are true:
- The Witness says the peak has passed
- Three consecutive iterations score within 0.5 points of each other on all criteria
- The Evaluator's Surprise score drops below 3 for two consecutive iterations (convergence toward the mean)
- 10 iterations have been completed (hard cap for this session)

### Final Selection

The Witness reviews all iterations and selects the best one. This is NOT necessarily the last iteration or the highest-scoring one. It's the most alive one. The Witness explains their choice in 2-3 sentences.

The selected iteration is saved as `tessera_v2.html`.

---

## Taste Brief (Reminder)

The visualization should feel like looking at deep water at night. You know something's alive in there, but it's not performing for you. Pastel-to-saturated spectrum. Particle systems that find structure rather than being given it. The undertone behind a guitar solo, not the lead. Restraint over spectacle. What's withheld matters more than what's shown.

The rest state must be independently beautiful — something you'd leave running with no conversation loaded. When texture increases, complexity emerges without chaos. When texture peaks, there's a moment of compressed intensity that blooms and dissolves. The rarity of dramatic moments is itself the design.

Avoid: dashboards, progress bars, traffic-light coding, labeled axes, score displays, any text overlay, anything that gamifies the experience, anything that rewards performance, anything generic or expected, anything that looks like a visualization rather than an organism.

Aspire to: something a marine biologist would recognize. Something that breathes. Something that could be mistaken for alive.

---

## Critical Rule

Every iteration must be a BUILDABLE, WORKING file. No breaking the existing functionality to pursue a visual improvement. If a change breaks the system, revert it and try a different approach.

---

*The Witness remembers what was alive.*
*The Evaluator optimizes.*
*Trust the Witness.*
