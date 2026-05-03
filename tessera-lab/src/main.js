import {createApp} from './app.js';console.log('[Tessera Lab] main loaded');
function boot(){console.log('[Tessera Lab] DOM ready');const has=!!window.THREE;console.log(`[Tessera Lab] THREE available: ${has} revision: ${has?window.THREE.REVISION:'n/a'}`);createApp();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
