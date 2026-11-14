
(function(){
var $=function(i){return document.getElementById(i)};
var T=function(k,f,p){return window.RCPTi18n?window.RCPTi18n.t(k,f,p):f};
var ELEV=35,SC={'Nominal Orbit':[.5,65,1],'Sleep Deprived + High Workload':[1.2,38,5.5],'Acute Solar Particle Event (SPE)':[18.5,42,4]};
var clamp=function(x,a,b){return Math.max(a,Math.min(b,x))};
function M(d,h,s){var fr=100*(1-Math.exp(-.08*d)),fh=100*Math.max(0,(70-h)/70),fs=Math.min(100,12.5*s),it=.05*d*s+.03*d*fh,R=clamp(.4*fr+.35*fh+.25*fs+it,0,100);
  return{fr:fr,fh:fh,fs:fs,it:it,R:R,lo:Math.max(0,R-4.2),hi:Math.min(100,R+4.8),bars:[.4*fr,.35*fh,.25*fs,it]}}
var history=[],listeners=[],lastState=null,simLog=[],logging=false,logT=0,logUnit='h',hlInter=false;
function tierOf(d,R){return d>=10||R>=70?'emergency':R>=ELEV?'elevated':'nominal'}
function draw(){
  var d=+$('d').value,h=+$('h').value,s=+$('s').value,m=M(d,h,s),R=m.R;
  $('od').textContent=d.toFixed(1);$('oh').textContent=Math.round(h);$('os').textContent=s.toFixed(1);
  var emerg=d>=10||R>=70,kind=emerg?'error':R>=ELEV?'warning':'success',bt=T('ban_idx','Multi-System Risk Index: {r}/100',{r:R.toFixed(1)});
  var b=$('banner');b.className='banner '+kind;
  b.textContent=emerg?T('ban_emerg','SPE AMBER/RED EMERGENCY MODE ACTIVE | High ')+bt:R>=ELEV?T('ban_elev','ELEVATED PHYSIOLOGICAL STRAIN | ')+bt:T('ban_nom','NOMINAL SYSTEM STATE | ')+bt;
  var mets=[[T('m_risk','Multi-System Risk (R_MRP)'),R.toFixed(1),T('m_ci','CI: [{lo}, {hi}]',{lo:m.lo.toFixed(1),hi:m.hi.toFixed(1)}),1,'R'],[T('m_rad','Radiation Rate'),d.toFixed(1)+' mSv/hr',T('m_sim','Simulated input'),0,'dose'],[T('m_hrv','Heart Rate Variability'),Math.round(h)+' ms',T('m_sim','Simulated input'),0,'hrv'],[T('m_sleep','Sleep Deficit'),s.toFixed(1)+' hrs',T('m_sim','Simulated input'),0,'sleep']];
  $('metrics').innerHTML=mets.map(function(q){return '<div class="m"><div class="l">'+q[0]+' <button type="button" class="exb" data-explain="'+q[4]+'" aria-label="'+T('explain_this','Explain this number')+': '+q[0]+'" title="'+T('explain_this','Explain this number')+'">?</button></div><div class="v">'+q[1]+'</div><div class="d'+(q[3]?' inv':'')+'">&#9650; '+q[2]+'</div></div>'}).join('');
  var mx=Math.max(10,Math.ceil(Math.max.apply(null,m.bars)*1.15/5)*5),labs=[T('bar_rad','Radiation|Impact').split('|'),T('bar_hrv','Autonomic|Strain (HRV)').split('|'),T('bar_sleep','Sleep|Debt').split('|'),T('bar_int','Non-Linear|Interaction').split('|')],col=R>50?'#ff4b4b':'#29B5E8';
  var svg='<svg viewBox="0 0 400 210"><line x1="36" y1="20" x2="392" y2="20" stroke="#2a2d3a"/><line x1="36" y1="150" x2="392" y2="150" stroke="#2a2d3a"/><text x="30" y="24" text-anchor="end">'+mx+'</text><text x="30" y="154" text-anchor="end">0</text>';
  m.bars.forEach(function(v,i){var x=52+i*88,hh=130*v/mx;svg+='<rect class="bar'+i+'" x="'+x+'" y="'+(150-hh)+'" width="56" height="'+hh+'" fill="'+col+'"/><text class="val" x="'+(x+28)+'" y="'+(150-hh-5)+'" text-anchor="middle">'+v.toFixed(1)+'</text><text x="'+(x+28)+'" y="168" text-anchor="middle">'+labs[i][0]+'</text><text x="'+(x+28)+'" y="181" text-anchor="middle">'+labs[i][1]+'</text>'});
  $('chart').innerHTML=svg+'</svg>';$('chart').className=hlInter?'hl-inter':'';
  var chips=[[T('chip_cv','Cardiovascular'),m.fh>40,T('st_high','High Strain'),T('st_stable','Stable')],[T('chip_cns','Central Nervous'),m.fs>40,T('st_disr','Disrupted'),T('st_nom','Nominal')],[T('chip_cell','Cellular Repair'),m.it>2,T('st_comp','Compromised'),T('st_opt','Optimal')]];
  $('chips').innerHTML=chips.map(function(q){return '<div class="chip"><b>'+q[0]+'</b><i style="background:'+(q[1]?'#ff5d4d':'#35d08a')+'"></i>'+(q[1]?q[2]:q[3])+'</div>'}).join('');
  var P=d>=10?['error',T('p_e_t','ACTION REQUIRED: IMMEDIATE RADIATION SHELTERING'),[T('p_e_1','Move to storm shelter (Water Wall / Central Module).'),T('p_e_2','Follow the crew antioxidant countermeasure plan set by the flight surgeon (illustrative).'),T('p_e_3','Halt non-essential EVA activities immediately.')]]:R>=ELEV?['warning',T('p_w_t','ACTION REQUIRED: WORKLOAD REDUCTION'),[T('p_w_1','Schedule mandatory 60-minute sleep extension.'),T('p_w_2','Increase fluid and electrolyte intake by +500 mL.'),T('p_w_3','Lower physical resistance training intensity by 20%.')]]:['success',T('p_n_t','NOMINAL OPERATIONS'),[T('p_n_1','Continue standard exercise routine (ARED / Treadmill).'),T('p_n_2','Maintain standard circadian light cycle exposure.'),T('p_n_3','All data stays on this device; no ground link is needed.')]];
  var pe=$('proto');pe.className='proto '+P[0];pe.innerHTML='<b>'+P[1]+'</b><ul>'+P[2].map(function(t){return '<li>'+t+'</li>'}).join('')+'</ul>';
  history.push(R);if(history.length>120)history.shift();drawHist();drawTL();drawHM();
  var st={d:d,h:h,s:s,R:R,lo:m.lo,hi:m.hi,fr:m.fr,fh:m.fh,fs:m.fs,it:m.it,it1:.05*d*s,it2:.03*d*m.fh,bars:m.bars,tier:tierOf(d,R),protocol:P[1],actions:P[2],running:!!timer,clock:timer?hr:null};
  lastState=st;if(logging)simLog.push({t:logT,d:d,h:h,s:s,R:R,tier:st.tier,bars:m.bars.slice()});
  listeners.forEach(function(fn){try{fn(st)}catch(e){console.error(e)}});
}
function drawHist(){
  var c=$('hist'),x=c.getContext('2d'),W=c.width,H=c.height;x.clearRect(0,0,W,H);
  [[35,'#ffb224'],[70,'#ff5d4d']].forEach(function(l){var y=H-l[0]/100*H;x.strokeStyle=l[1];x.setLineDash([3,4]);x.beginPath();x.moveTo(0,y);x.lineTo(W,y);x.stroke()});
  x.setLineDash([]);x.strokeStyle='#17a9f0';x.lineWidth=2;x.beginPath();
  history.forEach(function(v,i){var px=i/119*W,py=H-v/100*H;i?x.lineTo(px,py):x.moveTo(px,py)});x.stroke();
}

/* ---- realistic telemetry: seeded noisy traces ---- */
function rng(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
var TS=(function(){var r=rng(2026),o=[];
  for(var i=0;i<=160;i++){var t=i/4,base=t<12?.5:.5+18*Math.exp(-(t-12)/10);
    if(t>12&&t<16)base*=1+.18*Math.sin((t-12)*2.4); /* particle-flux fluctuations at onset */
    var nz=1+(r()-.5)*.14, d=Math.max(.05,base*nz+(r()-.5)*.08);
    var k=t<12?0:Math.min(1,(t-12)/6), circ=3*Math.sin(2*Math.PI*t/24), h=65-23*k+(t>24?(t-24)*.1:0)+circ+(r()-.5)*5;
    var sd=t<12?1+t*.02:Math.min(4,1+(t-12)*.5)+(r()-.5)*.08;
    var m=M(d,h,sd);o.push({t:t,d:d,h:h,s:sd,R:m.R,lo:m.lo,hi:m.hi})}
  return o})();
function drawTL(){
  var el=$('tl'),W=640,L=48,Rr=620,PW=Rr-L,cur=timer?hr:-1,sx=function(t){return L+t/40*PW};
  var panels=[{y:16,h:140,lab:'Risk index R_MRP',min:0,max:100,tk:[0,35,70,100]},{y:176,h:86,lab:'Dose rate (mSv/hr)',min:0,max:20,tk:[0,10,20]},{y:282,h:86,lab:'HRV (ms) / sleep debt (h)',min:20,max:80,tk:[20,50,80]}];
  var sy=function(p,v){return p.y+p.h-(v-p.min)/(p.max-p.min)*p.h};
  var o='<rect x="'+L+'" y="'+panels[0].y+'" width="'+PW+'" height="'+panels[0].h+'" fill="#0a0f16"/>';
  panels.forEach(function(p,i){ if(i)o+='<rect x="'+L+'" y="'+p.y+'" width="'+PW+'" height="'+p.h+'" fill="#0a0f16"/>';
    p.tk.forEach(function(v){var y=sy(p,v);o+='<line x1="'+L+'" x2="'+Rr+'" y1="'+y+'" y2="'+y+'" stroke="#1e2633"/><text x="'+(L-5)+'" y="'+(y+3)+'" text-anchor="end">'+v+'</text>'});
    for(var t=0;t<=40;t+=4)o+='<line x1="'+sx(t)+'" x2="'+sx(t)+'" y1="'+p.y+'" y2="'+(p.y+p.h)+'" stroke="#141b26"/>';
    o+='<text class="t" x="'+(L+4)+'" y="'+(p.y+11)+'">'+p.lab+'</text>'});
  /* SPE onset marker + sheltering window */
  var p0=panels[0];o+='<rect x="'+sx(12)+'" y="'+p0.y+'" width="'+(sx(40)-sx(12))+'" height="'+(panels[2].y+panels[2].h-p0.y)+'" fill="#ff5d4d" opacity=".05"/><line x1="'+sx(12)+'" x2="'+sx(12)+'" y1="'+p0.y+'" y2="'+(panels[2].y+panels[2].h)+'" stroke="#ff5d4d" stroke-dasharray="4 3"/><text x="'+(sx(12)+4)+'" y="'+(panels[2].y+panels[2].h-4)+'" style="fill:#ff9a8f">SPE onset (h 12)</text>';
  /* threshold lines */
  [[35,'#ffb224','Elevated 35'],[70,'#ff5d4d','Emergency 70']].forEach(function(l){var y=sy(p0,l[0]);o+='<line x1="'+L+'" x2="'+Rr+'" y1="'+y+'" y2="'+y+'" stroke="'+l[1]+'" stroke-dasharray="5 4" opacity=".8"/><text x="'+(Rr-3)+'" y="'+(y-3)+'" text-anchor="end" style="fill:'+l[1]+'">'+l[2]+'</text>'});
  var vis=TS.filter(function(q){return cur<0||q.t<=cur});
  function path(f,p,key){return vis.map(function(q,i){return (i?'L':'M')+sx(q.t).toFixed(1)+','+sy(p,f(q)).toFixed(1)}).join('')}
  /* CI band */
  if(vis.length>1){var up=vis.map(function(q,i){return (i?'L':'M')+sx(q.t).toFixed(1)+','+sy(p0,q.hi).toFixed(1)}).join(''),dn=vis.slice().reverse().map(function(q){return 'L'+sx(q.t).toFixed(1)+','+sy(p0,q.lo).toFixed(1)}).join('');
    o+='<path d="'+up+dn+'Z" fill="#17a9f0" opacity=".25"/>';
    o+='<path d="'+path(function(q){return q.R},p0)+'" fill="none" stroke="#5cc8ff" stroke-width="1.8"/>';
    o+='<path d="'+path(function(q){return Math.min(q.d,20)},panels[1])+'" fill="none" stroke="#ffb224" stroke-width="1.2"/>';
    o+='<path d="'+path(function(q){return q.h},panels[2])+'" fill="none" stroke="#35d08a" stroke-width="1.2"/>';
    o+='<path d="'+path(function(q){return 20+q.s*10},panels[2])+'" fill="none" stroke="#c792ff" stroke-width="1.4" stroke-dasharray="3 2"/>';
    o+='<text x="'+(Rr-3)+'" y="'+(panels[2].y+11)+'" text-anchor="end" style="fill:#35d08a">HRV</text><text x="'+(Rr-30)+'" y="'+(panels[2].y+11)+'" text-anchor="end" style="fill:#c792ff">sleep debt (20+10&middot;h)</text>';}
  if(cur>=0){o+='<line x1="'+sx(cur)+'" x2="'+sx(cur)+'" y1="'+p0.y+'" y2="'+(panels[2].y+panels[2].h)+'" stroke="#fff" opacity=".7"/>'}
  for(var t=0;t<=40;t+=8)o+='<text x="'+sx(t)+'" y="386" text-anchor="middle">'+t+'</text>';
  o+='<text x="'+((L+Rr)/2)+'" y="398" text-anchor="middle">Mission elapsed time (h)</text>';
  el.innerHTML=o;
}
/* ---- risk surface heatmap (dose x HRV) ---- */
function drawHM(){
  var c=$('hmc'),x=c.getContext('2d'),W=c.width,H=c.height,ml=34,mb=32,mt=6,mr=6,pw=W-ml-mr,ph=H-mb-mt,s=+$('s').value;
  x.clearRect(0,0,W,H);var img=x.createImageData(pw,ph);
  function color(R){var a=[[0,[12,40,90]],[35,[40,160,200]],[55,[255,196,60]],[70,[255,110,60]],[100,[190,20,40]]];for(var i=1;i<a.length;i++)if(R<=a[i][0]){var u=(R-a[i-1][0])/(a[i][0]-a[i-1][0]);return a[i-1][1].map(function(v,k){return v+(a[i][1][k]-v)*u})}return a[4][1]}
  for(var j=0;j<ph;j++)for(var i=0;i<pw;i++){var d=i/(pw-1)*50,h=100-j/(ph-1)*90,R=M(d,h,s).R,c3=color(R),k=(j*pw+i)*4;img.data[k]=c3[0];img.data[k+1]=c3[1];img.data[k+2]=c3[2];img.data[k+3]=255}
  x.putImageData(img,ml,mt);
  /* contours */
  [35,70].forEach(function(lv){x.strokeStyle='rgba(255,255,255,.9)';x.lineWidth=1.2;x.setLineDash(lv==35?[4,3]:[]);x.beginPath();var f=false;
    for(var i=0;i<pw;i++){var d=i/(pw-1)*50,lo=10,hi=100,found=null;
      for(var h=100;h>=10;h-=.5){if(M(d,h,s).R>=lv){found=h;break}}
      if(found!==null){var py=mt+(100-found)/90*(ph-1);f?x.lineTo(ml+i,py):x.moveTo(ml+i,py);f=true}else f=false}
    x.stroke()});x.setLineDash([]);
  x.fillStyle='#a3a8b8';x.font='10px sans-serif';x.textAlign='right';
  [10,40,70,100].forEach(function(h){x.fillText(h,ml-4,mt+(100-h)/90*(ph-1)+3)});
  x.textAlign='center';[0,10,25,50].forEach(function(d){x.fillText(d,ml+d/50*(pw-1),H-20)});
  x.fillText('Dose rate (mSv/hr)',ml+pw/2,H-6);x.save();x.translate(9,mt+ph/2);x.rotate(-Math.PI/2);x.fillText('HRV (ms)',0,0);x.restore();
  var d=+$('d').value,h=+$('h').value,px=ml+d/50*(pw-1),py=mt+(100-h)/90*(ph-1);
  x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=2;x.beginPath();x.arc(px,py,5,0,7);x.stroke();x.fill();
}
function exRow(){var e=$('exrow');if(!e)return;if(!timer){$('run').textContent=T('run','▶ Run 40 h SPE simulation');$('clock').textContent=T('clock_manual','Mission clock: manual')}e.innerHTML=[['R','m_risk','Multi-System Risk (R_MRP)'],['rad','bar_rad','Radiation Impact'],['hrv','bar_hrv','Autonomic Strain'],['sleep','bar_sleep','Sleep Debt'],['inter','bar_int','Non-Linear Interaction'],['ci','m_ci','Interval']].map(function(q){var lab=q[0]==='R'?T('m_risk','Risk R'):q[0]==='ci'?'±CI':T(q[1],q[2]).replace('|',' ');return '<button type="button" class="exb wide" data-explain="'+q[0]+'">? '+lab+'</button>'}).join('')}
document.addEventListener('rcpt:lang',function(){exRow();draw();setLangSel()});
function setLangSel(){var sl=$('langSel');if(!sl||!window.RCPTi18n)return;sl.innerHTML=RCPTi18n.langs().map(function(l){return '<option value="'+l[0]+'">'+l[1]+'</option>'}).join('');sl.value=RCPTi18n.get()}
function setPreset(){var p=SC[$('scen').value];$('d').value=p[0];$('h').value=p[1];$('s').value=p[2];history=[];stopRun();draw()}
$('scen').addEventListener('change',setPreset);
['d','h','s'].forEach(function(i){$(i).addEventListener('input',function(){stopRun();draw()})});

/* 40 h simulated SPE: onset at hour 12, 10 h decay constant, HRV falls, sleep debt rises (same assumptions as Fig. 4) */
var timer=null,hr=0;
function stopRun(){if(timer){clearInterval(timer);timer=null;logging=false;$('run').textContent=T('run','▶ Run 40 h SPE simulation');$('clock').textContent=T('clock_manual','Mission clock: manual')}}
$('run').addEventListener('click',function(){
  if(timer){stopRun();return}
  hr=0;history=[];simLog=[];logging=true;logUnit='h';hlInter=false;$('run').textContent=T('stop','■ Stop simulation');
  timer=setInterval(function(){
    hr+=.25;if(hr>40){stopRun();return}
    var d=hr<12?.5:.5+18*Math.exp(-(hr-12)/10),k=hr<12?0:Math.min(1,(hr-12)/6),h=65-23*k+(hr>24?(hr-24)*.1:0),s=hr<12?1:Math.min(4,1+(hr-12)*.5);
    logT=hr;$('d').value=d;$('h').value=h;$('s').value=s;
    $('clock').textContent=T('clock_h','Mission clock: hour {h} / 40',{h:hr.toFixed(1)})+(hr>=12?T('clock_onset',' (SPE onset at 12)'):'');
    draw();
  },120);
});

var SCN={nominal:'Nominal Orbit',sleep_deprived:'Sleep Deprived + High Workload',acute_spe:'Acute Solar Particle Event (SPE)'};
function setScenario(k){var n=SCN[k]||k;if(!SC[n])return false;hlInter=false;$('scen').value=n;setPreset();return true}
function setInputs(o,opt){opt=opt||{};if(!opt.silent)stopRun();
  var map={d:'d',h:'h',s:'s'};Object.keys(map).forEach(function(k){if(o[k]!=null&&isFinite(o[k])){var el=$(k);el.value=clamp(+o[k],+el.min,+el.max)}});draw();return lastState}
var jAnim=null;
function sleepRamp(to,ms){cancelAnimationFrame(jAnim);var from=+$('s').value,t0=performance.now();
  (function f(t){var u=clamp((t-t0)/ms,0,1);setInputs({s:from+(to-from)*u});if(u<1)jAnim=requestAnimationFrame(f)})(t0)}
function judge(n){
  var ids=['j1','j2','j3'];
  if(n===1){setScenario('nominal')}else if(n===2){setScenario('acute_spe')}else{if($('scen').value!==SCN.acute_spe)setScenario('acute_spe');hlInter=true;sleepRamp(9,3000);$('jhint').textContent=T('jhint2','Sleep debt is rising. Watch the Non-Linear Interaction bar grow.')}
  ids.forEach(function(id,i){if(i+1<=n)$(id).classList.add('done');else $(id).classList.remove('done')});
  if(n<3){hlInter=false;$('jhint').textContent=T('jhint','Then watch the “Non-Linear Interaction” bar grow (sleep debt × dose).')}
  draw();
}
$('j1').addEventListener('click',function(){judge(1)});$('j2').addEventListener('click',function(){judge(2)});$('j3').addEventListener('click',function(){judge(3)});
var launched=false;
function launch(){if(launched)return;exRow();setLangSel();launched=true;$('splash').classList.add('hide');$('app').classList.add('on');setPreset();document.dispatchEvent(new CustomEvent('rcpt:launch'))}
window.RCPT={M:M,ELEV:ELEV,tierOf:tierOf,getState:function(){return lastState},setInputs:setInputs,setScenario:setScenario,
  runSim:function(){if(!timer)$('run').click()},stopSim:stopRun,isRunning:function(){return !!timer},onUpdate:function(fn){listeners.push(fn)},
  getLog:function(){return {unit:logUnit,data:simLog.slice()}},startLog:function(u){simLog=[];logging=true;logUnit=u||'s'},stopLog:function(){logging=false},setLogTime:function(t){logT=t},
  limits:function(){return{d:[+$('d').min,+$('d').max],h:[+$('h').min,+$('h').max],s:[+$('s').min,+$('s').max]}}};
$('launch').addEventListener('click',launch);
$('langSel').addEventListener('change',function(){RCPTi18n.set(this.value)});setLangSel();exRow();
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&!$('splash').classList.contains('hide'))$('launch').click()});
})();
