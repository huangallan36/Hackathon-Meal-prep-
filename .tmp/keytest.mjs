import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')), l.slice(l.indexOf('=')+1)]));
const { GoogleGenAI } = await import('@google/genai');
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
// Gemini: list flash models
try {
  const pager = await ai.models.list({ config: { pageSize: 100 } });
  const names = [];
  for await (const m of pager) names.push(m.name);
  console.log('GEMINI models (flash/lite):', names.filter(n=>/flash|lite/.test(n)).join(', '));
} catch (e) { console.log('GEMINI list error:', e.status, String(e.message).slice(0,300)); }
for (const model of ['gemini-3.5-flash-lite','gemini-3.8-flash']) {
  const t = Date.now();
  try {
    const r = await ai.models.generateContent({ model, contents: 'Say hi in 3 words.' });
    console.log('GEMINI', model, 'OK', Date.now()-t+'ms', JSON.stringify(r.text));
  } catch (e) { console.log('GEMINI', model, 'ERR', e.status, String(e.message).slice(0,300)); }
}
// ElevenLabs
const xi = { 'xi-api-key': env.ELEVENLABS_API_KEY };
let r = await fetch('https://api.elevenlabs.io/v1/user/subscription', { headers: xi });
const sub = await r.json().catch(()=>null);
console.log('EL subscription', r.status, sub && JSON.stringify({tier: sub.tier, status: sub.status, used: sub.character_count, limit: sub.character_limit, detail: sub.detail}));
for (const vt of ['default','non-default']) {
  r = await fetch('https://api.elevenlabs.io/v2/voices?page_size=100&voice_type='+vt, { headers: xi });
  const j = await r.json().catch(()=>null);
  console.log('EL voices', vt, r.status, j?.voices ? j.voices.map(v=>`${v.name}|${v.voice_id}|${v.category}|${(v.available_for_tiers||[]).join('/')}`).join('\n  ') : JSON.stringify(j).slice(0,300));
}
