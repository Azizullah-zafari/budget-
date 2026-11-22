// بودجه‌یار — service worker
// HTML/JS/manifest: network-first (new versions arrive on their own); everything else: cache + background refresh.
const V='budgetyar-v5',
SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));
});

const fresh=(req,c)=>fetch(req).then(r=>{if(r&&(r.ok||r.type==='opaque'))c.put(req,r.clone());return r});

// try the network for up to 4s (the cache is refreshed when it finishes), then fall back to the cache
async function netFirst(req){
  const c=await caches.open(V),net=fresh(req,c);
  net.catch(()=>{});
  try{return await Promise.race([net,new Promise((_,no)=>setTimeout(no,4000))])}
  catch(e){return (await c.match(req,{ignoreSearch:true}))||(req.mode==='navigate'?await c.match('./index.html'):null)||Response.error()}
}

async function swr(req){
  const c=await caches.open(V),hit=await c.match(req),net=fresh(req,c).catch(()=>null);
  return hit||(await net)||Response.error();
}

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const u=new URL(r.url),
  core=u.origin===location.origin&&(r.mode==='navigate'||/\.(html|js|webmanifest)$/.test(u.pathname)||u.pathname.endsWith('/'));
  e.respondWith(core?netFirst(r):swr(r));
});
