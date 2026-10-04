import {buildGeometry, pointOnTrack, closestOnTrack} from './engine.js';
import {ReferenceLayer} from './tracing.js';
import {mountTracer} from './tracer-ui.js';
import {TrackPreview} from './preview3d.js';
import {DEFAULT_EXPORT} from './ac-export.js';
import {ASPHALT,asphaltPattern} from './surfaces.js';
import {mountAnalysis} from './analysis-ui.js';
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const icons = {
  help:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4m0 3h.01"/>',
  circuit:'<path d="M6 5h12c4 0 4 5 1 7l-3 6c-1 2-4 1-5-1l-2-3c-1-1-2 0-3 2-2 3-5 1-5-2V9c0-2 2-4 5-4Z"/>',
  undo:'<path d="m8 5-5 5 5 5M3 10h10a7 7 0 0 1 7 7v2"/>',
  redo:'<path d="m16 5 5 5-5 5m5-5H11a7 7 0 0 0-7 7v2"/>',
  save:'<path d="M4 3h13l3 3v15H4ZM8 3v6h8V3M8 21v-8h8v8"/>',
  pen:'<path d="m15 3 6 6-12 12H3v-6Zm-3 3 6 6M3 15l6 6"/>',
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
};
function icon(name) { return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || ''}</svg>`; }
$$('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));

const WORLD = { w: 1000, h: 740 };
const presets = {
  club: { name:'The Club Circuit', points:[[230,168],[460,155],[743,167],[838,230],[782,367],[702,513],[605,505],[511,401],[438,398],[349,540],[242,530],[157,359],[156,235]] },
  technical: { name:'Switchback', points:[[203,152],[451,150],[743,152],[852,225],[743,383],[713,527],[608,551],[521,443],[520,349],[420,376],[365,536],[243,551],[162,443],[176,341],[297,306],[306,238]] },
  speedway: { name:'The Speedway', points:[[309,192],[499,176],[688,190],[805,259],[843,370],[801,477],[682,543],[494,560],[307,542],[188,475],[157,366],[193,255]] },
};
const clone = (v) => JSON.parse(JSON.stringify(v));
const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
const STORAGE = 'apex-circuits-v1';
const DRAFT = 'apex-draft-v1';
function readStorage(key,fallback) { try { const v=localStorage.getItem(key);return v?JSON.parse(v):fallback; } catch {return fallback;} }
let storageAvailable = true;
function writeStorage(key,value) { try {localStorage.setItem(key,JSON.stringify(value));return true;} catch {storageAvailable=false;toast('Browser storage is unavailable. Export your circuit to keep it.');return false;} }
function presetTrack(key) {return {name:presets[key].name,points:presets[key].points.map(([x,y])=>({x,y,elevation:0,bank:0})),width:12,scale:.2,scaleSource:'manual',scaleVerification:null,smooth:true,line:false,start:0,preset:key,id:null,pit:[],barriers:[],complete:true,asphalt:'fresh',details:{description:'',type:'circuit',tags:'',version:'1.0',website:''},background:null,export:{...DEFAULT_EXPORT}};}
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
  const barriers=Array.isArray(data.barriers)?data.barriers.slice(0,40).filter(b=>b&&Array.isArray(b.points)).map(b=>({points:b.points.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(0,100).map(p=>({x:clamp(p.x,0,1000),y:clamp(p.y,0,740),elevation:clamp(Number(p.elevation)||0,-100,500)})),height:clamp(Number(b.height)||1.2,.4,4),width:clamp(Number(b.width)||.4,.15,2),style:b.style==='striped'?'striped':'concrete'})).filter(b=>b.points.length):[];
  const details={description:String(data.details?.description||'').slice(0,1500),type:['circuit','kart','test'].includes(data.details?.type)?data.details.type:'circuit',tags:String(data.details?.tags||'').slice(0,200),version:String(data.details?.version||'1.0').slice(0,20),website:/^https?:\/\//i.test(data.details?.website||'')?String(data.details.website).slice(0,200):''};
  const scaleSource=['map','calibrated','manual'].includes(data.scaleSource)?data.scaleSource:background?.type==='map'?'map':'manual',scaleVerification=Number.isFinite(data.scaleVerification?.distanceMeters)&&Number.isFinite(data.scaleVerification?.referencePixels)&&data.scaleVerification.distanceMeters>0&&data.scaleVerification.referencePixels>0?{distanceMeters:data.scaleVerification.distanceMeters,referencePixels:data.scaleVerification.referencePixels}:null;
  return {name:typeof data.name==='string'?data.name.slice(0,60)||'Untitled Circuit':'Untitled Circuit',points:data.points.map(p=>({x:p.x,y:p.y,elevation:clamp(Number(p.elevation)||0,-100,500),bank:clamp(Number(p.bank)||0,-15,15)})),width:clamp(Number(data.width)||12,4,30),scale:clamp(Number(data.scale)||.2,.02,10),scaleSource,scaleVerification,smooth:data.smooth!==false,line:!!data.line,start:Number.isFinite(data.start)?((data.start%1)+1)%1:0,preset:['club','technical','speedway'].includes(data.preset)?data.preset:null,id:typeof data.id==='string'?data.id:null,pit,barriers,details,complete:data.complete!==false&&data.points.length>=3,asphalt:ASPHALT[data.asphalt]?data.asphalt:'fresh',background,export:exportOptions};
}
const recoveredDraft=validateTrack(readStorage(DRAFT,null));
let track=recoveredDraft || presetTrack('club');
let library=readStorage(STORAGE,[]);
if(!Array.isArray(library))library=[];
library=library.filter(t=>validateTrack(t)&&t.points.length>=1).slice(0,100);
let undoStack=[], redoStack=[], tool='move', mode='build', dirty=!!recoveredDraft && !library.some(t=>JSON.stringify(validateTrack(t))===JSON.stringify(track));
let samples=[], sampleSegments=[], cumulative=[], length=0, roadWidth=track.width*5, activePoint=-1, hoverPoint=-1;
let showGrid=true, view={zoom:1,panX:0,panY:0}, drag=null, widthBefore=null;
let cssW=0,cssH=0,dpr=1,scale=1,offsetX=0,offsetY=0;
let selectedPoint=-1,tracerUI=null,analysisUI=null,referenceLayer=null,preview3D=null,referenceOpacity=.75,traceOverlay=true,measurement=[];
let selectedBarrier=-1,activeBarrier=-1;const asphaltTextures=new Map();
const canvas=$('#track-canvas'),ctx=canvas.getContext('2d');
let geometry=buildGeometry(track.points,track.smooth);
let analysisOverlay=false,analysisData=null,analysisFocus=null;

function toast(message) {const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3200);}
function snapshot() { return clone(track); }
function remember(previous=snapshot()) {undoStack.push(previous);if(undoStack.length>70)undoStack.shift();redoStack=[];dirty=true;track.preset=null;updateUndo();}
function updateUndo() {$('#undo-btn').disabled=!undoStack.length;$('#redo-btn').disabled=!redoStack.length;}
function draftSave() {if(storageAvailable)writeStorage(DRAFT,track);}
function commit() { if(track.points.length<3)track.complete=false;if(!track.barriers?.[selectedBarrier])selectedBarrier=-1;if(!track.barriers?.[activeBarrier])activeBarrier=-1;if(!track.points[selectedPoint])selectedPoint=-1;rebuild();syncUI();draftSave();if(mode==='preview')preview3D?.load(track); }
function undo() {if(!undoStack.length)return;redoStack.push(snapshot());track=undoStack.pop();dirty=true;commit();}
function redo() {if(!redoStack.length)return;undoStack.push(snapshot());track=redoStack.pop();dirty=true;commit();}
function rebuild() {
  geometry=buildGeometry(track.points,track.smooth,track.complete!==false);
  samples=geometry.samples;sampleSegments=geometry.segments;cumulative=geometry.cumulative;length=geometry.length;
  roadWidth=track.width/(track.scale||.2);
}
const pointAt = fraction => pointOnTrack(geometry,fraction);
const nearest = p => closestOnTrack(geometry,p);
function syncUI() {
  $('#track-name').value=track.name;$('#length-stat').innerHTML=`${(length*(track.scale||.2)/1000).toFixed(2)} <small>km</small>`;
  $('#points-stat').textContent=track.points.length;$('#width-range').value=track.width;$('#width-value').textContent=`${track.width} m`;
  $('#width-range').min=4;$('#width-range').max=30;$('#width-range').value=track.width;
  $('#width-range').style.background=`linear-gradient(to right,var(--orange) ${(track.width-4)/26*100}%,#e3e5db ${(track.width-4)/26*100}%)`;
  $('#smooth-toggle').checked=track.smooth;$('#line-toggle').checked=track.line;
  $('#saved-count').textContent=library.length;
  $$('.preset').forEach(b=>b.classList.toggle('active',b.dataset.preset===track.preset));
  $('#editor-status').textContent=track.complete!==false?'Closed circuit · Editable':'Open road · Editable';
  $('#layout-label').textContent=track.preset?'LAYOUT '+({club:'01',technical:'02',speedway:'03'}[track.preset]):'CUSTOM LAYOUT';
  updateUndo();tracerUI?.refresh();analysisUI?.refresh();
  if(referenceLayer && referenceLayer.currentKey!==referenceLayer.key(track.background))referenceLayer.ensure(track.background);
}
function setTool(value) {if(mode==='preview')stopPreview();if(value==='measure')measurement=[];if(value!=='barrier')activeBarrier=-1;tool=value;$$('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===value));canvas.style.cursor=value==='pan'?'grab':value==='move'?'default':'crosshair';$('#canvas-hint span').textContent=({move:'Drag road, pit, or barrier points. Closed circuits remain editable.',draw:track.complete!==false?'Click to insert a road point into the nearest section.':'Click to extend the open road. Alt + click inserts a point.',erase:'Click a road, pit, or barrier point to remove it.',start:'Click the road to place your start line.',pan:'Drag to move your canvas.',measure:'Click two reference points to calibrate the scale.',pit:'Click an open pit path. Select Move when finished.',barrier:'Click to draw a barrier path. Finish barrier or select Move.'})[value];}
function updateTransform() {
  scale=Math.min(cssW/WORLD.w,cssH/WORLD.h)*view.zoom;
  offsetX=(cssW-WORLD.w*scale)/2+view.panX;offsetY=(cssH-WORLD.h*scale)/2+view.panY;
  $('#zoom-reset').textContent=`${Math.round(view.zoom*100)}%`;
  $('.scale-label').innerHTML=`${Math.round(40/scale*(track.scale||.2))} m <span>╞════╡</span>`;
}
function resize() {const r=canvas.getBoundingClientRect();cssW=r.width;cssH=r.height;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);updateTransform();}
new ResizeObserver(resize).observe($('#canvas-wrap'));
function screenToWorld(e) {const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left-offsetX)/scale,y:(e.clientY-r.top-offsetY)/scale};}
function zoom(amount) {view.zoom=clamp(view.zoom*amount,.6,2.8);updateTransform();}
function pointHit(p) {let index=-1,best=20/scale;track.points.forEach((v,i)=>{const d=dist(p,v);if(d<best){best=d;index=i;}});return index;}
function strokePath(color,width,points=samples,closed=track.complete!==false) {
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
  if(track.points.length<2){strokePath('#a9b19a',2,track.points,false);return;}
  // Road finish and kerb dimensions use the circuit's real-world scale.
  const meters=1/(track.scale||.2);strokePath('#d8d9c7',roadWidth+5*meters);strokePath('#c2c6b2',roadWidth+2.4*meters);
  if(track.export?.kerbs!==false){strokePath('#f0ece0',roadWidth+1.4*meters);ctx.setLineDash([1.5*meters,1.5*meters]);strokePath('#ba5546',roadWidth+1.4*meters);ctx.setLineDash([]);}
  const style=track.asphalt||'fresh';if(!asphaltTextures.has(style))asphaltTextures.set(style,asphaltPattern(ctx,style));
  strokePath('#23272b',roadWidth);strokePath('#e5e4d9',Math.max(.5,roadWidth-.2*meters));strokePath(asphaltTextures.get(style),Math.max(.25,roadWidth-.4*meters));
  if(track.line){ctx.setLineDash([7,9]);strokePath('#aee0a16b',1.6);ctx.setLineDash([]);}
  if(track.complete===false){const a=track.points[0],b=track.points[track.points.length-1];[a,b].forEach((p,i)=>{ctx.fillStyle=i?'#ec7c44':'#4c9d86';ctx.beginPath();ctx.arc(p.x,p.y,6/scale,0,Math.PI*2);ctx.fill();ctx.fillStyle='#38443b';ctx.font=`${10/scale}px sans-serif`;ctx.textAlign='center';ctx.fillText(i?'END':'START',p.x,p.y-14/scale);});return;}
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
function drawBarriers(){
  (track.barriers||[]).forEach((b,index)=>{
    const width=b.width/(track.scale||.2),selected=index===selectedBarrier;
    strokePath('#20262b',width+2/scale,b.points,false);strokePath('#a9adb2',Math.max(width,3/scale),b.points,false);
    if(b.style==='striped'){ctx.setLineDash([3/(track.scale||.2),3/(track.scale||.2)]);strokePath('#b94c3d',Math.max(width,3/scale),b.points,false);ctx.setLineDash([]);}
    if(selected){ctx.setLineDash([5/scale,4/scale]);strokePath('#ee9557',width+6/scale,b.points,false);ctx.setLineDash([]);}
    if(mode==='build')b.points.forEach((p,i)=>{ctx.beginPath();ctx.rect(p.x-4/scale,p.y-4/scale,8/scale,8/scale);ctx.fillStyle=selected?'#ee9557':'#f8f7ed';ctx.fill();ctx.strokeStyle='#56616a';ctx.lineWidth=1/scale;ctx.stroke();});
  });
}
function drawAnalysisOverlay(){
  if(analysisOverlay&&analysisData){
    const rows=analysisData.samples;for(let i=0;i<(analysisData.closed?rows.length:rows.length-1);i++){const a=rows[i],b=rows[(i+1)%rows.length];ctx.strokeStyle=a.kind==='corner'?'#ee9255':a.kind==='straight'?'#5bbc9b':'#c4b870';ctx.lineWidth=2.5/scale;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    for(const c of analysisData.corners){ctx.fillStyle='#faf8ef';ctx.beginPath();ctx.arc(c.x,c.y,11/scale,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#d47a45';ctx.lineWidth=1.5/scale;ctx.stroke();ctx.fillStyle='#8e4b2c';ctx.font=`${9/scale}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('C'+c.number,c.x,c.y);ctx.textBaseline='alphabetic';}
  }
  if(analysisFocus!==null){const p=pointAt(analysisFocus);ctx.beginPath();ctx.arc(p.x,p.y,18/scale,0,Math.PI*2);ctx.strokeStyle='#ed9757';ctx.lineWidth=2/scale;ctx.stroke();}
}
function draw() {
  if(mode==='preview')return;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);ctx.fillStyle='#edece3';ctx.fillRect(0,0,cssW,cssH);
  if(showGrid){const step=40*scale;ctx.fillStyle='#cfd2bf';for(let x=((offsetX%step)+step)%step;x<cssW;x+=step)for(let y=((offsetY%step)+step)%step;y<cssH;y+=step){ctx.beginPath();ctx.arc(x,y,.7,0,Math.PI*2);ctx.fill();}}
  ctx.save();ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);
  if(referenceLayer?.image){ctx.save();ctx.globalAlpha=referenceOpacity;ctx.drawImage(referenceLayer.image,0,0,1000,740);ctx.restore();}else scenery();
  ctx.save();if(referenceLayer?.image&&mode==='build'&&traceOverlay)ctx.globalAlpha=.4;drawTrack();ctx.restore();
  drawBarriers();
  if(track.pit?.length){strokePath('#475b5f',6/(track.scale||.2),track.pit,false);ctx.setLineDash([5,8]);strokePath('#accdd4',1/scale,track.pit,false);ctx.setLineDash([]);if(mode==='build'){track.pit.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4/scale,0,Math.PI*2);ctx.fillStyle='#eff9e8';ctx.fill();ctx.strokeStyle='#4f95a0';ctx.lineWidth=1/scale;ctx.stroke();});}}
  if(measurement.length){ctx.setLineDash([5/scale,4/scale]);strokePath('#f2b767',2/scale,measurement,false);ctx.setLineDash([]);measurement.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,5/scale,0,Math.PI*2);ctx.fillStyle='#f2b767';ctx.fill();});}
  drawHandles();
  drawAnalysisOverlay();
  ctx.restore();
}

canvas.addEventListener('pointerdown',e=>{
  if(mode!=='build')return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);const p=screenToWorld(e),hit=pointHit(p);
  if(tool==='measure'){if(measurement.length>=2)measurement=[];measurement.push(p);if(measurement.length===2){const distance=dist(...measurement);if(distance<5){measurement=[];toast('Measure a line longer than 5 reference pixels.');}else tracerUI.measure(distance);}return;}
  if(tool==='pan'){drag={kind:'pan',x:e.clientX,y:e.clientY,panX:view.panX,panY:view.panY};canvas.style.cursor='grabbing';return;}
  if(tool==='barrier'){
    if(p.x<20||p.x>980||p.y<20||p.y>720){toast('Keep barriers inside the canvas.');return;}
    if(activeBarrier<0&&(track.barriers||[]).length>=40){toast('A circuit supports up to 40 barrier paths.');return;}
    if(activeBarrier>=0&&track.barriers[activeBarrier]?.points.length>=100){toast('Finish this barrier and start a new path.');return;}
    if(activeBarrier>=0&&track.barriers[activeBarrier]?.points.some(v=>dist(v,p)<3)){toast('Place barrier points farther apart.');return;}
    remember();track.barriers||=[];if(activeBarrier<0){activeBarrier=track.barriers.length;track.barriers.push({points:[],height:1.2,width:.4,style:'concrete'});}
    const near=nearest(p),height=pointAt(near.progress).elevation||0;track.barriers[activeBarrier].points.push({x:p.x,y:p.y,elevation:height});selectedBarrier=activeBarrier;selectedPoint=-1;commit();return;
  }
  let barrierHit=null;(track.barriers||[]).forEach((b,bi)=>b.points.forEach((v,pi)=>{if(dist(v,p)<12/scale)barrierHit={barrier:bi,index:pi};}));
  if(barrierHit&&hit<0&&tool==='move'){selectedBarrier=barrierHit.barrier;selectedPoint=-1;drag={kind:'barrier',...barrierHit,before:snapshot(),changed:false};tracerUI.refresh();return;}
  if(barrierHit&&hit<0&&tool==='erase'){remember();const b=track.barriers[barrierHit.barrier];b.points.splice(barrierHit.index,1);if(!b.points.length)track.barriers.splice(barrierHit.barrier,1);selectedBarrier=-1;commit();return;}
  if(tool==='pit'){if(p.x<40||p.x>960||p.y<70||p.y>670){toast('Keep the pit lane inside the boundary.');return;}if((track.pit?.length||0)>=100){toast('Pit lane supports up to 100 points.');return;}remember();track.pit||=[];track.pit.push({x:p.x,y:p.y,elevation:nearest(p).distance<roadWidth?pointAt(nearest(p).progress).elevation||0:0});commit();return;}
  let pitHit=-1;(track.pit||[]).forEach((v,i)=>{if(dist(v,p)<15/scale)pitHit=i;});
  if(hit<0&&pitHit>=0&&tool==='move'){selectedPoint=-1;drag={kind:'pit',index:pitHit,before:snapshot(),changed:false};tracerUI.refresh();return;}
  if(hit<0&&pitHit>=0&&tool==='erase'){remember();track.pit.splice(pitHit,1);commit();return;}
  if(tool==='move' && hit>=0){drag={kind:'point',index:hit,before:snapshot(),changed:false};activePoint=hit;selectedPoint=hit;selectedBarrier=-1;tracerUI.refresh();return;}
  if(tool==='erase' && hit>=0){remember();track.points.splice(hit,1);track.start=0;commit();return;}
  if(tool==='start' && track.points.length>=3){const near=nearest(p);if(near.distance<roadWidth){remember();track.start=near.progress;commit();toast('Start line moved. Follow the arrow to begin a lap.');}else toast('Click on the road to place the start line.');return;}
  if(tool==='draw'){
    if(p.x<40||p.x>960||p.y<70||p.y>670){toast('Place points inside the circuit boundary.');return;}
    if(track.points.length>=150){toast('Maximum of 150 control points reached.');return;}
    if(track.points.some(v=>dist(v,p)<Math.max(2,8/scale))){toast('Place the new point a little farther from existing points.');return;}
    let insert=track.points.length;
    if((track.complete!==false||e.altKey)&&track.points.length>=2){insert=sampleSegments[nearest(p).index]+1;}
    remember();track.points.splice(insert,0,{x:p.x,y:p.y,elevation:0,bank:0});selectedPoint=insert;track.start=0;commit();
  }
});
canvas.addEventListener('pointermove',e=>{
  if(mode!=='build')return;const p=screenToWorld(e);hoverPoint=pointHit(p);
  if(drag?.kind==='pan'){view.panX=drag.panX+e.clientX-drag.x;view.panY=drag.panY+e.clientY-drag.y;updateTransform();return;}
  if(drag?.kind==='point'){const v=track.points[drag.index];v.x=clamp(p.x,40,960);v.y=clamp(p.y,70,670);drag.changed=true;track.preset=null;rebuild();syncUI();}
  else if(drag?.kind==='pit'){const v=track.pit[drag.index];v.x=clamp(p.x,40,960);v.y=clamp(p.y,70,670);drag.changed=true;}
  else if(drag?.kind==='barrier'){const v=track.barriers[drag.barrier].points[drag.index];v.x=clamp(p.x,20,980);v.y=clamp(p.y,20,720);v.elevation=pointAt(nearest(v).progress).elevation||0;drag.changed=true;}
  else if(tool==='move')canvas.style.cursor=hoverPoint>=0?'grab':'default';
});
function finishDrag() {if(['point','pit','barrier'].includes(drag?.kind)&&drag.changed){remember(drag.before);commit();}drag=null;activePoint=-1;if(mode==='build')canvas.style.cursor=tool==='pan'?'grab':tool==='move'?'default':'crosshair';}
canvas.addEventListener('pointerup',finishDrag);canvas.addEventListener('pointercancel',finishDrag);canvas.addEventListener('pointerleave',()=>hoverPoint=-1);
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.08:1/1.08);},{passive:false});
$('#editor-tools').addEventListener('click',e=>{const button=e.target.closest('[data-tool]');if(button)setTool(button.dataset.tool);});
$('#zoom-in').onclick=()=>zoom(1.15);$('#zoom-out').onclick=()=>zoom(1/1.15);$('#zoom-reset').onclick=()=>{view={zoom:1,panX:0,panY:0};updateTransform();};
$('#grid-btn').onclick=()=>{showGrid=!showGrid;$('#grid-btn').setAttribute('aria-pressed',String(showGrid));$('#grid-btn span').textContent=showGrid?'Grid on':'Grid off';};
$('#undo-btn').onclick=undo;$('#redo-btn').onclick=redo;
$('#track-name').addEventListener('focus',()=>$('#track-name').dataset.before=track.name);
$('#track-name').addEventListener('change',()=>{const name=$('#track-name').value.trim()||'Untitled Circuit';if(name!==track.name){const prev=snapshot();prev.name=$('#track-name').dataset.before||track.name;remember(prev);track.name=name;commit();}});
$('#width-range').addEventListener('pointerdown',()=>widthBefore=snapshot());
$('#width-range').addEventListener('input',()=>{if(!widthBefore)widthBefore=snapshot();track.width=Number($('#width-range').value);rebuild();syncUI();});
$('#width-range').addEventListener('change',()=>{remember(widthBefore||snapshot());widthBefore=null;commit();});
$('#smooth-toggle').onchange=()=>{remember();track.smooth=$('#smooth-toggle').checked;track.start=0;commit();};
$('#line-toggle').onchange=()=>{track.line=$('#line-toggle').checked;draftSave();};

let pendingLayout=null;
function changeLayout(action){if(mode==='preview')stopPreview();if(dirty&&track.points.length){pendingLayout=action;$('#confirm-dialog').showModal();}else action();}
function loadPreset(key){remember();track=presetTrack(key);selectedPoint=selectedBarrier=-1;analysisFocus=null;measurement=[];view={zoom:1,panX:0,panY:0};updateTransform();dirty=false;commit();setTool('move');toast(`${presets[key].name} loaded. Make it your own.`);}
$$('[data-preset]').forEach(b=>b.onclick=()=>changeLayout(()=>loadPreset(b.dataset.preset)));
$('#new-btn').onclick=()=>changeLayout(()=>{remember();track={...presetTrack('club'),name:'Untitled Circuit',points:[],complete:false,preset:null,background:track.background,scale:track.scale||.2,scaleSource:track.scaleSource||'manual',scaleVerification:track.scaleVerification||null};selectedPoint=selectedBarrier=-1;analysisFocus=null;dirty=false;view={zoom:1,panX:0,panY:0};updateTransform();commit();setTool('draw');});
$('#confirm-replace').onclick=()=>{$('#confirm-dialog').close();pendingLayout?.();pendingLayout=null;};
$('#confirm-save').onclick=()=>{if(saveCircuit()){$('#confirm-dialog').close();pendingLayout?.();pendingLayout=null;}};
$$('.close-dialog').forEach(b=>b.onclick=()=>b.closest('dialog').close());
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('#help-btn').onclick=()=>{$('#help-dialog').showModal();};
$('#studio-link').onclick=()=>{$('#library-dialog').close();canvas.scrollIntoView({block:'center',behavior:'smooth'});};
function saveCircuit() {
  if(!track.points.length){toast('Add a road point before saving your draft.');return false;}
  if(!track.id)track.id=crypto.randomUUID?crypto.randomUUID():String(Date.now());
  const item={...snapshot(),updatedAt:new Date().toISOString()},index=library.findIndex(t=>t.id===track.id);
  const next=clone(library);if(index<0){if(next.length>=100){toast('Your garage is full. Export or remove a circuit first.');return false;}next.unshift(item);}else next[index]=item;
  if(!writeStorage(STORAGE,next))return false;library=next;dirty=false;draftSave();syncUI();toast('Circuit saved to your garage.');return true;
}
$('#save-btn').onclick=saveCircuit;
function miniSvg(points,closed=true){return `<svg viewBox="0 0 1000 740" aria-hidden="true"><path d="M ${points.map(p=>`${p.x} ${p.y}`).join(' L ')} ${closed?'Z':''}" fill="none" stroke="#9baf87" stroke-width="45" stroke-linejoin="round" stroke-linecap="round"/></svg>`;}
function renderLibrary(){
  const el=$('#library-list');el.replaceChildren();
  if(!library.length){el.innerHTML='<div class="empty-library">Your garage is waiting.<br />Save a circuit from the studio to see it here.</div>';return;}
  library.forEach(item=>{
    const row=document.createElement('div');row.className='library-row';row.innerHTML=miniSvg(item.points,item.complete!==false);
    const desc=document.createElement('div'),title=document.createElement('h3'),detail=document.createElement('p');title.textContent=item.name;detail.textContent=`${item.complete===false?'DRAFT':'COMPLETE'} · ${item.points.length} points · ${item.width} m wide`;desc.append(title,detail);row.append(desc);
    const load=document.createElement('button');load.className='subtle-button';load.textContent='Open ↗';load.onclick=()=>{$('#library-dialog').close();changeLayout(()=>{remember();track=validateTrack(item);dirty=false;commit();setTool('move');view={zoom:1,panX:0,panY:0};updateTransform();toast('Circuit loaded.');});};row.append(load);
    const exportBtn=document.createElement('button');exportBtn.className='icon-button';exportBtn.title='Export circuit';exportBtn.setAttribute('aria-label',`Export ${item.name}`);exportBtn.innerHTML=icon('download');exportBtn.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({format:'apex-circuit',version:1,...item},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`${item.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()||'circuit'}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};row.append(exportBtn);
    const del=document.createElement('button');del.className='icon-button';del.title='Remove saved circuit';del.setAttribute('aria-label',`Remove ${item.name}`);del.innerHTML=icon('trash');del.onclick=()=>{const previous=clone(library),next=library.filter(t=>t.id!==item.id);if(writeStorage(STORAGE,next)){library=next;renderLibrary();syncUI();toast('Circuit removed. Click Undo removal below to restore it.');const restore=document.createElement('button');restore.className='subtle-button';restore.textContent='Undo removal';restore.onclick=()=>{if(writeStorage(STORAGE,previous)){library=previous;renderLibrary();syncUI();}};el.append(restore);}};row.append(del);el.append(row);
  });
}
$('#library-btn').onclick=()=>{renderLibrary();$('#library-dialog').showModal();};
$('#import-btn').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async()=>{
  const file=$('#import-file').files[0];if(!file)return;
  if(file.size>150000){toast('That file is too large. Choose an APEX circuit JSON file.');$('#import-file').value='';return;}
  try{const imported=validateTrack(JSON.parse(await file.text()));if(!imported||!imported.points.length)throw new Error();imported.id=crypto.randomUUID?crypto.randomUUID():String(Date.now());imported.updatedAt=new Date().toISOString();if(library.length>=100){toast('Your garage is full. Remove a circuit before importing.');return;}const next=[imported,...library];if(writeStorage(STORAGE,next)){library=next;renderLibrary();syncUI();toast('Circuit imported. Open it to continue editing.');}}catch{toast('Invalid circuit file. Choose an exported APEX circuit JSON.');}finally{$('#import-file').value='';}
};
$('#fullscreen-btn').onclick=()=>{const expanded=$('.studio').classList.toggle('expanded');$('#fullscreen-btn').setAttribute('aria-label',expanded?'Exit expanded canvas':'Expand canvas');$('#fullscreen-btn').title=expanded?'Exit expanded canvas':'Expand canvas';};
$('#export-current').onclick=()=>{
  if(!track.points.length){toast('Add a point before exporting a draft.');return;}
  const url=URL.createObjectURL(new Blob([JSON.stringify({format:'apex-circuit',version:1,...snapshot()},null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=`${track.name.replace(/[^a-z0-9]+/gi,'-').toLowerCase()||'circuit'}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select')||$$('dialog').some(d=>d.open))return;
  const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();}
  else if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();redo();}
  else if(!(e.ctrlKey||e.metaKey||e.altKey)){const tools={v:'move',p:'draw',e:'erase',s:'start',h:'pan',b:'barrier'};if(tools[k]){e.preventDefault();setTool(tools[k]);}else if(k==='escape')$('.studio').classList.remove('expanded');}
});
function frame(){draw();requestAnimationFrame(frame);}
function stopPreview(){if(mode!=='preview')return;mode='build';$('.studio').classList.remove('preview-active');$('#preview-canvas').hidden=true;canvas.hidden=false;$('#preview-mode').classList.remove('active');$('#build-mode').classList.add('active');$('#canvas-caption').innerHTML='TRACE EDITOR <span>/</span> TOP VIEW';syncUI();resize();setTool(tool);}
function showPreview(){
  if(track.points.length<3||!length){toast('Trace a circuit with at least three points first.');return;}
  try{if(!preview3D)preview3D=new TrackPreview($('#preview-canvas'));if(!preview3D.gl){toast('3D preview needs WebGL. You can still trace and export the track.');return;}mode='preview';$('.studio').classList.add('preview-active');canvas.hidden=true;$('#preview-canvas').hidden=false;$('#preview-mode').classList.add('active');$('#build-mode').classList.remove('active');$('#canvas-caption').innerHTML='GEOMETRY PREVIEW <span>/</span> 3D';$('#canvas-hint span').textContent='Drag to orbit. Scroll to zoom. Inspect road and pit placement.';preview3D.load(track);}
  catch(error){stopPreview();toast('3D preview failed: '+error.message);}
}
referenceLayer=new ReferenceLayer(()=>{},toast);
const editorApi={
  getTrack:()=>track,getSelected:()=>selectedPoint,getBarrier:()=>selectedBarrier,reference:referenceLayer,toast,setTool,preview:showPreview,
  selectBarrier(index){if(mode!=='build')stopPreview();selectedBarrier=index;selectedPoint=-1;setTool('move');tracerUI.refresh();},
  newBarrier(){if(mode==='preview')stopPreview();activeBarrier=-1;selectedBarrier=-1;setTool('barrier');tracerUI.refresh();},
  finishBarrier(){activeBarrier=-1;setTool('move');tracerUI.refresh();},
  setComplete(value){if(mode==='preview')stopPreview();finishDrag();remember();track.complete=value;selectedPoint=selectedBarrier=-1;activeBarrier=-1;measurement=[];commit();setTool('move');toast(value?'Circuit closed. Keep editing or inspect the analysis.':'Road opened. You can extend its ends.');},
  editView(){if(mode==='preview')stopPreview();},
  updateTrack(fn){remember();fn(track);commit();updateTransform();},
  clear(scope){if(mode==='preview')stopPreview();finishDrag();remember();if(scope==='geometry'||scope==='road'){track.points=[];track.complete=false;track.start=0;}if(scope==='geometry'||scope==='pits')track.pit=[];if(scope==='geometry'||scope==='barriers')track.barriers=[];if(scope==='reference'){track.background=null;}selectedPoint=selectedBarrier=-1;activeBarrier=-1;analysisFocus=null;analysisData=null;measurement=[];commit();setTool(track.points.length?'move':'draw');toast('Selected items cleared. Undo restores them.');},
  reverseCircuit(){if(track.points.length<2)return;if(mode==='preview')stopPreview();finishDrag();const start=pointAt(track.start);remember();track.points.reverse();track.points.forEach(p=>p.bank=-(p.bank||0));track.pit.reverse();rebuild();track.start=nearest(start).progress;analysisFocus=null;commit();setTool('move');toast('Direction reversed. Road banking and pit direction updated.');},
  onAnalysis(data){analysisData=data;},getOverlay:()=>analysisOverlay,setOverlay(value){analysisOverlay=value;analysisFocus=null;},
  focusProgress(progress){if(mode==='preview')stopPreview();analysisFocus=progress;const p=pointAt(progress);view.zoom=2.4;const base=Math.min(cssW/1000,cssH/740)*view.zoom;view.panX=(500-p.x)*base;view.panY=(370-p.y)*base;updateTransform();},
  setOpacity(value){referenceOpacity=value;},setTraceOverlay(value){traceOverlay=value;},
  setReference(desc,meters,fresh){const apply=()=>{remember();if(fresh){track={...presetTrack('club'),name:'Traced Circuit',points:[],complete:false,preset:null,background:desc,scale:meters};selectedPoint=selectedBarrier=-1;}else{track.background=desc;track.scale=meters;}track.scaleSource=desc.type==='map'?'map':'manual';track.scaleVerification=null;analysisFocus=null;view={zoom:1,panX:0,panY:0};updateTransform();commit();referenceLayer.ensure(track.background);setTool(fresh?'draw':'move');};fresh?changeLayout(apply):apply();}
};
tracerUI=mountTracer(editorApi);analysisUI=mountAnalysis(editorApi);
$('#build-mode').onclick=stopPreview;
$('#width-range').setAttribute('min','4');$('#width-range').setAttribute('max','30');
rebuild();syncUI();resize();setTool('move');requestAnimationFrame(frame);
