import assert from 'node:assert/strict';
import {getLiveMatches,clearLiveCache,footballResult,normalizeTennisMatch,normalizeBadmintonEvent,normalizeCricket} from '../src/live/providerHub.mjs';
import {appendSnapshot,classifyUpdate,summarizeRevealed} from '../src/live/liveCenter.mjs';

let checks=0;
function pass(label){console.log('PASS LC-'+String(++checks).padStart(2,'0'),label);}
function future(minutes=120){return new Date(Date.now()+minutes*60_000).toISOString();}
const fixture={
 matchID:123,matchDateTimeUTC:future(),leagueName:'Demo test Bundesliga',team1:{teamName:'Alpha'},team2:{teamName:'Beta'},
 matchIsFinished:false,matchResults:[],goals:[],lastUpdateDateTime:new Date().toISOString()
};
const scheduled=footballResult(fixture);
assert.equal(scheduled.status,'SCHEDULED');pass('Future football fixture classified scheduled');
assert.equal(scheduled.scoreText,'Not reported');pass('Missing source score is not fabricated as 0-0');
assert.equal(scheduled.scoreHome,null);pass('Null result remains null');
assert.equal(scheduled.home,'Alpha');pass('Provider team names retained');
const finished=footballResult({...fixture,matchIsFinished:true,matchResults:[{resultTypeID:2,pointsTeam1:2,pointsTeam2:1}],goals:[{goalID:9,goalGetterName:'A. Striker',matchMinute:45,scoreTeam1:1,scoreTeam2:0}]});
assert.equal(finished.status,'FINAL');assert.equal(finished.scoreText,'2 – 1');pass('Football final reports actual source result');
assert.equal(finished.events.length,1);pass('Goal evidence drawn only from reported goal records');
const stale=footballResult({...fixture,matchDateTimeUTC:new Date(Date.now()-2*3600000).toISOString(),lastUpdateDateTime:new Date(Date.now()-3*3600000).toISOString()});
assert.notEqual(stale.status,'LIVE');pass('Old provider update never labeled live');
const tennis=normalizeTennisMatch('wta',{id:'100-2026',name:'WTA Tournament'},{
 id:'900',date:future(-6),status:{type:{state:'in',description:'In Progress'}},round:{displayName:'R16'},
 competitors:[{athlete:{displayName:'Player A'},linescores:[{value:6},{value:2}]},{athlete:{displayName:'Player B'},linescores:[{value:3},{value:4}]}]
});
assert.equal(tennis.status,'LIVE');assert.equal(tennis.scoreText,'6  2  /  3  4');pass('Tennis set scores normalized without invented rallies');
assert.equal(tennis.events.length,0);pass('No fictional tennis point events');
assert.equal(normalizeTennisMatch('atp',{id:'x'}, {competitors:[]}),null);pass('Malformed competition ignored');
const bad=normalizeBadmintonEvent({idEvent:456,dateEvent:new Date(Date.now()+2*86400000).toISOString().slice(0,10),strHomeTeam:'Player A',strAwayTeam:'Player B',strLeague:'BWF'});
assert.equal(bad.status,'SCHEDULED');pass('Badminton discovery is scheduled-only when sourced');
assert.match(bad.detail,/not verified live scoring/i);pass('Badminton schedule coverage honestly disclosed');
const cricket=normalizeCricket({id:'abc',name:'Test match',teams:['India','NZ'],matchStarted:true,matchEnded:false,dateTimeGMT:new Date().toISOString(),score:[{inning:'India',r:134,w:2,o:15}]});
assert.equal(cricket.status,'LIVE');assert.match(cricket.scoreText,/134 \/ 2/);pass('Cricket authorized-provider match-level score normalized');
assert.match(cricket.detail,/ball-by-ball/);pass('No unsupported delivery-grade claim');
const state=(score,status='LIVE')=>({id:'t:one',sport:'tennis',scoreText:score,status,events:[]});
let buffered=[];
buffered=appendSnapshot(buffered,null,state('0 / 0')).buffer;
assert.equal(buffered.length,1);pass('First external score enqueued without display');
buffered=appendSnapshot(buffered,null,state('0 / 0')).buffer;
assert.equal(buffered.length,1);pass('Duplicate provider fetch does not produce duplicate reveal');
buffered=appendSnapshot(buffered,null,state('6 / 2')).buffer;
buffered=appendSnapshot(buffered,null,state('6  4 / 2  3')).buffer;
assert.deepEqual(buffered.map(x=>x.scoreText),['0 / 0','6 / 2','6  4 / 2  3']);pass('External snapshots remain FIFO');
const first=buffered.shift();assert.equal(first.scoreText,'0 / 0');pass('First reveal cannot skip a queued future update');
const third=appendSnapshot(buffered,first,state('6  4 / 2  3'));
assert.equal(third.buffer.length,2);pass('Repeated most recent snapshot is deduplicated');
const limited=appendSnapshot(Array.from({length:3},(_,i)=>state(String(i))),null,state('3'),3);
assert.equal(limited.dropped,1);assert.equal(limited.buffer[0].scoreText,'1');pass('Bounded queue reports dropped snapshots explicitly');
assert.equal(classifyUpdate(state('2'),state('1')),'CHANGED');pass('Change detection based on actual source score');
assert.equal(classifyUpdate(state('1'),state('1')),'UNCHANGED');pass('Unchanged snapshots not misreported');
assert.match(summarizeRevealed(state('6  4 / 2  3'),state('6 / 2')).text,/cannot be inferred/);pass('Tennis briefing avoids invented rally narrative');
assert.match(summarizeRevealed({ ...scheduled,sport:'football'},null).text,/No score or outcome is predicted/);pass('Upcoming fixture briefing does not claim a score');
clearLiveCache();const invalid=await getLiveMatches('unknown');assert.equal(invalid.status,'INVALID');pass('Provider allowlist rejects invalid sports');
const noCricket=await getLiveMatches('cricket');assert.ok(['CONFIG_REQUIRED','UNAVAILABLE','OK'].includes(noCricket.status));if(!process.env.CRICAPI_KEY)assert.equal(noCricket.status,'CONFIG_REQUIRED');pass('Cricket connector exposes explicit authorization state');
const oldFetch=globalThis.fetch;
let requests=0;
const mockResponse={ok:true,headers:new Map(),text:async()=>JSON.stringify([{...fixture}])};
globalThis.fetch=async()=>{requests++;await new Promise(r=>setTimeout(r,25));return mockResponse;};
try{
 clearLiveCache();
 const [one,two]=await Promise.all([getLiveMatches('football'),getLiveMatches('football')]);
 assert.equal(requests,1);assert.equal(one.matches.length,1);assert.deepEqual(one.matches,two.matches);pass('Concurrent audience requests share one upstream fetch');
 const cached=await getLiveMatches('football');assert.equal(requests,1);assert.equal(cached.status,'OK');pass('Provider cache protects free quota');
 clearLiveCache();globalThis.fetch=async()=>{throw Error('network unavailable')};
 const failed=await getLiveMatches('football');
 assert.equal(failed.status,'UNAVAILABLE');assert.equal(failed.matches.length,0);pass('Network failure never replaces real scores with demo values');
}finally{globalThis.fetch=oldFetch;clearLiveCache();}
console.log('LIVE CENTER UNIT:',checks+'/'+checks,'passed');
