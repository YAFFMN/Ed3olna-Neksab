/* ORION: Mars mission atlas + 30-sol expedition game.
   The terrain is a STYLISED elevation model built from known feature positions (not NASA MOLA data).
   Radiation is a simplified model calibrated to Curiosity's published ~0.64 mSv/day at Gale crater.
   Risk in the game comes from the same RCPT model as the dashboard (window.RCPT.M). */
(function(){
'use strict';
var D=window.ORION_DATA,RC=window.RCPT,$=function(i){return document.getElementById(i)};
var W=1024,H=512,RKM=3389.5,KMDEG=RKM*Math.PI/180,d2r=Math.PI/180;
var clamp=function(x,a,b){return Math.max(a,Math.min(b,x))};
var smooth=function(a,b,x){var t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
var wrapLon=function(d){return ((d+540)%360)-180};
var fmt=function(n,k){return (+n).toFixed(k==null?1:k)};
var esc=function(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};

/* ---------------- physical model ---------------- */
var pressurePa=function(h){return 610*Math.exp(-h/11.1)};
var column=function(h){return 16.4*Math.exp(-h/11.1)};                 // g/cm2 of CO2 overhead
var gcrDay=function(h){return .937*(.55+.45*Math.exp(-column(h)/20))};    // mSv/day, calibrated: Gale (-4.4 km) = 0.64
var speRate=function(h){return 18.5*Math.exp(-column(h)/20)};            // mSv/hr, RCPT 18.5 stress-test thinned by the air above
var tMean=function(lat,h){return Math.max(-125,-55-.55*Math.abs(lat)-2*h)}; // deg C, rough annual mean
var EARTH_DAY=2.4/365;                                                       // mSv/day, average natural background on Earth

/* ---------------- terrain model ---------------- */
var elev,gcrG,hazG,slopeG,shadeG,built=false,terrainSrc='stylised';
function hash3(x,y,z){var h=Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,1274126177);h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967295}
function vn(x,y,z){var xi=Math.floor(x),yi=Math.floor(y),zi=Math.floor(z),xf=x-xi,yf=y-yi,zf=z-zi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),w=zf*zf*(3-2*zf);
  var L=function(a,b,t){return a+(b-a)*t};
  return L(L(L(hash3(xi,yi,zi),hash3(xi+1,yi,zi),u),L(hash3(xi,yi+1,zi),hash3(xi+1,yi+1,zi),u),v),L(L(hash3(xi,yi,zi+1),hash3(xi+1,yi,zi+1),u),L(hash3(xi,yi+1,zi+1),hash3(xi+1,yi+1,zi+1),u),v),w)}
function fbm(x,y,z){var s=0,a=.5,f=1;for(var o=0;o<5;o++){s+=a*(vn(x*f,y*f,z*f)-.5);a*=.5;f*=2.03}return s*2}
function rngSeed(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function segDist(px,py,ax,ay,bx,by){var dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy),0,1);var qx=ax+t*dx-px,qy=ay+t*dy-py;return[Math.sqrt(qx*qx+qy*qy),t]}
var RIMS=[{lat:-42.7,lon:70,R:1050,amp:2.4,w:260},{lat:-49.7,lon:-44.3,R:800,amp:1.6,w:200},{lat:12.9,lon:87,R:700,amp:1.8,w:170}];

function dichLat(lon){var P=D.dichotomy,k=1;while(k<P.length-1&&lon>P[k][0])k++;var a=P[k-1],b=P[k],t=clamp((lon-a[0])/(b[0]-a[0]),0,1);t=(1-Math.cos(t*Math.PI))/2;return a[1]+(b[1]-a[1])*t}
function buildTerrain(){
  elev=new Float32Array(W*H);var F=D.features,V=D.valles,N=W*H;
  var vp=V.pts.map(function(p){return[p[0]*KMDEG,p[1]*KMDEG]}),tot=0,seg=[];
  for(var q=0;q<vp.length-1;q++){var l=Math.hypot(vp[q+1][0]-vp[q][0],vp[q+1][1]-vp[q][1]);seg.push(l);tot+=l}
  for(var j=0;j<H;j++){
    var lat=90-(j+.5)/H*180,cl=Math.cos(lat*d2r);
    for(var i=0;i<W;i++){
      var lon=(i+.5)/W*360-180,lb=dichLat(lon),s=smooth(lb-6,lb+8,lat),e=1.5*(1-s)-4.2*s;
      e+=1.4*smooth(68,89,lat)+3.5*smooth(66,88,-lat);
      for(var k=0;k<F.length;k++){var f=F[k],dy=(lat-f.lat)*KMDEG;if(Math.abs(dy)>4.2*f.sig)continue;
        var dl=wrapLon(lon-f.lon),c=Math.cos((lat+f.lat)/2*d2r),dx=dl*c*KMDEG;if(Math.abs(dx)>4.2*f.sig)continue;
        e+=f.amp*Math.exp(-(dx*dx+dy*dy)/(2*f.sig*f.sig))}
      for(var m=0;m<RIMS.length;m++){var rm=RIMS[m],ddy=(lat-rm.lat)*KMDEG,ddx=wrapLon(lon-rm.lon)*Math.cos((lat+rm.lat)/2*d2r)*KMDEG,rd=Math.hypot(ddx,ddy);if(Math.abs(rd-rm.R)<3*rm.w)e+=rm.amp*Math.exp(-Math.pow((rd-rm.R)/rm.w,2))}
      if(lat>-25&&lat<6&&lon>-118&&lon<-35){var px=lat*KMDEG,py=lon*KMDEG*Math.cos(-10*d2r),best=1e9,bt=0,acc=0;
        for(var q2=0;q2<vp.length-1;q2++){var a=vp[q2],b=vp[q2+1],sd=segDist(px,py*1,a[0],a[1]*Math.cos(-10*d2r),b[0],b[1]*Math.cos(-10*d2r));if(sd[0]<best){best=sd[0];bt=(acc+sd[1]*seg[q2])/tot}acc+=seg[q2]}
        e-=V.depth*(.55+.45*Math.sin(Math.PI*clamp(bt,0,1)))*Math.exp(-best*best/(2*V.sig*V.sig))}
      var la=lat*d2r,lo=lon*d2r,nx=Math.cos(la)*Math.cos(lo)*3.2,ny=Math.cos(la)*Math.sin(lo)*3.2,nz=Math.sin(la)*3.2;
      e+=fbm(nx,ny,nz)*(.3+1.25*(1-s));
      elev[j*W+i]=e}}
  /* craters: dense in the old southern highlands, sparse in the young northern plains */
  var rnd=rngSeed(20260616);
  for(var n=0;n<1100;n++){
    var cla=Math.asin(2*rnd()-1)/d2r,clo=rnd()*360-180,u=rnd(),R=Math.min(150,21/Math.pow(1-u,1/1.7));if(Math.abs(cla)>68)continue;
    var cj=Math.floor((90-cla)/180*H),ci=Math.floor((clo+180)/360*W);if(cj<0||cj>=H)continue;
    if(elev[cj*W+ci]<-1.5&&rnd()>.22)continue;
    var depth=.0055*Math.pow(R,1.12),rim=.3*depth,kmx=KMDEG*360/W*Math.max(.08,Math.cos(cla*d2r)),kmy=KMDEG*180/H,nxp=Math.ceil(R*1.5/kmx),nyp=Math.ceil(R*1.5/kmy);
    for(var yy=-nyp;yy<=nyp;yy++){var jj=cj+yy;if(jj<0||jj>=H)continue;
      for(var xx=-nxp;xx<=nxp;xx++){var ii=(ci+xx+W)%W,r=Math.hypot(xx*kmx,yy*kmy);
        if(r<R){elev[jj*W+ii]-=depth*(1-Math.pow(r/R,2))}else if(r<R*1.35){elev[jj*W+ii]+=rim*Math.exp(-Math.pow((r-R)/(.14*R),2))}}}}
  var mn=1e9,mx=-1e9;for(var t=0;t<N;t++){var v=clamp(elev[t],-8.6,22.4);elev[t]=v;if(v<mn)mn=v;if(v>mx)mx=v}
  var r=derive();terrainSrc='stylised';built=true;
  try{var sv=JSON.parse(localStorage.getItem('orion.dem')||'null');if(sv&&sv.b64){var bin=atob(sv.b64),u=new Uint8Array(bin.length);for(var k2=0;k2<bin.length;k2++)u[k2]=bin.charCodeAt(k2);if(u.length===W*H){importDEM(u,sv.min,sv.max,sv.shift);r=derive()}}}catch(e){}
  return r;
}
function srcNote(){var d=document.getElementById('or-disc'),st=document.getElementById('or-src');if(d)d.firstChild.textContent=terrainSrc==='imported'?'Terrain: imported elevation grid supplied by the user (8-bit greyscale, so vertical steps are coarse). ':'Stylised terrain model built from known feature positions, in the style of a topographic atlas. It is not NASA MOLA data (you can import a real elevation grid in Data & Validation). ';if(st)st.textContent=terrainSrc==='imported'?'Terrain: imported grid':'Terrain: stylised model'}
function derive(){var N=W*H,mn=1e9,mx=-1e9;for(var t0=0;t0<N;t0++){var v0=elev[t0];if(v0<mn)mn=v0;if(v0>mx)mx=v0}
  /* derived grids */
  gcrG=new Float32Array(N);hazG=new Float32Array(N);slopeG=new Float32Array(N);shadeG=new Float32Array(N);
  var EX=22,dyk=KMDEG*180/H,L=[-.5,-.5,.7],Ln=Math.hypot(L[0],L[1],L[2]);L=[L[0]/Ln,L[1]/Ln,L[2]/Ln];
  for(var jy=0;jy<H;jy++){var la2=90-(jy+.5)/H*180,dxk=KMDEG*360/W*Math.max(.06,Math.cos(la2*d2r));
    for(var ix=0;ix<W;ix++){var id=jy*W+ix,h=elev[id],xl=elev[jy*W+((ix+W-1)%W)],xr=elev[jy*W+((ix+1)%W)],yu=elev[Math.max(0,jy-1)*W+ix],yd=elev[Math.min(H-1,jy+1)*W+ix];
      var gx=(xr-xl)/(2*dxk),gy=(yd-yu)/(2*dyk),sl=Math.atan(Math.hypot(gx,gy))/d2r;slopeG[id]=sl;
      var nx2=-gx*EX,ny2=-gy*EX,nl=Math.hypot(nx2,ny2,1),dot=(nx2*L[0]+ny2*L[1]+L[2])/nl;shadeG[id]=clamp(.93+2.0*(dot-L[2]),.55,1.55);
      var g=gcrDay(h);gcrG[id]=g;
      hazG[id]=100*(.5*clamp((g-.55)/.37,0,1)+.3*clamp((-tMean(la2,h)-45)/70,0,1)+.2*clamp(sl/10,0,1))}}
  return{min:mn,max:mx};
}


/* Bring-your-own real elevation grid: 8-bit greyscale equirectangular image (e.g. a MOLA DEM render) mapped to [minKm,maxKm]. */
function importDEM(u8,minKm,maxKm,shift){
  if(!u8||u8.length!==W*H)throw new Error('grid must be '+W+'x'+H);
  elev=new Float32Array(W*H);var half=shift?W/2:0,span=maxKm-minKm;
  for(var j=0;j<H;j++)for(var i=0;i<W;i++)elev[j*W+i]=clamp(minKm+u8[j*W+((i+half)%W)]/255*span,-8.6,22.4);
  derive();terrainSrc='imported';cache={};built=true;srcNote();if(open){paintMap();legend();drawOverlay();if(cur)select(cur.e.lat,cur.e.lon)}
}
function restoreStylised(){try{localStorage.removeItem('orion.dem')}catch(e){}buildTerrain();cache={};srcNote();if(open){paintMap();legend();drawOverlay();if(cur)select(cur.e.lat,cur.e.lon)}}

/* ---------------- colour ramps ---------------- */
function lut(stops,vmin,vmax){var n=1024,o=new Uint8Array(n*3);for(var i=0;i<n;i++){var v=vmin+(vmax-vmin)*i/(n-1),k=1;while(k<stops.length-1&&v>stops[k][0])k++;var a=stops[k-1],b=stops[k],t=clamp((v-a[0])/(b[0]-a[0]),0,1);for(var c=0;c<3;c++)o[i*3+c]=a[1][c]+(b[1][c]-a[1][c])*t}return o}
var LAYERS={
  topo:{name:'Topography',unit:'km',min:-8.6,max:22.4,stops:[[-8.6,[38,30,70]],[-6,[52,70,155]],[-4,[38,140,222]],[-2.8,[28,196,214]],[-1.6,[46,210,120]],[-.3,[160,224,54]],[.6,[244,226,56]],[2,[250,160,44]],[3.5,[238,76,44]],[5.2,[188,48,66]],[7.5,[160,112,98]],[11,[196,184,180]],[16,[236,236,236]],[22.4,[255,255,255]]],ticks:[-8,-4,0,4,8,14,22],sh:1,cont:1},
  rad:{name:'Radiation (quiet Sun)',unit:'mSv/day',min:.55,max:.92,stops:[[.55,[20,40,120]],[.62,[30,140,220]],[.7,[60,210,170]],[.78,[250,220,60]],[.86,[250,120,40]],[.92,[210,30,50]]],ticks:[.55,.65,.75,.85,.92],sh:.55},
  storm:{name:'Storm stress test',unit:'mSv/hr',min:2,max:18.5,stops:[[2,[30,60,160]],[4,[40,170,220]],[7,[90,220,150]],[11,[250,220,60]],[15,[250,110,40]],[18.5,[210,30,50]]],ticks:[2,5,10,15,18.5],sh:.55},
  haz:{name:'Hazard index (model)',unit:'0-100',min:15,max:70,stops:[[15,[40,160,100]],[28,[190,220,70]],[40,[250,200,50]],[55,[250,120,40]],[70,[200,30,60]]],ticks:[15,30,45,60,70],sh:.5}
};
Object.keys(LAYERS).forEach(function(k){var L=LAYERS[k];L.lut=lut(L.stops,L.min,L.max)});
var cache={};
function renderLayer(key){
  if(cache[key])return cache[key];
  var L=LAYERS[key],cv=document.createElement('canvas');cv.width=W;cv.height=H;var x=cv.getContext('2d'),img=x.createImageData(W,H),d=img.data;
  for(var j=0;j<H;j++){var lat=90-(j+.5)/H*180;
    for(var i=0;i<W;i++){var id=j*W+i,h=elev[id],v;
      v=key==='topo'?h:key==='rad'?gcrG[id]:key==='storm'?speRate(h):hazG[id];
      var t=clamp((v-L.min)/(L.max-L.min),0,1)*1023|0,sh=1+(shadeG[id]-1)*L.sh,r=L.lut[t*3],g=L.lut[t*3+1],b=L.lut[t*3+2];
      if(L.cont){var c0=Math.floor(h/2),cr=Math.floor(elev[j*W+Math.min(W-1,i+1)]/2),cd=Math.floor(elev[Math.min(H-1,j+1)*W+i]/2);if(c0!==cr||c0!==cd){sh*=.8}}
      if(key==='topo'&&(lat>81.5||lat<-83.5)){var ice=smooth(81.5,84,Math.abs(lat)-(lat<0?-2:0)*0);if(lat<-83.5)ice=smooth(83.5,86,-lat);var mix=.82*ice;r=r+(246-r)*mix;g=g+(248-g)*mix;b=b+(252-b)*mix}
      var p=id*4;d[p]=clamp(r*sh,0,255);d[p+1]=clamp(g*sh,0,255);d[p+2]=clamp(b*sh,0,255);d[p+3]=255}}
  x.putImageData(img,0,0);cache[key]=cv;return cv}

/* ---------------- site analysis ---------------- */
function idx(lat,lon){var i=clamp(Math.floor((wrapLon(lon)+180)/360*W),0,W-1),j=clamp(Math.floor((90-lat)/180*H),0,H-1);return j*W+i}
function dist(la1,lo1,la2,lo2){var p1=la1*d2r,p2=la2*d2r,dl=wrapLon(lo2-lo1)*d2r,a=Math.sin((p2-p1)/2)*Math.sin((p2-p1)/2)+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)*Math.sin(dl/2);return 2*RKM*Math.asin(Math.min(1,Math.sqrt(a)))}
function regionAt(lat,lon,h){
  var best=null,bd=1;
  D.regions.forEach(function(r){var pts=r.pts||[[r.lat,r.lon,r.r]];pts.forEach(function(p){var q=dist(lat,lon,p[0],p[1])/p[2];if(q<bd){bd=q;best=r}})});
  if(best)return best;
  if(lat>=80)return D.regions.filter(function(r){return/North Polar/.test(r.n)})[0];
  if(lat<=-80)return D.regions.filter(function(r){return/South Polar/.test(r.n)})[0];
  if(h<-2.5&&lat>5)return{n:'Northern lowlands',sci:1,terrain:1,dust:1,gen:1,env:'The smooth, low northern plains cover about a third of Mars. The ground is several kilometres lower than the southern highlands, so it has more air overhead.',watch:'Lower ground gives a lower radiation dose. Cold winters and, at higher latitudes, shallow ice.'};
  if(h>0.2)return{n:'Southern highlands',sci:1,terrain:2,dust:1,gen:1,env:'Ancient, heavily cratered high ground that covers most of the southern half of Mars. It is older and rougher than the northern plains.',watch:'Cratered, uneven ground slows travel. Higher ground means a little less air overhead, so a bit more radiation than the plains.'};
  return{n:'Highland-lowland boundary',sci:1,terrain:2,dust:1,gen:1,env:'The slope-and-scarp zone where the old southern highlands step down to the northern plains. Eroded mesas and channels are common.',watch:'Slopes and eroded mesas make ground travel uneven. Moderate elevation.'};
}
function siteNear(lat,lon){var b=null,bd=160;D.sites.forEach(function(s){var d=dist(lat,lon,s.lat,s.lon);if(d<bd){bd=d;b=s}});return b}
function envAt(lat,lon){var id=idx(lat,lon),h=elev[id];return{lat:lat,lon:wrapLon(lon),h:h,P:pressurePa(h),gcr:gcrDay(h),spe:speRate(h),tm:tMean(lat,h),slope:slopeG[id]}}
var LV=['Low','Moderate','High','Severe'];
function analyse(lat,lon,shield){
  var e=envAt(lat,lon),reg=regionAt(lat,lon,e.h),sh=shield||D.shields[0],o30=e.gcr*30,in30=e.gcr*30*sh.f;
  var hz=[];
  hz.push({k:'Radiation (everyday)',lv:e.gcr<.7?1:e.gcr<.82?2:3,t:'About '+fmt(e.gcr,2)+' mSv/day in the open, roughly '+Math.round(e.gcr/EARTH_DAY)+' times Earth\'s average natural background. Over 30 sols: about '+fmt(o30,0)+' mSv outside, or about '+fmt(in30,0)+' mSv living in a '+sh.n.toLowerCase()+'. Simplified model, calibrated to Curiosity\'s measured 0.64 mSv/day at Gale.'});
  hz.push({k:'Solar storm',lv:e.spe<4?1:e.spe<10?2:3,t:'In the stress-test storm (the dashboard\'s 18.5 mSv/hr reference, thinned by the air above this spot) the open-air rate is about '+fmt(e.spe,1)+' mSv/hr. The answer is a storm shelter, not a longer EVA. This is a stress test, not a forecast.'});
  hz.push({k:'Air and pressure',lv:3,t:'Pressure about '+Math.round(e.P)+' Pa, which is '+fmt(e.P/63,1)+'% of the roughly 6,300 Pa Armstrong limit where body fluids boil. The air is mostly carbon dioxide. A pressurised suit or habitat is mandatory everywhere.'});
  hz.push({k:'Cold',lv:e.tm>-55?1:e.tm>-80?2:3,t:'Average about '+Math.round(e.tm)+' °C. Typical day high near '+Math.round(e.tm+40)+' °C, night low near '+Math.round(e.tm-45)+' °C (approximate). Heating is a life-support issue.'});
  var dl=reg.dust||1;hz.push({k:'Dust',lv:dl,t:dl>=3?'This area is dust-prone: dust storms or thick dust cover are common. Fine dust irritates lungs, abrades seals and cuts solar power.':dl===2?'Dust storms or dust devils are known here. Fine dust irritates lungs and cuts solar power, so plan for storm season.':'Dust is present everywhere on Mars. It irritates lungs, abrades seals and suits, and coats solar panels.'});
  hz.push({k:'Toxic soil',lv:2,t:'Perchlorate salts, found by Phoenix and Curiosity, are toxic if inhaled or swallowed and can affect the thyroid at high exposure. Keep soil dust out of living areas.'});
  var tl=Math.max(reg.terrain||1,e.slope>8?3:e.slope>4?2:1);hz.push({k:'Terrain and EVA',lv:tl,t:tl>=3?'Steep or broken ground: falls, landslides and rover rollovers are real risks, and radio line of sight can be blocked.':tl===2?'Uneven, cratered or rocky ground slows travel and raises the risk of falls and stuck rovers.':'Mostly flat, open ground. Good for landing and for walking EVAs.'});
  hz.push({k:'Low gravity',lv:2,t:'Gravity is 38% of Earth\'s. Long stays can weaken bones and muscles, so daily exercise is part of every plan.'});
  var la=Math.abs(lat),water=la>=45?['Good','Ice is thought to lie within about a metre of the surface at these latitudes.']:la>=35?['Fair','Ice is probably buried a bit deeper, with more digging needed.']:['Poor','Near the equator, ice is deep or locked in minerals. Water would be hard to reach.'];
  return{e:e,reg:reg,hz:hz,water:water,o30:o30,in30:in30,sh:sh,near:siteNear(lat,lon)};
}

/* ---------------- state + UI ---------------- */
var site=null,layer='topo',cur=null,open=false,root,mapCv,ovCv,ovx,tip,tab='brief',hoverPt=null,keyPt={lat:0,lon:0},G=null,timer=null;
var shieldId='hab',best=(function(){try{return JSON.parse(localStorage.getItem('orion.best')||'{}')}catch(e){return{}}})();
var NV=function(){return window.NovaAPI||null};
var say=function(t,o){var n=NV();if(n)n.say(t,o||{})};
function mount(){
  root=document.createElement('div');root.id='orion';root.className='or';root.hidden=true;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Orion, Mars mission atlas');
  root.innerHTML='<header class="or-h"><div class="or-brand"><div class="or-t">ORION</div><div class="or-st">Mars mission atlas &middot; radiation and health explorer &middot; <span id="or-src">Terrain: stylised model</span></div></div>'+
   '<div class="or-layers" role="group" aria-label="Map layer">'+Object.keys(LAYERS).map(function(k){return '<button type="button" class="or-lb" data-layer="'+k+'" aria-pressed="'+(k==='topo')+'">'+LAYERS[k].name+'</button>'}).join('')+'</div>'+
   '<div class="or-opts"><label><input type="checkbox" id="or-sites" checked> Landing sites</label><label><input type="checkbox" id="or-grat" checked> Grid</label><label><input type="checkbox" id="or-lab" checked> Labels</label></div>'+
   '<button type="button" class="or-x" id="or-close" aria-label="Close Orion">Close &middot; Esc</button></header>'+
  '<div class="or-body"><section class="or-mapcol"><div class="or-frame" id="or-frame"><canvas id="or-map" width="'+W+'" height="'+H+'" aria-hidden="true"></canvas><canvas id="or-ov" tabindex="0" role="application" aria-label="Mars map. Use arrow keys to move the cursor, Enter to select a place."></canvas><div id="or-tip" class="or-tip" hidden></div><div id="or-load" class="or-load">Building terrain model&hellip;</div></div>'+
   '<div class="or-legend" id="or-legend"></div><div class="or-quick" id="or-quick"></div>'+
   '<p class="or-disc" id="or-disc">Stylised terrain model built from known feature positions, in the style of a topographic atlas. It is not NASA MOLA data (you can import a real elevation grid in Data &amp; Validation). Radiation, temperature and hazard layers are simplified models for planning and teaching. Research prototype, not a medical device; not affiliated with or endorsed by NASA.</p></section>'+
  '<aside class="or-side"><div class="or-tabs" role="tablist"><button type="button" role="tab" id="or-tb" aria-selected="true">Site briefing</button><button type="button" role="tab" id="or-tg" aria-selected="false">Expedition game</button></div><div id="or-brief" class="or-pane" aria-live="polite"></div><div id="or-game" class="or-pane" hidden></div></aside></div>';
  document.body.appendChild(root);
  mapCv=$('or-map');ovCv=$('or-ov');ovx=ovCv.getContext('2d');tip=$('or-tip');
  root.querySelectorAll('.or-lb').forEach(function(b){b.addEventListener('click',function(){setLayer(b.getAttribute('data-layer'))})});
  ['or-sites','or-grat','or-lab'].forEach(function(id){$(id).addEventListener('change',drawOverlay)});
  $('or-close').addEventListener('click',close);$('or-tb').addEventListener('click',function(){setTab('brief')});$('or-tg').addEventListener('click',function(){setTab('game')});
  var Q=[['Jezero Crater',18.4,77.5],['Gale Crater',-5.4,137.8],['Olympus Mons',18.65,-133.8],['Hellas floor',-42,70],['Valles Marineris',-12,-62],['Arcadia Planitia',47,-168],['Utopia Planitia',46.7,117.5],['Meridiani',-2,-5.5],['North pole',87,0]];
  $('or-quick').innerHTML='<span>Quick destinations:</span>'+Q.map(function(q,i){return '<button type="button" data-q="'+i+'">'+q[0]+'</button>'}).join('');
  $('or-quick').addEventListener('click',function(e){var b=e.target.closest('button');if(b){var q=Q[+b.getAttribute('data-q')];select(q[1],q[2])}});
  ovCv.addEventListener('pointermove',function(e){var p=toLL(e);hoverPt=p;showTip(e,p);drawOverlay()});
  ovCv.addEventListener('pointerleave',function(){hoverPt=null;tip.hidden=true;drawOverlay()});
  ovCv.addEventListener('click',function(e){var p=toLL(e);select(p.lat,p.lon)});
  ovCv.addEventListener('keydown',function(e){var st=e.shiftKey?10:2,m=false;
    if(e.key==='ArrowLeft'){keyPt.lon=wrapLon(keyPt.lon-st);m=true}else if(e.key==='ArrowRight'){keyPt.lon=wrapLon(keyPt.lon+st);m=true}else if(e.key==='ArrowUp'){keyPt.lat=clamp(keyPt.lat+st,-89,89);m=true}else if(e.key==='ArrowDown'){keyPt.lat=clamp(keyPt.lat-st,-89,89);m=true}
    else if(e.key==='Enter'||e.key===' '){select(keyPt.lat,keyPt.lon);e.preventDefault();return}
    if(m){e.preventDefault();hoverPt={lat:keyPt.lat,lon:keyPt.lon,key:1};drawOverlay()}});
  ovCv.addEventListener('focus',function(){hoverPt={lat:keyPt.lat,lon:keyPt.lon,key:1};drawOverlay()});
  if(window.ResizeObserver)new ResizeObserver(sizeOverlay).observe($('or-frame'));
  document.addEventListener('keydown',onKey);
}
function toLL(e){var r=ovCv.getBoundingClientRect(),x=clamp((e.clientX-r.left)/r.width,0,1),y=clamp((e.clientY-r.top)/r.height,0,1);return{lat:90-y*180,lon:x*360-180}}
function showTip(e,p){var id=idx(p.lat,p.lon),h=elev[id],L=LAYERS[layer],v=layer==='topo'?h:layer==='rad'?gcrG[id]:layer==='storm'?speRate(h):hazG[id];
  var r=$('or-frame').getBoundingClientRect();tip.hidden=false;tip.style.left=Math.min(r.width-190,e.clientX-r.left+14)+'px';tip.style.top=Math.max(4,e.clientY-r.top-54)+'px';
  tip.innerHTML=fmt(Math.abs(p.lat),1)+'°'+(p.lat>=0?'N':'S')+' '+fmt(Math.abs(p.lon),1)+'°'+(p.lon>=0?'E':'W')+'<br>elev '+fmt(h,1)+' km &middot; '+fmt(v,layer==='rad'?2:1)+' '+L.unit}
function sizeOverlay(){var r=$('or-frame').getBoundingClientRect(),dpr=window.devicePixelRatio||1;ovCv.width=Math.max(10,Math.round(r.width*dpr));ovCv.height=Math.max(10,Math.round(r.height*dpr));drawOverlay()}
function setLayer(k){layer=k;root.querySelectorAll('.or-lb').forEach(function(b){b.setAttribute('aria-pressed',String(b.getAttribute('data-layer')===k))});paintMap();legend()}
function paintMap(){var x=mapCv.getContext('2d');x.drawImage(renderLayer(layer),0,0);drawOverlay()}
function legend(){var L=LAYERS[layer],g='linear-gradient(90deg,'+L.stops.map(function(s){return 'rgb('+s[1].join(',')+') '+((s[0]-L.min)/(L.max-L.min)*100).toFixed(1)+'%'}).join(',')+')';
  $('or-legend').innerHTML='<div class="or-lt">'+L.name+' <span>('+L.unit+')</span></div><div class="or-bar" style="background:'+g+'"></div><div class="or-ticks">'+L.ticks.map(function(t){return '<span style="left:'+((t-L.min)/(L.max-L.min)*100).toFixed(1)+'%">'+t+'</span>'}).join('')+'</div>'}
var LABELS=[['THARSIS',2,-100,1],['Olympus Mons',18.65,-133.8,0],['Valles Marineris',-12,-72,0],['Hellas Planitia',-42.7,70,0],['Argyre',-49.7,-44.3,0],['Isidis',12.9,87,0],['Utopia Planitia',46.7,117.5,1],['Arabia Terra',20,10,1],['Elysium',25,147.2,0],['Chryse',28,-40,0],['Acidalia',50,-22,1],['Syrtis Major',8.4,69.5,0],['Amazonis',24.8,-164,0],['NORTHERN LOWLANDS',68,-60,1],['SOUTHERN HIGHLANDS',-62,10,1]];
function drawOverlay(){
  if(!ovx||!ovCv.width)return;var w=ovCv.width,h=ovCv.height,dpr=w/$('or-frame').getBoundingClientRect().width||1,X=function(lon){return(lon+180)/360*w},Y=function(lat){return(90-lat)/180*h};
  ovx.clearRect(0,0,w,h);ovx.font=(11*dpr)+'px Segoe UI, sans-serif';ovx.textBaseline='middle';
  if($('or-grat').checked){ovx.strokeStyle='rgba(255,255,255,.16)';ovx.lineWidth=dpr;ovx.beginPath();
    for(var lo=-150;lo<=150;lo+=30){ovx.moveTo(X(lo),0);ovx.lineTo(X(lo),h)}for(var la=-60;la<=60;la+=30){ovx.moveTo(0,Y(la));ovx.lineTo(w,Y(la))}ovx.stroke();
    ovx.fillStyle='rgba(255,255,255,.7)';ovx.textAlign='left';for(var l2=-60;l2<=60;l2+=30)ovx.fillText(Math.abs(l2)+'°'+(l2<0?'S':l2>0?'N':''),4*dpr,Y(l2)-7*dpr);ovx.textAlign='center';for(var l3=-150;l3<=150;l3+=30)ovx.fillText(Math.abs(l3)+'°'+(l3<0?'W':l3>0?'E':''),X(l3),h-8*dpr)}
  if($('or-lab').checked){ovx.textAlign='center';LABELS.forEach(function(l){var big=l[3];ovx.font=(big?'600 ':'')+(big?12:10.5)*dpr+'px Segoe UI, sans-serif';ovx.lineWidth=3*dpr;ovx.strokeStyle='rgba(0,0,0,.65)';ovx.fillStyle=big?'rgba(255,255,255,.88)':'#fff';var t=big?l[0].split('').join(' '):l[0];ovx.strokeText(t,X(l[2]),Y(l[1]));ovx.fillText(t,X(l[2]),Y(l[1]))})}
  if($('or-sites').checked){D.sites.forEach(function(s){var x=X(s.lon),y=Y(s.lat),r=4*dpr;ovx.beginPath();ovx.moveTo(x,y-r);ovx.lineTo(x+r,y);ovx.lineTo(x,y+r);ovx.lineTo(x-r,y);ovx.closePath();ovx.fillStyle=s.s==='lost'?'#ff6b6b':'#fff';ovx.fill();ovx.strokeStyle='#000';ovx.lineWidth=1.2*dpr;ovx.stroke();
    if(hoverPt&&dist(hoverPt.lat,hoverPt.lon,s.lat,s.lon)<330){ovx.textAlign='left';ovx.font=(10.5*dpr)+'px Segoe UI, sans-serif';ovx.lineWidth=3*dpr;ovx.strokeStyle='rgba(0,0,0,.8)';ovx.fillStyle='#fff';var tt=s.n+' '+s.y+(s.s==='lost'?' (lost)':'');ovx.strokeText(tt,x+7*dpr,y);ovx.fillText(tt,x+7*dpr,y)}})}
  if(hoverPt){var hx=X(hoverPt.lon),hy=Y(hoverPt.lat);ovx.strokeStyle='rgba(255,255,255,.75)';ovx.lineWidth=dpr;ovx.beginPath();ovx.moveTo(hx-9*dpr,hy);ovx.lineTo(hx+9*dpr,hy);ovx.moveTo(hx,hy-9*dpr);ovx.lineTo(hx,hy+9*dpr);ovx.stroke()}
  if(site){var sx=X(site.lon),sy=Y(site.lat);ovx.strokeStyle='rgba(255,255,255,.35)';ovx.setLineDash([4*dpr,5*dpr]);ovx.beginPath();ovx.moveTo(sx,0);ovx.lineTo(sx,h);ovx.moveTo(0,sy);ovx.lineTo(w,sy);ovx.stroke();ovx.setLineDash([]);
    ovx.beginPath();ovx.arc(sx,sy,13*dpr,0,7);ovx.strokeStyle='rgba(255,176,60,.55)';ovx.lineWidth=2*dpr;ovx.stroke();ovx.beginPath();ovx.arc(sx,sy,6.5*dpr,0,7);ovx.fillStyle='#ffb03c';ovx.fill();ovx.strokeStyle='#000';ovx.lineWidth=2*dpr;ovx.stroke()}
}
function setTab(t){tab=t;$('or-tb').setAttribute('aria-selected',String(t==='brief'));$('or-tg').setAttribute('aria-selected',String(t==='game'));$('or-brief').hidden=t!=='brief';$('or-game').hidden=t!=='game';if(t==='game')renderGame()}

/* ---------------- briefing ---------------- */
function currentShield(){return D.shields.filter(function(s){return s.id===shieldId})[0]||D.shields[0]}
function select(lat,lon){
  lat=clamp(lat,-89.5,89.5);lon=wrapLon(lon);site={lat:lat,lon:lon};keyPt={lat:lat,lon:lon};
  var a=analyse(lat,lon,currentShield());if(shieldId==='tube'&&!a.reg.tube){shieldId='hab';a=analyse(lat,lon,currentShield())}
  cur=a;drawOverlay();setTab('brief');renderBrief();
  if(G&&G.phase!=='end'&&timer){/* changing site during a mission is ignored */}
}
function chip(lv){return '<span class="or-chip lv'+lv+'">'+LV[lv]+'</span>'}
function renderBrief(){
  var el=$('or-brief');
  if(!cur){el.innerHTML='<div class="or-hint"><h3>Click anywhere on the map</h3><p>You will get a briefing for that spot: the terrain and environment, how much radiation an astronaut would take there, and the health dangers to plan for.</p><p>Try a quick destination under the map, or use the arrow keys and Enter.</p></div>';return}
  var a=cur,e=a.e,r=a.reg,top=a.hz.slice().sort(function(x,y){return y.lv-x.lv}).filter(function(x){return x.lv>=3}).slice(0,3);
  var h='<div class="or-card"><div class="or-rn">'+esc(r.n)+'</div><div class="or-co">'+fmt(Math.abs(e.lat),1)+'°'+(e.lat>=0?'N':'S')+', '+fmt(Math.abs(e.lon),1)+'°'+(e.lon>=0?'E':'W')+(a.near?' &middot; near <b>'+esc(a.near.n)+'</b> ('+a.near.y+(a.near.s==='lost'?', lost':', landed')+')':'')+'</div>'+
   '<div class="or-stats"><div><b>'+fmt(e.h,1)+' km</b><span>elevation <button type="button" class="exb" data-explain="o_col" aria-label="Explain this number" title="Explain this number">?</button></span></div><div><b>'+Math.round(e.P)+' Pa</b><span>air pressure <button type="button" class="exb" data-explain="o_press" aria-label="Explain this number" title="Explain this number">?</button></span></div><div><b>'+Math.round(e.tm)+' °C</b><span>avg temp</span></div><div><b>'+fmt(e.slope,1)+'°</b><span>coarse slope</span></div></div>'+
   '<p class="or-env">'+esc(r.env)+'</p><p class="or-watch"><b>Watch for:</b> '+esc(r.watch)+'</p></div>';
  h+='<div class="or-card or-rad"><div class="or-rh">If an astronaut stays here</div><div class="or-big"><div><b>'+fmt(e.gcr,2)+'</b><span>mSv/day in the open <button type="button" class="exb" data-explain="o_gcr" aria-label="Explain this number" title="Explain this number">?</button></span></div><div><b>'+fmt(a.in30,0)+'</b><span>mSv over 30 sols in '+esc(a.sh.n.toLowerCase())+'</span></div><div><b>'+fmt(e.spe,1)+'</b><span>mSv/hr in a stress-test storm <button type="button" class="exb" data-explain="o_spe" aria-label="Explain this number" title="Explain this number">?</button></span></div></div>'+
   '<div class="or-bud"><i style="width:'+clamp(a.in30/60*100,0,100)+'%"></i></div><div class="or-bl">'+fmt(a.in30/60*100,0)+'% of the game\'s 60 mSv expedition budget (assumed, not a regulatory limit) <button type="button" class="exb" data-explain="o_budget" aria-label="Explain this number" title="Explain this number">?</button></div></div>';
  h+='<div class="or-card"><div class="or-rh">Health outlook'+(top.length?' <span>top dangers: '+top.map(function(t){return esc(t.k)}).join(', ')+'</span>':'')+'</div>'+a.hz.map(function(x){return '<div class="or-hz"><div class="or-hk">'+esc(x.k)+chip(x.lv)+'</div><div class="or-ht">'+esc(x.t)+'</div></div>'}).join('')+
   '<div class="or-hz"><div class="or-hk">Water and ice access<span class="or-chip res">'+a.water[0]+'</span></div><div class="or-ht">'+esc(a.water[1])+'</div></div><p class="or-fine">Levels compare this spot with other places on Mars, not with Earth. Planning-level estimates for education. Not medical advice. For real health concerns, talk to a flight surgeon or doctor.</p></div>';
  h+='<div class="or-actions"><button type="button" class="or-btn" id="or-ask">Ask '+(NV()?esc(NV().name()):'Nova')+' about this place</button><button type="button" class="or-btn" id="or-rcpt">Test in RCPT dashboard</button><button type="button" class="or-btn go" id="or-plan">Plan expedition here</button></div>';
  el.innerHTML=h;
  $('or-ask').addEventListener('click',function(){var s=summary(a);say(s,{mood:'idle'});var n=NV();if(n&&n.open)n.open()});
  $('or-rcpt').addEventListener('click',function(){var s=a.e.spe;RC.setInputs({d:Math.min(50,s),h:42,s:4});close();say('I loaded '+r.n+' into the dashboard: the stress-test storm at about '+fmt(s,1)+' mSv/hr with the same tired crew as before. Watch the risk.',{mood:'alert'})});
  $('or-plan').addEventListener('click',function(){setTab('game')});
}
function summary(a){var e=a.e,top=a.hz.slice().sort(function(x,y){return y.lv-x.lv}).filter(function(x){return x.lv>=3&&x.k!=='Air and pressure'}).map(function(x){return x.k.toLowerCase()});
  return a.reg.n+', about '+fmt(e.h,1)+' km elevation. Radiation is roughly '+fmt(e.gcr,2)+' mSv a day in the open, about '+fmt(a.in30,0)+' mSv over 30 sols in a '+a.sh.n.toLowerCase()+'. Biggest concerns: '+(top.length?top.join(' and ')+', plus the thin air and the cold':'the thin air, the cold and the dust')+'. Simplified model, not medical advice.'}

/* ---------------- expedition game ---------------- */
var SOLS=30,BUDGET=60,DECIDE=3.2;
function renderGame(){
  var el=$('or-game');
  if(G&&G.phase!=='end'){return}
  if(G&&G.phase==='end'){renderEnd();return}
  if(!cur){el.innerHTML='<div class="or-hint"><h3>Expedition game</h3><p>Pick a landing site on the map first. Then survive a 30-sol expedition: each sol you choose Lab work, an EVA, Rest or a Storm shelter, while cosmic rays, a solar storm and a dust storm test your crew.</p><p>Risk comes from the same RCPT model as the dashboard. Everything is simulated.</p></div>';return}
  var a=cur,sc=a.reg.sci||1;
  el.innerHTML='<div class="or-card"><div class="or-rn">Expedition: '+esc(a.reg.n)+'</div><div class="or-co">'+fmt(Math.abs(a.e.lat),1)+'°'+(a.e.lat>=0?'N':'S')+', '+fmt(Math.abs(a.e.lon),1)+'°'+(a.e.lon>=0?'E':'W')+' &middot; science value x'+fmt(sc,1)+(best[key()]?' &middot; your best: <b>'+best[key()].g+'</b> ('+best[key()].s+')':'')+'</div>'+
   '<p class="or-env">Goal: 30 sols, stay under the <b>60 mSv</b> game dose budget, keep the crew out of emergency, and bring back science. A solar storm and a dust storm will hit at random times. Pick a shelter type:</p>'+
   '<div class="or-sh">'+D.shields.map(function(s){var dis=s.volcanic&&!a.reg.tube;return '<label class="'+(dis?'dis':'')+'"><input type="radio" name="or-shield" value="'+s.id+'" '+(shieldId===s.id?'checked':'')+(dis?' disabled':'')+'> <b>'+s.n+'</b> <span>x'+s.f+' of open-air dose</span><small>'+s.note+(dis?' (not available here)':'')+'</small></label>'}).join('')+'</div>'+
   '<p class="or-fine">Shielding factors are illustrative assumptions. Keys during play: 1 Lab, 2 EVA, 3 Rest, 4 Storm shelter, P pause.</p><button type="button" class="or-btn go big" id="or-start">Start expedition</button></div>';
  el.querySelectorAll('input[name=or-shield]').forEach(function(r){r.addEventListener('change',function(){shieldId=r.value;cur=analyse(site.lat,site.lon,currentShield());renderBrief()})});
  $('or-start').addEventListener('click',startMission);
}
function key(){return Math.round(site.lat/3)+','+Math.round(site.lon/3)}
function rnd(a,b){return a+Math.floor(Math.random()*(b-a+1))}
function startMission(){
  var a=cur,sh=currentShield();
  G={phase:'decide',sol:0,t:0,speed:1,paused:false,plan:'lab',dose:0,hrv:65,sl:1,sci:0,maxR:0,R:5,tier:'nominal',alerts:[],hist:[],emSols:0,stormSol:rnd(7,20),dustSol:rnd(3,22),
    bg:a.e.gcr/24,spe:a.e.spe,f:sh.f,sh:sh,sciMult:a.reg.sci||1,site:{n:a.reg.n,lat:site.lat,lon:site.lon},shelterSols:0,stormExposed:0,peakDose:0,abort:null};
  setTab('game');beginSol();timer=setInterval(tick,100);renderPlay();
  say('Expedition started at '+a.reg.n+', '+U()+'. I will warn you before the storm.',{mood:'happy'});
}
function U(){var n=NV();return n&&n.user?n.user():'Commander'}
function stormLevel(sol){return sol===G.stormSol?.25:sol===G.stormSol+1?.1:0}
function dustOn(sol){return sol>=G.dustSol&&sol<G.dustSol+4}
function alert_(t,k){G.alerts.unshift({t:t,k:k||''});if(G.alerts.length>5)G.alerts.pop()}
function beginSol(){
  G.sol++;G.t=0;G.phase='decide';
  if(G.sol===G.stormSol-1){alert_('Sol '+G.sol+': FORECAST. A solar particle event is expected next sol.','warn');say('Forecast, '+U()+': a solar storm is expected tomorrow. Plan a storm shelter.',{mood:'alert'})}
  if(G.sol===G.stormSol){alert_('Sol '+G.sol+': SOLAR STORM ARRIVES. Stay out of the open!','bad');say('The storm is here, '+U()+'. Shelter now.',{mood:'alert'})}
  if(G.sol===G.stormSol+1){alert_('Sol '+G.sol+': storm fading but still active.','warn')}
  if(G.sol===G.dustSol){alert_('Sol '+G.sol+': dust storm begins. Solar power drops, science slows.','warn');say('A dust storm is starting. Power will be tight for a few sols.',{queue:true,mood:'alert'})}
  if(G.sol===G.dustSol+4){alert_('Sol '+G.sol+': the dust storm has cleared.','good')}
  G.plan=G.sol>1?G.plan:'lab';if(stormLevel(G.sol)&&G.plan==='eva')G.plan='lab';
}
function resolveSol(){
  var p=G.plan,sl=stormLevel(G.sol),dust=dustOn(G.sol),bg=G.bg,f=G.f,spe=G.spe,out=6,dose=0,peak=bg*f,sci=0,dh=0,ds=0,note='';
  if(p==='eva'){dose=bg*out+bg*f*(24-out);peak=bg;sci=10*G.sciMult;dh=-3;ds=.9;
    if(sl){var eo=spe*sl*2.4*out,ei=spe*sl*f*(24-out);dose+=eo+ei;peak=Math.max(peak,spe*(G.sol===G.stormSol?.9:.35));dh-=2.5;G.stormExposed++;note='Caught outside in the storm!'}}
  else if(p==='shelter'){dose=bg*.12*24;peak=bg*.12;sci=0;dh=-.5;ds=.4;G.shelterSols++;if(sl){dose+=spe*sl*.12*24;peak=Math.max(peak,spe*(G.sol===G.stormSol?.9:.35)*.12);note='Sheltered through the storm.'}}
  else{dose=bg*f*24;peak=bg*f;sci=(p==='lab'?4:0)*G.sciMult;dh=p==='lab'?-.8:4;ds=p==='lab'?.35:-1.4;
    if(sl){dose+=spe*sl*f*24;peak=Math.max(peak,spe*(G.sol===G.stormSol?.9:.35)*f);dh-=2.5;G.stormExposed++;note='Storm hit the habitat.'}}
  if(dust){sci*=.5;dh-=.8}
  dh-=.12*dose;G.dose+=dose;G.peakDose=Math.max(G.peakDose,dose);
  G.hrv=clamp(G.hrv+dh,25,70);G.sl=clamp(G.sl+ds,0,10);
  var R=RC.M(peak,G.hrv,G.sl).R,tier=RC.tierOf(peak,R);G.R=R;G.tier=tier;G.maxR=Math.max(G.maxR,R);
  if(tier==='emergency'){sci-=15;G.emSols++}else if(tier==='elevated')sci-=3;
  G.sci=Math.max(0,G.sci+sci);G.hist.push({sol:G.sol,p:p,dose:dose,R:R,tier:tier});
  if(note)alert_('Sol '+G.sol+': '+note+' ('+fmt(dose,1)+' mSv)',/Caught|hit/.test(note)?'bad':'good');
  if(tier==='elevated'&&G.hist.length>1&&G.hist[G.hist.length-2].tier==='nominal'){say('The crew risk is elevated, '+U()+'. Try a rest sol.',{queue:true,mood:'alert'})}
  if(tier==='emergency'){alert_('Sol '+G.sol+': CREW RISK EMERGENCY ('+fmt(R,0)+'). Rest or shelter.','bad');say('Crew risk is in emergency, '+U()+'. Please rest.',{mood:'alert'})}
  if(G.dose>BUDGET*2){G.abort='Dose limit far exceeded: mission aborted.'}
  else if(G.emSols>=3&&tier==='emergency'){G.abort='Crew unfit after repeated emergency sols: mission aborted.'}
  if(G.abort||G.sol>=SOLS){endMission();return}
  beginSol();
}
function tick(){
  if(!G||G.phase!=='decide'||G.paused)return;
  G.t+=.1*G.speed;updatePlay();if(G.t>=DECIDE)resolveSol();else if(G)updatePlay();
}
function setPlan(p){if(!G||G.phase!=='decide')return;if(p==='eva'&&stormLevel(G.sol)){alert_('Sol '+G.sol+': EVA during the storm is dangerous.','bad')}G.plan=p;updatePlay()}
function grade(){var base=Math.min(G.sci,230)+.2*Math.max(0,G.sci-230),s=base+60*(1-Math.min(1.5,G.dose/BUDGET))-.6*G.maxR-4*Math.max(0,G.dose-BUDGET)-8*G.emSols-(G.abort?80:0);return{s:Math.round(s),g:s>=190?'S':s>=150?'A':s>=105?'B':s>=60?'C':'D'}}
function endMission(){
  clearInterval(timer);timer=null;G.phase='end';var gr=grade();G.res=gr;
  try{if(window.RCPTHist)window.RCPTHist.add({kind:'orion',title:'Orion: '+G.site.n,maxR:G.maxR,dose:G.dose,note:'Grade '+gr.g+' (score '+gr.s+'), '+G.sol+' sols'+(G.abort?', aborted':'')})}catch(e){}
  var k=key();if(!best[k]||best[k].s<gr.s){best[k]={g:gr.g,s:gr.s};try{localStorage.setItem('orion.best',JSON.stringify(best))}catch(e){}}
  renderEnd();
  say('Expedition over. Grade '+gr.g+'. You took '+fmt(G.dose,0)+' mSv, '+fmt(G.dose/BUDGET*100,0)+' percent of the budget, with a peak crew risk of '+fmt(G.maxR,0)+'.',{mood:gr.g<'C'?'happy':'idle'});
}
var ACT={lab:'Lab work',eva:'EVA',rest:'Rest',shelter:'Storm shelter'};
function renderPlay(){
  var el=$('or-game');
  el.innerHTML='<div class="or-card"><div class="or-rn">Sol <span id="g-sol"></span> / '+SOLS+' &middot; '+esc(G.site.n)+'</div><div class="or-dec"><i id="g-t"></i></div>'+
   '<div class="or-acts" role="group" aria-label="Choose this sol\'s action">'+[['lab','1','Lab work'],['eva','2','EVA'],['rest','3','Rest'],['shelter','4','Storm shelter']].map(function(a){return '<button type="button" class="or-act" data-p="'+a[0]+'"><kbd>'+a[1]+'</kbd>'+a[2]+'</button>'}).join('')+'</div>'+
   '<div class="or-ctl"><button type="button" class="or-btn" id="g-pause">Pause (P)</button><button type="button" class="or-btn" id="g-speed">Speed x1</button><button type="button" class="or-btn" id="g-quit">Quit</button></div></div>'+
   '<div class="or-card or-met"><div class="or-m"><span>Dose <b id="g-dose"></b> / '+BUDGET+' mSv</span><div class="or-pb"><i id="g-dosebar"></i></div></div>'+
   '<div class="or-m"><span>Crew risk <b id="g-R"></b> <em id="g-tier"></em></span><div class="or-pb"><i id="g-Rbar"></i></div></div>'+
   '<div class="or-m"><span>HRV <b id="g-hrv"></b> ms &middot; sleep debt <b id="g-sl"></b> h</span><div class="or-pb"><i id="g-hbar"></i></div></div>'+
   '<div class="or-m"><span>Science points <b id="g-sci"></b></span></div></div><div class="or-card"><div class="or-rh">Mission log</div><ul class="or-log" id="g-log"></ul></div>';
  el.querySelectorAll('.or-act').forEach(function(b){b.addEventListener('click',function(){setPlan(b.getAttribute('data-p'))})});
  $('g-pause').addEventListener('click',function(){togglePause()});
  $('g-speed').addEventListener('click',function(){G.speed=G.speed===1?2:G.speed===2?4:1;$('g-speed').textContent='Speed x'+G.speed});
  $('g-quit').addEventListener('click',function(){G.abort='Expedition ended early.';endMission()});
  updatePlay();
}
function togglePause(){if(G&&G.phase==='decide'){G.paused=!G.paused;$('g-pause').textContent=G.paused?'Resume (P)':'Pause (P)'}}
function updatePlay(){
  if(!G||!$('g-sol'))return;
  $('g-sol').textContent=G.sol;$('g-t').style.width=Math.min(100,G.t/DECIDE*100)+'%';
  $('or-game').querySelectorAll('.or-act').forEach(function(b){var p=b.getAttribute('data-p');b.classList.toggle('on',p===G.plan);b.setAttribute('aria-pressed',String(p===G.plan));b.classList.toggle('warn',p==='eva'&&!!stormLevel(G.sol))});
  $('g-dose').textContent=fmt(G.dose,1);$('g-dosebar').style.width=clamp(G.dose/BUDGET*100,0,100)+'%';$('g-dosebar').className=G.dose>BUDGET?'bad':G.dose>BUDGET*.75?'warn':'';
  $('g-R').textContent=fmt(G.R,0);$('g-tier').textContent=G.tier;$('g-tier').className='t-'+G.tier;$('g-Rbar').style.width=clamp(G.R,0,100)+'%';$('g-Rbar').className=G.tier==='emergency'?'bad':G.tier==='elevated'?'warn':'';
  $('g-hrv').textContent=Math.round(G.hrv);$('g-sl').textContent=fmt(G.sl,1);$('g-hbar').style.width=clamp((G.hrv-25)/45*100,0,100)+'%';$('g-sci').textContent=Math.round(G.sci);
  $('g-log').innerHTML=G.alerts.map(function(a){return '<li class="'+a.k+'">'+esc(a.t)+'</li>'}).join('')||'<li>Pick an action each sol. The sol resolves when the bar fills.</li>';
}
function renderEnd(){
  var r=G.res,el=$('or-game'),sav=G.hist.filter(function(h){return h.p==='shelter'}).length;
  var tips=[];
  if(G.stormExposed>0&&G.shelterSols===0)tips.push('You never used the storm shelter. Use it when the forecast says a storm is coming.');
  if(G.dose>BUDGET)tips.push('You went over the dose budget. A regolith or lava-tube shelter cuts everyday dose a lot.');
  if(G.maxR>=35)tips.push('Crew risk went elevated or worse. Rest sols bring HRV up and sleep debt down.');
  if(!tips.length)tips.push('Clean run. Try a higher-radiation site like Olympus Mons, or a dusty one.');
  el.innerHTML='<div class="or-card or-end"><div class="or-grade g'+r.g+'">'+r.g+'</div><div class="or-rn">'+(G.abort?esc(G.abort):'Expedition complete')+'</div><div class="or-co">'+esc(G.site.n)+' &middot; score '+r.s+'</div>'+
   '<div class="or-stats"><div><b>'+fmt(G.dose,0)+' mSv</b><span>'+fmt(G.dose/BUDGET*100,0)+'% of budget</span></div><div><b>'+fmt(G.maxR,0)+'</b><span>peak crew risk</span></div><div><b>'+Math.round(G.sci)+'</b><span>science points</span></div><div><b>'+G.sol+'</b><span>sols played</span></div></div>'+
   '<p class="or-env">'+(G.dose/EARTH_DAY>0?'That dose is about '+Math.round(G.dose/2.4)+' years of average natural radiation on Earth, taken in '+G.sol+' sols. ':'')+'The storm hit on sol '+G.stormSol+'; you sheltered '+sav+' sol'+(sav===1?'':'s')+'. '+tips.join(' ')+'</p><p class="or-fine">Simulated, with assumed shielding and storm values. Not a prediction or medical advice.</p>'+
   '<div class="or-actions"><button type="button" class="or-btn go" id="e-again">Play again</button><button type="button" class="or-btn" id="e-site">Pick another site</button></div></div>';
  $('e-again').addEventListener('click',function(){G=null;renderGame()});
  $('e-site').addEventListener('click',function(){G=null;setTab('brief')});
}

/* ---------------- open / close ---------------- */
var lastFocus=null;
function openOrion(){
  if(!root)mount();lastFocus=document.activeElement;root.hidden=false;open=true;document.body.classList.add('orion-open');
  var n=NV();if(n&&n.minimize)n.minimize();
  if(!built){$('or-load').hidden=false;setTimeout(function(){buildTerrain();srcNote();$('or-load').hidden=true;sizeOverlay();setLayer('topo');renderBrief();$('or-close').focus()},40)}else{sizeOverlay();$('or-close').focus()}
}
function close(){if(!open)return;if(timer){clearInterval(timer);timer=null;if(G&&G.phase==='decide'){G.paused=true}}root.hidden=true;open=false;document.body.classList.remove('orion-open');if(lastFocus&&lastFocus.focus)lastFocus.focus()}
function onKey(e){
  if(!open)return;
  if(e.key==='Escape'){e.stopPropagation();close();return}
  if(e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)&&e.target.type!=='radio'&&e.target.type!=='checkbox')return;
  if(G&&G.phase==='decide'&&tab==='game'){var m={'1':'lab','2':'eva','3':'rest','4':'shelter'};if(m[e.key]){setPlan(m[e.key]);e.preventDefault()}else if(e.key==='p'||e.key==='P'){togglePause();e.preventDefault()}}
}
/* resume a paused mission when the overlay is reopened */
document.addEventListener('orion:reopen',function(){if(G&&G.phase==='decide'&&!timer){timer=setInterval(tick,100)}});
var _open=openOrion;openOrion=function(){_open();if(G&&G.phase==='decide'&&!timer){timer=setInterval(tick,100);G.paused=true;var b=$('g-pause');if(b)b.textContent='Resume (P)'}};

window.Orion={current:function(){return cur},open:function(){openOrion()},close:close,isOpen:function(){return open},select:function(la,lo){if(!built){buildTerrain();sizeOverlay();setLayer('topo')}select(la,lo)},
  importDEM:importDEM,restoreStylised:restoreStylised,terrainSource:function(){return terrainSrc},
  _debug:{analyse:analyse,model:{column:column,gcrDay:gcrDay,speRate:speRate,tMean:tMean,pressurePa:pressurePa},build:function(){return buildTerrain()},elev:function(){return elev},state:function(){return G},begin:function(){startMission()},resolve:function(){resolveSol()},plan:setPlan,site:function(){return site}}};
})();
