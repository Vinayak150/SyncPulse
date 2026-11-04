import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createSyncPulseHttpServer } from '../src/server/liveTelemetryServer.mjs';

const { server } = createSyncPulseHttpServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
let checks = 0;
async function request(path, cookie = '', options = {}) {
  const headers = { ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) };
  return fetch(base + path, { ...options, headers });
}
function pass(message) { checks++; console.log('✅', message); }
try {
  const a = await request('/');
  assert.equal(a.status, 200);
  assert.match(await a.text(), /SyncPulse11/);
  const cookieA = a.headers.get('set-cookie')?.split(';')[0];
  assert.match(cookieA, /^sp11_session=/);
  pass('Homepage serves application and issues isolated session cookie');

  const b = await request('/');
  const cookieB = b.headers.get('set-cookie')?.split(';')[0];
  assert.notEqual(cookieA, cookieB);
  pass('Independent visitors receive different session identifiers');

  for (const p of ['/.git/config', '/.git/HEAD', '/.gitignore', '/data/ipl_json.zip', '/package.json', '/README.md', '/api/index.mjs', '/src/server/liveTelemetryServer.mjs', '/src/live/providerHub.mjs', '/%2e%2e/%2e%2e/etc/passwd']) {
    const r = await request(p, cookieA);
    assert.ok(r.status === 403 || r.status === 404, `${p} leaked: ${r.status}`);
    pass(`Private resource blocked: ${p}`);
  }
  for (const p of ['/index.html', '/src/models/model_artifact_v2.json', '/src/models/networkGraphEngine.mjs', '/src/features/fanFocus.mjs', '/src/live/liveCenter.mjs', '/src/live/liveCenter.css']) {
    const r = await request(p, cookieA);
    assert.equal(r.status, 200, p);
    pass(`Allowlisted static resource works: ${p}`);
  }

  const css = await request('/src/live/liveCenter.css',cookieA);
  assert.ok(css.headers.get('content-type').includes('text/css'));
  pass('Live UI stylesheet served with CSS MIME type');
  const badSport = await request('/api/sports/matches?sport=invalid', cookieA);
  assert.equal(badSport.status,400);
  pass('Unsupported sport parameter blocked before provider fetch');
  const cricketStatus = await request('/api/sports/matches?sport=cricket', cookieA);
  assert.equal(cricketStatus.status,200);
  const cricketData = await cricketStatus.json();
  assert.ok(['CONFIG_REQUIRED','OK','UNAVAILABLE'].includes(cricketData.status));
  pass('Cricket source returns honest provider status');

  const malicious = await request('/api/live/reset', cookieA, { method: 'POST', headers: { Origin: 'https://attacker.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(malicious.status, 403);
  pass('Cross-origin mutation rejected');
  const wrongType = await request('/api/live/reset', cookieA, { method: 'POST', body: '{}' });
  assert.equal(wrongType.status, 415);
  pass('JSON content-type enforced');
  const huge = await request('/api/live/reset', cookieA, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({extra: 'z'.repeat(140000)}) });
  assert.equal(huge.status, 400);
  pass('Oversized JSON body rejected');

  const stateBeforeB = await (await request('/api/live/state', cookieB)).json();
  const result = await request('/api/live/delivery', cookieA, { method:'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ runsBat: 4, runsExtra: 0 }) });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).accepted, true);
  const stateA = await (await request('/api/live/state', cookieA)).json();
  const stateB = await (await request('/api/live/state', cookieB)).json();
  assert.notDeepEqual(stateA.terminalState, stateB.terminalState);
  assert.deepEqual(stateB.terminalState, stateBeforeB.terminalState);
  pass('Browser A delivery cannot mutate browser B state');

  const matches = await (await request('/api/live/matches', cookieA)).json();
  assert.match(matches.matches[0].status, /DEMO REPLAY/);
  pass('Historical example correctly labeled as demo replay');

  const health = await (await request('/api/health', cookieA)).json();
  assert.equal(health.grokEnvConfigured, false);
  assert.equal(health.modelEvaluationSource, 'SYNTHETIC_MATCH_SIMULATION');
  pass('Health endpoint discloses synthetic evaluation and disabled server key');

  console.log(`SECURITY HTTP: ${checks}/${checks} checks passed`);
} finally {
  for (const conn of server._connections ? [] : []) void conn;
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
}
