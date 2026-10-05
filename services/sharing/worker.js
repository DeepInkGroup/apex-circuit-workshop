// APEX public snapshot storage. No client secrets or accounts are required.
const EDITOR = 'https://deepinkgroup.github.io/apex-circuit-workshop/';
const MAX_BYTES = 3 * 1024 * 1024;
const origins = new Set(['https://deepinkgroup.github.io', 'http://localhost:5173', 'http://127.0.0.1:5173']);
const recent = new Map();
function code14() {
  let code = '';
  while (code.length < 14) for (const n of crypto.getRandomValues(new Uint8Array(20))) {
    if (n < 250 && code.length < 14) code += String(n % 10);
  }
  return code;
}
async function readLimited(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('A circuit is required.');
  const chunks = []; let size = 0;
  for (;;) {
    const {done, value} = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Circuit exceeds the 3 MB sharing limit.'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}
function validCircuit(t) {
  const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1000 && p.y >= 0 && p.y <= 740;
  if (!t || typeof t.name !== 'string' || t.name.length > 60 || !Array.isArray(t.points) || t.points.length < 2 || t.points.length > 150 || !t.points.every(point)) return false;
  for (const [key, limit] of [['pit',100],['trees',300],['buildings',60]]) if (t[key] != null && (!Array.isArray(t[key]) || t[key].length > limit || !t[key].every(point))) return false;
  if (t.barriers != null && (!Array.isArray(t.barriers) || t.barriers.length > 40 || !t.barriers.every(b => b && Array.isArray(b.points) && b.points.length <= 100 && b.points.every(point)))) return false;
  return true;
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url), origin = request.headers.get('Origin');
    const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
    if (origin && origins.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const reply = (data, status = 200) => new Response(JSON.stringify(data), {status, headers});
    if (origin && !origins.has(origin)) return reply({error:'This origin is not allowed.'},403);
    if (request.method === 'OPTIONS') return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'86400'}});
    if (url.pathname === '/' && request.method === 'GET') return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>APEX Circuit Sharing</title><style>body{font:18px system-ui;max-width:640px;margin:15vh auto;padding:24px;background:#f7f5ee;color:#263d33}a{color:#a5552d}</style><h1>APEX Circuit Sharing</h1><p>Share a circuit using its 14-digit code. Create and open codes in the APEX editor.</p><a href="'+EDITOR+'">Open APEX Circuit Workshop →</a></html>',{headers:{'Content-Type':'text/html; charset=utf-8'}});
    if (!env.BUCKET) return reply({error:'Sharing storage is unavailable. Please try again later.'},503);
    try {
      const match = url.pathname.match(/^\/api\/circuits\/(\d{14})$/);
      if (request.method === 'GET' && match) {
        const object = await env.BUCKET.get('circuits/' + match[1] + '.json');
        if (!object) return reply({error:'Code not found. Check all 14 digits with the sender.'},404);
        return new Response(await object.text(),{headers});
      }
      if (request.method === 'POST' && url.pathname === '/api/circuits') {
        if (!request.headers.get('Content-Type')?.startsWith('application/json')) return reply({error:'Use a circuit JSON snapshot.'},415);
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown', now = Date.now();
        if (recent.size > 5000) for (const [key,value] of recent) if (now-value.time > 60000) recent.delete(key);
        const usage = recent.get(ip); if (usage && now-usage.time < 60000 && usage.count >= 8) return reply({error:'Please wait a minute before creating more codes.'},429);
        recent.set(ip,{time:usage && now-usage.time < 60000?usage.time:now,count:usage && now-usage.time < 60000?usage.count+1:1});
        const input = await readLimited(request);
        if (!validCircuit(input.track) || JSON.stringify(input.track).length > 200000) return reply({error:'Invalid circuit snapshot. Draw at least two road points.'},400);
        if (input.image != null && (typeof input.image !== 'string' || input.image.length > 2800000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(input.image))) return reply({error:'Reference image is too large or unsupported.'},400);
        const t = input.track; delete t.id; delete t.updatedAt;
        if (t.background?.type === 'image' && !input.image) t.background = null;
        for (let attempt = 0; attempt < 6; attempt++) {
          const code = code14(), key = 'circuits/' + code + '.json';
          if (await env.BUCKET.head(key)) continue;
          const snapshot = {schema:1,code,createdAt:new Date().toISOString(),track:t,image:input.image || null};
          const saved = await env.BUCKET.put(key,JSON.stringify(snapshot),{onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});
          if (saved) return reply({code,createdAt:snapshot.createdAt},201);
        }
        return reply({error:'Could not reserve a code. Please try again.'},503);
      }
      return reply({error:'Route not found.'},404);
    } catch (error) {
      return reply({error:error instanceof SyntaxError?'Invalid circuit JSON.':error.message?.includes('sharing limit')?error.message:'Sharing could not finish. Please try again.'},error.message?.includes('sharing limit')?413:400);
    }
  }
};
