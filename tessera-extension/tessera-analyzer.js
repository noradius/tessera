// ============================================================
// TESSERA — Texture Analyzer
// Routes analysis through background service worker to avoid CSP
// ============================================================

const TesseraAnalyzer = (function () {
  'use strict';

  let apiKey = '';
  let lastCallTime = 0;
  const MIN_INTERVAL = 5000;

  function setApiKey(key) {
    apiKey = key;
  }

  async function analyze(conversationText) {
    if (!apiKey) {
      console.warn('[Tessera] No API key set');
      return null;
    }

    // Rate limiting
    const now = Date.now();
    if (now - lastCallTime < MIN_INTERVAL) return null;
    lastCallTime = now;

    try {
      // Route through background service worker (avoids page CSP)
      const response = await chrome.runtime.sendMessage({
        type: 'tessera-analyze',
        apiKey: apiKey,
        conversationText: conversationText
      });

      if (response && response.success) {
        console.log('[Tessera] Analysis received from background worker');
        return response.data;
      } else {
        console.warn('[Tessera] Background worker error:', response?.error);
        return null;
      }
    } catch (e) {
      console.warn('[Tessera] Analysis failed:', e);
      return null;
    }
  }

  return { setApiKey, analyze };
})();
