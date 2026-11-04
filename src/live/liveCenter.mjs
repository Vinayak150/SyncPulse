/**
 * Live Match Center: separate from the legacy cricket learning lab.
 * User intent is a manual reveal gate over genuine provider score snapshots.
 * Updates never automatically change the visible score or evidence-based insight.
 */
const SPORTS=['football','tennis','badminton','cricket'];
const NAMES={football:'Football · Bundesliga',tennis:'Tennis · ATP / WTA',badminton:'Badminton · Limited fixtures',cricket:'Cricket · Authorized feed'};
export function appendSnapshot(buffer,visible,incoming,max=40){
 if(!incoming)return {buffer:[...buffer],dropped:0};
 const last=buffer.at(-1)||visible;
 if(last?.id===incoming.id&&last.scoreText===incoming.scoreText&&last.status===incoming.status)return {buffer:[...buffer],dropped:0};
 const next=[...buffer,{...incoming,observedAt:incoming.observedAt||null,events:Array.isArray(incoming.events)?incoming.events.map(e=>({...e})):[]}];
 const dropped=Math.max(0,next.length-max);
 return {buffer:next.slice(dropped),dropped};
}
export function classifyUpdate(pending,visible){
 if(!pending)return 'NONE';
 if(!visible)return 'FIRST';
 if(pending.id!==visible.id)return 'FIRST';
 return pending.scoreText!==visible.scoreText||pending.status!==visible.status?'CHANGED':'UNCHANGED';
}
export function summarizeRevealed(match,prior){
 if(!match)return {title:'Awaiting your first reveal',text:'Scores remain concealed until you choose to see them.',evidence:[]};
 if(match.status==='SCHEDULED')return {title:'Fixture scheduled',text:'This source reports an upcoming match. No score or outcome is predicted.',evidence:[]};
 if(match.status==='UNKNOWN'||match.status==='UNCONFIRMED')return {title:'Status not independently confirmed',text:'The provider has not supplied sufficient fresh status evidence to certify active play.',evidence:[]};
 if(!prior)return {title:'Your first revealed snapshot',text:`Source-reported score: ${match.scoreText}. This is a score update, not a video or point-by-point tracking stream.`,evidence:[]};
 if(match.scoreText===prior.scoreText)return {title:'No reported score change',text:'The provider score has not changed since your previous revealed snapshot. Play may still have occurred.',evidence:[]};
 if(match.sport==='football'&&match.scoreHome!==null&&prior.scoreHome!==null)
  return {title:'Scoreboard updated',text:`The displayed score moved from ${prior.scoreText} to ${match.scoreText}. This is a source-observed difference, not an inferred goal narrative.`,evidence:match.events?.map(e=>e.label).slice(-3)||[]};
 return {title:'Scoreboard updated',text:`The provider snapshot moved from ${prior.scoreText} to ${match.scoreText}. Individual rallies or points cannot be inferred from aggregate set scores.`,evidence:[]};
}
function el(id,root=document){return root.getElementById(id);}
const dateLabel=iso=>{
 if(!iso)return 'Time unavailable';
 const d=new Date(iso);return Number.isNaN(d.getTime())?'Time unavailable':d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
};
export function mountLiveCenter(root=document,options={}){
 const live=el('liveCenterRoot',root),demo=el('demoAppShell',root);
 if(!live||!demo)return null;
 const fetcher=options.fetcher || ((...args)=>fetch(...args));
 const timerMs=options.refreshMs||45000;
 let sport='tennis',catalog=null,selectedId=null,visible=null,pending=null,lastRevealed=null,buffer=[],droppedCount=0;
 let activeFetch=0,loading=false,loop=null,mode='live',disposed=false;
 const byId=id=>el(id,root);
 function modeSet(next){
  mode=next==='demo'?'demo':'live';
  live.hidden=mode!=='live';demo.hidden=mode!=='demo';
  byId('xpGoLive').classList.toggle('is-selected',mode==='live');
  byId('xpGoDemo').classList.toggle('is-selected',mode==='demo');
  byId('xpGoLive').setAttribute('aria-current',mode==='live'?'page':'false');
  byId('xpGoDemo').setAttribute('aria-current',mode==='demo'?'page':'false');
  if(mode==='live'&&!catalog)load();
  try{history.replaceState(null,'',mode==='demo'?'#demo':'#live');}catch(_){}
  if(mode==='demo')return;
  render();
 }
 function match(){return catalog?.matches?.find(m=>m.id===selectedId)||null;}
 function setText(id,value){const node=byId(id);if(node)node.textContent=value;}
 function resetViewer(){
  selectedId=null;visible=null;pending=null;lastRevealed=null;buffer=[];droppedCount=0;
 }
 function queueIncoming(incoming){
  // Capture observation time once. Subsequent catalog refreshes cannot rewrite a revealed timestamp.
  const result=appendSnapshot(buffer,visible,{...incoming,observedAt:incoming.observedAt||catalog?.fetchedAt||new Date().toISOString()},40);
  buffer=result.buffer;droppedCount+=result.dropped;pending=buffer[0]||null;
 }
 function render(){
  const src=catalog?.source;
  const status=catalog?.status||'CONNECTING';
  const isStale=status==='STALE'||catalog?.stale;
  const providerOk=status==='OK';
  setText('lcSportTitle',NAMES[sport]);
  setText('lcMatchCount',(catalog?.matches?.length||0)+' fixtures');
  setText('lcStatusBadge',loading?'Refreshing provider…':isStale?'⚠ Cached · refresh failed':status==='OK'?'● Provider connected':status==='CONFIG_REQUIRED'?'Connector required':status==='UNAVAILABLE'?'Source unavailable':'Connecting…');
  setText('lcProviderMessage',catalog?.message||'Contacting the external score source. No synthetic fallbacks.');
  setText('lcSourceName',src?'SOURCE / '+src.name.toUpperCase():'SOURCE / CONNECTING');
  setText('lcFetchTime',catalog?.fetchedAt?'Fetched '+dateLabel(catalog.fetchedAt)+(isStale?' · stale data':''):'Awaiting response');
  const sourceLink=byId('lcSourceLink');
  if(sourceLink){sourceLink.href=src?.url||'https://www.openligadb.de/';sourceLink.textContent='View provider ↗';}
  for(const btn of root.querySelectorAll('[data-lc-sport]')){
   const on=btn.getAttribute('data-lc-sport')===sport;btn.classList.toggle('is-selected',on);btn.setAttribute('aria-pressed',String(on));
  }
  const list=byId('lcMatchList');
  const focusedMatchId=list.contains(root.activeElement)?root.activeElement?.dataset?.matchId:null;
  list.replaceChildren();
  if(!catalog?.matches?.length){
   const div=root.createElement('div');div.className='lc-empty';
   div.textContent=status==='CONFIG_REQUIRED'?'Cricket scores need an authorized provider key. The Demo Lab remains fully usable; we never mislabel its simulation as live.':
    status==='UNAVAILABLE'?'External source temporarily unavailable. Your last revealed score, if any, stays on screen until you change sports or select another fixture.':
    'No fixtures were returned for this sport in the available provider window. We do not invent matches or scores.';
   list.appendChild(div);
  }
  for(const m of catalog?.matches||[]){
   const btn=root.createElement('button');btn.type='button';btn.className='lc-match'+(selectedId===m.id?' is-followed':'');
   btn.dataset.matchId=m.id;
   btn.setAttribute('aria-pressed',String(selectedId===m.id));
   const content=root.createElement('div');content.className='lc-match-content';
   const league=root.createElement('div');league.className='lc-match-league';league.textContent=(m.league||sport)+(m.stage?' · '+m.stage:'');
   const teams=root.createElement('div');teams.className='lc-match-teams';teams.textContent=m.home+'  vs  '+m.away;
   const time=root.createElement('div');time.className='lc-match-time';time.textContent=dateLabel(m.startTime);
   content.append(league,teams,time);
   const right=root.createElement('div');right.className='lc-match-right';
   const state=root.createElement('span');state.className='lc-state lc-state-'+(m.status==='LIVE'?'live':m.status==='SCHEDULED'?'scheduled':'final');
   // Even match completion can be a spoiler. Only scheduled (future) fixtures are marked publicly.
   // In particular, an old live match becoming FINAL cannot spoil a delayed fan's outcome.
   state.textContent=m.status==='SCHEDULED'?'UPCOMING':'◈ STATUS SHIELDED';
   const shield=root.createElement('span');shield.className='lc-obscured';shield.textContent='♢ SCORE SHIELDED';
   right.append(state,shield);btn.append(content,right);
   btn.addEventListener('click',()=>{
    if(selectedId!==m.id){selectedId=m.id;visible=null;lastRevealed=null;buffer=[];droppedCount=0;}
    if(catalog?.status==='OK'&&!catalog?.stale)queueIncoming(m);
    render();
    byId('lcReveal').focus();
   });
   list.appendChild(btn);
  }
  if(focusedMatchId){const same=[...list.querySelectorAll('[data-match-id]')].find(b=>b.dataset.matchId===focusedMatchId);same?.focus();}
  const current=match();
  const selected=byId('lcSelected');selected.replaceChildren();
  const overline=root.createElement('span');overline.className='lc-selected-overline';
  overline.textContent=current?'FOLLOWING / '+sport.toUpperCase():'NO MATCH FOLLOWED';
  const title=root.createElement('h4');title.textContent=current?current.home+' vs '+current.away:'Select a fixture to begin';
  const desc=root.createElement('p');desc.textContent=current?(current.league+' · '+(current.stage||'Externally sourced fixture')):
    'Match cards deliberately conceal the score. Select a fixture, then reveal only when your stream has caught up.';
  selected.append(overline,title,desc);
  const latest=current?pending:null;
  const reveal=byId('lcReveal');reveal.disabled=!latest||isStale||!providerOk;
  reveal.textContent=visible?'Reveal next buffered update  →':'Reveal first buffered score  →';
  reveal.setAttribute('aria-label',buffer.length?`Reveal 1 of ${buffer.length} buffered score snapshots`:'No new score updates available');
  setText('lcPending',!current?'Follow a fixture to protect its incoming results.':
   isStale?'Provider refresh failed. Updates are stale; manual reveal is disabled.':
   buffer.length>0?'◈ '+buffer.length+' source snapshot'+(buffer.length===1?'':'s')+' waiting in order behind SyncShield.'+(droppedCount?' '+droppedCount+' oldest updates were dropped after buffer saturation.':''):
   'No newly observed score changes. Next provider refresh is buffered, not auto-revealed.');
  setText('lcVisibleScore',visible?visible.scoreText:'♢  Score hidden');
  setText('lcVisibleMatchStatus',visible?'Provider status at reveal: '+(visible.providerStatus||visible.status):'Status and result protected until reveal');
  setText('lcSourceTime',visible?'Snapshot received '+dateLabel(visible.observedAt||visible.updatedAt||null):'Not yet revealed');
  const info=summarizeRevealed(visible,lastRevealed);
  setText('lcInsightTitle',info.title);setText('lcInsightBody',info.text);
  const evidence=byId('lcEvidence');evidence.replaceChildren();
  if(visible?.status==='FINAL'&&!visible?.updatedAt){
    const p=root.createElement('div');p.className='lc-evidence-item';p.textContent='Final status is provider-reported. Last-update timestamp unavailable.';evidence.appendChild(p);
  }
  for(const txt of info.evidence||[]){
    const p=root.createElement('div');p.className='lc-evidence-item';p.textContent=txt;evidence.appendChild(p);
  }
 }
 async function load(){
  if(disposed)return;
  const generation=++activeFetch;
  loading=true;render();
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),16000);
  try{
   const response=await fetcher('/api/sports/matches?sport='+encodeURIComponent(sport),{signal:controller.signal,cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   if(generation!==activeFetch||disposed)return;
   if(data.sport!==sport||!Array.isArray(data.matches))throw Error('Invalid provider response');
   catalog=data;
   if(selectedId){
    const next=match();
    if(next){if(data.status==='OK'&&!data.stale)queueIncoming(next);}else{
      // Preserve the fan's already-revealed data, but do not invent a fresh update.
      buffer=[];pending=null;
      if(visible)catalog={...data,matches:[{...visible,status:'UNCONFIRMED',detail:'No longer returned in the current provider window; data is stale.'},...data.matches],status:'STALE',stale:true,message:'Followed fixture is no longer in the current feed. Last revealed information is retained but is stale.'};
      else resetViewer();
    }
   }
  }catch(err){
   if(generation!==activeFetch||disposed)return;
   catalog=catalog?{...catalog,status:'STALE',stale:true,message:'Refresh failed. The previously fetched catalog may be stale. Please retry.'}:
    {sport,status:'UNAVAILABLE',matches:[],message:'Provider could not be reached. The app does not invent substitute scores.'};
  }finally{
   clearTimeout(timeout);
   if(generation===activeFetch&&!disposed){loading=false;render();}
  }
 }
 function switchSport(next){
  if(!SPORTS.includes(next)||next===sport)return;
  sport=next;catalog=null;resetViewer();activeFetch++;load();
 }
 function reveal(){
  const current=match();
  if(!current||!pending||catalog?.stale||catalog?.status!=='OK')return;
  lastRevealed=visible;
  visible=buffer.shift()||null;
  pending=buffer[0]||null;
  render();
 }
 byId('xpGoLive').addEventListener('click',()=>modeSet('live'));
 byId('xpGoDemo').addEventListener('click',()=>modeSet('demo'));
 byId('lcGoDemo').addEventListener('click',()=>modeSet('demo'));
 byId('lcHeroExplore').addEventListener('click',()=>byId('lcWorkspace').scrollIntoView({behavior:'smooth',block:'start'}));
 byId('lcRefresh').addEventListener('click',load);
 byId('lcReveal').addEventListener('click',reveal);
 for(const button of root.querySelectorAll('[data-lc-sport]'))button.addEventListener('click',()=>switchSport(button.getAttribute('data-lc-sport')));
 loop=setInterval(()=>{if(mode==='live'&&!disposed && (typeof document==='undefined'||document.visibilityState==='visible'))load();},timerMs);
 modeSet(typeof location!=='undefined'&&location.hash==='#demo'?'demo':'live');
 return {load,render,reveal,selectSport:switchSport,setMode:modeSet,getState:()=>({sport,catalog,selectedId,visible,pending,mode}),dispose(){disposed=true;clearInterval(loop);activeFetch++;}};
}
if(typeof document!=='undefined'){
 const boot=()=>{window.SyncPulseLiveCenter=mountLiveCenter();};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
}
