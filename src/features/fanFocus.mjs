/**
 * Fan Focus: ad-break recovery, visible-only shareable receipts and opt-in audio.
 * Adapted from the DeepSeek prototype's over-break, receipt and Web Audio concepts.
 * Only consumes the immutable viewer-visible projection, never stadium state.
 */
export function summarizeVisibleSince(state, mark = null) {
  if (!state || !Array.isArray(state.visibleEvents)) return null;
  const cursor = Number.isInteger(state.viewerCursorSeq) ? state.viewerCursorSeq : 0;
  const markSeq = mark && mark.scenarioId === state.scenarioId
    ? Math.min(cursor, Math.max(0, Number(mark.cursor) || 0)) : 0;
  const events = state.visibleEvents.filter(e => Number(e.seq) > markSeq && Number(e.seq) <= cursor);
  const total = events.reduce((n,e)=>n+(Number(e.runsTotal)||0),0);
  const wickets = events.filter(e=>e.isWicket).length;
  const boundaries = events.filter(e=>!e.extraType && (Number(e.runsBat)===4 || Number(e.runsBat)===6)).length;
  const extras = events.filter(e=>Boolean(e.extraType)).length;
  const dots = events.filter(e=>!e.isWicket && !e.extraType && (Number(e.runsTotal)||0)===0).length;
  const highlights = events.slice(-6).map(e=>{
    const what = e.isWicket ? 'WICKET' : e.extraType ? String(e.extraType).replace('_',' ') : e.runsBat===4 ? 'FOUR' : e.runsBat===6 ? 'SIX' : (Number(e.runsTotal)||0)+' run(s)';
    return {id:String(e.id||'event'),seq:e.seq,over:String(e.overBallLabel||'?'),summary:what};
  });
  const diff = mark && mark.scenarioId===state.scenarioId ? 'since your bookmark' : 'up to your viewer cursor';
  const overview = events.length
    ? `${events.length} revealed deliveries ${diff}: ${total} runs, ${wickets} wicket${wickets===1?'':'s'}, ${boundaries} boundar${boundaries===1?'y':'ies'}.`
    : 'No newly revealed deliveries since your bookmark. Hidden stadium events remain excluded.';
  return Object.freeze({
    scenarioId:state.scenarioId,cursor,visibleThrough:state.viewerVisibleThrough || state.oversFormatted || '?',
    score:`${state.scoreRuns}/${state.scoreWickets}`,batting:state.teams?.batting||'Batting side',
    bowling:state.teams?.bowling||'Bowling side',required:state.runsRequired,ballsLeft:state.legalBallsRemaining,
    total,wickets,boundaries,extras,dots,count:events.length,highlights,overview
  });
}
export function makeFanReceipt(summary) {
  if (!summary) return '';
  const recent=summary.highlights.map(e=>`${e.over}: ${e.summary}`).join(' | ') || 'No visible new deliveries';
  return [
    '🏏 SyncPulse11 | SPOILER-SAFE FAN RECEIPT',
    `${summary.batting} vs ${summary.bowling} • ${summary.score} (${summary.visibleThrough} overs visible)`,
    summary.overview,
    `Chase: ${summary.required} required from ${summary.ballsLeft} legal balls remaining.`,
    `Visible-only timeline: ${recent}`,
    'Only deliveries already revealed to this viewer are included.',
    'Illustrative/simulated cricket demo. Not an official live match feed.'
  ].join('\n');
}
export function makeVisibleBookmark(state) {
  if (!state || !Number.isInteger(state.viewerCursorSeq)) return null;
  return Object.freeze({scenarioId:state.scenarioId,cursor:state.viewerCursorSeq});
}
export function mountFanFocus(root=document, getViewerState=()=>window.SyncPulseFanVisibleState) {
  const byId=x=>root.getElementById(x);
  const openBtn=byId('fanFocusOpen'),panel=byId('fanFocusPanel'),close=byId('fanFocusClose');
  if (!openBtn || !panel || !close) return null;
  const markBtn=byId('fanFocusMark'),recapBtn=byId('fanFocusRecap'),copyBtn=byId('fanFocusCopy');
  const voiceBtn=byId('fanFocusVoice'),breakBtn=byId('fanFocusBreak'),timerEl=byId('fanFocusTimer');
  const overviewEl=byId('fanFocusOverview'),listEl=byId('fanFocusHighlights'),statusEl=byId('fanFocusStatus');
  const resultEl=byId('fanFocusResult');
  let mark=null,summary=null,lastScenario=null,tick=null,deadline=0,openingFocus=null;
  const setStatus=s=>{statusEl.textContent=s;};
  const safe=()=>{const s=getViewerState();return s && Array.isArray(s.visibleEvents)?s:null;};
  function stopTimer(){
    if(tick!==null){clearInterval(tick);tick=null;}
    deadline=0;timerEl.textContent='00:45';
    breakBtn.textContent='Start 45s Ad-Break';
  }
  function refresh(){
    const state=safe();
    if(!state){setStatus('Viewer state not ready');return;}
    if(lastScenario!==null && lastScenario!==state.scenarioId){mark=null;stopTimer();}
    lastScenario=state.scenarioId;
    summary=summarizeVisibleSince(state,mark);
    overviewEl.textContent=summary.overview;
    statusEl.textContent=`${mark?.scenarioId===state.scenarioId?'Bookmarked event #'+mark.cursor:'No bookmark yet'} • Viewer-safe through ${summary.visibleThrough} ov`;
    listEl.replaceChildren();
    for(const e of summary.highlights){
      const li=root.createElement('li');
      li.textContent=`#${e.seq} • ${e.over} — ${e.summary}`;
      listEl.appendChild(li);
    }
    if(!summary.highlights.length){
      const li=root.createElement('li');li.textContent='No visible events in this catch-up window';listEl.appendChild(li);
    }
    resultEl.textContent=`${summary.batting} ${summary.score} • ${summary.required} needed / ${summary.ballsLeft} balls`;
  }
  const open=()=>{openingFocus=root.activeElement;panel.hidden=false;panel.setAttribute('aria-hidden','false');refresh();close.focus();};
  const hide=()=>{panel.hidden=true;panel.setAttribute('aria-hidden','true');window.speechSynthesis?.cancel();speaking=false;voiceBtn.textContent='Read aloud';openingFocus?.focus?.();};
  openBtn.addEventListener('click',open);
  close.addEventListener('click',hide);
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();hide();}});
  markBtn.addEventListener('click',()=>{
    const state=safe();if(!state)return;
    mark=makeVisibleBookmark(state);refresh();
    setStatus(`Bookmarked viewer event #${mark.cursor}. Hidden stadium events remain shielded.`);
  });
  recapBtn.addEventListener('click',refresh);
  copyBtn.addEventListener('click',async()=>{
    refresh();const text=makeFanReceipt(summary);
    try{
      if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      setStatus('Copied viewer-safe receipt to clipboard.');
    }catch(_){setStatus('Clipboard unavailable. Use the recap displayed here instead.');}
  });
  let speaking=false;
  voiceBtn.addEventListener('click',()=>{
    if(speaking){
      window.speechSynthesis?.cancel();
      speaking=false;voiceBtn.textContent='Read aloud';
      setStatus('Voice playback stopped.');
      return;
    }
    refresh();
    if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){setStatus('Speech not supported on this browser.');return;}
    const u=new window.SpeechSynthesisUtterance(summary.overview+` ${summary.batting} ${summary.score} after ${summary.visibleThrough} overs.`);
    u.lang='en-IN';u.rate=1.0;
    u.onend=()=>{speaking=false;voiceBtn.textContent='Read aloud';};
    u.onerror=()=>{speaking=false;voiceBtn.textContent='Read aloud';};
    window.speechSynthesis.cancel();window.speechSynthesis.speak(u);
    speaking=true;
    setStatus('Reading viewer-safe recap. Tap Stop voice to cancel.');
    voiceBtn.textContent='Stop voice';
  });
  function chime(){
    try{
      const C=window.AudioContext||window.webkitAudioContext;if(!C)return;
      const ctx=new C(),o=ctx.createOscillator(),g=ctx.createGain();
      o.type='sine';o.frequency.setValueAtTime(660,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(880,ctx.currentTime+0.2);
      g.gain.setValueAtTime(0.0001,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.06,ctx.currentTime+0.04);g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.32);
      o.connect(g);g.connect(ctx.destination);o.start();o.stop(ctx.currentTime+0.34);o.onended=()=>ctx.close();
    }catch(_){} // Cosmetic audio; non-fatal
  }
  breakBtn.addEventListener('click',()=>{
    if(tick!==null){stopTimer();setStatus('Ad-break timer stopped.');return;}
    mark=makeVisibleBookmark(safe());
    if(!mark)return;
    deadline=Date.now()+45000;
    breakBtn.textContent='Cancel Ad-Break';
    setStatus('45-second simulated break. Scores remain protected at the viewer cursor.');
    const update=()=>{
      const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));
      timerEl.textContent=`00:${String(seconds).padStart(2,'0')}`;
      if(seconds===0){stopTimer();refresh();setStatus('Break over! Refresh recap to review only visible balls.');chime();}
    };
    tick=setInterval(update,250);update();
  });
  const pulse=setInterval(()=>{if(!panel.hidden)refresh();},1200);
  panel.hidden=true;
  return {refresh,dispose(){clearInterval(pulse);stopTimer();},getMark:()=>mark};
}
if(typeof document!=='undefined' && typeof window!=='undefined'){
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mountFanFocus(),{once:true});
  else mountFanFocus();
}
