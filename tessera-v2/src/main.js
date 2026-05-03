import { createApp } from './tessera-app.js';
console.log('[Tessera V2] main loaded');
function boot(){console.log('[Tessera V2] DOM ready');const hasTHREE=!!window.THREE;console.log(`[Tessera V2] THREE available: ${hasTHREE}${hasTHREE?` revision: ${window.THREE.REVISION}`:''}`);if(!hasTHREE){console.error('[Tessera V2] WebGL/THREE unavailable.');return;}createApp();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
