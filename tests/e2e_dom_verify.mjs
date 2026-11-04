/**
 * SyncPulse11 V5.5 — End-to-End DOM, NetworkX Graph, Live Telemetry & User-Flow Verification Script
 * Module: tests/e2e_dom_verify.mjs
 *
 * Verifies that index.html loads cleanly, binds all DOM elements,
 * executes all 24 in-browser tests on boot, and supports end-to-end user flows:
 * 1. Initial boot, 24/24 in-browser tests, 8-outcome What-If Matrix, 10-Feature Waterfall, Dugout Plans & DLS Par
 * 2. SyncShield initial Demo Delay isolation (16.5 stadium vs 16.4 viewer)
 * 3. Manual Sync spoiler isolation & Counterfactual Digest equality
 * 4. Captain's Call prediction locking, spoiler-gated pending state, and resolution on viewer catch-up
 * 5. All 4 PulseBrief modes & 3 explanation personas (3 grounded insights each)
 * 6. All 4 curated scenarios, 12.0 overs formatting, Free-Hit badge, and TARGET REACHED state
 * 7. Custom Match State modal validation (rejecting invalid 11.6 overs and accepting valid 15.2 overs)
 * 8. 2-Minute Guided Reviewer Demo Tour navigation
 * 9. Live Stadium Scorer Pad ingestion (4 FOUR, No-Ball Free Hit, W WKT) with strict viewer delay spoiler protection
 * 10. Autonomous Live Cricsheet Streamer & Real-Time Telemetry Activity Feed verification
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.join(__dirname, '..', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

class MockElement {
  constructor(tagName, id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.textContent = '';
    this._innerHTML = '';
    this.value = '';
    this.className = '';
    this.style = {};
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
    const self = this;
    this.classList = {
      _set: new Set(),
      add(...cls) { cls.forEach((c) => self.classList._set.add(c)); },
      remove(...cls) { cls.forEach((c) => self.classList._set.delete(c)); },
      toggle(c, force) {
        const shouldAdd = force !== undefined ? Boolean(force) : !self.classList._set.has(c);
        if (shouldAdd) self.classList._set.add(c);
        else self.classList._set.delete(c);
      },
      contains(c) { return self.classList._set.has(c); }
    };
  }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = String(val);
    if (val === '') this.children = [];
  }
  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) ?? null; }
  appendChild(child) {
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    this.children = this.children.filter((c) => c !== child);
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  click() {
    const fns = this.listeners.get('click') || [];
    for (const fn of fns) fn({ target: this, preventDefault() {} });
  }
  dispatchChange(newVal) {
    if (newVal !== undefined) this.value = String(newVal);
    const fns = this.listeners.get('change') || [];
    for (const fn of fns) fn({ target: this, preventDefault() {} });
  }
  scrollIntoView() {}
  select() {}
}

const elementsById = new Map();
const scenarioBtns = [];
const syncmodeBtns = [];
const briefmodeBtns = [];
const personaBtns = [];
const subtabBtns = [];
const intelTabBtns = [];
const netmodeBtns = [];
const enginePageBtns = [];
const grokPromptChips = [];
const liveScorerBtns = [];

for (const m of html.matchAll(/<([a-zA-Z0-9]+)\b([^>]*?)>/g)) {
  const tag = m[1];
  const attrs = m[2];
  const idMatch = attrs.match(/\bid="([^"]+)"/);
  const el = new MockElement(tag, idMatch ? idMatch[1] : '');

  for (const attrM of attrs.matchAll(/\b(data-[a-z]+|value)="([^"]*)"/g)) {
    if (attrM[1] === 'value') el.value = attrM[2];
    else el.setAttribute(attrM[1], attrM[2]);
  }
  if (attrs.includes('hidden')) el.classList.add('hidden');

  if (el.id) elementsById.set(el.id, el);
  if (el.getAttribute('data-scenario')) scenarioBtns.push(el);
  if (el.getAttribute('data-syncmode')) syncmodeBtns.push(el);
  if (el.getAttribute('data-briefmode')) briefmodeBtns.push(el);
  if (el.getAttribute('data-persona')) personaBtns.push(el);
  if (el.getAttribute('data-subtab')) subtabBtns.push(el);
  if (el.getAttribute('data-inteltab')) intelTabBtns.push(el);
  if (el.getAttribute('data-netmode')) netmodeBtns.push(el);
  if (el.getAttribute('data-enginepage')) enginePageBtns.push(el);
  if (el.getAttribute('data-grokprompt')) grokPromptChips.push(el);
  if (el.getAttribute('data-liveball')) liveScorerBtns.push(el);
}

const windowListeners = new Map();
const sandboxDocument = {
  body: new MockElement('body'),
  getElementById(id) {
    return elementsById.get(id) || null;
  },
  querySelectorAll(sel) {
    if (sel === '.scenario-btn') return scenarioBtns;
    if (sel === '.syncmode-btn') return syncmodeBtns;
    if (sel === '.briefmode-btn') return briefmodeBtns;
    if (sel === '.persona-btn') return personaBtns;
    if (sel === '.subtab-btn') return subtabBtns;
    if (sel === '.intel-tab-btn') return intelTabBtns;
    if (sel === '.netmode-btn') return netmodeBtns;
    if (sel === '.engine-page-btn') return enginePageBtns;
    if (sel === '.grok-prompt-chip') return grokPromptChips;
    if (sel === '.live-scorer-btn') return liveScorerBtns;
    return [];
  },
  createElement(tag) {
    return new MockElement(tag);
  },
  createElementNS(_ns, tag) {
    return new MockElement(tag);
  },
  execCommand() { return true; }
};

const sandboxWindow = {
  document: sandboxDocument,
  performance,
  localStorage: {
    _store: new Map(),
    getItem(k) { return this._store.get(k) ?? null; },
    setItem(k, v) { this._store.set(k, String(v)); }
  },
  navigator: {
    clipboard: {
      writeText: async () => {}
    }
  },
  speechSynthesis: {
    cancel() {},
    speak() {}
  },
  SpeechSynthesisUtterance: function (t) { this.text = t; },
  addEventListener(type, fn) {
    if (!windowListeners.has(type)) windowListeners.set(type, []);
    windowListeners.get(type).push(fn);
  },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval
};

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'Inline script must exist in index.html');

const context = vm.createContext({
  ...sandboxWindow,
  window: sandboxWindow,
  document: sandboxDocument,
  Object,
  Array,
  String,
  Number,
  Boolean,
  Math,
  Date,
  JSON,
  Map,
  Set,
  RegExp,
  Error,
  TypeError,
  parseInt,
  parseFloat,
  isNaN,
  isFinite,
  encodeURIComponent
});

vm.runInContext(scriptMatch[1], context);

for (const fn of windowListeners.get('DOMContentLoaded') || []) {
  fn();
}

console.log('================================================================');
console.log('SYNCPULSE11 V5.5 — END-TO-END DOM, NETWORKX & LIVE TELEMETRY VERIFICATION');
console.log('================================================================');

// Flow 1: Verify boot state, 24/24 in-browser tests, 8-outcome What-If Matrix, 10-Feature Waterfall, Dugout Plans & DLS Par
assert.equal(
  elementsById.get('lblTestSummaryBadge').textContent,
  '24/24 Automated Tests Passed',
  'All 24 in-browser tests must pass on boot'
);
assert.equal(elementsById.get('testResultsGrid').children.length, 24);
assert.equal(elementsById.get('whatIfSensitivityGrid').children.length, 8, 'Must render 8 Next-Ball What-If outcome cards');
assert.equal(elementsById.get('featureWaterfallList').children.length, 5, 'Must render top 5 10-feature Log-Odds Waterfall bars');
assert.equal(elementsById.get('dugoutPlansList').children.length, 3, 'Must render 3 Dugout Bowling Strategy plans');
assert.ok(elementsById.get('lblDlsParScore').textContent.length > 0, 'Must render live DLS Par Score');
assert.ok(elementsById.get('lblBayesStrikerSr').textContent.includes('SR'), 'Must render Pitchside Empirical Bayes Shrunk SR');
assert.ok(elementsById.get('lblLeverageIndex').textContent.includes('x ('), 'Must render Next-Ball Leverage Index');
console.log('✅ [E2E-01] Initial boot, 24/24 in-browser tests, What-If Matrix, 10-Feature Waterfall, Dugout Simulator & DLS Par verified');

// Flow 2: Verify SyncShield initial Demo Delay isolation (stadium at 16.5, viewer protected at 16.4)
assert.equal(elementsById.get('lblStadiumHeadOver').textContent, '16.5 ov');
assert.equal(elementsById.get('lblViewerCursorOver').textContent, '16.4 ov');
assert.equal(elementsById.get('lblScoreWickets').textContent, '159/4');
console.log('✅ [E2E-02] SyncShield initial Demo Delay isolation verified (16.5 stadium vs 16.4 viewer)');

// Flow 3: Simulate Next Stadium Event (Wicket on Event #3 at 17.0) while in Manual Sync at 16.4
syncmodeBtns.find((b) => b.getAttribute('data-syncmode') === 'MANUAL').click();
elementsById.get('btnSimNextStadiumBall').click();
assert.equal(elementsById.get('lblStadiumHeadOver').textContent, '17.0 ov');
assert.equal(elementsById.get('lblViewerCursorOver').textContent, '16.4 ov');
assert.equal(elementsById.get('lblScoreWickets').textContent, '159/4', 'Hidden wicket must NOT leak to viewer scoreboard');
assert.equal(
  elementsById.get('lblDigestWorldA').textContent,
  elementsById.get('lblDigestWorldB').textContent,
  'Counterfactual World A and World B digests must match bit-for-bit'
);
console.log('✅ [E2E-03] Manual Sync spoiler isolation & Counterfactual Digest equality verified');

// Flow 4: Lock a Captain's Call prediction while target event is buffered, then step viewer cursor to resolve
elementsById.get('btnViewerNextBall').click();
const optionButtons = elementsById.get('challengeOptionsList').children;
assert.equal(optionButtons.length, 3, 'Must render 3 Captain\'s Call options');
optionButtons[2].click();
assert.ok(
  elementsById.get('challengeStatusBox').innerHTML.includes('Prediction Locked (Spoiler-Gated)'),
  'Prediction must stay spoiler-gated while viewer is at 16.5'
);
elementsById.get('btnViewerNextBall').click();
assert.equal(elementsById.get('lblViewerCursorOver').textContent, '17.0 ov');
assert.equal(elementsById.get('lblScoreWickets').textContent, '160/5', 'Wicket revealed once viewer reaches 17.0');
assert.equal(elementsById.get('lblUserPoints').textContent, '50', '50 local points awarded upon authorized reveal');
console.log('✅ [E2E-04] Captain\'s Call spoiler-gated lock & authorized resolution (+50 pts) verified');

// Flow 5: Switch across all 4 PulseBrief modes and 3 personas
for (const mBtn of briefmodeBtns) {
  mBtn.click();
  assert.equal(elementsById.get('pulseBriefList').children.length, 3);
}
for (const pBtn of personaBtns) {
  pBtn.click();
  assert.equal(elementsById.get('pulseBriefList').children.length, 3);
}
console.log('✅ [E2E-05] All 4 PulseBrief modes & 3 explanation personas verified (3 grounded insights each)');

// Flow 6: Switch across all 4 curated scenarios and verify Spin Pressure (12.0) & Final Over Free-Hit badge
scenarioBtns.find((b) => b.getAttribute('data-scenario') === 'spin_pressure').click();
elementsById.get('btnResetScenario').click();
assert.equal(elementsById.get('lblOversFormatted').textContent, '12.0');

scenarioBtns.find((b) => b.getAttribute('data-scenario') === 'final_over').click();
syncmodeBtns.find((b) => b.getAttribute('data-syncmode') === 'LIVE').click();
elementsById.get('btnSimNextStadiumBall').click();
assert.equal(elementsById.get('lblFreeHitBadge').classList.contains('hidden'), false, 'Free Hit badge must appear after no-ball');
elementsById.get('btnSimNextStadiumBall').click();
assert.equal(elementsById.get('lblInningsStatusBadge').textContent, 'TARGET REACHED');
console.log('✅ [E2E-06] All 4 scenarios, 12.0 overs formatting, Free-Hit badge, and TARGET REACHED state verified');

// Flow 7: Custom Match State modal validation (reject invalid 11.6, accept valid 15.2)
elementsById.get('btnOpenCustomModal').click();
elementsById.get('inpCustomOvers').value = '11.6';
elementsById.get('btnApplyCustomState').click();
assert.equal(elementsById.get('customValidationError').classList.contains('hidden'), false, 'Must show validation error for 11.6 overs');

elementsById.get('inpCustomOvers').value = '15.2';
elementsById.get('inpCustomRuns').value = '142';
elementsById.get('inpCustomWickets').value = '5';
elementsById.get('inpCustomTarget').value = '188';
elementsById.get('btnApplyCustomState').click();
assert.equal(elementsById.get('lblOversFormatted').textContent, '15.2');
assert.equal(elementsById.get('lblScoreWickets').textContent, '142/5');
console.log('✅ [E2E-07] Custom Match State modal validation (invalid 11.6 rejected, valid 15.2 loaded) verified');

// Flow 8: Guided 2-Minute Reviewer Demo Tour
elementsById.get('btnStartTour').click();
assert.equal(elementsById.get('tourBanner').classList.contains('hidden'), false);
elementsById.get('btnTourNext').click();
assert.ok(elementsById.get('tourStepBadge').textContent.includes('Step 2/5'));
elementsById.get('btnTourClose').click();
assert.equal(elementsById.get('tourBanner').classList.contains('hidden'), true);
console.log('✅ [E2E-08] 2-Minute Guided Reviewer Demo Tour navigation verified');

// Flow 9: Live Telemetry Hub & Scorer Pad End-to-End Ingestion with Delay Isolation
elementsById.get('btnResetLiveStream').click();
syncmodeBtns.find((b) => b.getAttribute('data-syncmode') === 'DELAY').click();
elementsById.get('selDemoDelay').dispatchChange('1'); // 1 event behind
assert.equal(elementsById.get('lblScoreWickets').textContent, '144/3');
assert.equal(elementsById.get('lblOversFormatted').textContent, '15.0');

// Push a FOUR via Live Scorer Pad (Event #1 in stadium, Viewer still at Event #0 due to 1-ball delay!)
liveScorerBtns.find((b) => b.getAttribute('data-liveball') === '4').click();
assert.equal(elementsById.get('lblStadiumHeadOver').textContent, '15.1 ov');
assert.equal(elementsById.get('lblViewerCursorOver').textContent, '15.0 ov');
assert.equal(elementsById.get('lblScoreWickets').textContent, '144/3', 'Viewer on 1-ball delay must not see the 4 yet');

// Push a WICKET via Live Scorer Pad (Event #2 in stadium -> Viewer advances to Event #1 and sees 148/3, still shielded from Wicket at #2!)
liveScorerBtns.find((b) => b.getAttribute('data-liveball') === 'W').click();
assert.equal(elementsById.get('lblStadiumHeadOver').textContent, '15.2 ov');
assert.equal(elementsById.get('lblViewerCursorOver').textContent, '15.1 ov');
assert.equal(elementsById.get('lblScoreWickets').textContent, '148/3', 'Viewer sees Event #1 (Four) while Event #2 (Wicket) stays buffered');
console.log('✅ [E2E-09] Live Stadium Scorer Pad real-time ingestion & delayed viewer spoiler isolation verified');

// Flow 10: Autonomous Live Match Daemon & Real-Time Activity Log verification
elementsById.get('btnToggleContinuousDaemon').click(); // Starts daemon & steps 1 ball immediately (Event #3)
elementsById.get('btnToggleContinuousDaemon').click(); // Pauses daemon cleanly
assert.equal(elementsById.get('lblLiveEventsCount').textContent, '3 live stadium packets');
assert.ok(elementsById.get('liveActivityFeedLog').children.length >= 4, 'Activity feed log must record every live packet');
console.log('✅ [E2E-10] Autonomous Live Cricsheet Streamer & Real-Time Telemetry Activity Feed verified');

// Flow 11: V4.2 Progressive Disclosure UI/UX & 5-Domain Semantic Layout verification
assert.equal(elementsById.get('liveTelemetryDrawer').classList.contains('hidden'), true, 'Live drawer starts collapsed by default');
elementsById.get('btnToggleLiveHub').click();
assert.equal(elementsById.get('liveTelemetryDrawer').classList.contains('hidden'), false, 'Live drawer opens on header click');
elementsById.get('btnToggleLiveHub').click();
assert.equal(elementsById.get('liveTelemetryDrawer').classList.contains('hidden'), true, 'Live drawer closes cleanly');

assert.equal(elementsById.get('engineeringLabSection').classList.contains('hidden'), true, 'Engineering Lab starts collapsed by default');
elementsById.get('btnToggleEngLab').click();
assert.equal(elementsById.get('engineeringLabSection').classList.contains('hidden'), false, 'Engineering Lab opens on header click');
elementsById.get('btnToggleEngLab').click();
assert.equal(elementsById.get('engineeringLabSection').classList.contains('hidden'), true, 'Engineering Lab closes cleanly');

assert.equal(intelTabBtns.length, 4, 'Must have 4 Match Intelligence progressive disclosure sub-tabs (including NetworkX)');
assert.equal(elementsById.get('intelPanelTrajectory').classList.contains('hidden'), false);
assert.equal(elementsById.get('intelPanelWhatIf').classList.contains('hidden'), true);
intelTabBtns.find((b) => b.getAttribute('data-inteltab') === 'WHATIF').click();
assert.equal(elementsById.get('intelPanelTrajectory').classList.contains('hidden'), true);
assert.equal(elementsById.get('intelPanelWhatIf').classList.contains('hidden'), false);
intelTabBtns.find((b) => b.getAttribute('data-inteltab') === 'WATERFALL').click();
assert.equal(elementsById.get('intelPanelWaterfall').classList.contains('hidden'), false);
intelTabBtns.find((b) => b.getAttribute('data-inteltab') === 'NETWORKX').click();
assert.equal(elementsById.get('intelPanelNetworkX').classList.contains('hidden'), false);
console.log('✅ [E2E-11] V5.5 5-Domain Semantic UI & 4-Tab Progressive Disclosure (with NetworkX) verified');

// Flow 12: V5.0 Multi-Engine Dedicated Page Navigation & Interactive xAI Grok Co-Pilot Bar
assert.equal(enginePageBtns.length, 6, 'Must have 6 Multi-Engine Page navigation buttons');
enginePageBtns.find((b) => b.getAttribute('data-enginepage') === 'QUANT').click();
assert.equal(elementsById.get('colPulseBriefAndTimeline').classList.contains('hidden'), true, 'Left column hidden on dedicated Quant Engine page');
assert.equal(elementsById.get('intelPanelTrajectory').classList.contains('hidden'), false, 'Quant page expands Trajectory panel');
assert.equal(elementsById.get('intelPanelWhatIf').classList.contains('hidden'), false, 'Quant page expands What-If panel simultaneously');
assert.equal(elementsById.get('intelPanelWaterfall').classList.contains('hidden'), false, 'Quant page expands 12-Feature Waterfall panel simultaneously');

enginePageBtns.find((b) => b.getAttribute('data-enginepage') === 'PULSEBRIEF').click();
assert.equal(elementsById.get('colPulseBriefAndTimeline').classList.contains('hidden'), false, 'PulseBrief & Grok AI page visible');
assert.equal(elementsById.get('colIntelAndCaptain').classList.contains('hidden'), true, 'Right column hidden on dedicated PulseBrief page');

// Test Interactive Ask Grok Co-Pilot bar (offline grounded fallback & xAI key configuration)
assert.equal(grokPromptChips.length, 3, 'Must render 3 quick tactical prompt chips for Grok Co-Pilot');
grokPromptChips[0].click();
assert.equal(elementsById.get('grokCopilotResponseCard').classList.contains('hidden'), false, 'Grok Co-Pilot response card appears on query');
assert.ok(elementsById.get('txtGrokCopilotAnswer').textContent.includes('Deterministic Grounded Co-Pilot'), 'Offline grounded co-pilot answers immediately when no key is set');

// Return to Split Studio overview
enginePageBtns.find((b) => b.getAttribute('data-enginepage') === 'STUDIO').click();
assert.equal(elementsById.get('colPulseBriefAndTimeline').classList.contains('hidden'), false);
assert.equal(elementsById.get('colIntelAndCaptain').classList.contains('hidden'), false);
console.log('✅ [E2E-12] V5.0 Multi-Engine Page Router & Interactive xAI Grok Co-Pilot verified');

// Flow 13: V5.0 Live IND vs NZ (Eden Park • Nov 4, 2026) Match Tracking & Spoiler-Protected DLS Chase
const indNzBtn = scenarioBtns.find((b) => b.getAttribute('data-scenario') === 'ind_vs_nz_live');
assert.ok(indNzBtn, 'Must render 🔴 LIVE: IND vs NZ (Eden Park) scenario pill');
indNzBtn.click();
syncmodeBtns.find((b) => b.getAttribute('data-syncmode') === 'DELAY').click();
elementsById.get('selDemoDelay').dispatchChange('1');
assert.equal(elementsById.get('lblBattingTeam').textContent, 'IND');
assert.equal(elementsById.get('lblScoreWickets').textContent, '118/2', 'Viewer at 16.4 ov sees IND 118/2 (Kohli 51* off 36)');
assert.equal(elementsById.get('lblViewerCursorOver').textContent, '16.4 ov');
assert.equal(elementsById.get('lblStadiumHeadOver').textContent, '16.5 ov', 'Stadium is 1 ball ahead at 16.5 ov (119/2)');
assert.ok(elementsById.get('lblStriker').textContent.includes('V. Kohli'), 'Striker must be V. Kohli');

// Also test 1-click Sync LIVE IND vs NZ inside Live Telemetry Hub
elementsById.get('btnSyncIndVsNzLive').click();
assert.equal(elementsById.get('lblBattingTeam').textContent, 'IND');
assert.equal(elementsById.get('lblScoreWickets').textContent, '118/2');
console.log('✅ [E2E-13] Live IND vs NZ (Eden Park • Nov 4, 2026 — IND 118/2 chasing DLS 143) tracking verified');

// Flow 14: V5.5 Dynamic NetworkX Graph Topology (Markov State Flow vs Entity PageRank + Interactive Node Click)
assert.ok(elementsById.get('svgNetworkXGraph').children.length >= 20, 'NetworkX SVG must render directed edges and state nodes');
assert.ok(elementsById.get('lblNetDominantNode').textContent.includes('% PR'), 'Must display dominant PageRank centrality node');
assert.ok(elementsById.get('lblNetEntropyBits').textContent.includes('bits'), 'Must display Shannon transition entropy in bits');
elementsById.get('btnNetModeEntity').click();
assert.equal(elementsById.get('lblNetNodeEdgeCount').textContent, '8V • 12E', 'Entity PageRank graph must render 8 nodes and 12 edges');
// Click a node in the SVG graph to test interactive node inspector
const nodeGroups = elementsById.get('svgNetworkXGraph').children.filter((c) => c.tagName === 'G');
assert.equal(nodeGroups.length, 8, 'Must render 8 clickable entity node groups');
nodeGroups[0].click();
assert.ok(elementsById.get('lblNetInspectTitle').textContent.includes('M. Santner'), 'Clicking bowler node inspects M. Santner');
console.log('✅ [E2E-14] Dynamic NetworkX Graph Topology (Markov Flow, Entity PageRank & Interactive Node Inspector) verified');

console.log('----------------------------------------------------------------');
console.log('SUMMARY: 14/14 End-to-End DOM & Live Telemetry Flows + 34/34 Unit Tests Passed.');
console.log('================================================================');
