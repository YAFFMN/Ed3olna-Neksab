/* v1.7: (1) Emergency Simulator Sandbox, (2) Mitigation Prescriptions (CDSS), (3) Edge status bar, (4) Mission report exporter (JSON + PDF).
   Uses only the public RCPT API; all computation is local. Prescription thresholds and doses are ILLUSTRATIVE, not medical advice. */
(function(){'use strict';
var RC=window.RCPT,U=window.RCPTUI,esc=U.esc,$=function(i){return document.getElementById(i)},cl=function(x,a,b){return Math.max(a,Math.min(b,x))},f1=function(n){return(+n).toFixed(1)};
var LAT='19m 42s',RTT='39m 24s',TAU=10,BASE=2,buf=[],mlog=[],prevSig=null,prevTier=null,lastMs=0,feed=[],execd=null;
function addLog(ev,s,items){mlog.push({time:new Date().toISOString(),event:ev,tier:s&&s.tier,risk:s&&+f1(s.R),dose_mSv_hr:s&&+f1(s.d),hrv_ms:s&&Math.round(s.h),sleep_debt_h:s&&+f1(s.s),actions:items||[]});if(mlog.length>200)mlog.shift()}
/* ---- (2) CDSS rules: state -> concrete countermeasures ---- */
function prescribe(s){var o=[],d=s.d,h=s.h,sl=s.s,R=s.R,m=[];
 if(d>=3){var pct=cl(Math.round(d*2.2/5)*5,15,60);o.push({cat:'shield',ic:'\u{1F6D1}',pri:d>=10?3:2,title:'Operational Shielding',text:d>=10?'Increase lead-lined habitat module shielding by '+pct+'% and move crew to the storm shelter now.':'Pre-position +'+pct+'% lead-lined shielding and stage crew beside the storm shelter.',why:'Dose rate '+f1(d)+' mSv/hr (advisory \u22653, emergency \u226510)'})}
 if(d>=10||s.it>2)m.push('administer 200 mg Antioxidant Protocol');
 if(sl>=4||R>=70)m.push('enforce a mandatory 8-hour rest cycle');else if(sl>=2&&R>=35)m.push('schedule a 60-minute sleep extension');
 if(h<40)m.push('suspend resistance training 24 h and add +500 mL fluid/electrolytes');
 if(m.length){var t=m.join(' + ');o.push({cat:'med',ic:'\u{1F48A}',pri:(d>=10||sl>=4||R>=70)?3:2,title:'Medical Countermeasure',text:t.charAt(0).toUpperCase()+t.slice(1)+'.',why:'Interaction '+f1(s.it)+', sleep debt '+f1(sl)+' h, HRV '+Math.round(h)+' ms (illustrative, flight-surgeon approval)'})}
 if(d>=3){var hr=Math.ceil(TAU*Math.log(d/BASE));o.push({cat:'eva',ic:'\u{1F6E1}\uFE0F',pri:d>=10?3:2,title:'EVA Rescheduling',text:'Postpone scheduled spacewalk by '+hr+' hours until particle activity falls below the '+BASE+' mSv/hr baseline.',why:'Assumes '+TAU+' h exponential decay of the event (model assumption)'})}
 else if(sl>=5)o.push({cat:'eva',ic:'\u{1F6E1}\uFE0F',pri:2,title:'EVA Rescheduling',text:'Defer non-essential EVA until sleep debt is below 3 h.',why:'Sleep debt '+f1(sl)+' h'});
 if(s.tier!=='nominal')o.push({cat:'auto',ic:'\u{1F4E1}',pri:1,title:'Autonomous Execution',text:'Execute locally with no ground approval; queue this log for Earth (one-way delay '+LAT+').',why:'Edge AI decision authority'});
 if(!o.length)o.push({cat:'ok',ic:'\u2705',pri:0,title:'Nominal Operations',text:'Continue ARED/treadmill routine and circadian lighting. No countermeasure required.',why:'All indicators inside thresholds'});
 return o.sort(function(a,b){return b.pri-a.pri})}
var PL=['NOMINAL','ADVISORY','ELEVATED','CRITICAL'];
function paintRx(s,rx){var c=$('rxList');if(!c)return;var mx=rx[0].pri;
 $('rxPri').className='rx-pri p'+mx;$('rxPri').textContent='Risk '+f1(s.R)+'/100 \u00B7 '+PL[mx];
 c.innerHTML=rx.map(function(r){return '<div class="rx-i p'+r.pri+'"><span class="ic">'+r.ic+'</span><div><b>'+esc(r.title)+'</b><p>'+esc(r.text)+'</p><small>Trigger: '+esc(r.why)+'</small></div></div>'}).join('')}
/* ---- Nova (local rules) protocol-shift messages ---- */
function novaLine(s,rx){var n=['radiation','autonomic strain','sleep debt','non-linear interaction'],mi=s.bars.indexOf(Math.max.apply(null,s.bars)),a=rx.filter(function(r){return r.cat!=='auto'}).map(function(r){return r.title.toLowerCase()}).join(', ');
 if(s.tier==='emergency')return[3,'PROTOCOL SHIFT \u2192 EMERGENCY. Risk '+f1(s.R)+', leading driver: '+n[mi]+'. Executing: '+a+'. Earth round-trip is '+RTT+', so I am acting now.'];
 if(s.tier==='elevated')return[2,'PROTOCOL SHIFT \u2192 ELEVATED. Risk '+f1(s.R)+', driven by '+n[mi]+'. Recommended: '+a+'.'];
 return[1,'PROTOCOL SHIFT \u2192 NOMINAL. Risk '+f1(s.R)+'. Standing countermeasures released.']}
/* ---- avatar indices (same source as the Crew Avatar panel) ---- */
function idx(s){try{return window.RCPTAvatar.indices()}catch(e){return{cns:s.fs,cardio:s.fh,resp:s.fr,gi:s.R*.6,skel:s.R*.4,musc:s.R*.5,skin:s.fr*.6}}}
var tr=function(v){return v>=70?'bad':v>=35?'mid':'ok'},CC={ok:'#35d08a',mid:'#ffb224',bad:'#ff5d4d'};
/* ---- (1) simulator panel ---- */
var SN={cns:'CNS',cardio:'Cardio',resp:'Lungs',gi:'GI',skel:'Skeletal',musc:'Muscle',skin:'Skin'},ramp=null,P;
function avSVG(){return '<svg viewBox="0 0 160 295" role="img" aria-label="Crew avatar colored by organ-system risk"><circle data-s="cns" cx="80" cy="32" r="24" fill="#35d08a" fill-opacity=".35" stroke="#35d08a" stroke-width="3"/><rect data-s="skin" x="50" y="62" width="60" height="104" rx="24" fill="#0f1a28" stroke="#35d08a" stroke-width="3"/><rect data-s="musc" x="26" y="68" width="18" height="96" rx="9" fill="#35d08a" fill-opacity=".4"/><rect data-s="musc" x="116" y="68" width="18" height="96" rx="9" fill="#35d08a" fill-opacity=".4"/><rect data-s="musc" x="55" y="168" width="23" height="118" rx="11" fill="#35d08a" fill-opacity=".4"/><rect data-s="musc" x="82" y="168" width="23" height="118" rx="11" fill="#35d08a" fill-opacity=".4"/><path data-s="skel" d="M80 58V168M66 176V280M94 176V280" stroke="#35d08a" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse data-s="resp" cx="65" cy="96" rx="12" ry="20" fill="#35d08a" fill-opacity=".55"/><ellipse data-s="resp" cx="95" cy="96" rx="12" ry="20" fill="#35d08a" fill-opacity=".55"/><circle data-s="cardio" cx="80" cy="112" r="10" fill="#35d08a"/><rect data-s="gi" x="62" y="130" width="36" height="30" rx="13" fill="#35d08a" fill-opacity=".6"/></svg>'}
function build(el){el.innerHTML='<div class="sx"><div><h3>Emergency Simulator</h3><p class="fine">Drag a slider: the risk formula, crew avatar, countermeasures and Nova all react instantly. Everything runs on this device.</p>'+
 [['sd','Solar flare radiation (mSv/hr)',0,50,.5],['ss','Sleep duration, last 24 h (h)',0,10,.5],['sh','Heart Rate Variability (ms)',10,100,1]].map(function(q){return '<div class="sl"><label for="'+q[0]+'">'+q[1]+' <b id="'+q[0]+'v"></b></label><input type="range" id="'+q[0]+'" min="'+q[2]+'" max="'+q[3]+'" step="'+q[4]+'"></div>'}).join('')+
 '<small class="fine" id="sxSd"></small><div class="row"><button class="b" data-p="flare">\u2600 Solar flare spike</button><button class="b" data-p="sleep">\u{1F634} Sleep to 2 h</button><button class="b red" data-p="storm">\u26A0 Perfect storm</button><button class="b go" data-p="ramp">\u25B6 Auto-escalate</button><button class="b" data-p="reset">\u21BA Nominal</button></div>'+
 '<div class="row"><button class="b go" data-x="pdf">\u2B07 Export report (PDF)</button><button class="b" data-x="json">{ } JSON</button></div></div>'+
 '<div><div class="big" id="sxR"></div><div class="gauge" aria-hidden="true"><i id="sxG"></i></div><div class="fine" id="sxT"></div><h4>Dynamic Risk Formula (live)</h4><div class="fm" id="sxF"></div><h4>Countermeasures</h4><div id="sxRx"></div></div>'+
 '<div><h4>Crew Avatar</h4><div id="sxAv">'+avSVG()+'</div><div class="chips2" id="sxC"></div><h4>Nova (local AI) \u00B7 protocol feed</h4><div class="nova" id="sxN"></div></div></div>';
 el.querySelectorAll('input[type=range]').forEach(function(i){i.addEventListener('input',function(){cancelAnimationFrame(ramp);
  var o={};if(this.id==='sd')o.d=+this.value;if(this.id==='sh')o.h=+this.value;if(this.id==='ss')o.s=cl(8-this.value,0,10);RC.setInputs(o)})});
 el.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var p=b.getAttribute('data-p'),x=b.getAttribute('data-x');cancelAnimationFrame(ramp);
  if(x)return x==='pdf'?exportPDF():exportJSON();
  if(p==='flare')RC.setInputs({d:35});if(p==='sleep')RC.setInputs({s:6});if(p==='storm')RC.setInputs({d:28,h:30,s:6});if(p==='reset')RC.setScenario('nominal');
  if(p==='ramp'){RC.setScenario('nominal');var t0=performance.now();(function f(t){var u=cl((t-t0)/12000,0,1);RC.setInputs({d:.5+27.5*u,h:65-35*u,s:1+5*u});if(u<1)ramp=requestAnimationFrame(f)})(t0)}});
 var s=RC.getState();if(s)paintSim(s)}
function paintSim(s){var e=$('sxR');if(!e||!e.isConnected)return;var rx=prescribe(s),ae=document.activeElement&&document.activeElement.id;
 [['sd',s.d],['ss',cl(8-s.s,0,10)],['sh',s.h]].forEach(function(q){var i=$(q[0]);if(ae!==q[0])i.value=q[1];$(q[0]+'v').textContent=f1(q[1])});
 $('sxSd').textContent='Sleep debt used by the model: '+f1(s.s)+' h (8 h target minus actual sleep).';
 e.textContent=f1(s.R);e.style.color=CC[tr(s.R)];$('sxG').style.left='calc('+s.R+'% - 2px)';$('sxT').textContent='Tier: '+s.tier.toUpperCase()+' \u00B7 CI ['+f1(s.lo)+', '+f1(s.hi)+']';
 var h=function(v){return '<span class="hot">'+v+'</span>'};
 $('sxF').innerHTML='F_rad = 100\u00B7(1\u2212e^(\u22120.08\u00B7'+f1(s.d)+')) = '+h(f1(s.fr))+'\nF_hrv = 100\u00B7max(0,(70\u2212'+Math.round(s.h)+')/70) = '+h(f1(s.fh))+'\nF_slp = min(100, 12.5\u00B7'+f1(s.s)+') = '+h(f1(s.fs))+'\nI     = 0.05\u00B7d\u00B7s + 0.03\u00B7d\u00B7F_hrv = '+h(f1(s.it))+'\n------------------------------------------\nR = 0.40\u00B7'+f1(s.fr)+' + 0.35\u00B7'+f1(s.fh)+' + 0.25\u00B7'+f1(s.fs)+' + '+f1(s.it)+' = '+h(f1(s.R));
 $('sxRx').innerHTML=rx.map(function(r){return '<div class="rx-i p'+r.pri+'"><span class="ic">'+r.ic+'</span><div><b>'+esc(r.title)+'</b><p>'+esc(r.text)+'</p></div></div>'}).join('');
 var ix=idx(s);$('sxAv').querySelectorAll('[data-s]').forEach(function(n){var c=CC[tr(ix[n.getAttribute('data-s')])];n.setAttribute('stroke',c);n.setAttribute('fill',n.getAttribute('fill')==='#0f1a28'?'#0f1a28':c)});
 $('sxC').innerHTML=Object.keys(SN).map(function(k){return '<span class="'+tr(ix[k])+'">'+SN[k]+' '+Math.round(ix[k])+'</span>'}).join('');
 $('sxN').innerHTML=feed.slice(-5).reverse().map(function(f){return '<div class="t'+f[0]+'">'+esc(f[1])+'</div>'}).join('')||'<div class="t1">Standing by. Move a slider.</div>'}
P=U.panel({id:'simPanel',title:'Emergency Simulator Sandbox',tabs:[{id:'sim',label:'Simulator',render:build}]});
/* ---- (4) report builder ---- */
function ds(a,n){if(a.length<=n)return a;var o=[];for(var i=0;i<n;i++)o.push(a[Math.round(i*(a.length-1)/(n-1))]);return o}
function report(){var s=RC.getState(),rx=prescribe(s),G=[],H=[];for(var h=100;h>=10;h-=10){var r=[];for(var d=0;d<=50;d+=5)r.push(+f1(RC.M(d,h,s.s).R));H.push(r)}
 var T=ds(buf,60),rs=buf.map(function(b){return b.R}),tt={nominal:0,elevated:0,emergency:0};buf.forEach(function(b){tt[b.tier]++});
 try{window.RCPTCrew.crew().forEach(function(c){G.push({id:c.id,name:c.name,role:c.role||''})})}catch(e){}
 return{schema:'rcpt.mission-report',version:'1.0',generated_utc:new Date().toISOString(),disclaimer:'Simulated data. Research prototype, not a medical device. Thresholds and doses are illustrative.',
 system:{edge_ai:'local, offline',earth_latency_simulated:LAT,network_required:false,last_inference_ms:lastMs},crew:G,
 current:{dose_mSv_hr:+f1(s.d),hrv_ms:Math.round(s.h),sleep_debt_h:+f1(s.s),risk:+f1(s.R),ci:[+f1(s.lo),+f1(s.hi)],tier:s.tier,components:{radiation:+f1(s.fr),autonomic:+f1(s.fh),sleep:+f1(s.fs),interaction:+f1(s.it)}},
 model:{formula:'R=0.40*F_rad+0.35*F_hrv+0.25*F_slp+I',elevated_at:35,emergency_at:70},
 telemetry:{samples:T.map(function(b){return{t:b.t,dose:+f1(b.d),hrv:Math.round(b.h),sleep_debt:+f1(b.s),risk:+f1(b.R),tier:b.tier}}),summary:{n:buf.length,risk_min:rs.length?+f1(Math.min.apply(null,rs)):null,risk_max:rs.length?+f1(Math.max.apply(null,rs)):null,risk_mean:rs.length?+f1(rs.reduce(function(a,b){return a+b},0)/rs.length):null,samples_per_tier:tt}},
 risk_heatmap:{sleep_debt_h:s.s,dose_axis_mSv_hr:[0,5,10,15,20,25,30,35,40,45,50],hrv_axis_ms:[100,90,80,70,60,50,40,30,20,10],risk:H},
 active_prescriptions:rx.map(function(r){return{category:r.cat,title:r.title,action:r.text,trigger:r.why}}),mitigation_log:mlog.slice()}}
function dl(n,m,d){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([d],{type:m}));a.download=n;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},600)}
var stamp=function(){return new Date().toISOString().slice(0,16).replace(/[:T]/g,'-')};
function exportJSON(){addLog('report_exported_json',RC.getState());dl('RCPT-mission-report-'+stamp()+'.json','application/json',JSON.stringify(report(),null,2))}
/* minimal PDF 1.4 writer (ASCII, built-in Helvetica/Courier, vector charts) */
function exportPDF(){addLog('report_exported_pdf',RC.getState());var r=report(),pg=[[]],H=842,y=0;
 var A=function(t){return String(t).replace(/\u2265/g,'>=').replace(/[\u2212\u2013\u2014\u00B7]/g,'-').replace(/\u2192/g,'->').replace(/[^\x20-\x7e]/g,'').replace(/([\\()])/g,'\\$1')},
 hx=function(c){return[1,3,5].map(function(i){return(parseInt(c.substr(i,2),16)/255).toFixed(3)}).join(' ')},C=function(){return pg[pg.length-1]},
 R=function(x,yy,w,h,c){C().push(hx(c)+' rg '+x+' '+(H-yy-h)+' '+w+' '+h+' re f')},
 T=function(x,yy,t,sz,f,c){C().push(hx(c||'#111111')+' rg BT /'+(f||'F1')+' '+sz+' Tf '+x+' '+(H-yy)+' Td ('+A(t)+') Tj ET')},
 W=function(x,t,sz,mw,f){var ws=String(t).split(' '),l='';ws.forEach(function(w){if((l+' '+w).length*sz*.5>mw){T(x,y,l,sz,f);y+=sz+3;l=w}else l=l?l+' '+w:w});if(l){T(x,y,l,sz,f);y+=sz+3}},
 np=function(){pg.push([]);y=50},cur=r.current,tc={nominal:'#2e9e6b',elevated:'#d99100',emergency:'#d6402f'}[cur.tier];
 R(0,0,595,70,'#0a1420');T(36,32,'RCPT - Daily Bio-Medical Mission Report',17,'F2','#ffffff');T(36,52,'Generated '+r.generated_utc+' | Simulated crew data | Research prototype, not a medical device',8,'F1','#9fb4c8');
 R(36,86,523,44,tc);T(46,106,'STATUS: '+cur.tier.toUpperCase()+'   Risk '+cur.risk+'/100   CI ['+cur.ci[0]+', '+cur.ci[1]+']',13,'F2','#ffffff');T(46,122,'Dose '+cur.dose_mSv_hr+' mSv/hr | HRV '+cur.hrv_ms+' ms | Sleep debt '+cur.sleep_debt_h+' h | Edge AI offline, Earth delay '+LAT+' (simulated)',8.5,'F1','#ffffff');
 y=152;T(36,y,'1. Telemetry trend (risk index R_MRP)',11,'F2');y+=10;var x0=44,w0=505,h0=100,sm=r.telemetry.samples;R(x0,y,w0,h0,'#f1f5f9');
 [35,70].forEach(function(v){var yy=y+h0-v/100*h0;R(x0,yy,w0,.6,v===35?'#d99100':'#d6402f');T(x0+w0-70,yy-2,v===35?'Elevated 35':'Emergency 70',7,'F1','#555555')});
 if(sm.length>1){var p=sm.map(function(q,i){return(x0+i/(sm.length-1)*w0).toFixed(1)+' '+(H-(y+h0-q.risk/100*h0)).toFixed(1)}).join(' l ').replace(/^/,'');C().push('0.090 0.450 0.800 RG 1.4 w '+p.replace(' l ',' m ')+' S')}
 else if(sm.length){R(x0+w0/2-2,y+h0-sm[0].risk/100*h0-2,4,4,'#1673cc')}
 y+=h0+12;var sy=r.telemetry.summary;T(36,y,'Samples '+sy.n+' | min '+sy.risk_min+' | mean '+sy.risk_mean+' | max '+sy.risk_max+' | nominal/elevated/emergency: '+sy.samples_per_tier.nominal+'/'+sy.samples_per_tier.elevated+'/'+sy.samples_per_tier.emergency,8);y+=22;
 T(36,y,'2. Risk heatmap: dose rate (x, 0-50 mSv/hr) by HRV (y, 100-10 ms) at sleep debt '+r.risk_heatmap.sleep_debt_h+' h',11,'F2');y+=10;var cw=46,ch=9.5;
 r.risk_heatmap.risk.forEach(function(row,j){row.forEach(function(v,i){var c=v>=70?'#d6402f':v>=55?'#f08a3c':v>=35?'#f2c94c':v>=18?'#4fb3d9':'#1d4f91';R(44+i*cw,y+j*ch,cw-1,ch-1,c)})});
 y+=10*ch+10;T(36,y,'Blue < 18 | cyan 18-35 | yellow 35-55 | orange 55-70 | red >= 70 (emergency)',7.5,'F1','#555555');y+=22;
 T(36,y,'3. Active prescriptions (illustrative CDSS output)',11,'F2');y+=14;r.active_prescriptions.forEach(function(q){T(40,y,q.title.toUpperCase(),8.5,'F2');y+=11;W(52,q.action+' [Trigger: '+q.trigger+']',8.5,490);y+=2});
 y+=8;if(y>700)np();T(36,y,'4. Mitigation log',11,'F2');y+=14;var lg=r.mitigation_log.slice(-24);if(!lg.length){T(40,y,'No events logged in this session.',8.5);y+=12}
 lg.forEach(function(e){if(y>800)np();T(40,y,e.time.slice(11,19)+'  '+e.event+'  '+(e.tier||'')+'  R='+e.risk,8,'F3');y+=10;if(e.actions&&e.actions.length){W(60,e.actions.join(' | '),7.5,480);}});
 y+=10;if(y>790)np();W(36,'Disclaimer: '+r.disclaimer+' Independent project, not affiliated with or endorsed by NASA.',7.5,520);
 var o=[],n=pg.length,ob=['<</Type/Catalog/Pages 2 0 R>>','<</Type/Pages/Kids['+pg.map(function(_,i){return(7+2*i)+' 0 R'}).join(' ')+']/Count '+n+'>>','<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>','<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold>>','<</Type/Font/Subtype/Type1/BaseFont/Courier>>'];
 pg.forEach(function(c,i){c.push(hx('#666666')+' rg BT /F1 7 Tf 36 20 Td (RCPT mission report - page '+(i+1)+' of '+n+') Tj ET');var s=c.join('\n');ob.push('<</Length '+s.length+'>>\nstream\n'+s+'\nendstream','<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 3 0 R/F2 4 0 R/F3 5 0 R>>>>/Contents '+(6+2*i)+' 0 R>>')});
 var out='%PDF-1.4\n',off=[];ob.forEach(function(b,i){off.push(out.length);out+=(i+1)+' 0 obj\n'+b+'\nendobj\n'});var xr=out.length;out+='xref\n0 '+(ob.length+1)+'\n0000000000 65535 f \n'+off.map(function(v){return('0000000000'+v).slice(-10)+' 00000 n \n'}).join('')+'trailer\n<</Size '+(ob.length+1)+'/Root 1 0 R>>\nstartxref\n'+xr+'\n%%EOF';
 var u=new Uint8Array(out.length);for(var i=0;i<out.length;i++)u[i]=out.charCodeAt(i)&255;dl('RCPT-mission-report-'+stamp()+'.pdf','application/pdf',u)}
/* ---- wiring ---- */
function inject(){var m=document.querySelector('.main');if(!m||$('edgeBar'))return;
 var bar=document.createElement('div');bar.id='edgeBar';bar.setAttribute('role','status');bar.setAttribute('aria-label','Connectivity and edge AI status');
 bar.innerHTML='<div class="eb r"><i></i><span>\u{1F534} Earth Telemetry Latency:</span><b>'+LAT+'</b><em>Simulated Deep-Space Delay</em></div><div class="eb g"><i></i><span>\u{1F7E2} Local Edge AI Engine:</span><b>Active &amp; 100% Offline</b><em>Local WebAssembly / WASM Infrastructure</em></div><div class="eb c"><span>Local inference</span><b id="ebMs">-</b><em>0 network calls</em></div>';
 m.insertBefore(bar,m.firstChild);
 var card=document.createElement('div');card.className='rx';card.id='rxCard';card.innerHTML='<div class="rx-h"><h5>Mitigation Prescriptions</h5><span class="rx-tag">CDSS \u00B7 AUTONOMOUS \u00B7 ON-DEVICE</span><span class="rx-pri" id="rxPri"></span></div><div id="rxList"></div><div class="rx-f"><button class="tb go" id="rxAck" type="button">\u2714 Acknowledge &amp; log execution</button><button class="tb" id="rxPdf" type="button">\u2B07 Report (PDF)</button><button class="tb" id="rxJson" type="button">{ } JSON</button><span class="fine" id="rxNote">Illustrative protocols, not medical advice. Flight surgeon approval required.</span></div>';
 m.insertBefore(card,$('footer'));
 $('rxAck').onclick=function(){var s=RC.getState();addLog('executed',s,prescribe(s).map(function(r){return r.title+': '+r.text}));$('rxNote').textContent='\u2714 Executed and logged at '+new Date().toISOString().slice(11,19)+' UTC'};
 $('rxPdf').onclick=exportPDF;$('rxJson').onclick=exportJSON;
 var t=document.querySelector('.tools'),mk=function(id,txt,fn){var b=document.createElement('button');b.className='tb go';b.id=id;b.type='button';b.textContent=txt;b.onclick=fn;t.insertBefore(b,$('debriefBtn'));return b};
 mk('simBtn','\u26A1 Emergency Simulator',function(){P.open('sim')});mk('expBtn','\u2B07 Export Mission Report',exportPDF);mk('expJBtn','{ } JSON',exportJSON).className='tb'}
RC.onUpdate(function(s){var t0=performance.now();RC.M(s.d,s.h,s.s);var rx=prescribe(s);lastMs=+(performance.now()-t0).toFixed(3);
 buf.push({t:new Date().toISOString(),d:s.d,h:s.h,s:s.s,R:s.R,tier:s.tier});if(buf.length>600)buf.shift();
 if($('ebMs'))$('ebMs').textContent=lastMs.toFixed(2)+' ms';
 var sig=s.tier+'|'+rx.map(function(r){return r.cat}).join(',');
 if(sig!==prevSig){prevSig=sig;addLog(prevTier&&prevTier!==s.tier?'tier_change':'prescription_update',s,rx.map(function(r){return r.title+': '+r.text}))}
 if(prevTier!==null&&s.tier!==prevTier)feed.push(novaLine(s,rx));prevTier=s.tier;
 paintRx(s,rx);paintSim(s)});
document.addEventListener('rcpt:launch',inject);inject();
window.RCPTMission={prescribe:prescribe,report:report,exportJSON:exportJSON,exportPDF:exportPDF,openSimulator:function(){P.open('sim')},log:function(){return mlog.slice()}};
})();
