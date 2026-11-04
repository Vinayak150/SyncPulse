/**
 * SyncPulse11 V5.0 — Full-Stack Production Server:
 * Real-Time SSE Telemetry, Scorer Ingestion, Quant Inference API & Spoiler-Guarded xAI Grok Proxy
 * Module: src/server/liveTelemetryServer.mjs
 *
 * Capabilities:
 * 1. Serves the full SyncPulse11 V5.0 Multi-Engine Web Application over HTTP (`0.0.0.0:${PORT}`)
 * 2. Real-Time Server-Sent Events (SSE) Stream (`GET /api/live/stream`)
 * 3. Live Scorer / Webhook Ingestion (`POST /api/live/delivery`)
 * 4. Continuous Live Auto-Match Daemon (`POST /api/live/autostream`)
 * 5. Quantitative Inference Endpoint (`POST /api/quant/evaluate`)
 * 6. Spoiler-Guarded xAI Grok Co-Pilot Proxy (`POST /api/ai/grok` -> `https://api.x.ai/v1/chat/completions`)
 */

import http from 'node:http';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  formatOvers,
  getViewerSafeState
} from '../engine/cricketStateEngine.mjs';
import {
  MODEL_ARTIFACT,
  getConditionalDeliveryDist,
  createMulberry32,
  computeWinProbabilitySeries,
  runMonteCarloNextOver
} from '../models/winProbAndMonteCarlo.mjs';
import {
  generatePulseBrief
} from '../ai/pulseBriefEngine.mjs';
import {
  buildDynamicCricketNetwork
} from '../models/networkGraphEngine.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..', '..');

const INITIAL_LIVE_SCENARIO = {
  id: 'live_broadcast_stream',
  title: 'SIMULATED TELEMETRY: MUM vs CHE (Wankhede Demo Feed)',
  teams: { batting: 'MUM', bowling: 'CHE' },
  venue: 'Wankhede Stadium, Mumbai (Simulated Telemetry Channel)',
  initialState: {
    scoreRuns: 144,
    scoreWickets: 3,
    target: 196,
    legalBallsBowled: 90,
    striker: 'R. Jadeja',
    nonStriker: 'S. Dube',
    bowler: 'J. Bumrah',
    boundaryDroughtBalls: 7,
    freeHitActive: false,
    inningsStatus: 'IN_PROGRESS',
    fieldPreset: 'DEATH_YORKER_TRAP'
  },
  events: []
};

export const IND_VS_NZ_LIVE_SCENARIO = {
  id: 'ind_vs_nz_live',
  title: 'DEMO REPLAY: IND vs NZ (Illustrative Nov 4, 2026 score snapshot; not connected to live feed)',
  teams: { batting: 'IND', bowling: 'NZ' },
  venue: 'Eden Park, Auckland (1st ODI • NZ 185/10 in 40.2 ov • DLS Chase)',
  initialState: {
    scoreRuns: 112,
    scoreWickets: 2,
    target: 143,
    legalBallsBowled: 98, // 16.2 overs
    striker: 'V. Kohli',
    nonStriker: 'K.L. Rahul',
    bowler: 'M. Santner',
    boundaryDroughtBalls: 3,
    freeHitActive: false,
    inningsStatus: 'IN_PROGRESS',
    fieldPreset: 'SPIN_SQUEEZE'
  },
  events: [
    {
      id: 'indnz_ev_1',
      seq: 1,
      extraType: null,
      runsBat: 2,
      runsExtra: 0,
      isWicket: false,
      bowler: 'M. Santner',
      receiptTimestampMs: 1730691010000,
      tacticalNote: {
        bowlerPlan: 'Flatter arm-ball sliding into middle and leg after rain stoppage (NZ burned review earlier for LBW)',
        batterResponse: 'Virat Kohli clips neatly off the pads into the deep midwicket pocket for a brisk brace (moves to 47* off 35)',
        fieldPreset: 'SPIN_SQUEEZE'
      }
    },
    {
      id: 'indnz_ev_2',
      seq: 2,
      extraType: null,
      runsBat: 4,
      runsExtra: 0,
      isWicket: false,
      bowler: 'M. Santner',
      receiptTimestampMs: 1730691045000,
      tacticalNote: {
        bowlerPlan: 'Tossed up outside off with short extra cover in place',
        batterResponse: 'FOUR! Virat Kohli leans into a classic inside-out cover drive to reach his 80th fifty (51* off 36 balls, 8x4, 1x6)!',
        fieldPreset: 'SPIN_SQUEEZE'
      }
    },
    {
      id: 'indnz_ev_3',
      seq: 3,
      extraType: null,
      runsBat: 1,
      runsExtra: 0,
      isWicket: false,
      bowler: 'M. Santner',
      receiptTimestampMs: 1730691080000,
      tacticalNote: {
        bowlerPlan: 'Speared in on off-stump at 91 kph',
        batterResponse: 'Pushed calmly to long-off for a single to retain strike rotation (IND 119/2 in 16.5 ov)',
        fieldPreset: 'SPIN_SQUEEZE'
      }
    },
    {
      id: 'indnz_ev_4',
      seq: 4,
      extraType: null,
      runsBat: 4,
      runsExtra: 0,
      isWicket: false,
      bowler: 'M. Santner',
      nextBowler: 'M. Henry',
      receiptTimestampMs: 1730691115000,
      tacticalNote: {
        bowlerPlan: 'Final ball of 17th over drifted onto the pads',
        batterResponse: 'K.L. Rahul sweeps fine past short fine leg for FOUR! End of 17.0 overs (IND 123/2, need 20 off 18)',
        fieldPreset: 'SPIN_SQUEEZE'
      }
    },
    {
      id: 'indnz_ev_5',
      seq: 5,
      extraType: null,
      runsBat: 6,
      runsExtra: 0,
      isWicket: false,
      bowler: 'M. Henry',
      receiptTimestampMs: 1730691150000,
      tacticalNote: {
        bowlerPlan: '139 kph back-of-a-length seam delivery at Eden Park short straight boundary',
        batterResponse: 'MAXIMUM! Virat Kohli picks the length early and lofts straight down the ground for a 88m SIX!',
        fieldPreset: 'DEATH_YORKER_TRAP'
      }
    }
  ]
};

const BOWLER_ROSTER = ['M. Santner', 'M. Henry', "W. O'Rourke", 'J. Bumrah', 'H. Pandya', 'T. Boult', 'R. Khan', 'A. Singh'];
const BATTER_QUEUE = ['S. Iyer', 'H. Pandya', 'R. Jadeja', 'M.S. Dhoni', 'R. Singh', 'A. Russell', 'R. Patidar', 'S. Gill', 'V. Kohli'];
const TACTICAL_PLANS = {
  dot: { bowlerPlan: '144 kph blockhole yorker on middle stump', batterResponse: 'Jammed out back to bowler; no run', fieldPreset: 'DEATH_YORKER_TRAP' },
  '1': { bowlerPlan: 'Hard length into body cramping room', batterResponse: 'Tucked off hips to deep midwicket for 1', fieldPreset: 'DEATH_YORKER_TRAP' },
  '2': { bowlerPlan: 'Slower cutter into the pitch outside off', batterResponse: 'Sliced into wide long-off pocket for a hard-run 2', fieldPreset: 'SLOWER_TRAP' },
  '4': { bowlerPlan: 'Missed yorker length outside off', batterResponse: 'Carved fiercely past backward point for FOUR', fieldPreset: 'BOUNDARY_DEFENSE_RING' },
  '6': { bowlerPlan: 'Slot delivery hunted in the arc', batterResponse: 'Launched 92m over cow corner for a flat SIX', fieldPreset: 'BOUNDARY_DEFENSE_RING' },
  W: { bowlerPlan: '119 kph dipping slower leg-cutter', batterResponse: 'Miscued high off the toe end to long-on — OUT!', fieldPreset: 'SLOWER_TRAP' },
  wide: { bowlerPlan: 'Wide yorker pushed beyond tramline', batterResponse: 'Left alone by striker; umpire signals Wide', fieldPreset: 'DEATH_YORKER_TRAP' },
  no_ball: { bowlerPlan: 'High-effort bouncer overstepping front crease', batterResponse: 'Front-foot No-Ball called — FREE HIT next ball!', fieldPreset: 'DEATH_YORKER_TRAP' }
};

export function createLiveTelemetrySession() {
  let liveScenario = structuredClone(INITIAL_LIVE_SCENARIO);
  let activityFeed = [
    {
      activityId: 'act_boot',
      timestampIso: new Date().toISOString(),
      type: 'SYSTEM_READY',
      summary: 'Live Telemetry Hub initialized at 15.0 overs (144/3 chasing 196).'
    }
  ];
  let prng = createMulberry32(20261104);
  let autoStreamTimer = null;

  function computeCurrentTerminalState() {
    return getViewerSafeState(liveScenario, liveScenario.events.length);
  }

  function recordActivity(type, summary, eventSeq = null) {
    const entry = {
      activityId: 'act_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
      timestampIso: new Date().toISOString(),
      type,
      eventSeq,
      summary
    };
    activityFeed.unshift(entry);
    if (activityFeed.length > 50) activityFeed.pop();
    return entry;
  }

  function ingestLiveDelivery(payload = {}) {
    const curState = computeCurrentTerminalState();
    if (curState.inningsStatus !== 'IN_PROGRESS') {
      return {
        accepted: false,
        reason: `Innings already terminated (${curState.inningsStatus}). Reset live match to push new deliveries.`,
        scenario: liveScenario,
        terminalState: curState
      };
    }

    const nextSeq = liveScenario.events.length + 1;
    const extraType = payload.extraType || null;
    const isWicket = Boolean(payload.isWicket);
    const runsBat = Number.isInteger(payload.runsBat) ? payload.runsBat : 0;
    const runsExtra = Number.isInteger(payload.runsExtra) ? payload.runsExtra : (extraType === 'wide' || extraType === 'no_ball' ? 1 : 0);
    const dismissalMode = payload.dismissalMode || (isWicket ? 'caught' : null);

    const usedBatters = new Set([curState.striker, curState.nonStriker]);
    for (const ev of liveScenario.events) {
      if (ev.newBatter) usedBatters.add(ev.newBatter);
    }
    const nextBatterFromQueue = BATTER_QUEUE.find((b) => !usedBatters.has(b)) || `Batter #${curState.scoreWickets + 3}`;

    const isLegal = extraType !== 'wide' && extraType !== 'no_ball';
    const nextLegalBalls = curState.legalBallsBowled + (isLegal ? 1 : 0);
    const overEnding = isLegal && nextLegalBalls % 6 === 0;
    const nextBowler = overEnding
      ? BOWLER_ROSTER[(Math.floor(nextLegalBalls / 6)) % BOWLER_ROSTER.length]
      : curState.bowler;

    const outcomeKey = isWicket ? 'W' : extraType ? extraType : String(runsBat);
    const defaultNote = TACTICAL_PLANS[outcomeKey] || TACTICAL_PLANS.dot;

    const newEvent = {
      id: `live_ev_${nextSeq}`,
      seq: nextSeq,
      extraType,
      runsBat,
      runsExtra,
      isWicket,
      dismissalMode,
      dismissalText: isWicket ? (payload.dismissalText || `c Long-On b ${curState.bowler} (Tactical Slower Ball)`) : '',
      newBatter: isWicket ? (payload.newBatter || nextBatterFromQueue) : undefined,
      bowler: payload.bowler || curState.bowler,
      nextBowler: payload.nextBowler || (overEnding ? nextBowler : undefined),
      receiptTimestampMs: payload.receiptTimestampMs || Date.now(),
      tacticalNote: {
        bowlerPlan: payload.bowlerPlan || defaultNote.bowlerPlan,
        batterResponse: payload.batterResponse || defaultNote.batterResponse,
        fieldPreset: payload.fieldPreset || defaultNote.fieldPreset
      }
    };

    liveScenario.events.push(newEvent);
    const updatedState = computeCurrentTerminalState();
    const latestVis = updatedState.latestEvent;

    const desc = isWicket
      ? `WICKET at ${latestVis.overBallLabel}! ${newEvent.bowler} dismisses ${curState.striker} (${updatedState.scoreRuns}/${updatedState.scoreWickets})`
      : extraType
      ? `EXTRA (${extraType.toUpperCase()}) at ${latestVis.overBallLabel} by ${newEvent.bowler} (+${runsBat + runsExtra} run${updatedState.freeHitActive ? ', FREE HIT ACTIVE' : ''})`
      : `BALL ${latestVis.overBallLabel}: ${newEvent.bowler} to ${curState.striker} — ${runsBat} run(s) (${updatedState.scoreRuns}/${updatedState.scoreWickets})`;

    const act = recordActivity('SIMULATED_DELIVERY_INGESTED', desc, nextSeq);

    return {
      accepted: true,
      event: newEvent,
      activity: act,
      scenario: liveScenario,
      terminalState: updatedState
    };
  }

  function stepAutonomousCricsheetDelivery() {
    const curState = computeCurrentTerminalState();
    if (curState.inningsStatus !== 'IN_PROGRESS') {
      return { accepted: false, reason: 'Innings complete', scenario: liveScenario, terminalState: curState };
    }
    const dist = getConditionalDeliveryDist(curState.legalBallsBowled, curState.scoreWickets, Boolean(curState.freeHitActive));
    const u = prng();
    let acc = 0;
    let chosen = 'dot';
    for (const item of dist) {
      acc += item.p;
      if (u <= acc) {
        chosen = item.type;
        break;
      }
    }

    if (chosen === 'wide') return ingestLiveDelivery({ extraType: 'wide', runsBat: 0, runsExtra: 1 });
    if (chosen === 'no_ball') return ingestLiveDelivery({ extraType: 'no_ball', runsBat: 0, runsExtra: 1 });
    if (chosen === 'W') {
      if (curState.freeHitActive) {
        return ingestLiveDelivery({ extraType: null, runsBat: 0, runsExtra: 0, isWicket: false, bowlerPlan: 'Play & miss on Free Hit (Bowled/Caught barred)' });
      }
      return ingestLiveDelivery({ extraType: null, runsBat: 0, runsExtra: 0, isWicket: true });
    }
    const rBat = chosen === 'dot' ? 0 : parseInt(chosen, 10) || 0;
    return ingestLiveDelivery({ extraType: null, runsBat: rBat, runsExtra: 0, isWicket: false });
  }

  function resetLiveMatch(customInit = null) {
    liveScenario = structuredClone(customInit || INITIAL_LIVE_SCENARIO);
    activityFeed = [];
    recordActivity('MATCH_RESET', `Live telemetry reset to ${formatOvers(liveScenario.initialState.legalBallsBowled)} overs (${liveScenario.initialState.scoreRuns}/${liveScenario.initialState.scoreWickets}).`, 0);
    return {
      scenario: liveScenario,
      terminalState: computeCurrentTerminalState(),
      activityFeed
    };
  }

  return {
    getScenario: () => liveScenario,
    getActivityFeed: () => activityFeed,
    getTerminalState: computeCurrentTerminalState,
    ingestLiveDelivery,
    stepAutonomousCricsheetDelivery,
    resetLiveMatch,
    setAutoStreamTimer: (t) => { autoStreamTimer = t; },
    getAutoStreamTimer: () => autoStreamTimer
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    let failed = false;
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > 128 * 1024) {
        if (!failed) reject(new Error('Request body too large'));
        failed = true;
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (failed) return;
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export function createSyncPulseHttpServer() {
  // Each browser owns an independent, ephemeral demo session.
  // No anonymous visitor can change another browser's match or see its SSE packets.
  const sessions = new Map();
  const sseClients = new Map(); // ServerResponse -> session id
  const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
  const MAX_SESSIONS = 500;
  const PUBLIC_ASSETS = new Set([
    '/', '/index.html',
    '/src/ai/pulseBriefEngine.mjs',
    '/src/engine/cricketStateEngine.mjs',
    '/src/models/networkGraphEngine.mjs',
    '/src/models/winProbAndMonteCarlo.mjs',
    '/src/models/model_artifact_v2.json'
  ]);

  function getSession(req, res) {
    const cookie = String(req.headers.cookie || '').match(/(?:^|;\s*)sp11_session=([a-f0-9-]{36})(?:;|$)/);
    let id = cookie?.[1];
    if (!id || !sessions.has(id)) {
      const now = Date.now();
      for (const [key, value] of sessions) {
        if (now - value.lastSeen > SESSION_TTL_MS && ![...sseClients.values()].includes(key)) {
          if (value.session.getAutoStreamTimer()) clearInterval(value.session.getAutoStreamTimer());
          sessions.delete(key);
        }
      }
      if (sessions.size >= MAX_SESSIONS) return null;
      id = randomUUID();
      sessions.set(id, { session: createLiveTelemetrySession(), lastSeen: now, windowStart: now, posts: 0, aiCalls: 0 });
      const secure = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
      res.setHeader('Set-Cookie', `sp11_session=${id}; Path=/; HttpOnly; SameSite=Strict; Max-Age=7200${secure}`);
    }
    const state = sessions.get(id);
    state.lastSeen = Date.now();
    return { id, state, session: state.session };
  }

  function broadcastSse(sessionId, eventType, dataObj) {
    const frame = `event: ${eventType}\ndata: ${JSON.stringify(dataObj)}\n\n`;
    for (const [res, recipientId] of sseClients) {
      if (recipientId !== sessionId) continue;
      try { res.write(frame); }
      catch (_e) { sseClients.delete(res); }
    }
  }

  const server = http.createServer(async (req, res) => {
    const urlObj = new URL(req.url || '/', 'http://127.0.0.1');
    const pathname = urlObj.pathname;
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cache-Control', 'no-store');

    // No wildcard CORS: mutations are same-origin only.
    const origin = req.headers.origin;
    if (origin) {
      let allowed = false;
      try { allowed = new URL(origin).host === req.headers.host; } catch (_) {}
      if (!allowed) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Cross-origin requests are not permitted' }));
        return;
      }
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    const current = getSession(req, res);
    if (!current) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Demo session capacity reached' }));
      return;
    }
    const { id: sessionId, state: clientState, session } = current;
    if (req.method === 'POST') {
      const now = Date.now();
      if (now - clientState.windowStart > 60000) {
        clientState.windowStart = now;
        clientState.posts = 0;
        clientState.aiCalls = 0;
      }
      clientState.posts++;
      if (pathname === '/api/ai/grok') clientState.aiCalls++;
      if (clientState.posts > 100 || clientState.aiCalls > 5) {
        res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
        res.end(JSON.stringify({ error: 'Demo request rate limit reached' }));
        return;
      }
      if (!String(req.headers['content-type'] || '').toLowerCase().includes('application/json')) {
        res.writeHead(415, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Expected application/json' }));
        return;
      }
    }

    // 0. Health & Model Metadata Endpoint
    if (pathname === '/api/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        service: 'SyncPulse11 V5.5 Full-Stack AI Cricket Co-Pilot',
        modelId: MODEL_ARTIFACT.modelId,
        heldOutMetrics: MODEL_ARTIFACT.heldOutMetrics,
        connectedSseClients: sseClients.size,
        grokEnvConfigured: false,
        modelEvaluationSource: 'SYNTHETIC_MATCH_SIMULATION',
        demoMode: true
      }));
      return;
    }

    // 1. SSE Real-Time Stream Endpoint
    if (pathname === '/api/live/stream' && req.method === 'GET') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      res.write(`event: snapshot\ndata: ${JSON.stringify({
        scenario: session.getScenario(),
        terminalState: session.getTerminalState(),
        activityFeed: session.getActivityFeed(),
        connectedClients: sseClients.size + 1
      })}\n\n`);
      sseClients.set(res, sessionId);
      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    // 2. Current Live State & Activity Log Snapshot
    if (pathname === '/api/live/state' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        scenario: session.getScenario(),
        terminalState: session.getTerminalState(),
        activityFeed: session.getActivityFeed(),
        autoStreaming: Boolean(session.getAutoStreamTimer()),
        connectedClients: sseClients.size
      }));
      return;
    }

    // 3. Push Live Delivery (Scorer Console / Webhook / Step Autonomous)
    if (pathname === '/api/live/delivery' && req.method === 'POST') {
      try {
        const payload = await readJsonBody(req);
        const outcome = payload.mode === 'AUTO_CRICSHEET'
          ? session.stepAutonomousCricsheetDelivery()
          : session.ingestLiveDelivery(payload);
        broadcastSse(sessionId, 'delivery', {
          outcome,
          scenario: session.getScenario(),
          terminalState: session.getTerminalState(),
          activityFeed: session.getActivityFeed()
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(outcome));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // 4. Toggle Continuous Autonomous Live Match Stream on Server
    if (pathname === '/api/live/autostream' && req.method === 'POST') {
      try {
        const payload = await readJsonBody(req);
        const existing = session.getAutoStreamTimer();
        if (existing) {
          clearInterval(existing);
          session.setAutoStreamTimer(null);
        }
        if (payload.enable) {
          const intervalMs = Math.max(800, Math.min(10000, Number(payload.intervalMs) || 2500));
          const timer = setInterval(() => {
            const out = session.stepAutonomousCricsheetDelivery();
            broadcastSse(sessionId, 'delivery', {
              outcome: out,
              scenario: session.getScenario(),
              terminalState: session.getTerminalState(),
              activityFeed: session.getActivityFeed()
            });
            if (!out.accepted) {
              clearInterval(timer);
              session.setAutoStreamTimer(null);
            }
          }, intervalMs);
          session.setAutoStreamTimer(timer);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ autoStreaming: Boolean(session.getAutoStreamTimer()) }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // 5. Reset Live Match (or Switch to Featured Live Match: IND vs NZ)
    if (pathname === '/api/live/reset' && req.method === 'POST') {
      const existing = session.getAutoStreamTimer();
      if (existing) {
        clearInterval(existing);
        session.setAutoStreamTimer(null);
      }
      let payload = {};
      try { payload = await readJsonBody(req); }
      catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      const targetTemplate = payload.matchId === 'ind_vs_nz_live' ? IND_VS_NZ_LIVE_SCENARIO : INITIAL_LIVE_SCENARIO;
      const snap = session.resetLiveMatch(targetTemplate);
      broadcastSse(sessionId, 'reset', snap);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(snap));
      return;
    }

    // 5b. Live Match Discovery & Instant Switch (/api/live/matches)
    if (pathname === '/api/live/matches' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        featuredLiveMatch: 'ind_vs_nz_live',
        matches: [
          {
            id: 'ind_vs_nz_live',
            label: '🇮🇳 IND vs 🇳🇿 NZ — Illustrative 2026 Replay (Not Live)',
            status: 'DEMO REPLAY • Unverified score example • Not a live provider feed',
            scenario: IND_VS_NZ_LIVE_SCENARIO
          },
          {
            id: 'live_broadcast_stream',
            label: '📡 MUM vs CHE — Simulated Wankhede Death-Over Feed',
            status: 'LIVE SIM • MUM 144/3 (15.0 ov) chasing 196',
            scenario: INITIAL_LIVE_SCENARIO
          }
        ]
      }));
      return;
    }

    // 6. Backend Quantitative Inference API (/api/quant/evaluate)
    if (pathname === '/api/quant/evaluate' && req.method === 'POST') {
      try {
        const payload = await readJsonBody(req);
        const safeState = payload.viewerSafeState || session.getTerminalState();
        const initialState = payload.initialState || session.getScenario().initialState;
        const wpSeries = computeWinProbabilitySeries(safeState, initialState);
        const mcResult = runMonteCarloNextOver(safeState, Number(payload.rollouts) || 1000);
        const networkGraph = buildDynamicCricketNetwork(safeState, payload.graphMode || 'MARKOV_STATE_FLOW');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          modelId: MODEL_ARTIFACT.modelId,
          viewerVisibleThrough: safeState.viewerVisibleThrough || safeState.oversFormatted,
          winProbability: wpSeries,
          monteCarlo: mcResult,
          networkGraph
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // 7. Spoiler-Guarded xAI Grok Co-Pilot API Proxy (/api/ai/grok)
    if (pathname === '/api/ai/grok' && req.method === 'POST') {
      try {
        const payload = await readJsonBody(req);
        const apiKey = (payload.apiKey || '').trim(); // Never spend a server-wide paid key on anonymous public traffic.
        const model = payload.model || 'grok-3-mini';
        const briefMode = payload.briefMode || 'JUST_JOINED';
        const persona = payload.persona || 'ANALYST';
        const userQuestion = (payload.userQuestion || '').trim();
        const rawSafeState = payload.viewerSafeState || session.getTerminalState();

        // Strict Server-Side Spoiler Noninterference Sanitization:
        // Only pass fields from viewerSafeState up to viewerVisibleThrough
        const sanitizedEvidence = {
          teams: rawSafeState.teams,
          venue: rawSafeState.venue,
          phase: rawSafeState.phase,
          score: `${rawSafeState.scoreRuns}/${rawSafeState.scoreWickets}`,
          oversVisible: rawSafeState.oversFormatted,
          target: rawSafeState.target,
          runsRequired: rawSafeState.runsRequired,
          legalBallsRemaining: rawSafeState.legalBallsRemaining,
          currentRunRate: rawSafeState.currentRunRate,
          requiredRunRate: rawSafeState.requiredRunRate,
          striker: rawSafeState.striker,
          nonStriker: rawSafeState.nonStriker,
          bowler: rawSafeState.bowler,
          boundaryDroughtBalls: rawSafeState.boundaryDroughtBalls,
          freeHitActive: rawSafeState.freeHitActive,
          visibleEvents: Array.isArray(rawSafeState.visibleEvents)
            ? rawSafeState.visibleEvents.slice(-6).map((e) => ({
                id: e.id,
                overBallLabel: e.overBallLabel,
                bowler: e.bowler,
                strikerAfter: e.strikerAfter,
                runsTotal: e.runsTotal,
                isWicket: e.isWicket,
                extraType: e.extraType,
                tacticalNote: e.tacticalNote
              }))
            : []
        };

        const deterministicBrief = generatePulseBrief(rawSafeState, briefMode, persona);

        if (!apiKey) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            provider: 'OFFLINE_GROUNDED_FALLBACK',
            model: 'deterministic-evidence-engine',
            viewerVisibleThrough: rawSafeState.oversFormatted,
            insights: deterministicBrief.insights,
            copilotAnswer: userQuestion
              ? `[Deterministic Grounded Co-Pilot • Visible ≤ ${rawSafeState.oversFormatted} ov]: At ${sanitizedEvidence.score} (${sanitizedEvidence.oversVisible} ov), ${sanitizedEvidence.teams?.batting || 'Chasing team'} need ${sanitizedEvidence.runsRequired} runs from ${sanitizedEvidence.legalBallsRemaining} legal balls (RRR ${sanitizedEvidence.requiredRunRate}). ${deterministicBrief.insights[0]?.claim || ''}`
              : null
          }));
          return;
        }

        const systemPrompt = [
          'You are SyncPulse11 Grok Co-Pilot, an elite real-time T20 cricket tactical analyst.',
          'CRITICAL SPOILER-SAFETY INVARIANT: You must ONLY use facts present in the provided sanitized ViewerSafeState JSON (visible up to ' + sanitizedEvidence.oversVisible + ' overs).',
          'Never invent or speculate about unrevealed future deliveries beyond ' + sanitizedEvidence.oversVisible + ' overs.',
          'Adapt your tone to persona: ' + persona + ' (ANALYST = sharp dugout analytics; HINGLISH = high-energy Indian cricket broadcast Hinglish; SILENT = ultra-concise bullet cards).'
        ].join(' ');

        const userPrompt = userQuestion
          ? `User Tactical Question: "${userQuestion}"\n\nSanitized ViewerSafeState (Visible <= ${sanitizedEvidence.oversVisible} ov):\n${JSON.stringify(sanitizedEvidence)}\n\nBase Grounded Insights:\n${JSON.stringify(deterministicBrief.insights)}\n\nReturn a JSON object with keys: "copilotAnswer" (a crisp 2-3 sentence tactical answer grounded strictly in the visible state) and "insights" (an array of 3 strings rewriting the 3 base insights in persona "${persona}").`
          : `Rewrite these 3 grounded cricket insights in persona "${persona}" using ONLY the sanitized ViewerSafeState (Visible <= ${sanitizedEvidence.oversVisible} ov):\n${JSON.stringify(sanitizedEvidence)}\n\nBase Insights:\n${JSON.stringify(deterministicBrief.insights)}\n\nReturn a JSON object with keys: "insights" (array of 3 rewritten strings) and "copilotAnswer" (1-sentence tactical summary).`;

        const grokResp = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            temperature: 0.25,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]
          })
        });

        if (!grokResp.ok) {
          const errText = await grokResp.text();
          throw new Error(`xAI Grok API HTTP ${grokResp.status}: ${errText.slice(0, 180)}`);
        }

        const grokJson = await grokResp.json();
        const rawContent = grokJson?.choices?.[0]?.message?.content || '';
        let parsedObj = null;
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { parsedObj = JSON.parse(jsonMatch[0]); } catch (_e) {}
        }

        const rewrittenArr = Array.isArray(parsedObj?.insights) ? parsedObj.insights : null;
        const finalInsights = deterministicBrief.insights.map((orig, idx) => ({
          ...orig,
          claim: (rewrittenArr && rewrittenArr[idx]) ? String(rewrittenArr[idx]) : orig.claim
        }));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          provider: 'XAI_GROK_LIVE',
          model,
          viewerVisibleThrough: rawSafeState.oversFormatted,
          insights: finalInsights,
          copilotAnswer: parsedObj?.copilotAnswer || rawContent.trim()
        }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          provider: 'OFFLINE_GROUNDED_FALLBACK',
          error: err.message,
          copilotAnswer: null,
          insights: null
        }));
      }
      return;
    }

    // 8. Serve Static Files (index.html, src/*, etc.)
    const relPath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const safePath = path.resolve(ROOT_DIR, relPath);
    if (!PUBLIC_ASSETS.has(pathname) || !fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(safePath);
    const mime = ext === '.html' ? 'text/html; charset=utf-8' : ext === '.mjs' || ext === '.js' ? 'application/javascript; charset=utf-8' : ext === '.json' ? 'application/json; charset=utf-8' : 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(fs.readFileSync(safePath));
  });

  return { server, get session() { return sessions.values().next().value?.session || null; } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const port = Number(process.env.PORT) || 4111;
  const host = process.env.HOST || '0.0.0.0';
  const { server } = createSyncPulseHttpServer();
  server.listen(port, host, () => {
    console.log('========================================================================');
    console.log(`⚡ SYNCPULSE11 V5.5 HARDENED DEMO SERVER RUNNING ON http://localhost:${port}`);
    console.log(`📡 SSE Live Stream:  http://localhost:${port}/api/live/stream`);
    console.log(`🤖 xAI Grok Proxy:   POST http://localhost:${port}/api/ai/grok`);
    console.log(`📈 Quant Engine API: POST http://localhost:${port}/api/quant/evaluate`);
    console.log('========================================================================');
  });
}
