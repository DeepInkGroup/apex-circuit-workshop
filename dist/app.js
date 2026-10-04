import {buildGeometry, pointOnTrack, closestOnTrack, LapTracker, stepVehicle, METERS_PER_UNIT} from './engine.js';
import {ReferenceLayer} from './tracing.js';
import {mountTracer} from './tracer-ui.js';
import {TrackPreview} from './preview3d.js';
import {DEFAULT_EXPORT} from './ac-export.js';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const icons = {
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/>',
  circuit:'<path d="M6 5h12c4 0 4 5 1 7l-3 6c-1 2-4 1-5-1l-2-3c-1-1-2 0-3 2-2 3-5 1-5-2V9c0-2 2-4 5-4Z"/>',
  undo:'<path d="m8 5-5 5 5 5M3 10h10a7 7 0 0 1 7 7v2"/>',
  redo:'<path d="m16 5 5 5-5 5m5-5H11a7 7 0 0 0-7 7v2"/>',
  save:'<path d="M4 3h13l3 3v15H4ZM8 3v6h8V3M8 21v-8h8v8"/>',
  play:'<path d="m8 4 12 8-12 8Z"/>',
  pause:'<path d="M8 5v14m8-14v14"/>',
  pen:'<path d="m15 3 6 6-12 12H3v-6Zm-3 3 6 6M3 15l6 6"/>',
  wheel:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="m4 8 6 3m10-3-6 3m-2 3v7M4 8h16"/>',
  cursor:'<path d="m5 3 15 10-7 1-3 7Z"/>',
  eraser:'<path d="m14 3 7 7-11 11H6l-5-5Zm-9 9 7 7m-2 2h12"/>',
  flag:'<path d="M5 21V3m0 1h7l2 2h6v10h-6l-2-2H5"/>',
  hand:'<path d="M8 12V5a2 2 0 0 1 4 0v7-8a2 2 0 0 1 4 0v8-6a2 2 0 0 1 4 0v10c0 4-3 6-7 6-2 0-4-1-5-3l-5-6c-2-3 1-5 3-3l2 2Z"/>',
  grid:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18m6-18v18"/>',
  expand:'<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  plus:'<path d="M12 4v16M4 12h16"/>',
  upload:'<path d="M4 15v6h16v-6M12 16V3m-5 5 5-5 5 5"/>',
  download:'<path d="M4 15v6h16v-6M12 3v13m-5-5 5 5 5-5"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  camera:'<rect x="3" y="6" width="18" height="14" rx="2"/><circle cx="12" cy="13" r="4"/><path d="m8 6 1-3h6l1 3"/>',
  restart:'<path d="M3 10a9 9 0 1 1 1 7M3 3v7h7"/>',
  ghost:'<path d="M4 21V10a8 8 0 0 1 16 0v11l-4-3-4 3-4-3Z"/><path d="M9 10h.01M15 10h.01"/>',
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ''}</svg>`; }
$$('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));

const WORLD = { w: 1000, h: 740 };
const presets = {
  club: { name:'The Club Circuit', points:[[230,168],[460,155],[743,167],[838,230],[782,367],[702,513],[605,505],[511,401],[438,398],[349,540],[242,530],[157,359],[156,235]] },
  technical: { name:'Switchback', points:[[203,152],[451,150],[743,152],[852,225],[743,383],[713,527],[608,551],[521,443],[520,349],[420,376],[365,536],[243,551],[162,443],[176,341],[297,306],[306,238]] },
  speedway: { name:'The Speedway', points:[[309,192],[499,176],[688,190],[805,259],[843,370],[801,477],[682,543],[494,560],[307,542],[188,475],[157,366],[193,255]] },
};
const vehicles = {
  club:{name:'Club Sport',hp:210,max:240,accel:84,brake:165,steer:2.5,grip:.86,color:'#f26a34',speed:65,gripRating:75,classification:'RWD / CLUB CLASS'},
  kart:{name:'Sprint Kart',hp:32,max:165,accel:102,brake:175,steer:3.35,grip:.96,color:'#6b9d88',speed:43,gripRating:94,classification:'DIRECT DRIVE / KART CLASS'},
  gt:{name:'GT Racer',hp:490,max:330,accel:106,brake:180,steer:2.05,grip:.72,color:'#668bc5',speed:95,gripRating:59,classification:'RWD / GT CLASS'},
};
const clone = (v) => JSON.parse(JSON.stringify(v));
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const STORAGE = 'apex-circuits-v1';
const DRAFT = 'apex-draft-v1';
function readStorage(key,fallback) { try { const v=localStorage.getItem(key);return v?JSON.parse(v):fallback; } catch {return fallback;} }
let storageAvailable = true;
function writeStorage(key,value) { try {localStorage.setItem(key,JSON.stringify(value));return true;} catch {storageAvailable=false;toast('Browser storage is unavailable. Export your circuit to keep it.');return false;} }
function presetTrack(key) {return {name:presets[key].name,points:presets[key].points.map(([x,y])=>({x,y,elevation:0,bank:0})),width:12,scale:.2,smooth:true,line:false,start:0,preset:key,car:'club',id:null,pit:[],background:null,export:{...DEFAULT_EXPORT}};}
function validateTrack(data) {
  if(!data || !Array.isArray(data.points) || data.points.length>150 || data.points.some(p=>!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x<0 || p.x>WORLD.w || p.y<0 || p.y>WORLD.h)) return null;
  let background=null;
  if(data.background?.type==='map'&&Number.isFinite(data.background.lat)&&Number.isFinite(data.background.lon)&&Math.abs(data.background.lat)<=85&&Math.abs(data.background.lon)<=180)background={type:'map',lat:data.background.lat,lon:data.background.lon,zoom:clamp(Math.round(Number(data.background.zoom)||18),14,20)};
  else if(data.background?.type==='image'&&typeof data.background.key==='string')background={type:'image',key:data.background.key.slice(0,100),name:String(data.background.name||'Reference image').slice(0,100)};
  const exportOptions={...DEFAULT_EXPORT};
  ['author','country','city'].forEach(k=>{if(typeof data.export?.[k]==='string')exportOptions[k]=data.export[k].slice(0,60);});
  exportOptions.pitboxes=clamp(Math.round(Number(data.export?.pitboxes)||8),1,16);
  ['kerbs','barriers','ai'].forEach(k=>exportOptions[k]=data.export?.[k]!==false);
  const pit=Array.isArray(data.pit)?data.pit.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=740).slice(0,100).map(p=>({x:p.x,y:p.y,elevation:clamp(Number(p.elevation)||0,-100,500)})):[];
  return {name:typeof data.name==='string'?data.name.slice(0,40)||'Untitled Circuit':'Untitled Circuit',points:data.points.map(p=>({x:p.x,y:p.y,elevation:clamp(Number(p.elevation)||0,-100,500),bank:clamp(Number(p.bank)||0,-15,15)})),width:clamp(Number(data.width)||12,4,30),scale:clamp(Number(data.scale)||.2,.02,10),smooth:data.smooth!==false,line:!!data.line,start:Number.isFinite(data.start)?((data.start%1)+1)%1:0,preset:['club','technical','speedway'].includes(data.preset)?data.preset:null,car:vehicles[data.car]?data.car:'club',id:typeof data.id==='string'?data.id:null,pit,background,export:exportOptions};
}
const recoveredDraft=validateTrack(readStorage(DRAFT,null));
let track=recoveredDraft || presetTrack('club');
let library=readStorage(STORAGE,[]);
if(!Array.isArray(library))library=[];
library=library.filter(t=>validateTrack(t)&&t.points.length>=3).slice(0,100);
let undoStack=[], redoStack=[], tool='move', mode='build', dirty=!!recoveredDraft && !library.some(t=>JSON.stringify(validateTrack(t))===JSON.stringify(track));
let samples=[], sampleSegments=[], cumulative=[], length=0, roadWidth=track.width*5, activePoint=-1, hoverPoint=-1;
let showGrid=true, view={zoom:1,panX:0,panY:0}, drag=null, widthBefore=null;
let cssW=0,cssH=0,dpr=1,scale=1,offsetX=0,offsetY=0;
let selectedPoint=-1,tracerUI=null,referenceLayer=null,preview3D=null,referenceOpacity=.75,traceOverlay=true,measurement=[],tracingInProgress=false;
const canvas=$('#track-canvas'),ctx=canvas.getContext('2d');
let car={x:0,y:0,angle:0,speed:0,vx:0,vy:0}, keys=new Set(), paused=false, countdown=0;
let elapsed=0,lap=1,best=null,marks=[],ghost=[],currentGhost=[],messageUntil=0;
let recordKey='',lastGhostStamp=0,geometry=buildGeometry(track.points,track.smooth);
const lapTracker=new LapTracker();
let sessionLaps=[],followCamera=window.matchMedia('(pointer: coarse)').matches,showGhost=true,editorView=null;
const records = readStorage('apex-records-v1',{});
let recordData=records && typeof records==='object' && !Array.isArray(records)?records:{};

function toast(message) {const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3200);}
function snapshot() { return clone(track); }
function remember(previous=snapshot()) {undoStack.push(previous);if(undoStack.length>70)undoStack.shift();redoStack=[];dirty=true;track.preset=null;updateUndo();}
function updateUndo() {$('#undo-btn').disabled=mode==='drive'||!undoStack.length;$('#redo-btn').disabled=mode==='drive'||!redoStack.length;}
function draftSave() {if(storageAvailable)writeStorage(DRAFT,track);}
function commit() { rebuild();syncUI();draftSave();if(mode==='preview')preview3D?.load(track); }
function undo() {if(mode==='drive'||!undoStack.length)return;redoStack.push(snapshot());track=undoStack.pop();dirty=true;commit();}
function redo() {if(mode==='drive'||!redoStack.length)return;undoStack.push(snapshot());track=redoStack.pop();dirty=true;commit();}
function rebuild() {
  geometry=buildGeometry(track.points,track.smooth);
  samples=geometry.samples;sampleSegments=geometry.segments;cumulative=geometry.cumulative;length=geometry.length;
  roadWidth=track.width/(track.scale||.2);
}
const pointAt = fraction => pointOnTrack(geometry,fraction);
const nearest = p => closestOnTrack(geometry,p);
function relativeProgress(progress) {return ((progress-track.start+1)%1);}
function syncUI() {
  $('#track-name').value=track.name;$('#length-stat').innerHTML=`${(length*(track.scale||.2)/1000).toFixed(2)} <small>km</small>`;
  $('#points-stat').textContent=track.points.length;$('#width-range').value=track.width;$('#width-value').textContent=`${track.width} m`;
  $('#width-range').min=4;$('#width-range').max=30;$('#width-range').value=track.width;
  $('#width-range').style.background=`linear-gradient(to right,var(--orange) ${(track.width-4)/26*100}%,#e3e5db ${(track.width-4)/26*100}%)`;
  $('#smooth-toggle').checked=track.smooth;$('#line-toggle').checked=track.line;
  $('#saved-count').textContent=library.length;
  $$('.preset').forEach(b=>b.classList.toggle('active',b.dataset.preset===track.preset));
  $$('.car-selector button').forEach(b=>b.classList.toggle('selected',b.dataset.car===track.car));
  const v=vehicles[track.car];$('#car-name').textContent=v.name;$('#car-power').textContent=`${v.hp} HP`;
  $('#speed-rating').style.width=`${v.speed}%`;$('#grip-rating').style.width=`${v.gripRating}%`;$('.car-class').textContent=v.classification;
  $('#car-body stop:first-child').setAttribute('stop-color',v.color);$('#car-body stop:last-child').setAttribute('stop-color',v.color);
  $('.car-preview svg path[fill="#f86732"]').setAttribute('style',`fill:${v.color}`);
  const valid=track.points.length>=3&&length*(track.scale||.2)>=60;$('#drive-btn').disabled=!valid;
  $('#editor-status').textContent=mode==='drive'?'Test session · '+(paused?'Paused':'Driving'):valid?'Closed circuit · Ready to drive':track.points.length?'Add at least 3 points to close your circuit':'Select the pen and click to draw your circuit';
  $('#layout-label').textContent=track.preset?'LAYOUT '+({club:'01',technical:'02',speedway:'03'}[track.preset]):'CUSTOM LAYOUT';
  updateUndo();tracerUI?.refresh();
  if(referenceLayer && referenceLayer.currentKey!==referenceLayer.key(track.background))referenceLayer.ensure(track.background);
}
function setTool(value) {if(mode==='drive')return;if(mode==='preview')stopPreview();if(value==='measure')measurement=[];if(value==='move')tracingInProgress=false;if(value==='draw'&&track.points.length<3)tracingInProgress=true;tool=value;$$('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===value));canvas.style.cursor=value==='pan'?'grab':value==='move'?'default':'crosshair';$('#canvas-hint span').textContent=({move:'Drag points. Select one to edit elevation.',draw:tracingInProgress?'Click to trace the centerline. Select Move to finish.':'Click to add a point to your circuit.',erase:'Click a road or pit point to remove it.',start:'Click the track to place your start line.',pan:'Drag to move your canvas.',measure:'Click two reference points to calibrate the scale.',pit:'Click an open pit path. Select Move to finish.'})[value];}
function updateTransform() {
  scale=Math.min(cssW/WORLD.w,cssH/WORLD.h)*view.zoom;
  offsetX=(cssW-WORLD.w*scale)/2+view.panX;offsetY=(cssH-WORLD.h*scale)/2+view.panY;
  if(mode==='drive'&&followCamera){scale=Math.max(Math.min(cssW,cssH)/(95/(track.scale||.2)),.4);offsetX=cssW/2-(car.x+Math.cos(car.angle)*8/(track.scale||.2))*scale;offsetY=cssH/2-(car.y+Math.sin(car.angle)*8/(track.scale||.2))*scale;}
  $('#zoom-reset').textContent=`${Math.round(view.zoom*100)}%`;
  $('.scale-label').innerHTML=`${Math.round(40/scale*(track.scale||.2))} m <span>╞════╡</span>`;
}
function resize() {const r=canvas.getBoundingClientRect();cssW=r.width;cssH=r.height;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);updateTransform();}
new ResizeObserver(resize).observe($('#canvas-wrap'));
function screenToWorld(e) {const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left-offsetX)/scale,y:(e.clientY-r.top-offsetY)/scale};}
function zoom(amount) {view.zoom=clamp(view.zoom*amount,.6,2.8);updateTransform();}
function pointHit(p) {let index=-1,best=20/scale;track.points.forEach((v,i)=>{const d=dist(p,v);if(d<best){best=d;index=i;}});return index;}
function strokePath(color,width,points=samples,closed=true) {
  if(!points.length)return;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);if(closed)ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
}
function scenery() {
  const trees=[[82,96,13],[109,92,10],[77,132,11],[884,114,13],[914,144,10],[887,156,11],[866,622,13],[899,611,10],[892,648,11],[108,632,13],[132,654,11],[91,658,9]];
  ctx.fillStyle='#d3d8c1';ctx.globalAlpha=.55;
  trees.forEach(([x,y,r])=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();});ctx.globalAlpha=1;
  ctx.strokeStyle='#d6dbca';ctx.lineWidth=1;ctx.setLineDash([3,5]);ctx.strokeRect(66,68,870,604);ctx.setLineDash([]);
  ctx.fillStyle='#a4ac94';ctx.font='8px "DM Sans",sans-serif';ctx.textAlign='left';ctx.fillText('APEX / YOUR PROVING GROUND',80,690);ctx.textAlign='right';ctx.fillText('EST. 2026',924,690);
}
function drawTrack() {
  if(track.points.length<3){strokePath('#a9b19a',2,track.points,false);return;}
  // Sandy runoff, striped curbs, and asphalt are rendered from the same centerline.
  strokePath('#d8d9c7',roadWidth+27);strokePath('#c2c6b2',roadWidth+14);
  strokePath('#f0ece0',roadWidth+9);
  ctx.setLineDash([12,12]);strokePath('#c37b62',roadWidth+9);ctx.setLineDash([]);
  strokePath('#555d54',roadWidth+2);strokePath('#666e62',roadWidth-1);
  strokePath('#697064',roadWidth-10);strokePath('#747a6d33',roadWidth*.55);
  if(track.line){ctx.setLineDash([7,9]);strokePath('#aee0a16b',1.6);ctx.setLineDash([]);}
  const s=pointAt(track.start),w=roadWidth;
  ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle);
  ctx.fillStyle='#efebdb';ctx.fillRect(-6,-w/2,12,w);
  for(let i=0;i<Math.ceil(w/6);i++)for(let j=0;j<2;j++){if((i+j)%2===0){ctx.fillStyle='#424a43';ctx.fillRect(-6+j*6,-w/2+i*6,6,Math.min(6,w-i*6));}}
  ctx.fillStyle='#dbe0c8';ctx.beginPath();ctx.moveTo(27,-7);ctx.lineTo(38,0);ctx.lineTo(27,7);ctx.lineTo(27,3);ctx.lineTo(15,3);ctx.lineTo(15,-3);ctx.lineTo(27,-3);ctx.closePath();ctx.fill();
  if(mode==='build'){ctx.fillStyle='#8c957e';ctx.font='8px "DM Sans",sans-serif';ctx.textAlign='center';ctx.fillText('START / FINISH',0,-w/2-24);ctx.strokeStyle='#aeb59e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-w/2-18);ctx.lineTo(0,-w/2-7);ctx.stroke();}
  ctx.restore();
}
function drawHandles() {
  const rad=5/scale;
  track.points.forEach((p,i)=>{
    ctx.beginPath();ctx.arc(p.x,p.y,(i===hoverPoint||i===activePoint||i===selectedPoint?7:5)/scale,0,Math.PI*2);ctx.fillStyle=i===selectedPoint?'#ec7c44':i===hoverPoint&&tool==='erase'?'#d44235':'#f6f2dc';ctx.fill();ctx.lineWidth=1.5/scale;ctx.strokeStyle='#dc7952';ctx.stroke();
    ctx.beginPath();ctx.arc(p.x,p.y,1.7/scale,0,Math.PI*2);ctx.fillStyle='#d8764e';ctx.fill();
    if(i===hoverPoint){ctx.fillStyle='#59654a';ctx.font=`${9/scale}px "DM Sans",sans-serif`;ctx.textAlign='center';ctx.fillText(String(i+1).padStart(2,'0'),p.x,p.y-rad-10/scale);}
  });
  if(!track.points.length){ctx.fillStyle='#8c977f';ctx.textAlign='center';ctx.font='29px "Barlow Condensed",sans-serif';ctx.fillText('Every circuit starts with a point.',500,350);ctx.font='12px "DM Sans",sans-serif';ctx.fillText('Click the canvas to start drawing. Add at least 3 points.',500,384);}
}
function drawCar(c,alpha=1) {
  const v=vehicles[track.car],kart=track.car==='kart',L=kart?22:30,W=kart?15:16;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(c.x,c.y);ctx.rotate(c.angle);ctx.scale(.2/(track.scale||.2),.2/(track.scale||.2));
  ctx.fillStyle='#28302544';ctx.fillRect(-L/2+2,-W/2+3,L,W);
  ctx.fillStyle='#252c28';ctx.fillRect(-L/2+3,-W/2-2,8,5);ctx.fillRect(L/2-10,-W/2-2,7,5);ctx.fillRect(-L/2+3,W/2-3,8,5);ctx.fillRect(L/2-10,W/2-3,7,5);
  ctx.fillStyle=v.color;ctx.beginPath();ctx.roundRect(-L/2,-W/2,L,W,kart?3:5);ctx.fill();
  ctx.fillStyle='#243630';ctx.beginPath();ctx.roundRect(-5,-W/2+2,11,W-4,2);ctx.fill();
  ctx.fillStyle='#758981';ctx.fillRect(3,-W/2+3,3,W-6);
  ctx.fillStyle='#ffead6';ctx.fillRect(L/2-3,-W/2+2,2,3);ctx.fillRect(L/2-3,W/2-5,2,3);
  ctx.fillStyle='#303c32';ctx.fillRect(-L/2-1,-W/2-2,3,W+4);
  ctx.fillStyle='#ffb595';ctx.fillRect(8,-2,4,4);ctx.restore();
}
function draw() {
  if(mode==='preview')return;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);ctx.fillStyle=mode==='drive'?'#e6e9d8':'#edece3';ctx.fillRect(0,0,cssW,cssH);
  if(showGrid){const step=40*scale;ctx.fillStyle=mode==='drive'?'#c9d0b4':'#cfd2bf';for(let x=((offsetX%step)+step)%step;x<cssW;x+=step)for(let y=((offsetY%step)+step)%step;y<cssH;y+=step){ctx.beginPath();ctx.arc(x,y,.7,0,Math.PI*2);ctx.fill();}}
  ctx.save();ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);
  if(referenceLayer?.image){ctx.save();ctx.globalAlpha=referenceOpacity;ctx.drawImage(referenceLayer.image,0,0,1000,740);ctx.restore();}else scenery();
  ctx.save();if(referenceLayer?.image&&mode==='build'&&traceOverlay)ctx.globalAlpha=.4;drawTrack();ctx.restore();
  if(track.pit?.length){strokePath('#475b5f',6/(track.scale||.2),track.pit,false);ctx.setLineDash([5,8]);strokePath('#accdd4',1/scale,track.pit,false);ctx.setLineDash([]);if(mode==='build'){track.pit.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4/scale,0,Math.PI*2);ctx.fillStyle='#eff9e8';ctx.fill();ctx.strokeStyle='#4f95a0';ctx.lineWidth=1/scale;ctx.stroke();});}}
  if(measurement.length){ctx.setLineDash([5/scale,4/scale]);strokePath('#f2b767',2/scale,measurement,false);ctx.setLineDash([]);measurement.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,5/scale,0,Math.PI*2);ctx.fillStyle='#f2b767';ctx.fill();});}
  if(mode==='build')drawHandles();
  else{
    ctx.lineWidth=2;ctx.lineCap='round';marks.forEach(m=>{ctx.strokeStyle=`rgba(37,44,34,${m.a})`;ctx.beginPath();ctx.moveTo(m.x1,m.y1);ctx.lineTo(m.x2,m.y2);ctx.stroke();});
    if(showGhost && ghost.length && !paused){let gi=0;while(gi<ghost.length-2&&ghost[gi+1].t<elapsed)gi++;if(ghost[gi] && elapsed<=ghost[ghost.length-1].t)drawCar(ghost[gi],.23);}
    drawCar(car);
  }
  ctx.restore();
}

canvas.addEventListener('pointerdown',e=>{
  if(mode!=='build')return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);const p=screenToWorld(e),hit=pointHit(p);
  if(tool==='measure'){if(measurement.length>=2)measurement=[];measurement.push(p);if(measurement.length===2){const distance=dist(...measurement);if(distance<5){measurement=[];toast('Measure a line longer than 5 reference pixels.');}else tracerUI.measure(distance);}return;}
  if(tool==='pit'){if(p.x<40||p.x>960||p.y<70||p.y>670){toast('Keep the pit lane inside the boundary.');return;}if((track.pit?.length||0)>=100){toast('Pit lane supports up to 100 points.');return;}remember();track.pit||=[];track.pit.push({x:p.x,y:p.y,elevation:nearest(p).distance<roadWidth?pointAt(nearest(p).progress).elevation||0:0});commit();return;}
  let pitHit=-1;(track.pit||[]).forEach((v,i)=>{if(dist(v,p)<15/scale)pitHit=i;});
  if(hit<0&&pitHit>=0&&tool==='move'){selectedPoint=-1;drag={kind:'pit',index:pitHit,before:snapshot(),changed:false};tracerUI.refresh();return;}
  if(hit<0&&pitHit>=0&&tool==='erase'){remember();track.pit.splice(pitHit,1);commit();return;}
  if(tool==='pan'){drag={kind:'pan',x:e.clientX,y:e.clientY,panX:view.panX,panY:view.panY};canvas.style.cursor='grabbing';return;}
  if(tool==='move' && hit>=0){drag={kind:'point',index:hit,before:snapshot(),changed:false};activePoint=hit;selectedPoint=hit;tracerUI.refresh();return;}
  if(tool==='erase' && hit>=0){remember();track.points.splice(hit,1);track.start=0;commit();return;}
  if(tool==='start' && track.points.length>=3){const near=nearest(p);if(near.distance<roadWidth){remember();track.start=near.progress;commit();toast('Start line moved. Follow the arrow to begin a lap.');}else toast('Click on the road to place the start line.');return;}
  if(tool==='draw'){
    if(p.x<40||p.x>960||p.y<70||p.y>670){toast('Place points inside the circuit boundary.');return;}
    if(track.points.length>=150){toast('Maximum of 150 control points reached.');return;}
    if(track.points.some(v=>dist(v,p)<20)){toast('Place the new point a little farther from existing points.');return;}
    let insert=track.points.length;
    if(track.points.length>=3&&!tracingInProgress){insert=sampleSegments[nearest(p).index]+1;}
    remember();track.points.splice(insert,0,{x:p.x,y:p.y,elevation:0,bank:0});selectedPoint=insert;track.start=0;commit();
  }
});
canvas.addEventListener('pointermove',e=>{
  if(mode!=='build')return;const p=screenToWorld(e);hoverPoint=pointHit(p);
  if(drag?.kind==='pan'){view.panX=drag.panX+e.clientX-drag.x;view.panY=drag.panY+e.clientY-drag.y;updateTransform();return;}
  if(drag?.kind==='point'){const v=track.points[drag.index];v.x=clamp(p.x,40,960);v.y=clamp(p.y,70,670);drag.changed=true;track.preset=null;rebuild();syncUI();}
  else if(drag?.kind==='pit'){const v=track.pit[drag.index];v.x=clamp(p.x,40,960);v.y=clamp(p.y,70,670);drag.changed=true;}
  else if(tool==='move')canvas.style.cursor=hoverPoint>=0?'grab':'default';
});
function finishDrag() {if((drag?.kind==='point'||drag?.kind==='pit')&&drag.changed){remember(drag.before);commit();}drag=null;activePoint=-1;if(mode==='build')canvas.style.cursor=tool==='pan'?'grab':tool==='move'?'default':'crosshair';}
canvas.addEventListener('pointerup',finishDrag);canvas.addEventListener('pointercancel',finishDrag);canvas.addEventListener('pointerleave',()=>hoverPoint=-1);
canvas.addEventListener('wheel',e=>{if(mode==='drive')return;e.preventDefault();zoom(e.deltaY<0?1.08:1/1.08);},{passive:false});
$('#editor-tools').addEventListener('click',e=>{const button=e.target.closest('[data-tool]');if(button)setTool(button.dataset.tool);});
$('#zoom-in').onclick=()=>zoom(1.15);$('#zoom-out').onclick=()=>zoom(1/1.15);$('#zoom-reset').onclick=()=>{view={zoom:1,panX:0,panY:0};updateTransform();};
$('#grid-btn').onclick=()=>{showGrid=!showGrid;$('#grid-btn').setAttribute('aria-pressed',String(showGrid));$('#grid-btn span').textContent=showGrid?'Grid on':'Grid off';};
$('#undo-btn').onclick=undo;$('#redo-btn').onclick=redo;
$('#track-name').addEventListener('focus',()=>$('#track-name').dataset.before=track.name);
$('#track-name').addEventListener('change',()=>{const name=$('#track-name').value.trim()||'Untitled Circuit';if(name!==track.name){const prev=snapshot();prev.name=$('#track-name').dataset.before||track.name;remember(prev);track.name=name;commit();}});
$('#width-range').addEventListener('pointerdown',()=>widthBefore=snapshot());
$('#width-range').addEventListener('input',()=>{if(mode==='drive')return;if(!widthBefore)widthBefore=snapshot();track.width=Number($('#width-range').value);rebuild();syncUI();});
$('#width-range').addEventListener('change',()=>{if(mode==='drive')return;remember(widthBefore||snapshot());widthBefore=null;commit();});
$('#smooth-toggle').onchange=()=>{if(mode==='drive')return;remember();track.smooth=$('#smooth-toggle').checked;track.start=0;commit();};
$('#line-toggle').onchange=()=>{track.line=$('#line-toggle').checked;draftSave();};
$$('[data-car]').forEach(b=>b.onclick=()=>{track.car=b.dataset.car;syncUI();draftSave();if(mode==='drive'){startDrive();toast(`${vehicles[track.car].name} ready. New test session.`);}});

let pendingLayout=null;
function changeLayout(action){if(mode==='drive')stopDrive();if(mode==='preview')stopPreview();if(dirty&&track.points.length){pendingLayout=action;$('#confirm-dialog').showModal();}else action();}
function loadPreset(key){remember();track=presetTrack(key);selectedPoint=-1;measurement=[];view={zoom:1,panX:0,panY:0};updateTransform();dirty=false;commit();setTool('move');toast(`${presets[key].name} loaded. Make it your own.`);}
$$('[data-preset]').forEach(b=>b.onclick=()=>changeLayout(()=>loadPreset(b.dataset.preset)));
$('#new-btn').onclick=()=>changeLayout(()=>{remember();track={...presetTrack('club'),name:'Untitled Circuit',points:[],preset:null,car:track.car,background:track.background,scale:track.scale||.2};selectedPoint=-1;dirty=false;view={zoom:1,panX:0,panY:0};updateTransform();commit();setTool('draw');});
$('#confirm-replace').onclick=()=>{$('#confirm-dialog').close();pendingLayout?.();pendingLayout=null;};
$('#confirm-save').onclick=()=>{if(saveCircuit()){$('#confirm-dialog').close();pendingLayout?.();pendingLayout=null;}};
$$('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('#help-btn').onclick=()=>{if(mode==='drive'&&!paused&&countdown<=0)togglePause();$('#help-dialog').showModal();};
$('#studio-link').onclick=()=>{$('#library-dialog').close();canvas.scrollIntoView({block:'center',behavior:'smooth'});};
function saveCircuit() {
  if(track.points.length<3 || length<=200){toast('Finish a circuit with at least 3 points before saving.');return false;}
  if(!track.id)track.id=crypto.randomUUID?crypto.randomUUID():String(Date.now());
  const item={...snapshot(),updatedAt:new Date().toISOString()},index=library.findIndex(t=>t.id===track.id);
  const next=clone(library);if(index<0){if(next.length>=100){toast('Your garage is full. Export or remove a circuit first.');return false;}next.unshift(item);}else next[index]=item;
  if(!writeStorage(STORAGE,next))return false;library=next;dirty=false;draftSave();syncUI();toast('Circuit saved to your garage.');return true;
}
$('#save-btn').onclick=saveCircuit;
function miniSvg(points){return `<svg viewBox="0 0 1000 740" aria-hidden="true"><path d="M ${points.map(p=>`${p.x} ${p.y}`).join(' L ')} Z" fill="none" stroke="#9baf87" stroke-width="45" stroke-linejoin="round" stroke-linecap="round"/></svg>`;}
function renderLibrary(){
  const el=$('#library-list');el.replaceChildren();
  if(!library.length){el.innerHTML='<div class="empty-library">Your garage is waiting.<br />Save a circuit from the studio to see it here.</div>';return;}
  library.forEach(item=>{
    const row=document.createElement('div');row.className='library-row';row.innerHTML=miniSvg(item.points);
    const desc=document.createElement('div'),title=document.createElement('h3'),detail=document.createElement('p');title.textContent=item.name;detail.textContent=`${item.points.length} points · ${item.width} m wide`;desc.append(title,detail);row.append(desc);
    const load=document.createElement('button');load.className='subtle-button';load.textContent='Open ↗';load.onclick=()=>{$('#library-dialog').close();changeLayout(()=>{remember();track=validateTrack(item);dirty=false;commit();setTool('move');view={zoom:1,panX:0,panY:0};updateTransform();toast('Circuit loaded.');});};row.append(load);
    const exportBtn=document.createElement('button');exportBtn.className='icon-button';exportBtn.title='Export circuit';exportBtn.setAttribute('aria-label',`Export ${item.name}`);exportBtn.innerHTML=icon('download');exportBtn.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({format:'apex-circuit',version:1,...item},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`${item.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()||'circuit'}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};row.append(exportBtn);
    const del=document.createElement('button');del.className='icon-button';del.title='Remove saved circuit';del.setAttribute('aria-label',`Remove ${item.name}`);del.innerHTML=icon('trash');del.onclick=()=>{const previous=clone(library),next=library.filter(t=>t.id!==item.id);if(writeStorage(STORAGE,next)){library=next;renderLibrary();syncUI();toast('Circuit removed. Click Undo removal below to restore it.');const restore=document.createElement('button');restore.className='subtle-button';restore.textContent='Undo removal';restore.onclick=()=>{if(writeStorage(STORAGE,previous)){library=previous;renderLibrary();syncUI();}};el.append(restore);}};row.append(del);el.append(row);
  });
}
$('#library-btn').onclick=()=>{if(mode==='drive'&&!paused&&countdown<=0)togglePause();renderLibrary();$('#library-dialog').showModal();};
$('#import-btn').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async()=>{
  const file=$('#import-file').files[0];if(!file)return;
  if(file.size>150000){toast('That file is too large. Choose an APEX circuit JSON file.');$('#import-file').value='';return;}
  try{const imported=validateTrack(JSON.parse(await file.text()));if(!imported||imported.points.length<3)throw new Error();imported.id=crypto.randomUUID?crypto.randomUUID():String(Date.now());imported.updatedAt=new Date().toISOString();if(library.length>=100){toast('Your garage is full. Remove a circuit before importing.');return;}const next=[imported,...library];if(writeStorage(STORAGE,next)){library=next;renderLibrary();syncUI();toast('Circuit imported. Open it to start driving.');}}catch{toast('Invalid circuit file. Choose an exported APEX circuit JSON.');}finally{$('#import-file').value='';}
};
$('#fullscreen-btn').onclick=()=>{const expanded=$('.studio').classList.toggle('expanded');$('#fullscreen-btn').setAttribute('aria-label',expanded?'Exit expanded canvas':'Expand canvas');$('#fullscreen-btn').title=expanded?'Exit expanded canvas':'Expand canvas';};
$('#export-current').onclick=()=>{
  if(track.points.length<3){toast('Add at least three points before exporting.');return;}
  const url=URL.createObjectURL(new Blob([JSON.stringify({format:'apex-circuit',version:1,...snapshot()},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`${track.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()||'circuit'}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

function signature() {const data=JSON.stringify({physics:3,points:track.points.map(p=>[Math.round(p.x*10),Math.round(p.y*10)]),width:track.width,scale:track.scale,smooth:track.smooth,start:track.start,car:track.car});let hash=2166136261;for(let i=0;i<data.length;i++){hash^=data.charCodeAt(i);hash=Math.imul(hash,16777619);}return 'track-'+(hash>>>0).toString(36);}
function resetCar() {const p=pointAt(track.start+.009);car={x:p.x,y:p.y,angle:p.angle,speed:0,vx:0,vy:0,steering:0};elapsed=0;lapTracker.reset();currentGhost=[];lastGhostStamp=0;keys.clear();marks=[];updateTransform();}
function startDrive() {
  if(mode==='preview')stopPreview();measurement=[];
  if(track.points.length<3||length*(track.scale||.2)<60){toast('Trace at least 3 points and a circuit at least 60 meters long.');return;}
  if(mode==='build')editorView=clone(view);
  mode='drive';view={zoom:1,panX:0,panY:0};paused=false;lap=1;sessionLaps=[];renderLapHistory();countdown=3.15;messageUntil=0;recordKey=signature();best=Number.isFinite(recordData[recordKey])?recordData[recordKey]:null;
  const savedGhost=readStorage('apex-ghost-v1',null);
  ghost=savedGhost?.key===recordKey && Array.isArray(savedGhost.frames) && savedGhost.frames.length<=15000 && savedGhost.frames.every(f=>['x','y','angle','t'].every(k=>Number.isFinite(f[k])))?savedGhost.frames:[];
  resetCar();
  $('#camera-btn').setAttribute('aria-pressed',String(followCamera));
  $('.studio').classList.add('drive-active');$('#drive-hud').hidden=false;
  ['#editor-tools','#canvas-label','#canvas-zoom','#canvas-hint','#compass'].forEach(s=>$(s).hidden=true);
  $('#build-mode').classList.remove('active');$('#drive-mode').classList.add('active');$('#canvas-caption').innerHTML='TEST SESSION <span>/</span> TOP VIEW';
  $('#drive-btn').innerHTML=icon('pen')+'<span>Back to build</span><span class="button-arrow">↗</span>';$('#track-name').disabled=true;$('#width-range').disabled=true;$('#smooth-toggle').disabled=true;
  $('#pause-btn').innerHTML=icon('pause');$('#pause-btn').setAttribute('aria-label','Pause driving');canvas.style.cursor='default';canvas.setAttribute('aria-label','Driving session. WASD or arrow keys drive, Shift handbrakes, Space pauses, R resets.');syncUI();updateHUD();canvas.focus({preventScroll:true});
}
function stopDrive() {
  mode='build';if(editorView)view=editorView;editorView=null;updateTransform();keys.clear();paused=false;$('.studio').classList.remove('drive-active');$('#drive-hud').hidden=true;
  ['#editor-tools','#canvas-label','#canvas-zoom','#canvas-hint','#compass'].forEach(s=>$(s).hidden=false);
  $('#build-mode').classList.add('active');$('#drive-mode').classList.remove('active');$('#canvas-caption').innerHTML='CIRCUIT EDITOR <span>/</span> TOP VIEW';
  $('#drive-btn').innerHTML=icon('play')+'<span>Test drive</span><span class="button-arrow">↗</span>';$('#track-name').disabled=false;$('#width-range').disabled=false;$('#smooth-toggle').disabled=false;canvas.setAttribute('aria-label','Circuit editor. Drag orange points to reshape your track. Select Draw to add points.');setTool(tool);syncUI();
}
$('#drive-btn').onclick=()=>mode==='build'?startDrive():stopDrive();$('#drive-mode').onclick=()=>{if(mode!=='drive')startDrive();};$('#build-mode').onclick=()=>{if(mode!=='build')stopDrive();};
function formatTime(t) {const min=Math.floor(t/60),sec=Math.floor(t%60),ms=Math.floor((t%1)*1000);return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;}
function setRaceMessage(label,duration=2){$('#race-message').textContent=label;$('#race-message').classList.add('message-label');messageUntil=performance.now()+duration*1000;}
function togglePause(){if(mode!=='drive'||countdown>0)return;paused=!paused;keys.clear();$('#pause-btn').innerHTML=icon(paused?'play':'pause');$('#pause-btn').setAttribute('aria-label',paused?'Resume driving':'Pause driving');if(paused)setRaceMessage('SESSION PAUSED',3600);else{messageUntil=0;$('#race-message').textContent='';}syncUI();}
$('#pause-btn').onclick=togglePause;
$('#camera-btn').onclick=()=>{followCamera=!followCamera;$('#camera-btn').setAttribute('aria-pressed',String(followCamera));$('#camera-btn').title=followCamera?'Use circuit overview (C)':'Follow the car (C)';updateTransform();};
$('#ghost-btn').onclick=()=>{showGhost=!showGhost;$('#ghost-btn').setAttribute('aria-pressed',String(showGhost));toast(showGhost?'Best lap ghost enabled.':'Best lap ghost hidden.');};
function restartDrive(){resetCar();countdown=1.2;paused=false;$('#pause-btn').innerHTML=icon('pause');$('#pause-btn').setAttribute('aria-label','Pause driving');syncUI();}
$('#restart-btn').onclick=restartDrive;
function renderLapHistory(){
  const el=$('#lap-history');el.replaceChildren();
  if(!sessionLaps.length){el.innerHTML='<p class="session-empty">Your next lap is a new possibility.<br>Drive a full circuit to set a time.</p>';return;}
  sessionLaps.slice(-5).reverse().forEach(result=>{
    const row=document.createElement('div');row.className='lap-result'+(result.valid?'':' invalid');
    const num=document.createElement('span');num.textContent=`LAP ${String(result.lap).padStart(2,'0')}`;
    const time=document.createElement('strong');time.textContent=formatTime(result.time);
    const detail=document.createElement('span');detail.textContent=!result.valid?'INVALID':result.isBest?'BEST':`+${(result.time-result.best).toFixed(3)}`;
    row.title=result.reason||'Completed lap';row.append(num,time,detail);el.append(row);
  });
}
function finishLap(result){
  if(elapsed<3)return;
  const time=elapsed,isBest=result.valid&&(best===null||time<best);
  if(isBest){best=time;recordData[recordKey]=time;const entries=Object.entries(recordData);if(entries.length>250)delete recordData[entries[0][0]];writeStorage('apex-records-v1',recordData);ghost=clone(currentGhost);writeStorage('apex-ghost-v1',{key:recordKey,frames:ghost});setRaceMessage(`NEW BEST · ${formatTime(time)}`,3);toast(`New best lap: ${formatTime(time)}`);}
  else if(result.valid){setRaceMessage(`LAP ${lap} · ${formatTime(time)}`,2.5);}
  else setRaceMessage(`INVALID LAP · ${result.reason.toUpperCase()}`,2.5);
  sessionLaps.push({lap,time,isBest,best,...result});if(sessionLaps.length>50)sessionLaps.shift();renderLapHistory();
  lap++;elapsed=0;currentGhost=[];lastGhostStamp=0;
}
function updatePhysics(dt) {
  if(mode!=='drive')return;
  if(paused)return;
  if(countdown>0){countdown-=dt;const label=countdown>.2?String(Math.ceil(countdown-.2)):'GO';$('#race-message').classList.remove('message-label');if($('#race-message').textContent!==label)$('#race-message').textContent=label;if(countdown<=0){setRaceMessage('GO',.7);}return;}
  const multiplier=.2/(track.scale||.2),baseVehicle=vehicles[track.car],v={...baseVehicle,max:baseVehicle.max*multiplier,accel:baseVehicle.accel*multiplier,brake:baseVehicle.brake*multiplier,turnSpeed:50*multiplier},onRoad=nearest(car).distance<roadWidth/2-.6/(track.scale||.2);
  const throttle=keys.has('w')||keys.has('arrowup'),brake=keys.has('s')||keys.has('arrowdown');
  const steer=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
  const handbrake=keys.has('shift'),prevX=car.x,prevY=car.y;
  stepVehicle(car,v,{throttle,brake,steer,handbrake},onRoad,dt);
  if(Math.abs(car.speed)>90*multiplier&&(steer||handbrake)&&onRoad){const nx=-Math.sin(car.angle)*6*multiplier,ny=Math.cos(car.angle)*6*multiplier;[-1,1].forEach(s=>marks.push({x1:prevX+nx*s,y1:prevY+ny*s,x2:car.x+nx*s,y2:car.y+ny*s,a:.19}));if(marks.length>1200)marks.splice(0,20);}
  elapsed+=dt;
  const near=nearest(car),progress=relativeProgress(near.progress);
  const result=lapTracker.update(progress,near.distance<roadWidth/2-.6/(track.scale||.2),dt);
  if(result)finishLap(result);
  if(elapsed-lastGhostStamp>.06){currentGhost.push({x:car.x,y:car.y,angle:car.angle,t:elapsed});lastGhostStamp=elapsed;if(currentGhost.length>15000)currentGhost.shift();}
}
let lastHud=0;
function updateHUD() {
  $('#lap-display').textContent=String(lap).padStart(2,'0');$('#time-display').textContent=formatTime(elapsed);$('#best-display').textContent=best!==null?formatTime(best):'—';
  const speed=Math.round(Math.abs(car.speed)*(track.scale||.2)*3.6);$('#speed-display').textContent=speed;$('#speed-fill').style.width=`${Math.abs(car.speed)/(vehicles[track.car].max*.2/(track.scale||.2))*100}%`;
  const onRoad=nearest(car).distance<roadWidth/2-.6/(track.scale||.2);$('#surface-display').textContent=onRoad?'ON TRACK':'OFF TRACK';$('#surface-display').style.color=onRoad?'#a4b097':'#efa07b';
  $('#lap-validity').textContent=lapTracker.invalidReason?`${lapTracker.invalidReason} · lap invalid`:'Clean lap';$('#lap-validity').classList.toggle('invalid',!!lapTracker.invalidReason);
  $('#checkpoint-label').textContent=`${lapTracker.checkpoint-1} / 7 checkpoints`;
  $('#checkpoint-fill').style.width=`${(lapTracker.checkpoint-1)/7*100}%`;
  if(countdown<=0&&!paused&&performance.now()>messageUntil){$('#race-message').textContent='';$('#race-message').classList.remove('message-label');}
}
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select') || $$('dialog').some(d=>d.open))return;
  const k=e.key.toLowerCase();
  if(mode==='drive'){
    if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift','c',' ','r','escape'].includes(k)){e.preventDefault();if(k===' '&&!e.repeat)togglePause();else if(k==='r'&&!e.repeat)restartDrive();else if(k==='c'&&!e.repeat)$('#camera-btn').click();else if(k==='escape'){if($('.studio').classList.contains('expanded'))$('.studio').classList.remove('expanded');else stopDrive();}else keys.add(k);}
  }else{
    if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();}else if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();redo();}else if(!(e.ctrlKey||e.metaKey||e.altKey)){const map={v:'move',p:'draw',e:'erase',s:'start',h:'pan'};if(map[k]){e.preventDefault();setTool(map[k]);}else if(k==='escape')$('.studio').classList.remove('expanded');}
  }
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();if(mode==='drive'&&!paused&&countdown<=0)togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();if(mode==='drive'&&!paused&&countdown<=0)togglePause();}});
$$('.touch-controls button').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key);b.style.filter='brightness(1.25)';});['pointerup','pointercancel','lostpointercapture'].forEach(event=>b.addEventListener(event,()=>{keys.delete(b.dataset.key);b.style.filter='';}));});
let lastFrame=performance.now(),accumulator=0;
function frame(now) {
  accumulator+=Math.min((now-lastFrame)/1000,.1);lastFrame=now;
  while(accumulator>=1/120){updatePhysics(1/120);accumulator-=1/120;}
  if(mode==='drive'&&followCamera)updateTransform();
  draw();if(mode==='drive'&&now-lastHud>50){updateHUD();lastHud=now;}requestAnimationFrame(frame);
}
function stopPreview(){if(mode!=='preview')return;mode='build';$('.studio').classList.remove('preview-active');$('#preview-canvas').hidden=true;canvas.hidden=false;$('#preview-mode').classList.remove('active');$('#build-mode').classList.add('active');$('#canvas-caption').innerHTML='TRACE EDITOR <span>/</span> TOP VIEW';$('#canvas-hint span').textContent='Drag points. Select one to edit elevation.';syncUI();}
function showPreview(){
  if(mode==='drive')stopDrive();if(track.points.length<3||!length){toast('Trace a circuit with at least three points first.');return;}
  try{if(!preview3D)preview3D=new TrackPreview($('#preview-canvas'));if(!preview3D.gl){toast('3D preview needs WebGL. You can still trace and export the track.');return;}mode='preview';$('.studio').classList.add('preview-active');canvas.hidden=true;$('#preview-canvas').hidden=false;$('#preview-mode').classList.add('active');$('#build-mode').classList.remove('active');$('#drive-mode').classList.remove('active');$('#canvas-caption').innerHTML='GEOMETRY PREVIEW <span>/</span> 3D';$('#canvas-hint span').textContent='Drag to orbit. Scroll to zoom. Inspect road and pit placement.';preview3D.load(track);}
  catch(error){stopPreview();toast('3D preview failed: '+error.message);}
}
referenceLayer=new ReferenceLayer(()=>{},toast);
tracerUI=mountTracer({
  getTrack:()=>track,getSelected:()=>selectedPoint,reference:referenceLayer,toast,setTool,preview:showPreview,
  stopDrive(){if(mode==='drive')stopDrive();else if(mode==='preview')stopPreview();},
  updateTrack(fn){if(mode==='drive')stopDrive();remember();fn(track);commit();updateTransform();},
  setOpacity(value){referenceOpacity=value;},setTraceOverlay(value){traceOverlay=value;},
  setReference(desc,meters,fresh){const apply=()=>{remember();if(fresh){track={...presetTrack('club'),name:'Traced Circuit',points:[],preset:null,background:desc,scale:meters};selectedPoint=-1;}else{track.background=desc;track.scale=meters;}view={zoom:1,panX:0,panY:0};updateTransform();commit();referenceLayer.ensure(track.background);setTool(fresh?'draw':'move');};fresh?changeLayout(apply):apply();}
});
$('#build-mode').onclick=()=>{if(mode==='drive')stopDrive();else stopPreview();};
$('#width-range').setAttribute('min','4');$('#width-range').setAttribute('max','30');
rebuild();syncUI();renderLapHistory();resize();setTool('move');requestAnimationFrame(frame);
