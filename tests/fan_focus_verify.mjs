import assert from 'node:assert/strict';
import fs from 'node:fs';
import { summarizeVisibleSince, makeFanReceipt, makeVisibleBookmark } from '../src/features/fanFocus.mjs';
const state = (visible = 2, third = 'WICKET') => Object.freeze({
 scenarioId:'death_chase',viewerCursorSeq:visible,viewerVisibleThrough:visible===2?'16.5':'17.0',
 oversFormatted:visible===2?'16.5':'17.0', scoreRuns:160+(visible===3?(third==='SIX'?6:0):0),
 scoreWickets:4+(visible===3 && third==='WICKET'?1:0),
 runsRequired:36-(visible===3 && third==='SIX'?6:0),legalBallsRemaining:19-(visible===3?1:0),
 teams:{batting:'MUM',bowling:'CHE'},
 visibleEvents:[
  {id:'ev1',seq:1,overBallLabel:'16.4',runsBat:1,runsTotal:1,isWicket:false},
  {id:'ev2',seq:2,overBallLabel:'16.5',runsBat:1,runsTotal:1,isWicket:false},
  ...(visible>=3?[{id:'ev3',seq:3,overBallLabel:'17.0',runsBat:third==='SIX'?6:0,runsTotal:third==='SIX'?6:0,isWicket:third==='WICKET'}]:[])
 ]
});
let checks=0;
const ok=(name)=>{checks++;console.log('PASS FF-'+String(checks).padStart(2,'0'),name)};
const a=state(2,'WICKET'), b=state(2,'SIX');
assert.deepEqual(summarizeVisibleSince(a),summarizeVisibleSince(b));ok('Hidden WICKET and SIX produce identical fan summaries');
assert.equal(makeFanReceipt(summarizeVisibleSince(a)),makeFanReceipt(summarizeVisibleSince(b)));ok('Hidden future cannot leak into share receipt');
const mark=makeVisibleBookmark(a);
assert.deepEqual(mark,{scenarioId:'death_chase',cursor:2});ok('Bookmark captures viewer cursor only');
const unchanged=summarizeVisibleSince(a,mark);
assert.equal(unchanged.count,0);ok('Bookmark hides all earlier deliveries');
assert.match(unchanged.overview,/No newly revealed deliveries/);ok('Empty catch-up informs fan honestly');
const revealedW=summarizeVisibleSince(state(3,'WICKET'),mark);
assert.equal(revealedW.wickets,1);assert.equal(revealedW.boundaries,0);ok('Visible wicket appears only once revealed');
const revealedS=summarizeVisibleSince(state(3,'SIX'),mark);
assert.equal(revealedS.wickets,0);assert.equal(revealedS.boundaries,1);ok('Visible boundary appears after cursor advance');
assert.notEqual(makeFanReceipt(revealedW),makeFanReceipt(revealedS));ok('Authorized reveal distinguishes divergent timelines');
assert.equal(summarizeVisibleSince(state(2),makeVisibleBookmark(state(3))).count,0);ok('Viewer rewind cannot disclose forward events');
const different={...mark,scenarioId:'spin_pressure'};
assert.equal(summarizeVisibleSince(a,different).count,2);ok('Bookmark from another scenario is safely ignored');
assert.match(makeFanReceipt(revealedW),/simulated cricket demo/i);ok('Receipt discloses demo provenance');
assert.match(makeFanReceipt(revealedS),/already revealed/);ok('Receipt explains anti-spoiler scope');
assert.equal(makeFanReceipt(null),'');assert.equal(summarizeVisibleSince(null),null);ok('Graceful empty inputs');
const injected = {...a,visibleEvents:[...a.visibleEvents, {seq:999,id:'hidden',overBallLabel:'secret',runsBat:6,runsTotal:6,isWicket:false}]};
assert.equal(summarizeVisibleSince(injected).count,2);ok('Defensive cursor filter ignores malformed future entries');
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.ok(html.includes('id="fanFocusPanel"') && html.includes('src="/src/features/fanFocus.mjs"'));ok('Fan Focus loaded from production UI');
assert.match(html,/window.SyncPulseFanVisibleState = safeState/);ok('Bridge exposes only immutable viewer projection');
console.log('FAN FOCUS:',checks+'/'+checks,'checks passed');
