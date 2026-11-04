import assert from 'node:assert/strict';
import { mountFanFocus } from '../src/features/fanFocus.mjs';

class MockNode {
  constructor(id='') {this.id=id;this.hidden=false;this.textContent='';this.attrs={};this.children=[];this.listeners=new Map();this.focused=false;}
  addEventListener(name,fn){const l=this.listeners.get(name)||[];l.push(fn);this.listeners.set(name,l);}
  setAttribute(n,v){this.attrs[n]=v;}
  replaceChildren(){this.children=[];}
  appendChild(el){this.children.push(el);return el;}
  focus(){this.focused=true;if(typeof root!=='undefined')root.activeElement=this;}
  click(){for(const fn of this.listeners.get('click')||[])fn({preventDefault(){}});}
  key(key,shiftKey=false){for(const fn of this.listeners.get('keydown')||[])fn({key,shiftKey,preventDefault(){}});}
}
const ids=['fanFocusOpen','fanFocusPanel','fanFocusClose','fanFocusMark','fanFocusRecap','fanFocusCopy','fanFocusVoice','fanFocusBreak','fanFocusTimer','fanFocusOverview','fanFocusHighlights','fanFocusStatus','fanFocusResult'];
const nodes=new Map(ids.map(id=>[id,new MockNode(id)]));
const root={activeElement:new MockNode('before'),getElementById:x=>nodes.get(x),createElement:tag=>new MockNode(tag)};
const el=x=>nodes.get('fanFocus'+x);
let copied='';
Object.defineProperty(globalThis,'navigator',{value:{clipboard:{async writeText(t){copied=t}}},configurable:true});
const speech={cancelCount:0,started:[],cancel(){this.cancelCount++},speak(u){this.started.push(u)}};
globalThis.window={speechSynthesis:speech,SpeechSynthesisUtterance:class {constructor(t){this.text=t}}};
let visibleCount=1;
const state=()=>({
 scenarioId:'death_chase',viewerCursorSeq:visibleCount,viewerVisibleThrough:visibleCount===1?'16.4':'16.5',
 scoreRuns:158+visibleCount,scoreWickets:4,runsRequired:38-visibleCount,legalBallsRemaining:20-visibleCount,
 teams:{batting:'MUM',bowling:'CHE'},visibleEvents:[
 {seq:1,id:'one',runsBat:1,runsTotal:1,isWicket:false,overBallLabel:'16.4'},
 ...(visibleCount>=2?[{seq:2,id:'two',runsBat:6,runsTotal:6,isWicket:false,overBallLabel:'16.5'}]:[])
 ]});
let n=0;const pass=s=>{n++;console.log('PASS FDOM-'+String(n).padStart(2,'0'),s)};
const ui=mountFanFocus(root,state);
try{
 assert.ok(ui);assert.equal(el('Panel').hidden,true);pass('Module initializes without opening drawer');
 el('Open').click();assert.equal(el('Panel').hidden,false);assert.ok(el('Close').focused);pass('Drawer opens and moves focus');
 assert.match(el('Overview').textContent,/1 revealed/);pass('Viewer-visible summary renders');
 el('Mark').click();assert.equal(ui.getMark().cursor,1);pass('Bookmark uses viewer cursor');
 const message=el('Status').textContent;
 await new Promise(r=>setTimeout(r,1300));
 assert.equal(el('Status').textContent,message);
 pass('Periodic refresh does not overwrite bookmark confirmation');
 assert.match(el('Overview').textContent,/No newly revealed/);pass('Bookmark prevents duplicate prior history');
 visibleCount=2;ui.refresh();assert.match(el('Overview').textContent,/1 revealed/);assert.match(el('Highlights').children[0].textContent,/SIX/);pass('Newly revealed event appears');
 el('Copy').click();await new Promise(r=>setImmediate(r));assert.match(copied,/16.5.*SIX/);assert.doesNotMatch(copied,/hidden|unreleased wicket/i);pass('Share receipt copies only visible event');
 el('Voice').click();assert.equal(speech.started.length,1);assert.match(speech.started[0].text,/1 revealed/);pass('Voice readout is explicit and viewer safe');
 el('Voice').click();assert.ok(speech.cancelCount>=2);assert.equal(el('Voice').textContent,'Read aloud');pass('Voice can be stopped');
 el('Break').click();assert.equal(el('Break').textContent,'Cancel Ad-Break');pass('Ad-break timer starts on user action');
 el('Break').click();assert.equal(el('Timer').textContent,'00:45');pass('Ad-break timer cancels cleanly');
 el('Panel').key('Escape');assert.equal(el('Panel').hidden,true);pass('Escape closes dialog');
 el('Open').click();assert.equal(el('Panel').hidden,false);
 el('Copy').focus();el('Panel').key('Tab');assert.equal(root.activeElement,el('Close'));pass('Tab wraps from last to first dialog control');
 el('Close').focus();el('Panel').key('Tab',true);assert.equal(root.activeElement,el('Copy'));pass('Shift+Tab wraps from first to last dialog control');
 el('Close').click();assert.equal(el('Panel').hidden,true);pass('Close button closes dialog');
 console.log('FAN FOCUS DOM:',n+'/'+n,'passed');
} finally { ui.dispose(); }
