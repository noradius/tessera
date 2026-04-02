// ============================================================
// TESSERA — Phase 3: Content Script
// DOM reading + visualization + API wiring on claude.ai
// Persistent message buffer survives virtual scrolling
// ============================================================

(function () {
  'use strict';

  if (!window.location.hostname.includes('claude.ai')) return;
  if (document.getElementById('tessera-panel')) return;

  // ---- State ----
  let lastMessageTimestamp = Date.now();
  let lastAnalysisTime = 0;
  let lastUrl = window.location.href;
  let streamingTimeout = null;
  let apiKey = '';
  let engineReady = false;
  let lastBufferSnapshot = '';

  // Persistent message buffer — survives virtual scrolling
  // Key: message index, Value: { role, text }
  // Once a message is captured, it stays in the buffer even if scrolled out of DOM
  let messageBuffer = [];
  let knownMessageHashes = new Set();

  const MIN_ANALYSIS_INTERVAL = 5000;
  const STREAMING_DEBOUNCE = 2500;
  const PERIODIC_INTERVAL = 30000;
  const SCAN_INTERVAL = 3000; // scan DOM for new/changed messages

  // ---- Panel Injection ----
  const panel = document.createElement('div');
  panel.id = 'tessera-panel';
  document.body.appendChild(panel);

  // ---- Load Settings ----
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.get(['tessera_api_key', 'tessera_panel_size'], (data) => {
      if (data.tessera_api_key) {
        apiKey = data.tessera_api_key;
        TesseraAnalyzer.setApiKey(apiKey);
        console.log('[Tessera] API key loaded');
      }
      if (data.tessera_panel_size) {
        const size = parseInt(data.tessera_panel_size);
        if (size >= 120 && size <= 500) {
          panel.style.width = size + 'px';
          panel.style.height = size + 'px';
        }
      }
    });
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.tessera_api_key) {
        apiKey = changes.tessera_api_key.newValue || '';
        TesseraAnalyzer.setApiKey(apiKey);
      }
      if (changes.tessera_panel_size) {
        const size = parseInt(changes.tessera_panel_size.newValue);
        if (size >= 120 && size <= 500) {
          panel.style.width = size + 'px';
          panel.style.height = size + 'px';
        }
      }
    });
  }

  // ---- Initialize Visualization ----
  function initEngine() {
    if (!window.TesseraEngine || !window.THREE) {
      setTimeout(initEngine, 100);
      return;
    }
    TesseraEngine.init(panel);
    engineReady = true;
    console.log('[Tessera] Engine initialized');
  }
  initEngine();

  // ---- Message Hashing (simple, fast) ----
  function hashText(text) {
    // Simple hash for deduplication — first 80 chars + length
    return (text || '').substring(0, 80).trim() + '|' + (text || '').length;
  }

  // ---- DOM Scanning → Buffer Accumulation ----
  function scanAndAccumulate() {
    // Scan currently visible messages and merge into persistent buffer
    const allTurns = document.querySelectorAll('[data-testid="human-turn"], [data-testid="ai-turn"]');

    if (allTurns.length > 0) {
      allTurns.forEach(turn => {
        const role = turn.dataset.testid === 'human-turn' ? 'Human' : 'Assistant';
        const text = turn.innerText?.trim();
        if (!text || text.length < 2) return;

        const hash = hashText(role + text);

        if (!knownMessageHashes.has(hash)) {
          knownMessageHashes.add(hash);

          // Find insertion position — try to maintain chronological order
          // Use DOM order relative to existing buffer entries
          messageBuffer.push({ role, text, hash });
        }
      });
      return;
    }

    // Fallback: broader selectors
    const selectors = [
      '[class*="ConversationTurn"]',
      '[class*="message"]',
      '.prose',
      '[class*="Message"]'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        elements.forEach(el => {
          const text = el.innerText?.trim();
          if (!text || text.length < 10) return;
          const hash = hashText(text);
          if (!knownMessageHashes.has(hash)) {
            knownMessageHashes.add(hash);
            messageBuffer.push({ role: '', text, hash });
          }
        });
        break;
      }
    }
  }

  // ---- Build Transcript from Buffer ----
  function getBufferTranscript() {
    return messageBuffer.map(msg => {
      if (msg.role) return `${msg.role}: ${msg.text}`;
      return msg.text;
    }).join('\n\n---\n\n');
  }

  // ---- Analysis ----
  async function triggerAnalysis() {
    if (!engineReady || !apiKey) return;

    const now = Date.now();
    if (now - lastAnalysisTime < MIN_ANALYSIS_INTERVAL) return;

    // Scan DOM into buffer first
    scanAndAccumulate();

    const transcript = getBufferTranscript();
    if (!transcript || transcript.length < 20) return;
    if (transcript === lastBufferSnapshot) return;

    lastBufferSnapshot = transcript;
    lastAnalysisTime = now;

    console.log('[Tessera] Buffer: ' + messageBuffer.length + ' messages, ' + transcript.length + ' chars');
    console.log('[Tessera] Transcript preview:\n', transcript.substring(0, 2000), transcript.length > 2000 ? '\n... (' + transcript.length + ' total chars)' : '');

    TesseraEngine.setAnalyzing(true);
    console.log('[Tessera] Analyzing conversation...');

    const result = await TesseraAnalyzer.analyze(transcript);

    TesseraEngine.setAnalyzing(false);

    if (result && result.textures) {
      TesseraEngine.setTextures(result.textures, result.confidence || 0.5);
      console.log('[Tessera] Textures updated:', result.textures);
    }
  }

  // ---- Heart Memory Detection ----
  function checkHeartMemory() {
    const silenceDuration = Date.now() - lastMessageTimestamp;
    if (silenceDuration > 60000 && engineReady) {
      TesseraEngine.triggerEvent('heartMemory');
    }
    lastMessageTimestamp = Date.now();
  }

  // ---- Mutation Observer ----
  let lastVisibleCount = 0;

  function onDomChange() {
    const turns = document.querySelectorAll('[data-testid="human-turn"], [data-testid="ai-turn"]');
    const count = turns.length;

    if (count !== lastVisibleCount) {
      const isNewMessage = count > lastVisibleCount;
      lastVisibleCount = count;

      // Always accumulate into buffer
      scanAndAccumulate();

      if (isNewMessage) {
        checkHeartMemory();

        // Debounce for streaming — wait for response to finish
        if (streamingTimeout) clearTimeout(streamingTimeout);
        streamingTimeout = setTimeout(() => {
          // Re-scan to catch final streamed content
          scanAndAccumulate();
          triggerAnalysis();
        }, STREAMING_DEBOUNCE);
      }
    }
  }

  const observer = new MutationObserver(() => {
    onDomChange();
  });

  // Start observing
  function startObserving() {
    const container = document.querySelector('[class*="conversation"]') ||
                      document.querySelector('main') ||
                      document.body;
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    console.log('[Tessera] Observing DOM changes');
  }
  startObserving();

  // ---- Periodic DOM Scan (catches scrolled-into-view messages) ----
  setInterval(() => {
    const prevSize = messageBuffer.length;
    scanAndAccumulate();
    if (messageBuffer.length > prevSize) {
      console.log('[Tessera] Scan found ' + (messageBuffer.length - prevSize) + ' new messages (total: ' + messageBuffer.length + ')');
    }
  }, SCAN_INTERVAL);

  // ---- URL Change Detection (SPA navigation) ----
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      console.log('[Tessera] Conversation changed — resetting buffer');
      // Reset buffer for new conversation
      messageBuffer = [];
      knownMessageHashes = new Set();
      lastBufferSnapshot = '';
      lastVisibleCount = 0;
      // Re-analyze new conversation after a short delay
      setTimeout(triggerAnalysis, 1500);
    }
  });
  urlObserver.observe(document.body, { childList: true, subtree: true });

  // ---- Periodic Analysis Safety Net ----
  setInterval(() => {
    scanAndAccumulate();
    if (messageBuffer.length > 0) {
      triggerAnalysis();
    }
  }, PERIODIC_INTERVAL);

  // ---- Initial Scan ----
  setTimeout(() => {
    scanAndAccumulate();
    console.log('[Tessera] Initial scan: ' + messageBuffer.length + ' messages found');
    if (messageBuffer.length > 0) {
      triggerAnalysis();
    }
  }, 2000);

  // ---- Diagnostic (run window.tesseraDiag() in DevTools console) ----
  window.tesseraDiag = function () {
    scanAndAccumulate();
    console.log('=== TESSERA DIAGNOSTIC ===');
    console.log('Engine ready:', engineReady);
    console.log('API key set:', !!apiKey, apiKey ? '(' + apiKey.substring(0, 8) + '...)' : '');
    console.log('Buffer messages:', messageBuffer.length);
    console.log('Last visible count:', lastVisibleCount);
    console.log('DOM turns found:', document.querySelectorAll('[data-testid="human-turn"], [data-testid="ai-turn"]').length);
    console.log('Fallback .prose found:', document.querySelectorAll('.prose').length);
    console.log('TesseraEngine exists:', !!window.TesseraEngine);
    console.log('THREE exists:', !!window.THREE);
    console.log('Panel element:', !!document.getElementById('tessera-panel'));
    console.log('Panel size:', panel.style.width || '(css default)', 'x', panel.style.height || '(css default)');
    if (messageBuffer.length > 0) {
      console.log('First message preview:', messageBuffer[0].text.substring(0, 100));
    }
    console.log('=========================');
    return 'Run window.tesseraForceAnalyze() to force an analysis';
  };

  window.tesseraForceAnalyze = async function () {
    scanAndAccumulate();
    const transcript = getBufferTranscript();
    console.log('[Tessera FORCE] Transcript length:', transcript.length);
    if (!transcript || transcript.length < 10) {
      console.log('[Tessera FORCE] No transcript to analyze');
      return;
    }
    if (!apiKey) {
      console.log('[Tessera FORCE] No API key');
      return;
    }
    lastBufferSnapshot = ''; // force re-analysis
    lastAnalysisTime = 0;
    await triggerAnalysis();
    console.log('[Tessera FORCE] Done');
  };

  console.log('[Tessera] Content script loaded. Run tesseraDiag() in console for diagnostics.');
})();
