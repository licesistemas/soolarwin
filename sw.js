const CACHE='representante-shell-v1';
const SHELL=['./representante.html','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('representante-shell-')&&k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;if(url.pathname.endsWith('/representante.html')){event.respondWith(fetch(req).then(response=>{if(response.ok){const clone=response.clone();caches.open(CACHE).then(c=>c.put(req,clone))}return response}).catch(()=>caches.match(req)));return;}if(SHELL.some(p=>url.pathname.endsWith(p.slice(1))))event.respondWith(caches.match(req).then(hit=>hit||fetch(req)));});
