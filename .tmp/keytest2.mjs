import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')), l.slice(l.indexOf('=')+1)]));
const { GoogleGenAI, ThinkingLevel } = await import('@google/genai');
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
for (const [model, lvl] of [['gemini-3.8-flash', ThinkingLevel.LOW],['gemini-3.7-flash', ThinkingLevel.LOW],['gemini-3.6-flash', ThinkingLevel.MINIMAL],['gemini-flash-latest', undefined],['gemini-3.5-flash-lite', undefined]]) {
  const t = Date.now();
  try {
    const r = await ai.models.generateContent({ model, contents: 'Return JSON {"ok":true}', config: { responseMimeType: 'application/json', responseJsonSchema: { type:'object', properties:{ ok:{type:'boolean'} }, required:['ok'] }, ...(lvl? { thinkingConfig: { thinkingLevel: lvl } } : {}) } });
    console.log('GEMINI', model, 'OK', Date.now()-t+'ms', r.text);
  } catch (e) { console.log('GEMINI', model, 'ERR', e.status, String(e.message).slice(0,160)); }
}
// function calling + text on flash-lite
try {
  const t=Date.now();
  const r = await ai.models.generateContent({ model: 'gemini-3.5-flash-lite', contents: [{role:'user', parts:[{text:"I'm tired and don't know what to cook."}]}],
    config: { systemInstruction: 'You are Sous, a warm voice sous chef. Always say one or two short spoken sentences, and call a tool when it helps.', tools: [{ functionDeclarations: [{ name: 'open_fridge_camera', description: 'Open the camera so the user can photograph their fridge to detect ingredients.', parametersJsonSchema: { type: 'object', properties: {} } }] }] } });
  console.log('FC', Date.now()-t+'ms', 'text=', JSON.stringify(r.text), 'calls=', JSON.stringify(r.functionCalls));
} catch (e) { console.log('FC ERR', e.status, String(e.message).slice(0,300)); }
// ElevenLabs TTS probe
const t = Date.now();
const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL/stream?output_format=mp3_44100_128', { method:'POST', headers: {'xi-api-key': env.ELEVENLABS_API_KEY, 'Content-Type':'application/json', Accept:'audio/mpeg'}, body: JSON.stringify({ text: 'Hi!', model_id: 'eleven_flash_v2_5' }) });
const buf = Buffer.from(await res.arrayBuffer());
console.log('EL TTS', res.status, res.headers.get('content-type'), buf.length, 'bytes', Date.now()-t+'ms', 'cost', res.headers.get('character-cost'));
