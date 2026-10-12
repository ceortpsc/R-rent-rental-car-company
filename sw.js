const CACHE='rrent-brand-shell-v1';
const SHELL=['/','/app','/assets/r-rent-brand-icon.svg','/assets/trailblazer-2026-concept.svg','/styles.css','/luxury-experience.css','/luxury-experience.js'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()).catch(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin||new URL(request.url).pathname.startsWith('/api/'))return;event.respondWith(fetch(request).catch(()=>caches.match(request).then(r=>r||Response.error())));});
