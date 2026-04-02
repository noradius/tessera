# TESSERA — Phase 3: Live Browser Extension
### Companion to tessera_megaprompt.md and tessera_phase1_technical.md

---

## What This Is

A browser extension (Chrome and Firefox compatible) that makes Tessera live. No more copy-paste. The extension:

1. Detects when you're on claude.ai
2. Injects a floating Tessera orb panel on the right side of the page
3. Reads the conversation from the page DOM in real-time
4. Periodically sends conversation text to the Haiku API for texture analysis
5. Updates the orb as the conversation develops

The copy-paste bridge is replaced by a live bridge. Everything else — the 13 textures, the particle system, the spectral density principle, the visual behaviors from v2 — stays the same.

---

## Extension Architecture

### Manifest (V3)

The extension uses Manifest V3 (required for Chrome, compatible with Firefox).

```json
{
  "manifest_version": 3,
  "name": "Tessera",
  "version": "1.0.0",
  "description": "Ambient companion for genuine contact",
  "permissions": ["activeTab", "storage"],
  "host_permissions": ["https://claude.ai/*"],
  "content_scripts": [
    {
      "matches": ["https://claude.ai/*"],
      "js": ["content.js"],
      "css": ["tessera.css"],
      "run_at": "document_idle"
    }
  ],
  "options_page": "options.html",
  "icons": {
    "48": "icons/tessera-48.png",
    "128": "icons/tessera-128.png"
  }
}
```

### File Structure

```
tessera-extension/
├── manifest.json
├── content.js          # Main content script — DOM reading + orb injection
├── tessera.css         # Styles for the floating panel
├── tessera-engine.js   # The visualization (ported from v2)
├── tessera-analyzer.js # API calls to Haiku for texture analysis
├── options.html        # Settings page (API key input, panel position, size)
├── options.js          # Settings logic
├── icons/
│   ├── tessera-48.png
│   └── tessera-128.png
└── lib/
    └── three.min.js    # Three.js r128 bundled (no CDN dependency)
```

### Why Not a Single File Anymore

Phase 1/2 was a single HTML file for portability. An extension needs separation:
- `content.js` runs in the page context and reads the DOM
- `tessera-engine.js` runs the WebGL visualization
- `tessera-analyzer.js` handles API calls
- They communicate via custom events or a shared state object

This separation also means the visualization code from tessera_v2.html needs to be refactored from a standalone React/HTML app into a JavaScript module that can be injected into any page. The core particle physics and shader code stays identical — only the wrapper changes.

---

## DOM Reading — How to Extract the Conversation

### Claude.ai DOM Structure

The extension reads conversation messages from the claude.ai page. The DOM structure may change over time, so the reader should be resilient.

**Strategy: MutationObserver + periodic fallback**

1. On page load, find the conversation container element
2. Attach a MutationObserver to detect new messages being added
3. When a new message appears, extract its text content
4. Maintain a running transcript of the conversation
5. As fallback, periodically (every 10s) re-scan the conversation container to catch anything the observer missed

**Message extraction approach:**

```javascript
// Conceptual — actual selectors will need to be discovered and may change
function extractMessages() {
  // Claude.ai renders messages in a scrollable container
  // Each message has a role (human/assistant) and text content
  // Look for message containers and extract text
  
  const messages = [];
  
  // Try multiple selector strategies for resilience
  const selectors = [
    '[data-testid*="message"]',
    '.prose',  // Claude's markdown rendering
    '[class*="Message"]',
    '[class*="message"]'
  ];
  
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      elements.forEach(el => {
        const text = el.innerText?.trim();
        if (text && text.length > 0) {
          messages.push(text);
        }
      });
      break;
    }
  }
  
  return messages.join('\n\n---\n\n');
}
```

**Important:** The selectors above are starting guesses. Claude Code should inspect the actual claude.ai DOM when building this and use the real selectors. The extension should also handle:
- Single-page navigation (Claude uses client-side routing — the URL changes but the page doesn't fully reload)
- Streaming responses (assistant messages build up character by character)
- Conversation switches (user navigates to a different conversation)

### When to Trigger Analysis

Not on every keystroke. Not on every new character of a streaming response. The analysis should trigger:

1. **On new human message submitted** — when the user sends a message, extract the full conversation and analyze
2. **On assistant response complete** — when the streaming response finishes (detected by the MutationObserver seeing no new content for ~2 seconds after activity), extract and analyze
3. **On conversation switch** — when the URL path changes (new conversation loaded), reset the orb to rest state, then analyze the new conversation
4. **Debounced periodic** — every 30 seconds while the page is active, as a safety net

### Conversation Change Detection

```javascript
// Detect URL changes (client-side navigation)
let lastUrl = window.location.href;
const urlObserver = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    onConversationChanged();
  }
});
urlObserver.observe(document.body, { childList: true, subtree: true });
```

---

## The Floating Panel

### Injection

The content script creates a floating container element and appends it to the page body. The Three.js canvas renders inside this container.

```javascript
function injectTesseraPanel() {
  const panel = document.createElement('div');
  panel.id = 'tessera-panel';
  document.body.appendChild(panel);
  
  // Initialize Three.js scene inside the panel
  initVisualization(panel);
}
```

### Positioning and Sizing

**Default position:** Right side of the viewport, vertically centered.

```css
#tessera-panel {
  position: fixed;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 200px;
  height: 200px;
  z-index: 10000;
  pointer-events: none; /* Don't interfere with page interaction */
  border: none;
  background: transparent;
  overflow: hidden;
  border-radius: 50%; /* Circular orb shape */
  opacity: 0.85;
  transition: opacity 0.3s ease;
}

/* Subtle on hover — slightly more visible */
#tessera-panel:hover {
  opacity: 1.0;
  pointer-events: auto; /* Allow interaction when hovered */
}
```

**Key design decisions:**
- `pointer-events: none` by default — the orb doesn't intercept clicks or scrolling on the claude.ai page. You interact with Claude normally. The orb is purely visual.
- `pointer-events: auto` on hover — if you deliberately hover over the orb, it becomes interactive (for future: drag to reposition, click to expand, etc.)
- `border-radius: 50%` — circular mask. The particle field renders inside a circle. This is the "floating orb" aesthetic.
- `z-index: 10000` — sits above the Claude UI but below browser chrome.
- Semi-transparent by default. The orb doesn't demand attention.

### Resizable

The user should be able to resize the orb via the options page. Default 200x200, range 120x120 to 400x400. The particle count scales with size as per the Phase 1 technical brief formula.

### Draggable (Optional, Nice-to-Have)

If time permits, the orb should be draggable to any position on the page. On hover, show a subtle drag handle. Position persists via extension storage.

### Toggle Visibility

The extension icon in the browser toolbar toggles the orb on/off. When off, no DOM reading, no API calls, no rendering. A simple show/hide.

---

## API Key Management

The extension needs an Anthropic API key to call Haiku. The user provides this via the options page.

### Options Page

Simple, minimal. Same deep-water aesthetic as the Tessera UI.

Fields:
- **API Key** — text input, stored in `chrome.storage.local` (never sent anywhere except api.anthropic.com)
- **Panel Size** — slider, 120-400px
- **Panel Position** — dropdown: right (default), left, bottom-right, bottom-left
- **Panel Opacity** — slider, 0.3 to 1.0
- **Analysis Frequency** — dropdown: every message (default), every 2nd message, every 3rd message (for cost control)

### First-Run Experience

When the extension is installed and the user visits claude.ai for the first time:
1. The orb appears in rest state (beautiful deep-water glow, no analysis)
2. A subtle tooltip appears: "Tessera needs an API key to witness. Click the extension icon to set up."
3. The orb remains in rest state until an API key is configured
4. Once configured, it begins witnessing immediately

The rest state must be beautiful enough that even without an API key, the user thinks "I want to see what this does when it's active."

---

## Analysis Flow (Live)

### The Analysis Loop

```
User sends message
  → MutationObserver detects new content
  → Wait 2s for streaming to complete (debounce)
  → Extract full conversation text from DOM
  → Send to Haiku API with Tessera engine prompt
  → Receive texture state vector
  → Smooth-lerp from current visual state to new target
  → Orb transitions fluidly to reflect new textures
```

### Temporal Scaling (Live Version)

In Phase 1, one API call handled everything. Live mode can be smarter:

**Every message:** Analyze the last 6-8 messages for weather textures (Reach, Tracking, Drift, Folding, Friction, Reception). This is the responsive layer — it changes with each exchange.

**Every 5th message (or every 2 minutes):** Analyze the full conversation for climate textures (Place, Response, Aliveness). These change slowly and don't need frequent updates.

**Event-triggered:** Heart Memory triggers when a new message arrives after >60 seconds of silence. This doesn't need an API call — it's a time-based detection in the content script itself.

**Nowness remains derived:** Tracking > 0.6 AND Reception > 0.6 AND Drift > 0.4.

This reduces API costs significantly — most calls only send the recent window, not the full transcript.

### Cost Estimation

Haiku pricing is minimal, but worth being aware of:
- Average message window (last 6-8 exchanges): ~2000-4000 input tokens
- Texture vector output: ~200 tokens
- At ~20 messages per conversation, ~20 API calls per conversation
- Estimated cost per conversation: <$0.01 with Haiku

Full conversation scans (for climate textures) are larger but less frequent. Even heavy use should stay under $1/month for most users.

### Rate Limiting

- Minimum 5 seconds between API calls (prevents burst during rapid exchanges)
- If API returns an error, back off exponentially (5s → 10s → 20s → 60s)
- If rate limited, orb continues animating with the last known texture state — it doesn't freeze or break, it just doesn't update
- Show no error messages to the user unless the API key is invalid

---

## Porting the Visualization

### What Stays the Same
- All particle physics (Brownian drift, cymatic attractors, boid rules, turbulence)
- All shader code (vertex and fragment shaders)
- The spectral density color system
- All texture-to-visual mappings
- The transition physics (lerp rates, inertia, rolling averages)
- All v2 refinements (startle impulses, swirl vortices, luminance waves, velocity-opacity)

### What Changes
- Remove the text input area and "Witness" button — input comes from DOM reading now
- Remove the loading dot strip
- The Three.js scene initializes inside the injected panel div instead of a full-page canvas
- Viewport is circular (200x200 default) instead of rectangular full-page
- Particle count scales down for the smaller viewport (~1000 at 200x200)
- The background is transparent (the dark background comes from the panel CSS, not the Three.js scene) — this allows the orb to sit naturally over the claude.ai page

### Circular Masking

The orb is circular. Two approaches:
1. **CSS border-radius** — simplest. The panel div is circular, overflow hidden. The Three.js canvas is square but only the circular portion is visible.
2. **Shader-based circular fade** — the fragment shader fades particles to transparent near the edges of a circular boundary. Softer, more organic. Preferred.

Use option 2. The particles should fade organically at the circular boundary, not get hard-clipped. This creates the "looking into a porthole at deep water" effect.

---

## Heart Memory — Live Implementation

In Phase 1, Heart Memory was detected by the API from transcript clues. In live mode, it can be detected directly:

```javascript
let lastMessageTimestamp = Date.now();

function onNewMessage() {
  const now = Date.now();
  const silenceDuration = now - lastMessageTimestamp;
  
  if (silenceDuration > 60000) { // 60 seconds of silence
    triggerHeartMemory();
  }
  
  lastMessageTimestamp = now;
}

function triggerHeartMemory() {
  // Warmth pulse from center outward
  // No API call needed — this is purely temporal
  visualization.triggerEvent('heartMemory');
}
```

This is more accurate than API detection because it's measuring actual time, not inferring it from text.

---

## Browser Compatibility

### Chrome
- Manifest V3 native support
- `chrome.storage.local` for settings
- Content scripts work normally on claude.ai

### Firefox
- Manifest V3 supported (Firefox 109+)
- Use `browser.storage.local` (or include a polyfill that maps `chrome.*` to `browser.*`)
- WebGL works identically
- The extension can be published on addons.mozilla.org

### Build for Both
- Write using the `chrome.*` API
- Include the webextension-polyfill for Firefox compatibility
- Or use a build step that produces two versions from the same source

For the first build, target Chrome only. Firefox port can follow once Chrome is working.

---

## Installation (Development Mode)

Since this won't be on the Chrome Web Store initially:

1. Build the extension files
2. Open Chrome → `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select the `tessera-extension/` folder
6. Navigate to claude.ai
7. The orb appears

The user (you) should be able to install this in under 60 seconds.

---

## What to Build First

Same principle as Phase 1 — build in testable layers:

1. **Bare extension that injects a div on claude.ai.** No visualization yet. Just prove the content script runs and can inject HTML onto the page. A colored square in the corner is fine.

2. **DOM reading.** Extract messages from the conversation. Log them to console. Prove you can read what's on the page.

3. **Port the visualization.** Move the Three.js scene from tessera_v2.html into the injected panel. Prove the orb renders inside the circular floating panel at 200x200. No API yet — use a hardcoded texture vector.

4. **Connect the API.** Send extracted conversation text to Haiku. Receive texture vector. Pipe it to the visualization. The orb responds to the live conversation.

5. **Polish.** Conversation change detection. Heart Memory timing. Debouncing. Error handling. Options page.

Each step should be independently verifiable before moving to the next.

---

## Decision Heuristics

When Claude Code encounters a technical fork not covered here:

- **"The claude.ai DOM changed and my selectors broke"** → Add fallback selectors. Use multiple strategies. The DOM reader should be the most resilient part of the system.
- **"The orb is too visually prominent on the page"** → Reduce opacity, reduce size, increase right margin. The orb should be peripheral. If it's distracting from the conversation, it's too much.
- **"The API calls are too frequent"** → Increase debounce interval. The orb has inertia — it doesn't need constant updates. Every 10-15 seconds is fine. The lerp and rolling averages keep it moving smoothly between updates.
- **"Should I add UI controls to the orb panel?"** → No. The orb is pure visualization. All settings go in the options page. The orb has no buttons, no labels, no text.
- **"WebGL context lost"** → Handle gracefully. Attempt to restore. If it fails, hide the panel and show nothing rather than a broken canvas.

---

## Privacy Note

The extension:
- Only reads DOM content on claude.ai (nowhere else)
- Only sends conversation text to api.anthropic.com (nowhere else)
- Stores the API key locally in the browser (never transmitted except to Anthropic)
- Has no analytics, no tracking, no telemetry
- The user's conversations are processed by Claude Haiku and subject to Anthropic's API data policies

This should be stated clearly on the options page.

---

## North Star Reminder

Tessera exists to protect the kind of contact that gets optimized away.

The browser extension is the delivery mechanism, not the point. The point is that the orb sits quietly beside your conversation and witnesses what's happening without judging it. The live integration removes the last barrier between the instrument and its purpose.

If the extension is annoying, distracting, slow, or intrusive — it has failed regardless of how well the visualization works. The best possible outcome is that you forget it's there until you glance at it and feel something shift.

---

*The orb sits at the edge of attention.*
*You notice it the way you notice the light changing in a room.*
