/* Companion ("Nova" by default). Offline rule engine first; optional Enhanced mode via main-process bridge.
   Everything the companion states about the app comes from window.RCPT (live state), never from invented numbers. */
(function(){
'use strict';
var CFG=window.NOVA_CONFIG,R=window.RCPT,$=function(i){return document.getElementById(i)};
var bridge=window.novaBridge||null;
var fmt=function(n,k){return (+n).toFixed(k==null?1:k)};
/* ---------- settings (non-secret only; API key lives in the main process) ---------- */
var ls={get:function(k,d){try{var v=localStorage.getItem('nova.'+k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:function(k,v){try{localStorage.setItem('nova.'+k,JSON.stringify(v))}catch(e){}}};
var S={
  companion:ls.get('companion',CFG.name),userName:ls.get('userName',CFG.userTitle),
  mode:ls.get('mode','offline'),endpoint:ls.get('endpoint',CFG.defaultEndpoint),model:ls.get('model',CFG.defaultModel),
  voiceOn:ls.get('voiceOn',true),soundOn:false /* alert tone is always off at startup */
};
if(!CFG.companions[S.companion])S.companion=CFG.name;
var N=function(){return S.companion},U=function(){return S.userName||CFG.userTitle};
var isLocalUrl=function(u){try{var h=new URL(u).hostname;return h==='localhost'||h==='127.0.0.1'||h==='[::1]'}catch(e){return false}};
var enhancedActive=function(){return S.mode==='enhanced'&&!!bridge};
var esc=function(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};

/* ---------- mascot ---------- */
function mascotSVG(){
  var c=CFG.companions[S.companion],x=c.extra,b=c.body,t=c.trim,o='<svg class="nv-m" viewBox="0 0 120 120" data-st="idle" aria-hidden="true" focusable="false">';
  if(x==='ring')o+='<ellipse cx="60" cy="70" rx="56" ry="13" fill="none" stroke="'+t+'" stroke-width="3" transform="rotate(-16 60 70)" opacity=".8"/>';
  o+='<line x1="60" y1="18" x2="60" y2="30" stroke="'+t+'" stroke-width="3"/><circle class="bulb" cx="60" cy="14" r="5"/>';
  if(x==='ears')o+='<circle cx="27" cy="50" r="10" fill="'+t+'"/><circle cx="93" cy="50" r="10" fill="'+t+'"/>';
  o+='<g class="body"><circle cx="22" cy="86" r="7" fill="'+b+'" stroke="'+t+'" stroke-width="2"/><circle cx="98" cy="86" r="7" fill="'+b+'" stroke="'+t+'" stroke-width="2"/>'+
   '<circle cx="60" cy="68" r="40" fill="'+b+'" stroke="'+t+'" stroke-width="3"/><rect x="34" y="44" width="52" height="30" rx="15" fill="#0b1626" stroke="'+t+'" stroke-width="2"/>'+
   '<ellipse class="eye" cx="49" cy="59" rx="4.5" ry="6"/><ellipse class="eye" cx="71" cy="59" rx="4.5" ry="6"/>'+
   '<path class="happyeye" d="M43 62 q6 -9 12 0"/><path class="happyeye" d="M65 62 q6 -9 12 0"/>'+
   '<circle class="halo" cx="60" cy="90" r="10"/><path class="heart" d="M60 97 c-8 -5 -10 -11 -4 -12 c2 0 4 1 4 3 c0 -2 2 -3 4 -3 c6 1 4 7 -4 12z"/></g></svg>';
  return o;
}
var baseMood='idle',moodTimer=null;
function paintMood(m){document.querySelectorAll('.nv-m').forEach(function(e){e.setAttribute('data-st',m)})}
function mood(m,ms){clearTimeout(moodTimer);paintMood(m);if(ms)moodTimer=setTimeout(function(){paintMood(baseMood)},ms)}
function setTier(t){baseMood=t==='nominal'?'idle':'alert';document.documentElement.style.setProperty('--glow',CFG.glow[t]);paintMood(baseMood)}

/* ---------- UI ---------- */
var dock=document.createElement('div');dock.id='nv-dock';dock.hidden=true;
dock.innerHTML='<div class="nv-bubble" id="nv-bub" hidden role="status"></div>'+
'<section class="nv-panel" id="nv-panel" aria-label="Crew companion chat">'+
 '<div class="nv-head"><span id="nv-m1"></span><div class="who"><div class="nm" id="nv-nm"></div><span class="nv-badge" id="nv-badge"></span></div>'+
 '<button class="nv-ib" id="nv-voice" type="button" aria-pressed="true" title="Voice replies on/off (M)" aria-label="Voice replies"></button>'+
 '<button class="nv-ib" id="nv-snd" type="button" aria-pressed="false" title="Alert tone on/off (S)" aria-label="Alert tone">&#128276;</button>'+
 '<button class="nv-ib" id="nv-min" type="button" title="Minimise (C)" aria-label="Minimise chat">&#8212;</button></div>'+
 '<div class="nv-log" id="nv-log" role="log" aria-live="polite" aria-label="Conversation and captions"></div>'+
 '<div class="nv-chips" id="nv-chips"></div>'+
 '<form class="nv-row" id="nv-form"><input id="nv-in" type="text" autocomplete="off" aria-label="Message"><button class="nv-ib" id="nv-send" type="submit" title="Send" aria-label="Send">&#10148;</button>'+
 '<button class="nv-ib" id="nv-mic" type="button" title="Hold to talk (Space)" aria-label="Push to talk">&#127908;</button></form>'+
 '<div class="nv-note" id="nv-note"></div></section>'+
'<button id="nv-fab" type="button" aria-label="Open crew companion" hidden></button>';
document.body.appendChild(dock);
var cap=document.createElement('div');cap.id='nv-cap';cap.hidden=true;cap.setAttribute('role','status');cap.setAttribute('aria-live','polite');document.body.appendChild(cap);

function modal(id,html){var m=document.createElement('div');m.className='nv-modal';m.id=id;m.hidden=true;m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.innerHTML='<div class="nv-card">'+html+'</div>';document.body.appendChild(m);m.addEventListener('mousedown',function(e){if(e.target===m)closeModal()});return m}
var openM=null,lastFocus=null;
function openModal(id){closeModal();lastFocus=document.activeElement;openM=$(id);openM.hidden=false;var f=openM.querySelector('input,select,button');if(f)f.focus()}
function closeModal(){if(openM){openM.hidden=true;openM=null;if(lastFocus&&lastFocus.focus)lastFocus.focus()}}
document.addEventListener('keydown',function(e){if(!openM||e.key!=='Tab')return;var f=[].slice.call(openM.querySelectorAll('input,select,button,a[href]')).filter(function(x){return !x.disabled});if(!f.length)return;var a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){z.focus();e.preventDefault()}else if(!e.shiftKey&&document.activeElement===z){a.focus();e.preventDefault()}});

modal('nv-about','<button class="nv-ib x" type="button" data-close aria-label="Close">&#10005;</button><h3>About RCPT</h3>'+
 '<p><b>Radiation-Coupled Physiological Twin</b> is an offline-first concept for Moon-to-Mars crew health, built for the NASA Space Apps Challenge 2026.</p>'+
 '<p>v1.5 adds image assessment (rule-based cues, not a diagnosis), the crew avatar, the Earth-Mars ground link and daily wellness quests.</p>'+
 '<h4>How the number is made</h4><p>R = 0.40&middot;radiation + 0.35&middot;HRV strain + 0.25&middot;sleep debt + interaction. Interaction = 0.05&middot;dose&middot;sleep debt + 0.03&middot;dose&middot;HRV strain. The &minus;4.2/+4.8 interval is a fixed band, not a statistical posterior. Elevated at 35, emergency at 70 or 10 mSv/hr.</p>'+
 '<h4>What is simulated, and what is real</h4><p>Every crew input (radiation, HRV, sleep debt, the 40 h storm, the demo story, the shelter reduction) is simulated or assumed. Nothing here is a mission measurement. The real parts: the Mars dose model is calibrated to Curiosity\'s published 0.64 mSv/day, and Data &amp; Validation can show NOAA\'s proton-flux feed (live, cached or a bundled reference, always labelled). The Validation tab shows where the model is wrong. The physiological weights are not validated.</p>'+
 '<h4>The companion</h4><p>The companion answers with a local rule engine that works with no internet. Enhanced mode is optional and off by default. It is not a doctor: it gives no diagnoses and no medication doses. For any real health concern, contact a flight surgeon or a doctor.</p>'+
 '<p><b>Research prototype, not a medical device. Independent project, not affiliated with or endorsed by NASA.</b></p>');
modal('nv-keys','<button class="nv-ib x" type="button" data-close aria-label="Close">&#10005;</button><h3>Keyboard shortcuts</h3><table>'+
 '<tr><td><kbd>Enter</kbd></td><td>Launch from the splash screen</td></tr><tr><td><kbd>F11</kbd></td><td>Fullscreen (desktop app)</td></tr>'+
 '<tr><td><kbd>Space</kbd></td><td>Hold to talk (when no button or field is focused)</td></tr><tr><td><kbd>M</kbd></td><td>Mute or unmute voice replies</td></tr>'+
 '<tr><td><kbd>S</kbd></td><td>Alert tone on or off (off by default)</td></tr><tr><td><kbd>C</kbd></td><td>Show or hide the chat panel</td></tr>'+
 '<tr><td><kbd>/</kbd></td><td>Type a message to the companion</td></tr><tr><td><kbd>D</kbd></td><td>Start or stop Demo Mode</td></tr><tr><td><kbd>O</kbd></td><td>Open Orion, the Mars atlas and expedition game</td></tr>'+
 '<tr><td><kbd>B</kbd></td><td>Mission Debrief</td></tr><tr><td><kbd>A</kbd></td><td>Crew Avatar (clickable body)</td></tr><tr><td><kbd>I</kbd></td><td>Optical / Image Assessment</td></tr><tr><td><kbd>L</kbd></td><td>Ground communications link</td></tr><tr><td><kbd>?</kbd> buttons</td><td>Click any small round ? to see how that number is computed</td></tr><tr><td><kbd>?</kbd></td><td>This sheet</td></tr><tr><td><kbd>Esc</kbd></td><td>Close dialogs, stop the demo</td></tr></table>');
modal('nv-set','<button class="nv-ib x" type="button" data-close aria-label="Close">&#10005;</button><h3>Settings</h3>'+
 '<label for="st-user">Your name (what the companion calls you)</label><input type="text" id="st-user" maxlength="24">'+
 '<label for="st-comp">Companion</label><select id="st-comp"></select>'+
 '<h4>Answer engine</h4><label for="st-mode">Mode</label><select id="st-mode"><option value="offline">Offline (local rules, default)</option><option value="enhanced">Enhanced (LLM you provide)</option></select>'+
 '<div id="st-enh"><label for="st-ep">Chat endpoint (OpenAI-compatible; Ollama default)</label><input type="text" id="st-ep">'+
 '<label for="st-model">Model</label><input type="text" id="st-model">'+
 '<label for="st-key">API key (optional for a local model)</label><input type="password" id="st-key" autocomplete="off" placeholder="paste key, then press Save key">'+
 '<div class="row"><button class="tb" type="button" id="st-savekey">Save key</button><button class="tb" type="button" id="st-clearkey">Delete key</button><button class="tb" type="button" id="st-test">Test connection</button></div>'+
 '<div class="st" id="st-status"></div><p class="st">In Enhanced mode your questions and the live simulated readings are sent to the endpoint above. Commands, safety replies and the debrief are still handled locally.</p></div>'+
 '<div class="row"><button class="tb go" type="button" id="st-ok">Save settings</button></div>');
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-close]'))closeModal()});

function applyCompanion(){
  var n=N();$('nv-m1').innerHTML=mascotSVG();$('nv-fab').innerHTML='<span class="nv-bubble" id="nv-fabtxt" hidden></span>'+mascotSVG().replace('class="nv-m"','class="nv-m big"');
  $('nv-nm').textContent=n;$('nv-in').placeholder='Ask '+n+'...';$('nv-fab').setAttribute('aria-label','Open '+n+', your crew companion');
  $('nv-chips').innerHTML=['Why is my risk high?','What should I do now?','What if I sleep 2 more hours?','Run the solar storm','Go back to nominal'].map(function(q){return '<button type="button">'+q+'</button>'}).join('');
  $('nv-note').textContent='Simulated data only. Research prototype, not a medical device. Voice input uses your system speech service and may need internet; typing is always offline.';
  paintMood(baseMood);setBadge();voiceBtn();
}
function setBadge(){
  var b=$('nv-badge'),side=document.querySelector('.side .badge');
  var label,enh=enhancedActive();
  if(enh){label=isLocalUrl(S.endpoint)?'Enhanced (local model)':'Enhanced (online)';b.className='nv-badge enh'}else{label='Offline (local)';b.className='nv-badge'}
  b.textContent=label;if(side)side.innerHTML='<i></i>'+(enh?label.toUpperCase():'OFFLINE LOCAL MODE');
}
function voiceBtn(){var b=$('nv-voice');b.innerHTML=S.voiceOn?'&#128266;':'&#128263;';b.setAttribute('aria-pressed',String(S.voiceOn));b.title=S.voiceOn?'Mute voice replies (M)':'Unmute voice replies (M)'}
function sndBtn(){$('nv-snd').setAttribute('aria-pressed',String(S.soundOn))}
function togglePanel(open){var p=$('nv-panel'),f=$('nv-fab');if(open==null)open=p.hidden;p.hidden=!open;f.hidden=open;if(open){$('nv-bub').hidden=true;scrollLog()}}
function scrollLog(){var l=$('nv-log');l.scrollTop=l.scrollHeight}
function addMsg(who,text){var d=document.createElement('div');d.className='nv-msg '+who;d.textContent=text;$('nv-log').appendChild(d);scrollLog();return d}

/* ---------- speech out (TTS) + captions ---------- */
var capTimer=null,bubTimer=null;
function say(text,o){
  o=o||{};addMsg('bot',text);hist.push({role:'assistant',content:text});if(hist.length>12)hist.shift();
  if(o.mood)mood(o.mood,4500);
  cap.textContent=N()+': '+text;cap.hidden=false;clearTimeout(capTimer);var ms=Math.max(3500,text.length*70);capTimer=setTimeout(function(){cap.hidden=true},ms);
  if($('nv-panel').hidden){var bt=$('nv-fabtxt');bt.textContent=text.length>140?text.slice(0,137)+'...':text;bt.hidden=false;clearTimeout(bubTimer);bubTimer=setTimeout(function(){bt.hidden=true},Math.min(ms,9000))}
  if(S.voiceOn&&'speechSynthesis' in window){
    try{if(!o.queue)speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(text);u.rate=CFG.voice.rate;u.pitch=CFG.voice.pitch;u.lang=CFG.voice.lang;
      u.onstart=function(){document.querySelectorAll('.nv-m').forEach(function(e){e.classList.add('talk')})};
      var end=function(){document.querySelectorAll('.nv-m').forEach(function(e){e.classList.remove('talk')})};u.onend=end;u.onerror=end;speechSynthesis.speak(u)}catch(e){}
  }
}
function stopSpeech(){try{speechSynthesis.cancel()}catch(e){}}

/* ---------- speech in (STT, push to talk) ---------- */
var SR=window.SpeechRecognition||window.webkitSpeechRecognition,rec=null,listening=false,heard='';
function startPTT(){
  if(listening)return;
  if(!SR){addMsg('sys','Voice input is not available in this runtime. Type your message instead.');return}
  try{rec=new SR();rec.lang=CFG.sttLang;rec.interimResults=true;rec.continuous=false;heard='';
    rec.onresult=function(e){var t='';for(var i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;heard=t;$('nv-in').value=t};
    rec.onerror=function(e){var m={'not-allowed':'Microphone permission was denied.','service-not-allowed':'Speech service is not allowed here.','network':'Speech recognition needs an online speech service and could not reach it. Typing still works offline.','no-speech':'I did not hear anything.','audio-capture':'No microphone found.'}[e.error]||('Voice input error: '+e.error);addMsg('sys',m)};
    rec.onend=function(){listening=false;$('nv-mic').setAttribute('aria-pressed','false');var t=$('nv-in').value.trim();if(heard&&t){$('nv-in').value='';send(t)}};
    rec.start();listening=true;$('nv-mic').setAttribute('aria-pressed','true');togglePanel(true);addMsg('sys','Listening...')}
  catch(e){listening=false;addMsg('sys','Voice input could not start.')}
}
function stopPTT(){if(rec&&listening){try{rec.stop()}catch(e){}}}

/* ---------- alert tone (off by default, 2 short beeps, no visual flashing) ---------- */
var actx=null;
function alertTone(){if(!S.soundOn)return;try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();[0,.4].forEach(function(dt){var o=actx.createOscillator(),g=actx.createGain();o.type='sine';o.frequency.value=880;g.gain.value=.0001;o.connect(g);g.connect(actx.destination);var t=actx.currentTime+dt;g.gain.exponentialRampToValueAtTime(.08,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.22);o.start(t);o.stop(t+.25)})}catch(e){}}

/* ---------- tools (shared by the local engine and the LLM) ---------- */
function stateLine(){var s=R.getState();return 'radiation '+fmt(s.d)+' mSv/hr, HRV '+Math.round(s.h)+' ms, sleep debt '+fmt(s.s)+' h, risk '+fmt(s.R)+' ('+s.tier+')'}
var TOOLS={
  set_inputs:{d:'Move the simulated input sliders. Omit a field to leave it unchanged.',p:{radiation_msv_hr:{type:'number',description:'0 to 50'},hrv_ms:{type:'number',description:'10 to 100'},sleep_debt_h:{type:'number',description:'0 to 10'}},
    run:function(a){var s=R.setInputs({d:a.radiation_msv_hr,h:a.hrv_ms,s:a.sleep_debt_h});return 'Inputs now: '+stateLine()}},
  run_scenario:{d:'Load a preset scenario.',p:{name:{type:'string',enum:['nominal','sleep_deprived','acute_spe']}},req:['name'],
    run:function(a){if(!R.setScenario(a.name))return 'Unknown scenario';return 'Scenario loaded: '+stateLine()}},
  run_simulation:{d:'Start the 40 hour simulated solar particle event.',p:{},run:function(){R.runSim();return 'Simulation started'}},
  stop_simulation:{d:'Stop a running simulation or the demo.',p:{},run:function(){stopDemo();R.stopSim();return 'Stopped'}},
  apply_shelter:{d:'Apply the assumed radiation shelter (cuts the simulated dose rate by the configured factor).',p:{},
    run:function(){var s=R.getState();R.setInputs({d:s.d*CFG.shelterFactor});return 'Shelter applied (assumed x'+CFG.shelterFactor+' dose rate). '+stateLine()}},
  start_demo:{d:'Start the 90 second scripted demo story.',p:{},run:function(){startDemo();return 'Demo started'}},
  mission_debrief:{d:'Show the five-line debrief of the last simulation.',p:{},run:function(){return debriefText()}}
};
function runTool(name,args){var t=TOOLS[name];if(!t)return 'Unknown tool '+name;try{return t.run(args||{})}catch(e){return 'Tool error'}}
function toolSchemas(){return Object.keys(TOOLS).map(function(k){var t=TOOLS[k];return{type:'function','function':{name:k,description:t.d,parameters:{type:'object',properties:t.p,required:t.req||[]}}}})}

/* ---------- explanations (built from the real model terms) ---------- */
function comps(s){return [['radiation',.4*s.fr],['low HRV (autonomic strain)',.35*s.fh],['sleep debt',.25*s.fs],['the dose-coupled interaction',s.it]].sort(function(a,b){return b[1]-a[1]})}
function tierWord(t){return t==='emergency'?'emergency':t==='elevated'?'elevated':'nominal'}
function whyText(s){
  var c=comps(s),top=c[0],o=U()+', the simulated risk is '+fmt(s.R)+' ('+tierWord(s.tier)+'; interval '+fmt(s.lo)+' to '+fmt(s.hi)+', a fixed band). ';
  if(s.R<10)o+='That is low. ';
  o+='Biggest driver: '+top[0]+', about '+fmt(top[1])+' points. ';
  if(s.it>=.5)o+='The interaction adds '+fmt(s.it)+': sleep debt × dose gives '+fmt(s.it1)+' and dose × HRV strain gives '+fmt(s.it2)+'. Both scale with dose, so a tired crew in a storm is hit harder than the parts add up.';
  else o+='The interaction adds only '+fmt(s.it)+' because dose is low. It grows fast when dose and sleep debt rise together.';
  return o;
}
function nowText(s){return U()+', right now the simulated state is '+tierWord(s.tier)+'. Illustrative protocol, '+s.protocol.toLowerCase()+': '+s.actions.join(' ')+' These are demo guidelines, not medical advice.'}
function statusText(s){return 'Simulated readings, '+U()+': radiation '+fmt(s.d)+' mSv/hr, HRV '+Math.round(s.h)+' ms, sleep debt '+fmt(s.s)+' h. Risk '+fmt(s.R)+', '+tierWord(s.tier)+'.'}
function num(t,re){var m=t.match(re);return m?parseFloat(m[1]):null}
function whatIfText(t,s){
  var d=s.d,h=s.h,sl=s.s,parts=[],assume='';
  var more=num(t,/sleep(?:ing)?(?:\s+for)?\s+(\d+(?:\.\d+)?)\s*(?:more\s+|extra\s+|additional\s+)?(?:h|hr|hrs|hours?)\b/);
  var setS=num(t,/sleep\s*debt\s*(?:is|was|were|goes?|rises?|drops?|falls?|to|at|of)?\s*(?:up\s+to|down\s+to)?\s*(\d+(?:\.\d+)?)/);
  var setD=num(t,/(?:radiation|dose)(?:\s*rate)?\s*(?:is|was|goes?|rises?|drops?|falls?|to|at|of)?\s*(?:up\s+to|down\s+to)?\s*(\d+(?:\.\d+)?)/);
  var setH=num(t,/hrv\s*(?:is|was|goes?|rises?|drops?|falls?|to|at|of)?\s*(?:up\s+to|down\s+to)?\s*(\d+(?:\.\d+)?)/);
  if(more!=null&&setS==null){sl=Math.max(0,s.s-more*CFG.sleepRepay);parts.push('you sleep '+fmt(more,0)+(more===1?' more hour':' more hours'));assume=' I assume 1 h of sleep repays '+fmt(CFG.sleepRepay)+' h of debt.'}
  if(setS!=null){sl=Math.min(10,setS);parts.push('sleep debt is '+fmt(sl)+' h')}
  if(setD!=null){d=Math.min(50,setD);parts.push('radiation is '+fmt(d)+' mSv/hr')}
  if(setH!=null){h=Math.max(10,Math.min(100,setH));parts.push('HRV is '+Math.round(h)+' ms')}
  if(/shelter/.test(t)){d=s.d*CFG.shelterFactor;parts.push('the crew shelters');assume+=' I assume the shelter cuts dose rate to '+Math.round(CFG.shelterFactor*100)+'%.'}
  if(!parts.length)return U()+', tell me what to change. For example: "what if I sleep 2 more hours?" or "what if radiation drops to 2?"';
  var m=R.M(d,h,sl),tier=R.tierOf(d,m.R),dr=m.R-s.R;
  return 'If '+parts.join(' and ')+', the simulated risk goes from '+fmt(s.R)+' to '+fmt(m.R)+' ('+tierWord(tier)+'). '+(Math.abs(dr)<.05?'No change.':(dr<0?'That is ':'That is ')+fmt(Math.abs(dr))+' points '+(dr<0?'lower':'higher')+'.')+(fmt(m.it)!==fmt(s.it)?' Interaction would be '+fmt(m.it)+' instead of '+fmt(s.it)+'.':'')+assume+' This is a what-if only; nothing was changed.';
}

/* ---------- debrief ---------- */
function debriefText(){
  var L=R.getLog(),a=L.data;if(a.length<2)return 'No simulation recorded yet, '+U()+'. Press "Run 40 h SPE simulation" or Demo Mode, then ask me for the debrief.';
  var u=L.unit==='h'?' h':' s',span=a[a.length-1].t-a[0].t,dt=span/(a.length-1),pk=a[0],emT=0,elT=0;
  a.forEach(function(r){if(r.R>pk.R)pk=r;if(r.tier==='emergency')emT+=dt;if(r.tier!=='nominal')elT+=dt});
  var maxD=Math.max.apply(null,a.map(function(r){return r.d})),last=a[a.length-1],names=['radiation','HRV strain','sleep debt','interaction'],bi=0;pk.bars.forEach(function(v,i){if(v>pk.bars[bi])bi=i});
  return ['1. Run: '+a.length+' simulated samples over '+fmt(span,0)+u+(L.unit==='h'?'':' of the demo story')+'. All inputs are simulated.',
   '2. Peak risk '+fmt(pk.R)+' at '+fmt(pk.t,L.unit==='h'?1:0)+u+'; peak dose rate '+fmt(maxD)+' mSv/hr.',
   '3. Time in emergency: '+fmt(emT,L.unit==='h'?1:0)+u+'. Time elevated or worse: '+fmt(elT,L.unit==='h'?1:0)+u+'.',
   '4. At the peak the top driver was '+names[bi]+' ('+fmt(pk.bars[bi])+' points); interaction added '+fmt(pk.bars[3])+'.',
   '5. Ended at risk '+fmt(last.R)+' ('+tierWord(last.tier)+'). Research prototype only. For real health concerns, see a flight surgeon.'].join('\n');
}


/* ---------- knowledge + small talk (offline) ---------- */
var KB=window.NOVA_KB||{mars:[],talk:[],facts:[],jokes:[],feelings:{},marsGuard:/$^/};
var pick=function(a){return a[Math.floor(Math.random()*a.length)]};
function fill(t){return t.replace(/\{U\}/g,U()).replace(/\{N\}/g,N()).replace(/\{STATE\}/g,stateBlurb())}
function stateBlurb(){var s=R.getState();if(!s)return '';return s.tier==='nominal'?'Your simulated crew state is calm.':s.tier==='elevated'?'Your simulated risk is elevated, so let\'s keep an eye on it.':'The simulation is in emergency, so let\'s deal with that first.'}
function marsAnswer(t,loose){
  if(!KB.marsGuard.test(t))return null;
  for(var i=0;i<KB.mars.length;i++){var e=KB.mars[i];if(e.re.test(t)){
    var a=e.a===null?pick(KB.facts):e.a;return{kind:'mars',text:a+(e.id==='random'||e.id==='overview'?'':' (From my built-in notes, rounded. Check NASA\'s Mars pages for details.)')}}}
  return loose?{kind:'mars',text:KB.mars.filter(function(e){return e.id==='overview'})[0].a}:null;
}
function talkAnswer(t){
  var f=KB.feelings;
  if(f.tired&&f.tired.re.test(t))return{kind:'feeling',text:fill(f.tired.a),mood:'idle'};
  if(f.low&&f.low.re.test(t))return{kind:'feeling',text:fill(f.low.a),mood:'idle'};
  if(/\b(what('s| is) (the )?time|what time is it|current time)\b/.test(t))return{kind:'talk',text:'Your computer\'s clock says '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+', '+U()+'. (That is Earth clock time, not mission time.)'};
  if(/\b(what('s| is) (the )?date|what day is (it|today)|today'?s date)\b/.test(t))return{kind:'talk',text:'Today is '+new Date().toLocaleDateString([],{weekday:'long',year:'numeric',month:'long',day:'numeric'})+' on your computer\'s calendar, '+U()+'.'};
  for(var i=0;i<KB.talk.length;i++){var e=KB.talk[i];if(e.re.test(t))return{kind:'talk',text:e.a===null?pick(KB.jokes):fill(e.a),mood:e.mood||(e.id==='joke'?'happy':null)}}
  return null;
}

/* ---------- local rule engine ---------- */
var hist=[];
var MED=/\b(diagnos\w*|prescri\w*|medicat\w*|medicine|dosage|dose of|how many (mg|pills|tablets)|\d+\s?(mg|mcg)\b|ibuprofen|aspirin|paracetamol|acetaminophen|antibiotic|painkiller|symptom\w*|chest pain|pain|dizzy|nause\w*|vomit\w*|faint\w*|bleed\w*|sick|ill\b|cancer|tumou?r|am i (ok|okay|fine|healthy|dying|safe)|is it safe for me|treat\w*|cure)\b/i;
var WHATIF=/\b(what if|what happens|what would|what will|if i|if we|suppose|how would|would it|how much would|what about)\b/i;
/* ---------- v1.4: validation / teach / crew / live data / language intents ---------- */
function openPanel(api,tab){try{api&&api.open(tab)}catch(e){}}
function v14(t,s){
  var S=window.RCPTScience,C=window.RCPTCrew,Th=window.RCPTTeach,I=window.RCPTi18n;
  if(S&&/\b(validat\w*|sources?|citations?|references?|sensitiv\w*|how accurate|accuracy|can i trust|is (this|the|your) model (right|accurate|correct|valid)|curiosity)\b/.test(t)&&!/\b(mars|rover)\b.*\b(fact|tell me about|what is)\b/.test(t)){
    var v=S.validation(),tab=/sensitiv/.test(t)?'sens':/source|citation|reference/.test(t)?'src':'valid';
    openPanel({open:function(){S.open(tab)}});
    if(!v)return{kind:'cmd',text:'Opening the validation panel, '+U()+'.'};
    return{kind:'cmd',text:'Opening it, '+U()+'. Honest summary: the Mars dose part is calibrated to Curiosity at Gale, and on a check it was not tuned to (the seasonal pressure swing) it gets the direction right but only about '+Math.round(v.ratio*100)+'% of the published size. The physiological weights are assumptions and are not validated. That is why I show you the sensitivity analysis too.'};
  }
  if(Th&&/\b(teach(ing)? mode|lessons?|tutorials?|start (a |the )?(mission|lesson)|teach me(?: how| to use|\s*[.!?]?$)|learn how|classroom|for (a )?(school|class|students))\b/.test(t)){Th.open();return{kind:'cmd',text:'Opening the teaching missions, '+U()+'. Each one takes three or four minutes and ends with one question.'}}
  if(C&&/\b(crew status|how is (the|my) crew|who is (most )?at risk|each crew|all crew|crew members?|multi[- ]?crew|the crew)\b/.test(t)&&!/\bcompanion\b/.test(t)){
    var st=s,rows=C.crew().map(function(c){var e=C.eff(c,st);return{n:c.name,R:e.R,tier:e.tier}}).sort(function(a,b){return b.R-a.R});
    return{kind:'crew',text:'Highest simulated risk: '+rows[0].n+' at '+fmt(rows[0].R)+' ('+tierWord(rows[0].tier)+'). '+rows.slice(1).map(function(r){return r.n+' '+fmt(r.R)}).join(', ')+'. Open Crew & Missions to edit locations and see mission dose.'}
  }
  if(S&&/\b(space ?weather|noaa|solar (flux|wind|activity)|proton flux|real[- ]?time|live data|latest storm|cached)\b/.test(t)){
    var w=S.swx();openPanel({open:function(){S.open('space')}});
    if(w&&w.flux10!=null)return{kind:'cmd',text:'Latest '+(w.kind==='live'?'live':w.kind==='cache'?'cached':'bundled reference')+' NOAA reading: '+fmt(w.flux10,w.flux10<10?2:0)+' pfu at 10 MeV and above, NOAA scale S'+w.sScale+'. That is not a crew dose; the panel shows how it can be mapped, with the assumption labelled.'};
    return{kind:'cmd',text:'Opening the space-weather tab, '+U()+'. The app only goes online when you press Fetch, and it keeps a cached copy for offline use.'}
  }
  if(I&&/\b(arabic|عربي|spanish|español|espanol|english)\b/.test(t)&&/\b(speak|switch|change|language|use|talk|in)\b/.test(t)){
    var code=/arabic|عربي/.test(t)?'ar':/spanish|español|espanol/.test(t)?'es':'en';I.set(code);return{kind:'cmd',text:code==='ar'?'تم تغيير اللغة إلى العربية.':code==='es'?'Idioma cambiado a español. Mis respuestas siguen en inglés por ahora.':'Language set to English.'}
  }
  var m;if(window.RCPTUI&&(m=t.match(/\bexplain\b.*\b(interaction|interval|ci\b|confidence|tier|threshold|risk|r_mrp|hrv|sleep|radiation|dose)/))&&!/\bwhy\b/.test(t)){
    var map={interaction:'inter',interval:'ci',ci:'ci',confidence:'ci',tier:'tier',threshold:'tier',risk:'R',r_mrp:'R',hrv:'hrv',sleep:'sleep',radiation:'rad',dose:'rad'};
    if(window.RCPTUI.explain(map[m[1]]))return{kind:'cmd',text:'Here is the step-by-step breakdown with your current numbers, '+U()+'.'}
  }
  return null;
}
function arLocal(text,t,s){
  var has=function(re){return re.test(text)},ar=function(x,mood){return{kind:'ar',text:x,mood:mood}};
  var tw={nominal:'طبيعية',elevated:'مرتفعة',emergency:'طوارئ'};
  if(has(/دواء|ادوية|أدوية|علاج|مرض|مريض|ألم|الم |أعراض|اعراض|تشخيص|جرعة دواء|حبوب/))return ar('لا أستطيع التشخيص ولا إعطاء نصائح دوائية. أنا نموذج بحثي وليس جهازًا طبيًا. إذا شعرت بسوء فعلي فتواصل مع طبيب الرحلة أو طبيب مختص.');
  if(has(/ما اسمك|اسمك|من انت|من أنت|مين انت/))return ar('اسمي '+N()+'، رفيقك في الطاقم. أشرح نموذج الخطر المحاكى وأحرّك الأشرطة لك. أنا نموذج بحثي مستقل، لا أتبع ناسا.');
  if(has(/شكرا|شكراً|مشكور|يعطيك/))return ar('على الرحب والسعة يا قائد.','happy');
  if(has(/كيف حالك|كيفك|شلونك|عامل ايه|عامل إيه|اخبارك|أخبارك/))return ar('أنا بخير، شكرًا لسؤالك! جاهز لمساعدتك. ماذا نراجع اليوم؟','happy');
  if(has(/مرحبا|مرحباً|اهلا|أهلا|أهلاً|السلام عليكم|صباح|مساء|هلا/))return ar('أهلاً بك يا قائد. كل شيء بخير هنا. اسألني عن الخطر أو قل «شغّل العاصفة».','happy');
  if(has(/(شغل|شغّل|ابدأ|ابدا|أطلق).*(عاصفة|محاكاة)|عاصفة شمسية/)&&!has(/أوقف|اوقف/)){runTool('run_simulation');return ar('أشغّل الآن محاكاة العاصفة الشمسية لمدة 40 ساعة. تبدأ العاصفة عند الساعة 12 وسأنبّهك عند الحاجة.')}
  if(has(/أوقف|اوقف|وقف|ايقاف|إيقاف/)){runTool('stop_simulation');return ar('تم الإيقاف. الأشرطة بيدك من جديد.')}
  if(has(/احتم|احتمي|ملجأ|ملجا|شيلتر/)){runTool('apply_shelter');var n=R.getState();return ar('أحتمي الآن. أفترض أن الملجأ يخفّض الجرعة المحاكاة إلى '+Math.round(CFG.shelterFactor*100)+'%. الخطر المحاكى الآن '+fmt(n.R)+'.')}
  if(has(/طبيعي|اعادة|إعادة|رجوع|ارجع/)){runTool('run_scenario',{name:'nominal'});return ar('عدنا إلى الوضع الطبيعي يا قائد.')}
  if(has(/أوريون|اوريون|خريطة|الخريطة|اطلس|أطلس/)&&window.Orion){window.Orion.open();return ar('أفتح أوريون. انقر على أي مكان في المريخ لترى الإشعاع والمخاطر الصحية هناك.')}
  if(has(/تعلم|تعلّم|درس|دروس|تعليم|مدرسة|طلاب/)&&window.RCPTTeach){window.RCPTTeach.open();return ar('أفتح المهمات التعليمية. كل مهمة تستغرق 3–4 دقائق وتنتهي بسؤال.')}
  if(has(/التحقق|المصادر|مصادر|دقة|دقيق|الحساسية/)&&window.RCPTScience){window.RCPTScience.open(has(/مصادر|المصادر/)?'src':has(/الحساسية/)?'sens':'valid');return ar('أفتح لوحة التحقق. باختصار: الجزء الخاص بإشعاع المريخ معايَر وفق كيوريوسيتي، أما أوزان الجزء الفسيولوجي فافتراضية وغير محققة.')}
  if(has(/الحالة|الوضع|الخطر|كم/)){return ar('الخطر المحاكى الآن '+fmt(s.R)+' من 100 (الحالة: '+tw[s.tier]+'). الجرعة '+fmt(s.d)+' ملي سيفرت/ساعة، وHRV '+Math.round(s.h)+' مللي ثانية، ودَين النوم '+fmt(s.s)+' ساعة. كل القيم محاكاة.')}
  if(has(/لماذا|ليش|ليه|اشرح|شرح/)){if(window.RCPTUI&&window.RCPTUI.explain('R'))return ar('هذا شرح خطوة بخطوة لمؤشر الخطر بأرقامك الحالية.')}
  if(has(/المريخ/))return ar('المريخ هو الكوكب الأحمر، رابع كواكب المجموعة الشمسية. غلافه الجوي رقيق جدًا (نحو 1% من ضغط الأرض) فلا يحميه من الإشعاع كثيرًا. افتح «أوريون» لاستكشاف الخريطة.');
  if(has(/مساعدة|ساعدني|ماذا تستطيع|ماذا تفعل|اوامر|أوامر/))return ar('جرّب: «ما الحالة؟»، «شغّل العاصفة»، «احتمِ الآن»، «أعد الوضع الطبيعي»، «أوريون»، «تعلّم»، «التحقق». لغتي العربية ما زالت محدودة.');
  return ar('لم أفهم ذلك تمامًا بعد، لغتي العربية محدودة حاليًا. جرّب: «ما الحالة؟» أو «شغّل العاصفة» أو «احتمِ». يمكنني الشرح بالإنجليزية أيضًا.');
}

function local(text){
  var t=text.toLowerCase().trim(),s=R.getState(),m;
  if(!t)return{kind:'empty',text:''};
  if(MED.test(t)&&!/(radiation dose|dose rate|risk)/.test(t))return{kind:'medical',text:'I can\'t diagnose anything or give medication advice, '+U()+'. I\'m a research prototype, not a medical device. If something feels wrong, please contact your flight surgeon or a doctor. I can explain the simulated model if that helps.'};
  if((m=t.match(/(?:call me|my name is|i am called|i'm called)\s+([a-z][a-z' -]{0,22})/))){S.userName=m[1].trim().replace(/\b\w/g,function(c){return c.toUpperCase()});ls.set('userName',S.userName);return{kind:'name',text:'Nice to meet you, '+S.userName+'. I\'ll call you that from now on.'}}
  if(/\b(debrief|summary of (the )?(run|simulation|mission)|summari[sz]e (the )?(run|simulation|mission))\b/.test(t)){return{kind:'debrief',text:debriefText()}}
  if(/\b(open|show|launch|start|play|load)\b.*\b(orion|mars map|mars atlas|the map|atlas|expedition|game)\b/.test(t)&&window.Orion){window.Orion.open();return{kind:'cmd',text:'Opening Orion, '+U()+'. Click anywhere on Mars to see the radiation and health outlook there.'}}
  var h15=window.RCPTv15&&window.RCPTv15.nova(t,s,text);if(h15)return h15;
  if(/[؀-ۿ]/.test(text))return arLocal(text,t,s);
  var ex;if((ex=v14(t,s)))return ex;
  var mk=marsAnswer(t);if(mk&&!/\b(set|make|change|put|raise|lower|increase|decrease|adjust)\b.*\b(radiation|hrv|sleep)\b/.test(t))return mk;
  if(/\b(start|run|begin|launch|play)\b.*\bdemo\b|\bdemo mode\b/.test(t)){runTool('start_demo');return{kind:'cmd',text:'Starting the 90 second demo, '+U()+'.'}}
  if(!WHATIF.test(t)){
    if(/\b(stop|halt|cancel|pause)\b.*\b(sim\w*|storm|demo|run)\b/.test(t)){runTool('stop_simulation');return{kind:'cmd',text:'Stopped. Sliders are yours again, '+U()+'.'}}
    if(/\b(run|start|trigger|begin|launch|simulate|hit me with)\b.*\b(solar|storm|spe|simulation|sim|particle)\b/.test(t)){runTool('run_simulation');return{kind:'cmd',text:'Running the 40 hour simulated solar storm, '+U()+'. The storm starts at hour 12. I will warn you when it matters.'}}
    if(/\b(nominal|reset|normal|back to normal|all clear)\b/.test(t)&&/\b(go|back|set|switch|reset|return|load|make)\b/.test(t)||/^(reset|nominal)$/.test(t)){runTool('run_scenario',{name:'nominal'});return{kind:'cmd',text:'Back to nominal, '+U()+'. '+statusText(R.getState())}}
    if(/\b(sleep deprived|sleep-deprived)\b/.test(t)&&/\b(load|run|set|go|switch|scenario)\b/.test(t)){runTool('run_scenario',{name:'sleep_deprived'});return{kind:'cmd',text:'Loaded the sleep-deprived scenario. '+statusText(R.getState())}}
    if(/\b(acute spe|solar particle event)\b/.test(t)&&/\b(load|set|go|switch|scenario)\b/.test(t)){runTool('run_scenario',{name:'acute_spe'});return{kind:'cmd',text:'Loaded the acute solar particle event. '+statusText(R.getState())}}
    if(/\b(shelter|storm shelter|take cover)\b/.test(t)&&/\b(go|move|apply|take|enter|now|let's|lets)\b/.test(t)){runTool('apply_shelter');return{kind:'cmd',text:'Sheltering. I assume that cuts the simulated dose rate to '+Math.round(CFG.shelterFactor*100)+'%. '+statusText(R.getState())}}
    var cmd=/\b(set|make|change|put|turn|raise|lower|increase|decrease|move|adjust)\b/.test(t),a={},ch=[];
    if(cmd){var v;
      if((v=num(t,/sleep(?:\s*debt)?\s*(?:to|at|=)?\s*(\d+(?:\.\d+)?)/))!=null){a.sleep_debt_h=v;ch.push('sleep debt')}
      if((v=num(t,/(?:radiation|dose)(?:\s*rate)?\s*(?:to|at|=)?\s*(\d+(?:\.\d+)?)/))!=null){a.radiation_msv_hr=v;ch.push('radiation')}
      if((v=num(t,/hrv\s*(?:to|at|=)?\s*(\d+(?:\.\d+)?)/))!=null){a.hrv_ms=v;ch.push('HRV')}
      if(ch.length){runTool('set_inputs',a);var n=R.getState();return{kind:'cmd',text:'Done, '+U()+'. '+ch.map(function(c){return c==='sleep debt'?'Sleep debt is '+fmt(n.s)+' h':c==='radiation'?'radiation is '+fmt(n.d)+' mSv/hr':'HRV is '+Math.round(n.h)+' ms'}).join(', ').replace(/^./,function(x){return x.toUpperCase()})+'. Simulated risk is now '+fmt(n.R)+', '+tierWord(n.tier)+'.'}}}
  }
  if(WHATIF.test(t)||/\bsleep(?:ing)?\b.*\b\d+\s*(?:more\s+)?(?:h|hr|hrs|hours?)\b/.test(t))return{kind:'whatif',text:whatIfText(t,s)};
  if(/\bwhy\b|\bexplain\b|\bhow (is|was) (it|the risk|that) (calculated|computed|made)\b|\bwhat('s| is) (driving|causing)\b/.test(t))return{kind:'why',text:whyText(s)};
  if(/\bwhat (should|do|can|must) (i|we)\b|\bwhat now\b|\bwhat next\b|\bnext step\b|\badvice\b|\bprotocol\b|\bwhat to do\b/.test(t))return{kind:'now',text:nowText(s)};
  var tk=talkAnswer(t);if(tk)return tk;
  var ml=marsAnswer(t,true);if(ml)return ml;
  if(/\b(status|how (am i|are we|is it|are things)|how's it going|readings?|current)\b/.test(t))return{kind:'status',text:statusText(s)};
  if(/\b(real|actual|measure\w*|live|true)\b.*\b(data|readings?|values?|numbers?|sensor\w*)\b|\bis (this|that|it) real\b/.test(t))return{kind:'real',text:'The crew numbers are simulated, '+U()+': they come from the sliders or a scripted scenario, and I have no sensors. The real-world parts are the published Curiosity radiation values behind the Mars dose model, and an optional NOAA proton-flux feed in Data & Validation, which is labelled live, cached or bundled.'};
  if(/\b(who|what) are you\b|\byour name\b|\bintroduce\b/.test(t))return{kind:'identity',text:'I\'m '+N()+', your crew companion. I explain the simulated risk model and I can move the sliders for you. I\'m a research prototype, not a medical device, and this is an independent project, not affiliated with or endorsed by NASA.'};
  if(/\b(offline|internet|online|connected|enhanced)\b/.test(t))return{kind:'offline',text:enhancedActive()?'Enhanced mode is on, so some answers go to the model you configured. Commands and safety replies still run locally.':'I\'m running fully offline with a local rule engine. Nothing leaves this device unless you turn on Enhanced mode or press Fetch in the space-weather tab.'};
  if(/\b(help|what can you do|commands?|options)\b/.test(t))return{kind:'help',text:'Try: "validation", "teach me", "how is the crew?", "space weather", "why is my risk high?", "what should I do now?", "what if I sleep 2 more hours?", "run the solar storm", "set sleep debt to 8", "go back to nominal", "shelter now", "start the demo", or "debrief".'};
  if(/^(hi|hello|hey|yo|good (morning|evening|day))\b/.test(t))return{kind:'hello',text:'Hello, '+U()+'. All good here. Ask me why the risk is what it is, or tell me to run the solar storm.'};
  if(/\b(thanks|thank you|cheers|great job|nice)\b/.test(t))return{kind:'thanks',text:'Anytime, '+U()+'.',mood:'happy'};
  var lib=window.NOVA_ANSWER&&window.NOVA_ANSWER(text);if(lib)return{kind:'lib',text:lib+' (From my built-in library, rounded. Double-check NASA or the original source.)'};
  return{kind:'fallback',text:'I\'m not sure about that one, '+U()+'. Offline, I know this dashboard, small talk and a set of Mars facts. For open-ended questions, turn on Enhanced mode in Settings. Say "help" for examples.'};
}
var LLM_KINDS={why:1,whatif:1,now:1,status:1,fallback:1,identity:1,help:1,mars:1,talk:1,lib:1};

/* ---------- Enhanced mode ---------- */
function systemPrompt(q){
  var s=R.getState();
  return 'You are '+N()+', a warm, calm, slightly playful robot crew companion in a research-prototype dashboard (RCPT). Use short sentences. Call the user "'+U()+'". Never sound alarmist.\n'+
  'RULES: This is a simulation. All values are simulated or assumed; never claim real measurements. You are not a medical device. Never diagnose, never give medication names or doses; for real health concerns say to contact a flight surgeon or doctor. The project is independent, not affiliated with or endorsed by NASA. Only use the numbers in LIVE STATE for the crew simulation; do not invent others. You can answer any question on any topic like a knowledgeable, friendly general assistant: explain, teach, write, translate, do math, help with code, give advice. Reply in the language the user writes in. For Mars, spaceflight and radiation topics, use BACKGROUND FACTS first (they override your memory). If you are unsure, say so instead of guessing, and never invent dates, numbers, quotes or sources. Keep answers short (under 150 words) unless the user asks for more detail. Use tools only when the user asks to change the app.\n'+
  'MODEL: R = clip(0.40*f_rad + 0.35*f_hrv + 0.25*f_sleep + 0.05*dose*sleepDebt + 0.03*dose*f_hrv, 0, 100). f_rad=100(1-exp(-0.08*dose)); f_hrv=100*max(0,(70-HRV)/70); f_sleep=min(100,12.5*sleepDebt). Interval is a fixed -4.2/+4.8 band. Tiers: elevated >=35, emergency >=70 or dose >=10 mSv/hr.\n'+
  'BACKGROUND FACTS: '+(window.NOVA_FACTS&&q?window.NOVA_FACTS(q,6)+' ':'')+KB.mars.filter(function(e){return e.a}).map(function(e){return e.a}).join(' ')+'\n'+'LIVE STATE (simulated): '+JSON.stringify({radiation_msv_hr:+fmt(s.d),hrv_ms:Math.round(s.h),sleep_debt_h:+fmt(s.s),R_MRP:+fmt(s.R),interval:[+fmt(s.lo),+fmt(s.hi)],tier:s.tier,contributions:{radiation:+fmt(.4*s.fr),hrv_strain:+fmt(.35*s.fh),sleep_debt:+fmt(.25*s.fs),interaction:+fmt(s.it),sleepdebt_x_dose:+fmt(s.it1),dose_x_hrv_strain:+fmt(s.it2)},active_protocol:s.protocol,protocol_steps:s.actions,assumptions:{shelter_dose_factor:CFG.shelterFactor,sleep_repay_ratio:CFG.sleepRepay}});
}
var DRUG=/\b(\d+\s?(mg|mcg)\b|ibuprofen|aspirin|paracetamol|acetaminophen|tablets?|pills?|antibiotics?)\b/i;
function askLLM(text,fallback){
  mood('thinking');
  var msgs=[{role:'system',content:systemPrompt(text)}].concat(hist.slice(-8),[{role:'user',content:text}]);
  bridge.chat({endpoint:S.endpoint,model:S.model,messages:msgs,tools:toolSchemas()}).then(function(r){
    if(!r||!r.ok)throw new Error((r&&r.error)||'no response');
    var out=(r.text||'').trim();
    (r.toolCalls||[]).forEach(function(c){var res=runTool(c.name,c.args);if(!out)out=res});
    if(!out)throw new Error('empty reply');
    if(DRUG.test(out))out='I can\'t give medication advice, '+U()+'. For real health concerns, please talk to your flight surgeon or a doctor.';
    say(out,{mood:'idle'});
  }).catch(function(e){addMsg('sys','Enhanced mode unavailable ('+(e&&e.message||e)+'). Answering offline.');say(fallback,{mood:'idle'})});
}
function send(text){
  text=(text||'').trim();if(!text)return;
  addMsg('me',text);hist.push({role:'user',content:text});if(hist.length>12)hist.shift();
  var r=local(text);if(r.kind==='empty')return;
  if(window.RCPTv15)r=window.RCPTv15.decorate(r,text)||r;
  if(enhancedActive()&&LLM_KINDS[r.kind]){askLLM(text,r.text);return}
  var delay=r.kind==='cmd'?0:250;mood('thinking');
  setTimeout(function(){say(r.text,{mood:r.mood||(r.kind==='cmd'&&R.getState().tier==='nominal'?'happy':null)})},delay);
}

/* ---------- proactive warnings ---------- */
var prevTier='nominal',lastPro=0,rank={nominal:0,elevated:1,emergency:2};
function proactive(s,prev){
  var now=Date.now();
  if(rank[s.tier]>rank[prev]){
    if(s.tier!=='emergency'&&now-lastPro<8000)return;
    lastPro=now;
    if(s.tier==='emergency'){alertTone();mood('alert',4500);
      setTimeout(function(){var c=R.getState();if(c.tier!=='emergency')return; /* re-read so a ramping storm is reported at its current level */
        say(c.d>=10?U()+', radiation is up to '+fmt(c.d)+' mSv/hr. Let\'s move to the shelter.':U()+', the simulated risk is '+fmt(c.R)+'. Let\'s stop and rest.',{mood:'alert'})},1200)}
    else say(U()+', the simulated risk is '+fmt(s.R)+'. '+comps(s)[0][0].replace(/^./,function(c){return c.toUpperCase()})+' is leading it. Let\'s ease the workload.',{mood:'alert'});
  }else if(s.tier==='nominal'&&prev!=='nominal'){lastPro=now;say('Risk is back below the elevated line, '+U()+'. Nice work.',{mood:'happy'})}
}
var started=false;
R.onUpdate(function(s){
  setTier(s.tier);
  if(!started){prevTier=s.tier;return}
  if(s.tier!==prevTier){var p=prevTier;prevTier=s.tier;proactive(s,p)}
});

/* ---------- demo mode (90 s scripted story) ---------- */
var DEMO={on:false,timer:null,t0:0,done:{}},DUR=90;
function kf(){var f=CFG.shelterFactor;return [[0,.5,65,1],[12,.5,65,1],[14,18.5,60,1.2],[24,18.5,46,2.5],[33,18.5,42,4],[36,18.5*f,42,4],[50,2,50,3.6],[62,1.2,56,3],[80,.8,60,2.5],[90,.5,63,2]]}
var STAGES=[[0,'1/5 · Nominal orbit'],[12,'2/5 · Solar storm hits'],[24,'3/5 · '+'Companion warns, crew decides'],[36,'4/5 · Crew shelters'],[55,'5/5 · Risk drops']];
var hud=document.createElement('div');hud.id='nv-demo';hud.hidden=true;hud.setAttribute('role','region');hud.setAttribute('aria-label','Demo mode');
hud.innerHTML='<div class="top"><span class="stage" id="dm-stage"></span><button class="tb" id="dm-stop" type="button">Stop demo (Esc)</button></div><div class="bar"><i id="dm-bar"></i></div><div class="earth" id="dm-earth"></div><div class="ok" id="dm-ok" hidden>No ground approval needed</div>';
document.body.appendChild(hud);
function mmss(sec){sec=Math.max(0,Math.round(sec));return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
function startDemo(){
  if(DEMO.on)return;closeModal();stopSpeech();R.stopSim();R.setScenario('nominal');
  DEMO.on=true;DEMO.done={};DEMO.t0=performance.now();hud.hidden=false;$('dm-ok').hidden=true;prevTier='nominal';lastPro=0;
  R.startLog('s');var K=kf();
  say('All simulated readings are nominal, '+U()+'. Watch what happens when a solar storm hits.',{mood:'happy'});
  DEMO.timer=setInterval(function(){
    var t=(performance.now()-DEMO.t0)/1000;if(t>=DUR){endDemo(true);return}
    var i=0;while(i<K.length-2&&t>K[i+1][0])i++;var a=K[i],b=K[i+1],u=Math.max(0,Math.min(1,(t-a[0])/(b[0]-a[0])));
    R.setLogTime(t);R.setInputs({d:a[1]+(b[1]-a[1])*u,h:a[2]+(b[2]-a[2])*u,s:a[3]+(b[3]-a[3])*u},{silent:true});
    var st=STAGES[0];STAGES.forEach(function(g){if(t>=g[0])st=g});$('dm-stage').textContent='Demo '+st[1];$('dm-bar').style.width=(t/DUR*100)+'%';
    $('clock').textContent='Demo story: '+Math.round(t)+' s / '+DUR;
    var rem=t<12?22*60:22*60-(t-12)*22,txt=t<12?'Earth link: one-way delay 22:00 (Mars, worst case)':'Waiting on Earth: '+mmss(rem)+' left of a 22:00 one-way delay (demo clock x22)';
    $('dm-earth').textContent=txt;$('latT').textContent=mmss(rem);
    function once(k,at,fn){if(t>=at&&!DEMO.done[k]){DEMO.done[k]=1;fn()}}
    once('delay',24,function(){say('The Earth link is 22 minutes one way. Waiting for a reply is not an option.',{queue:true})});
    once('noground',31,function(){$('dm-ok').hidden=false;$('lat').classList.add('demo');say(U()+', no ground approval needed. I\'ll guide the shelter steps now.',{queue:true,mood:'alert'})});
    once('shelter',36,function(){say('Crew is in the shelter. I assume that cuts the dose rate to '+Math.round(CFG.shelterFactor*100)+'%. Watch the risk fall.',{queue:true})});
    once('recover',52,function(){say('HRV is recovering and sleep debt is falling. The interaction term is shrinking.',{queue:true})});
  },100);
  ['d','h','s','scen','run'].forEach(function(id){$(id).addEventListener(id==='run'?'click':id==='scen'?'change':'input',abortOnUser)});
}
function abortOnUser(e){if(DEMO.on&&e.isTrusted)endDemo(false)}
function endDemo(finished){
  if(!DEMO.on)return;clearInterval(DEMO.timer);DEMO.on=false;hud.hidden=true;R.stopLog();$('lat').classList.remove('demo');if(window.RCPTLink)window.RCPTLink.refresh();else $('latT').textContent='22:00';$('clock').textContent=finished?'Demo finished':'Demo stopped';
  say(finished?'Demo complete, '+U()+'. Press Mission Debrief for the summary.':'Demo stopped. Sliders are yours.',{mood:finished?'happy':null,queue:true});
}
function stopDemo(){endDemo(false)}

/* ---------- debrief button ---------- */
function debrief(){togglePanel(true);var t=debriefText();addMsg('me','Mission debrief');say(t,{mood:'happy'})}

/* ---------- settings dialog ---------- */
function refreshKeyStatus(){
  var el=$('st-status');if(!bridge){el.textContent='Enhanced mode needs the desktop app (this build has no secure key store).';return}
  bridge.hasKey().then(function(k){el.textContent=k.has?(k.encrypted?'API key saved, encrypted by your operating system.':'API key held in memory only for this session (OS encryption unavailable).'):'No API key stored.'}).catch(function(){})
}
function openSettings(){
  $('st-user').value=S.userName;$('st-comp').innerHTML=Object.keys(CFG.companions).map(function(k){return '<option'+(k===S.companion?' selected':'')+'>'+k+'</option>'}).join('');
  $('st-mode').value=S.mode;$('st-ep').value=S.endpoint;$('st-model').value=S.model;$('st-key').value='';
  $('st-enh').style.display=S.mode==='enhanced'?'block':'none';refreshKeyStatus();openModal('nv-set');
}
$('st-mode').addEventListener('change',function(){$('st-enh').style.display=this.value==='enhanced'?'block':'none'});
$('st-savekey').addEventListener('click',function(){var k=$('st-key').value.trim();if(!k||!bridge)return;bridge.saveKey(k).then(function(){$('st-key').value='';refreshKeyStatus()})});
$('st-clearkey').addEventListener('click',function(){if(bridge)bridge.clearKey().then(refreshKeyStatus)});
$('st-test').addEventListener('click',function(){var el=$('st-status');if(!bridge){el.textContent='Not available outside the desktop app.';return}el.textContent='Testing...';
  bridge.chat({endpoint:$('st-ep').value.trim(),model:$('st-model').value.trim(),messages:[{role:'user',content:'Reply with the single word: ready'}],tools:[]}).then(function(r){el.textContent=r.ok?'Connected. Reply: '+String(r.text).slice(0,60):'Failed: '+r.error})});
$('st-ok').addEventListener('click',function(){
  S.userName=$('st-user').value.trim()||CFG.userTitle;S.companion=$('st-comp').value;S.mode=$('st-mode').value;S.endpoint=$('st-ep').value.trim()||CFG.defaultEndpoint;S.model=$('st-model').value.trim()||CFG.defaultModel;
  ['userName','companion','mode','endpoint','model'].forEach(function(k){ls.set(k,S[k])});
  if(S.mode==='enhanced'&&!bridge)addMsg('sys','Enhanced mode needs the desktop app. Staying offline.');
  closeModal();applyCompanion();setBadge();
});

/* ---------- wiring ---------- */
$('nv-form').addEventListener('submit',function(e){e.preventDefault();var v=$('nv-in').value;$('nv-in').value='';send(v)});
$('nv-chips').addEventListener('click',function(e){var b=e.target.closest('button');if(b)send(b.textContent)});
$('nv-voice').addEventListener('click',function(){toggleVoice()});
$('nv-snd').addEventListener('click',function(){toggleSound()});
$('nv-min').addEventListener('click',function(){togglePanel(false)});
$('nv-fab').addEventListener('click',function(){togglePanel(true);$('nv-in').focus()});
var mic=$('nv-mic');
mic.addEventListener('pointerdown',function(e){e.preventDefault();startPTT()});
['pointerup','pointerleave','pointercancel'].forEach(function(ev){mic.addEventListener(ev,stopPTT)});
mic.addEventListener('click',function(e){if(e.detail===0){listening?stopPTT():startPTT()}});
function toggleVoice(){S.voiceOn=!S.voiceOn;ls.set('voiceOn',S.voiceOn);if(!S.voiceOn)stopSpeech();voiceBtn();addMsg('sys',S.voiceOn?'Voice replies on.':'Voice muted. Captions stay on.')}
function toggleSound(){S.soundOn=!S.soundOn;sndBtn();addMsg('sys',S.soundOn?'Alert tone on.':'Alert tone off.');if(S.soundOn)alertTone()}
$('demoBtn').addEventListener('click',function(){DEMO.on?stopDemo():startDemo()});
$('dm-stop').addEventListener('click',stopDemo);
$('debriefBtn').addEventListener('click',debrief);
$('keysBtn').addEventListener('click',function(){openModal('nv-keys')});
$('aboutBtn').addEventListener('click',function(){openModal('nv-about')});
$('setBtn').addEventListener('click',openSettings);

var interactive=function(t){return t&&t.closest&&t.closest('input,textarea,select,button,a,[contenteditable]')};
document.addEventListener('keydown',function(e){
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  if(e.key==='Escape'){if(openM)closeModal();else if(DEMO.on)stopDemo();return}
  if(!started||openM||(window.RCPTUI&&window.RCPTUI.anyOpen()))return;
  if(document.body.classList.contains('orion-open')){var kk=e.key.length===1?e.key.toLowerCase():e.key;if(kk!=='m'&&kk!=='c')return}
  var typing=e.target.closest&&e.target.closest('input[type=text],input[type=password],textarea');if(typing)return;
  if(e.key===' '&&!interactive(e.target)){e.preventDefault();if(!e.repeat)startPTT();return}
  var k=e.key.length===1?e.key.toLowerCase():e.key;
  if(k==='m'){toggleVoice()}else if(k==='s'){toggleSound()}else if(k==='c'){togglePanel()}else if(k==='d'){DEMO.on?stopDemo():startDemo()}
  else if(k==='o'){if(window.Orion)window.Orion.open()}else if(k==='b'){debrief()}else if(k==='?'){openModal('nv-keys')}else if(k==='/'){e.preventDefault();togglePanel(true);$('nv-in').focus()}
});
document.addEventListener('keyup',function(e){if(e.key===' '&&listening)stopPTT()});

document.addEventListener('rcpt:lang',function(e){var m={ar:['ar-SA','ar-SA'],es:['es-ES','es-ES'],en:['en-US','en-US']}[e.detail];if(m){CFG.voice.lang=m[0];CFG.sttLang=m[1]}});
document.addEventListener('rcpt:launch',function(){
  started=true;dock.hidden=false;applyCompanion();prevTier=R.getState().tier;setTier(prevTier);
  togglePanel(window.innerWidth>=1600);
  say('Hi '+U()+', I\'m '+N()+'. Everything here is simulated. Ask me why the risk is what it is, or say "run the solar storm".',{mood:'happy'});
});
applyCompanion();
window.NovaAPI={say:function(t,o){say(t,o)},name:N,user:U,open:function(){togglePanel(true)},minimize:function(){if(started)togglePanel(false)}};
window.NovaDebug={local:local,send:send,startDemo:startDemo,debriefText:debriefText,S:S};
})();
