/**
 * Independent externally-sourced match discovery for Live Match Center.
 * No simulation, no fabricated fixtures and no connection to cricket's demo engine.
 *
 * Provider notes:
 * - OpenLigaDB: documented, no-key, openly provided Bundesliga results.
 * - ESPN ATP/WTA site scoreboard: publicly reachable but UNOFFICIAL/undocumented;
 *   best effort only, must not be treated as a licensed production feed.
 * - TheSportsDB public v1: badminton event discovery only; free tier is not
 *   a real-time badminton score feed.
 * - Cricket: explicit unavailable state until authorized CRICAPI_KEY is set.
 */
const SPORTS = new Set(['football','tennis','badminton','cricket','all']);
const TTL = 40_000;
const STALE_LIMIT = 3 * 60 * 1000;
const cache = new Map();
const inFlight = new Map();
const source = {
  football: {name:'OpenLigaDB',url:'https://www.openligadb.de/',tier:'No-key open data',coverage:'German Bundesliga; goal events when reported'},
  tennis: {name:'ESPN public scoreboard (unofficial)',url:'https://www.espn.com/tennis/',tier:'Best-effort, undocumented endpoint',coverage:'ATP/WTA competitions and set scores'},
  badminton: {name:'TheSportsDB free public v1',url:'https://www.thesportsdb.com/',tier:'Free schedule discovery only',coverage:'Partial fixture discovery; not a real-time score service'},
  cricket: {name:'CricAPI',url:'https://www.cricapi.com/',tier:'Requires authorized API key',coverage:'Subject to provider subscription/rights'}
};
function str(v){return typeof v==='string'?v.trim().slice(0,180):'';}
function stamp(v){const t=Date.parse(v || '');return Number.isFinite(t)?new Date(t).toISOString():null;}
function bounded(v){if(v===null||v===undefined||v==='')return null;const x=Number(v);return Number.isFinite(x)&&x>=0?Math.min(x,999):null;}
async function getJson(url,{timeout=7500}={}){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeout);
 try{
  const r=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json','User-Agent':'SyncPulse11 educational FDE demo'}});
  if(!r.ok)throw Error('upstream returned HTTP '+r.status);
  const length=Number(r.headers.get('content-length')||0);
  if(length>2_000_000)throw Error('upstream payload too large');
  const body=await r.text();
  if(body.length>2_000_000)throw Error('upstream payload too large');
  return JSON.parse(body);
 }finally{clearTimeout(timer);}
}
function footballResult(m){
 const choices=Array.isArray(m.matchResults)?m.matchResults:[];
 const final=choices.find(r=>r.resultTypeID===2 || r.resultTypeId===2 || r.resultName==='Endergebnis' || r.isFinalResult===true);
 const candidate=final||choices.find(r=>r.resultTypeID===1)||choices.at(-1);
 const goals=Array.isArray(m.goals)?m.goals:[];
 const scoreA=bounded(candidate?.pointsTeam1 ?? (goals.length?goals.at(-1)?.scoreTeam1:null));
 const scoreB=bounded(candidate?.pointsTeam2 ?? (goals.length?goals.at(-1)?.scoreTeam2:null));
 const at=stamp(m.matchDateTimeUTC),updatedAt=stamp(m.lastUpdateDateTime);
 const start=at?Date.parse(at):NaN,now=Date.now(),age=updatedAt?now-Date.parse(updatedAt):Infinity;
 let state='UNKNOWN';
 if(m.matchIsFinished)state='FINAL';
 else if(Number.isFinite(start)&&now<start)state='SCHEDULED';
 else if(Number.isFinite(start)&&now>=start && now-start<4*3600000 && age>-5*60000 && age<30*60000)state='LIVE';
 else if(Number.isFinite(start)&&now-start>=4*3600000)state='UNCONFIRMED';
 const events=goals.slice(-10).map(g=>({
  id:String(g.goalID??g.goalId??''),
  label:`Goal${g.matchMinute!=null?' '+g.matchMinute+"'":''}: ${str(g.goalGetterName)||'Scorer not listed'}`,
  minute:bounded(g.matchMinute),home:bounded(g.scoreTeam1),away:bounded(g.scoreTeam2)
 }));
 return {
  id:'f:'+m.matchID,sport:'football',league:str(m.leagueName),stage:str(m.group?.groupName),
  home:str(m.team1?.teamName)||'Home',away:str(m.team2?.teamName)||'Away',
  scoreHome:scoreA,scoreAway:scoreB,scoreText:scoreA===null||scoreB===null?'Not reported':scoreA+' – '+scoreB,
  status:state,providerStatus:str(m.matchIsFinished?'Final':state),startTime:at,updatedAt,
  detail:state==='UNCONFIRMED'?'Provider has not confirmed the current status.':null,
  events,sourceUrl:source.football.url
 };
}
function normalizeTennisMatch(tour,event,comp){
 const players=Array.isArray(comp.competitors)?comp.competitors:[];
 if(players.length!==2)return null;
 const [a,b]=players;
 const name=p=>str(p.athlete?.displayName||p.roster?.displayName||p.team?.displayName)||'Player';
 const scores=p=>Array.isArray(p.linescores)?p.linescores.map(s=>s.tiebreak!=null?String(s.value)+' ('+String(s.tiebreak)+')':String(s.value)).join('  '):'';
 const status=str(comp.status?.type?.state);
 const at=stamp(comp.date||comp.startDate);
 const hoursSince=at?(Date.now()-Date.parse(at))/3600000:Infinity;
 const state=status==='in'?(hoursSince>-2&&hoursSince<24?'LIVE':'UNCONFIRMED'):status==='post'?'FINAL':status==='pre'?'SCHEDULED':'UNKNOWN';
 const updatedAt=null; // ESPN competition record does not expose a reliable update timestamp.
 return {
  id:'t:'+tour+':'+event.id+':'+comp.id,
  sport:'tennis',league:str(event.name),stage:str(comp.round?.displayName||comp.type?.text),
  home:name(a),away:name(b),scoreHome:null,scoreAway:null,
  scoreText: [scores(a)||'–',scores(b)||'–'].join('  /  '),
  status:state,providerStatus:str(comp.status?.type?.description),startTime:at,updatedAt,
  detail:'Set scores as reported by the upstream tournament scoreboard. Point-by-point events may be unavailable.',
  events:[],sourceUrl:source.tennis.url
 };
}
function normalizeBadmintonEvent(e){
 if(!e || !e.idEvent)return null;
 const at=stamp(e.strTimestamp || (e.dateEvent&&e.strTime?e.dateEvent+'T'+e.strTime+'Z':e.dateEvent));
 return {id:'b:'+e.idEvent,sport:'badminton',league:str(e.strLeague)||'Badminton',stage:str(e.strRound),
 home:str(e.strHomeTeam)||'Player / Team A',away:str(e.strAwayTeam)||'Player / Team B',
 scoreHome:null,scoreAway:null,scoreText:'Not provided by free schedule feed',
 status: e.strStatus==='Match Finished'?'FINAL':at&&Date.parse(at)>Date.now()?'SCHEDULED':'UNCONFIRMED',
 providerStatus:'Limited schedule coverage',startTime:at,updatedAt:null,
 detail:'Free schedule data only. Not verified live scoring or point-by-point badminton coverage.',
 events:[],sourceUrl:source.badminton.url};
}
function normalizeCricket(m){
 const started=Boolean(m.matchStarted),ended=Boolean(m.matchEnded);
 const matchDate=stamp(m.dateTimeGMT);
 const hoursSince=matchDate?(Date.now()-Date.parse(matchDate))/3600000:Infinity;
 const status=ended?'FINAL':started?(hoursSince>-4&&hoursSince<120?'LIVE':'UNCONFIRMED'):'SCHEDULED';
 const a=str(m.teams?.[0])||'Team A',b=str(m.teams?.[1])||'Team B';
 const score=Array.isArray(m.score)?m.score:[];
 return {id:'c:'+str(m.id),sport:'cricket',league:str(m.name||m.matchType),stage:str(m.venue),
 home:a,away:b,scoreHome:null,scoreAway:null,scoreText:score.map(s=>`${str(s.inning)} ${bounded(s.r)??'?'} / ${bounded(s.w)??'?'} (${s.o??'?'} ov)`).join(' · ')||'Score pending',
 status,providerStatus:str(m.status),startTime:matchDate,updatedAt:null,
 detail:'Score summary only; ball-by-ball viewer synchronization requires an event feed with verified delivery IDs.',
 events:[],sourceUrl:source.cricket.url};
}
function sortMatches(matches){
 const weights={LIVE:0,SCHEDULED:1,UNCONFIRMED:2,UNKNOWN:3,FINAL:4};
 return matches.sort((a,b)=>(weights[a.status]??5)-(weights[b.status]??5)||Math.abs(Date.parse(a.startTime||0)-Date.now())-Math.abs(Date.parse(b.startTime||0)-Date.now()));
}
export function buildLiveInsight(current,previous){
 if(!current)return {label:'Choose a match',detail:'No score data is currently selected.',evidence:[],confidence:'none'};
 if(current.status==='SCHEDULED')return {label:'Match scheduled',detail:'This fixture has not started. No score or result is inferred.',evidence:[],confidence:'source-reported'};
 if(current.status==='UNCONFIRMED'||current.status==='UNKNOWN')return {label:'Status unconfirmed',detail:'The provider does not provide enough fresh evidence to call this match live.',evidence:[],confidence:'limited'};
 if(!previous)return {label:'First confirmed snapshot',detail:current.scoreText==='Not reported'?'No scoring data has been reported.':`Reported score: ${current.scoreText}. This is an externally sourced snapshot, not a video stream.`,evidence:[],confidence:'provider-snapshot'};
 if(current.scoreText===previous.scoreText)return {label:'No reported scoring change',detail:'The provider score is unchanged since your last revealed snapshot. This does not imply no play occurred.',evidence:[],confidence:'provider-snapshot'};
 const detail=(current.sport==='football'&&current.scoreHome!=null&&previous.scoreHome!=null)?
  `Score changed from ${previous.scoreText} to ${current.scoreText}. Home change: ${current.scoreHome-previous.scoreHome}, away change: ${current.scoreAway-previous.scoreAway}. These are score differences, not verified event explanations.`:
  `Reported score changed from ${previous.scoreText} to ${current.scoreText}. The feed does not establish which individual action caused the change.`;
 return {label:'Verified score update',detail,evidence:current.events.map(e=>e.label).slice(-3),confidence:'provider-snapshot'};
}
async function providerRead(sport){
 if(sport==='football'){
  const today=Date.now(),year=new Date(today).getUTCFullYear();
  const season=new Date(today).getUTCMonth()<6?year-1:year;
  const raw=await getJson('https://api.openligadb.de/getmatchdata/bl1/'+season);
  if(!Array.isArray(raw))throw Error('Unexpected football provider schema');
  const matches=raw.map(footballResult).filter(m=>m.startTime && Math.abs(Date.parse(m.startTime)-today)<10*86400000);
  return {matches:sortMatches(matches).slice(0,40),message:'Bundesliga fixtures within ten days. Source timestamps determine live confidence.'};
 }
 if(sport==='tennis'){
  const tours=['atp','wta'];
  const results=await Promise.allSettled(tours.map(t=>getJson('https://site.api.espn.com/apis/site/v2/sports/tennis/'+t+'/scoreboard')));
  const matches=[];const errors=[];
  for(let i=0;i<results.length;i++){
   const r=results[i];if(r.status==='rejected'){errors.push(tours[i]+' unavailable');continue;}
   for(const event of (r.value?.events||[])){
    for(const grouping of (event.groupings||[])){
     for(const competition of (grouping.competitions||[])){
      const m=normalizeTennisMatch(tours[i],event,competition);
      if(m&&m.startTime&&Math.abs(Date.parse(m.startTime)-Date.now())<3*86400000)matches.push(m);
     }
    }
   }
  }
  if(results.every(r=>r.status==='rejected'))throw Error('Both tennis sources unavailable');
  return {matches:sortMatches(matches).slice(0,48),message:'ATP/WTA best-effort public scoreboard; unofficial API without reliability or redistribution guarantee.'+(errors.length?' '+errors.join(', '):'')};
 }
 if(sport==='badminton'){
  const date=new Date().toISOString().slice(0,10);
  const data=await getJson('https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d='+date+'&s=Badminton');
  const matches=(Array.isArray(data.events)?data.events:[]).map(normalizeBadmintonEvent).filter(Boolean).slice(0,20);
  return {matches,message:matches.length?'Partial badminton fixture listings only, not verified live scores.':'No badminton fixtures returned by the free schedule source today; this is not evidence that no matches exist.'};
 }
 if(sport==='cricket'){
  const key=process.env.CRICAPI_KEY;
  if(!key)return {matches:[],status:'CONFIG_REQUIRED',message:'Authorized CricAPI key not configured. Do not treat scripted IND vs NZ as a live match. Set CRICAPI_KEY on the server for a provider-backed score feed.'};
  const data=await getJson('https://api.cricapi.com/v1/currentMatches?apikey='+encodeURIComponent(key)+'&offset=0');
  if(data.status==='failure')throw Error('Cricket provider rejected its API key');
  return {matches:sortMatches((data.data||[]).map(normalizeCricket)).slice(0,30),message:'CricAPI match-level scores. Ball-by-ball synchronized commentary is not provided by this connector.'};
 }
 throw Error('Unsupported sport');
}
export async function getLiveMatches(sport='football'){
 if(!SPORTS.has(sport)||sport==='all')return {sport,status:'INVALID',matches:[],message:'Choose a specific supported sport'};
 const cached=cache.get(sport),now=Date.now();
 if(cached && now-cached.at<TTL)return {...cached.response,cacheAgeSec:Math.round((now-cached.at)/1000)};
 if(inFlight.has(sport))return inFlight.get(sport);
 const task=(async()=>{
  try{
   const info=await providerRead(sport);
   const response={sport,status:info.status||'OK',matches:info.matches,source:source[sport],
    fetchedAt:new Date().toISOString(),stale:false,cacheAgeSec:0,message:info.message};
   cache.set(sport,{at:Date.now(),response});
   return response;
  }catch(error){
   if(cached && now-cached.at<STALE_LIMIT)return {...cached.response,status:'STALE',stale:true,cacheAgeSec:Math.round((now-cached.at)/1000),message:'Provider refresh failed; showing cached source data. '+String(error.message).slice(0,100)};
   return {sport,status:'UNAVAILABLE',matches:[],source:source[sport],fetchedAt:new Date().toISOString(),stale:false,cacheAgeSec:0,message:'Provider unavailable. Scores are not replaced with simulated data.'};
  }
 })();
 inFlight.set(sport,task);
 try{return await task;}finally{inFlight.delete(sport);}
}
export function clearLiveCache(){cache.clear();inFlight.clear();}
export {normalizeTennisMatch,footballResult,normalizeBadmintonEvent,normalizeCricket};
