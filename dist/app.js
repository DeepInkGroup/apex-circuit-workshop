import {barrierProperties,pitOuterBarriers,drawBarrier} from './barriers.js?v=20261009-ai-crash-fix';
import {trackFolder,newTrackId,circuitName,synchronizeIdentity} from './mod-identity.js?v=20261009-ai-crash-fix';
import {pitStopPaint} from './pit-stop.js?v=20261009-ai-crash-fix';
import {pitRibbons,pitArrows} from './pit-ribbon.js?v=20261009-ai-crash-fix';
import {idealLine,drawIdealLine} from './ideal-line.js?v=20261009-ai-crash-fix';
import {buildGeometry, pointOnTrack, closestOnTrack} from './engine.js?v=20261009-ai-crash-fix';
import {ReferenceLayer} from './tracing.js?v=20261009-ai-crash-fix';
import {mountTracer} from './tracer-ui.js?v=20261009-ai-crash-fix';
import {TrackPreview} from './preview3d.js?v=20261009-ai-crash-fix';
import {DEFAULT_EXPORT} from './ac-export.js?v=20261009-ai-crash-fix';
import {ASPHALT,asphaltPattern} from './surfaces.js?v=20261009-ai-crash-fix';
import {mountAnalysis} from './analysis-ui.js?v=20261009-ai-crash-fix';
import {buildPitPlan,PIT_STYLES,pitSettings} from './pit-plan.js?v=20261009-ai-crash-fix';
import {WEATHER,TREE_TYPES,simplifyStroke} from './environment.js?v=20261009-ai-crash-fix';
import {treeSettings,treeRadius,drawTree,treeClear,randomTrees} from './trees.js?v=20261009-ai-crash-fix';
import {toGamePoint} from './coordinates.js?v=20261009-ai-crash-fix';
import {buildRoadLayout,drawRoadLayout,fillRoadPolygons} from './road-layout.js?v=20261009-ai-crash-fix';
import {mountDrawStudio} from './studio-ui.js?v=20261009-ai-crash-fix';
import {cornerSettings,reverseTurnBoards} from './corner-settings.js?v=20261009-ai-crash-fix';
import {repairCrossings} from './crossing-repair.js?v=20261009-ai-crash-fix';
import {drawStructures} from './structures.js?v=20261009-ai-crash-fix';
import {mountStructures} from './structure-ui.js?v=20261009-ai-crash-fix';
import {mountCorners} from './corner-ui.js?v=20261009-ai-crash-fix';
import {GRASS,buildingSettings,buildingCorners,buildingContains,buildingsOverlap,buildingRotationHandle,drawBuilding,grassPattern} from './scenery.js?v=20261009-ai-crash-fix';
import {mountScenery} from './scenery-ui.js?v=20261009-ai-crash-fix';
import {mountACSetup} from './ac-setup-ui.js?v=20261009-ai-crash-fix';
import {mountSharing} from './sharing.js?v=20261009-ai-crash-fix';
import {mountWorkspaceNavigation} from './workspace-ui.js?v=20261009-ai-crash-fix';
import {timingSettings,buildTimingPlan} from './timing.js?v=20261009-ai-crash-fix';
import {automaticBarriers,barrierSettings,cutBarrierOpening} from './auto-barriers.js?v=20261009-ai-crash-fix';
import {mountTiming} from './timing-ui.js?v=20261009-ai-crash-fix';
import {mountSurfaces} from './surface-ui.js?v=20261009-ai-crash-fix';
import {surfaceSettings} from './surface-settings.js?v=20261009-ai-crash-fix';
import {gantryPlan,drawGantry} from './gantry.js?v=20261009-ai-crash-fix';
import {turnMarkerPlan,drawTurnMarkers} from './turn-markers.js?v=20261009-ai-crash-fix';
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
// Legacy layouts are kept for old circuit files and existing geometry fixtures.
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
function presetTrack(key) {return {name:presets[key].name,points:presets[key].points.map(([x,y])=>({x,y,elevation:0,bank:0})),width:12,scale:.2,scaleSource:'manual',scaleVerification:null,smooth:true,line:false,start:0,preset:key,id:null,pit:[],pitSettings:{width:6,style:'blue',side:'auto'},barrierSettings:barrierSettings({}),barriers:[],trees:[],buildings:[],grass:'mown',weather:'sunny',complete:true,asphalt:'fresh',details:{description:'',type:'circuit',tags:'',version:'1.0',website:''},background:null,export:{...DEFAULT_EXPORT,trackId:newTrackId(presets[key].name)}};}
function validateTrack(data) {
  if(!data || !Array.isArray(data.points) || data.points.length>150 || data.points.some(p=>!p || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x<0 || p.x>WORLD.w || p.y<0 || p.y>WORLD.h)) return null;
  let background=null;
  if(data.background?.type==='map'&&Number.isFinite(data.background.lat)&&Number.isFinite(data.background.lon)&&Math.abs(data.background.lat)<=85&&Math.abs(data.background.lon)<=180)background={type:'map',lat:data.background.lat,lon:data.background.lon,zoom:clamp(Math.round(Number(data.background.zoom)||18),14,20)};
  else if(data.background?.type==='image'&&typeof data.background.key==='string')background={type:'image',key:data.background.key.slice(0,100),name:String(data.background.name||'Reference image').slice(0,100)};
  const exportOptions={...DEFAULT_EXPORT};
  ['author','country','city'].forEach(k=>{if(typeof data.export?.[k]==='string')exportOptions[k]=data.export[k].slice(0,60);});
  exportOptions.pitboxes=clamp(Math.round(Number(data.export?.pitboxes)||8),1,16);
  ['kerbs','barriers','ai','trees','buildings','grassFx','gantry','distanceMarkers'].forEach(k=>exportOptions[k]=data.export?.[k]!==false);
  for(const [key,min,max] of [['gridSpacing',4,12],['wallHeight',1,4],['gantryClearance',4.5,8]])exportOptions[key]=clamp(Number(data.export?.[key])||DEFAULT_EXPORT[key],min,max);
  Object.assign(exportOptions,surfaceSettings(data.export));
  exportOptions.trackId=trackFolder(data);exportOptions.trackIdName=circuitName(data.name);exportOptions.trackIdMode=data.export?.trackIdMode==='manual'?'manual':'auto';exportOptions.idealLine=data.export?.idealLine===true;exportOptions.distanceBoardStyle=data.export?.distanceBoardStyle==='contrast'?'contrast':'classic';exportOptions.distanceBoardSize=data.export?.distanceBoardSize==='large'?'large':'standard';exportOptions.distanceBoardSetback=clamp(Number(data.export?.distanceBoardSetback)||1.8,1,8);
  const buildings=Array.isArray(data.buildings)?data.buildings.filter(b=>b&&Number.isFinite(b.x)&&Number.isFinite(b.y)).slice(0,60).map(b=>({x:clamp(b.x,0,1000),y:clamp(b.y,0,740),...buildingSettings(b)})):[];
  const pit=Array.isArray(data.pit)?data.pit.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1000&&p.y>=0&&p.y<=740).slice(0,100).map(p=>({x:p.x,y:p.y,elevation:clamp(Number(p.elevation)||0,-100,500)})):[];
  const barriers=Array.isArray(data.barriers)?data.barriers.slice(0,40).filter(b=>b&&Array.isArray(b.points)).map(b=>({points:b.points.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(0,100).map(p=>({x:clamp(p.x,0,1000),y:clamp(p.y,0,740),elevation:clamp(Number(p.elevation)||0,-100,500)})),...barrierProperties(b),automatic:b.automatic===true})).filter(b=>b.points.length):[];
  const details={description:String(data.details?.description||'').slice(0,1500),type:['circuit','kart','test'].includes(data.details?.type)?data.details.type:'circuit',tags:String(data.details?.tags||'').slice(0,200),version:String(data.details?.version||'1.0').slice(0,20),website:/^https?:\/\//i.test(data.details?.website||'')?String(data.details.website).slice(0,200):''};
  const scaleSource=['map','calibrated','manual'].includes(data.scaleSource)?data.scaleSource:background?.type==='map'?'map':'manual',scaleVerification=Number.isFinite(data.scaleVerification?.distanceMeters)&&Number.isFinite(data.scaleVerification?.referencePixels)&&data.scaleVerification.distanceMeters>0&&data.scaleVerification.referencePixels>0?{distanceMeters:data.scaleVerification.distanceMeters,referencePixels:data.scaleVerification.referencePixels}:null;
  const trees=Array.isArray(data.trees)?data.trees.filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)).slice(0,300).map(p=>({x:clamp(p.x,0,1000),y:clamp(p.y,0,740),...treeSettings(p)})):[];
  return {name:circuitName(data.name),points:data.points.map(p=>({x:p.x,y:p.y,elevation:clamp(Number(p.elevation)||0,-100,500),bank:clamp(Number(p.bank)||0,-15,15),...cornerSettings(p)})),generator:data.generator&&typeof data.generator.seed==='string'?{seed:data.generator.seed.slice(0,32),style:['flowing','technical','fast'].includes(data.generator.style)?data.generator.style:'flowing',complexity:clamp(Number(data.generator.complexity)||12,8,24),length:clamp(Number(data.generator.length)||900,300,5000)}:null,width:clamp(Number(data.width)||12,4,30),scale:clamp(Number(data.scale)||.2,.02,10),scaleSource,scaleVerification,smooth:data.smooth!==false,line:!!data.line,start:Number.isFinite(data.start)?((data.start%1)+1)%1:0,preset:['club','technical','speedway'].includes(data.preset)?data.preset:null,id:typeof data.id==='string'?data.id:null,pit,pitSettings:pitSettings(data),timing:timingSettings(data),barrierSettings:barrierSettings(data),barriers,trees,buildings,grass:GRASS[data.grass]?data.grass:'mown',weather:WEATHER[data.weather]?data.weather:'sunny',details,complete:data.complete!==false&&data.points.length>=3,asphalt:ASPHALT[data.asphalt]?data.asphalt:'fresh',background,export:exportOptions};
}
function emptyTrack(){return {...presetTrack('club'),name:'Untitled Circuit',points:[],preset:null,complete:false,export:{...DEFAULT_EXPORT,trackId:newTrackId('Untitled Circuit')}};}
const recoveredDraft=validateTrack(readStorage(DRAFT,null));
let track=recoveredDraft || emptyTrack();
let library=readStorage(STORAGE,[]);
if(!Array.isArray(library))library=[];
library=library.map(t=>{const validated=validateTrack(t);return validated?{...validated,updatedAt:t.updatedAt}:null;}).filter(t=>t&&t.points.length>=1).slice(0,100);
let undoStack=[], redoStack=[], tool='move', mode='build', dirty=!!recoveredDraft && !library.some(t=>JSON.stringify(validateTrack(t))===JSON.stringify(track));
let samples=[], sampleSegments=[], cumulative=[], length=0, roadWidth=track.width*5, activePoint=-1, hoverPoint=-1;
let showGrid=true, view={zoom:1,panX:0,panY:0}, drag=null, widthBefore=null;
let cssW=0,cssH=0,dpr=1,scale=1,offsetX=0,offsetY=0;
const selectedPoints=new Set();
const selectedPointIndices=()=>track.points.map((p,i)=>selectedPoints.has(p)?i:-1).filter(i=>i>=0);
function settleSelection(){for(const p of selectedPoints)if(!track.points.includes(p))selectedPoints.delete(p);if(selectedPoint<0||!track.points[selectedPoint]){selectedPoints.clear();selectedPoint=-1;}else if(!selectedPoints.has(track.points[selectedPoint])){selectedPoints.clear();selectedPoints.add(track.points[selectedPoint]);}}
let selectedPoint=-1,tracerUI=null,analysisUI=null,studioUI=null,cornerUI=null,referenceLayer=null,preview3D=null,referenceOpacity=.75,traceOverlay=true,measurement=[];
let sceneryUI=null,acSetupUI=null,surfaceUI=null,timingUI=null,shareUI=null,workspaceUI=null,structureUI=null,selectedBuilding=-1,buildingBrush=buildingSettings();
let selectedTree=-1,treeBrush={height:8,type:'broadleaf'},cursorPoint=null,snapEnabled=false,snapMeters=5;
let selectedBarrier=-1,activeBarrier=-1;const asphaltTextures=new Map();
const canvas=$('#track-canvas'),ctx=canvas.getContext('2d');
let geometry=buildGeometry(track.points,track.smooth,track.complete!==false,track);
let pitLayout=buildPitPlan(track);
let roadLayout=buildRoadLayout(track,geometry,pitLayout);
let idealGuide=track.export?.idealLine?idealLine(track,roadLayout):[];
let pitRibbonLayout=pitRibbons(pitLayout);
let timingLayout=buildTimingPlan(track,geometry,roadLayout);
let gantryLayout=gantryPlan(track,timingLayout,pitLayout);
let pitWalls=pitOuterBarriers(track,pitLayout,geometry,gantryLayout);
let turnMarkers=turnMarkerPlan(track,geometry,pitLayout,pitWalls);
let analysisOverlay=false,analysisData=null,analysisFocus=null;

function toast(message) {const el=$('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3200);}
function snapshot() { return clone(track); }
function remember(previous=snapshot()) {undoStack.push(previous);if(undoStack.length>70)undoStack.shift();redoStack=[];dirty=true;track.preset=null;updateUndo();}
function updateUndo() {$('#undo-btn').disabled=!undoStack.length;$('#redo-btn').disabled=!redoStack.length;}
function draftSave() {if(storageAvailable)writeStorage(DRAFT,track);}
function syncCircuitIdentity(previousName){
  synchronizeIdentity(track,previousName);
  const index=track.id?library.findIndex(item=>item.id===track.id):-1,item=library[index];
  if(item&&(item.name!==track.name||trackFolder(item)!==track.export.trackId)){
    const next=clone(library);next[index]={...item,name:track.name,export:{...item.export,trackId:track.export.trackId,trackIdName:track.name,trackIdMode:track.export.trackIdMode}};
    if(writeStorage(STORAGE,next)){library=next;if($('#library-dialog').open)renderLibrary();}
  }
}
function commit(previousName) { syncCircuitIdentity(previousName);settleSelection();if(track.points.length<3)track.complete=false;if(!track.barriers?.[selectedBarrier])selectedBarrier=-1;if(!track.barriers?.[activeBarrier])activeBarrier=-1;if(!track.points[selectedPoint])selectedPoint=-1;if(!track.trees?.[selectedTree])selectedTree=-1;if(!track.buildings?.[selectedBuilding])selectedBuilding=-1;rebuild();syncUI();draftSave();if(mode==='preview')preview3D?.load(track); }
function undo() {if(!undoStack.length)return;redoStack.push(snapshot());track=undoStack.pop();dirty=true;commit();}
function redo() {if(!redoStack.length)return;undoStack.push(snapshot());track=redoStack.pop();dirty=true;commit();}
function rebuild() {
  geometry=buildGeometry(track.points,track.smooth,track.complete!==false,track);
  samples=geometry.samples;sampleSegments=geometry.segments;cumulative=geometry.cumulative;length=geometry.length;
  roadWidth=track.width/(track.scale||.2);
  pitLayout=buildPitPlan(track);
  roadLayout=buildRoadLayout(track,geometry,pitLayout);
  idealGuide=track.export?.idealLine?idealLine(track,roadLayout):[];pitRibbonLayout=pitRibbons(pitLayout);
  timingLayout=buildTimingPlan(track,geometry,roadLayout);
  gantryLayout=gantryPlan(track,timingLayout,pitLayout);
  pitWalls=pitOuterBarriers(track,pitLayout,geometry,gantryLayout);
  turnMarkers=turnMarkerPlan(track,geometry,pitLayout,pitWalls);
}
const pointAt = fraction => pointOnTrack(geometry,fraction);
const nearest = p => closestOnTrack(geometry,p);
function syncUI() {
  settleSelection();
  document.title=track.name+' · APEX Circuit Workshop';
  $('#track-name').value=track.name;$('#length-stat').innerHTML=`${(length*(track.scale||.2)/1000).toFixed(2)} <small>km</small>`;
  $('#points-stat').textContent=track.points.length;$('#width-range').value=track.width;$('#width-value').textContent=`${track.width} m`;
  $('#width-range').min=4;$('#width-range').max=30;$('#width-range').value=track.width;
  $('#width-range').style.background=`linear-gradient(to right,var(--orange) ${(track.width-4)/26*100}%,#e3e5db ${(track.width-4)/26*100}%)`;
  $('#smooth-toggle').checked=track.smooth;$('#line-toggle').checked=track.line;
  $('#saved-count').textContent=library.length;
  $$('.preset').forEach(b=>b.classList.toggle('active',b.dataset.preset===track.preset));
  $('#editor-status').textContent=(track.complete!==false?'Closed circuit · Editable':'Open road · Editable')+(selectedPoints.size>1?` · ${selectedPoints.size} road points selected`:'');
  $('#layout-label').textContent=track.preset?'LAYOUT '+({club:'01',technical:'02',speedway:'03'}[track.preset]):'CUSTOM LAYOUT';
  const cutaway=$('#preview-tunnel-cutaway');if(cutaway){cutaway.disabled=!geometry.structureProfile?.ranges.some(r=>r.type==='tunnel');cutaway.setAttribute('aria-pressed',String(mode==='preview'&&!!preview3D?.cutaway));}
  updateUndo();tracerUI?.refresh();analysisUI?.refresh();studioUI?.refresh();cornerUI?.refresh();structureUI?.refresh();sceneryUI?.refresh();acSetupUI?.refresh();surfaceUI?.refresh();timingUI?.refresh();shareUI?.refresh();workspaceUI?.refresh();
  if(referenceLayer && referenceLayer.currentKey!==referenceLayer.key(track.background))referenceLayer.ensure(track.background);
}
function setTool(value) {if(mode==='preview')stopPreview();if(value==='measure')measurement=[];if(value!=='barrier')activeBarrier=-1;tool=value;$$('[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===value));canvas.style.cursor=value==='pan'?'grab':value==='move'?'default':'crosshair';$('#canvas-hint span').textContent=({move:'Shift-click road points to select several; release Shift and drag to move them together.',draw:track.complete!==false?'Click to insert a point. Shift snaps to the grid.':'Click road points. Click START to close the circuit.',sketch:'Drag to sketch a road section. Release to create editable points.',erase:'Click a road, pit, barrier, or tree to remove it.',start:'Click the road to place your start line.',pan:'Drag to move your canvas.',measure:'Click two reference points to calibrate the scale.',pit:'Click a pit route. Parking bays are fitted automatically.',barrier:'Click to draw a barrier path. Finish barrier ends this path.',building:'Click clear ground to place a building. Use Move to edit it.',tree:'Click beside the circuit to plant a tree.'})[value];studioUI?.refresh();cornerUI?.refresh();}
function updateTransform() {
  scale=Math.min(cssW/WORLD.w,cssH/WORLD.h)*view.zoom;
  offsetX=(cssW-WORLD.w*scale)/2+view.panX;offsetY=(cssH-WORLD.h*scale)/2+view.panY;
  $('#zoom-reset').textContent=`${Math.round(view.zoom*100)}%`;
  $('.scale-label').innerHTML=`${Math.round(40/scale*(track.scale||.2))} m <span>╞════╡</span>`;
}
function resize() {const r=canvas.getBoundingClientRect();cssW=r.width;cssH=r.height;dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);updateTransform();}
new ResizeObserver(resize).observe($('#canvas-wrap'));
function screenToWorld(e,snap=true) {const r=canvas.getBoundingClientRect(),p={x:(e.clientX-r.left-offsetX)/scale,y:(e.clientY-r.top-offsetY)/scale};if(snap&&(snapEnabled||(e.shiftKey&&tool!=='move'))&&!['pan','measure'].includes(tool)){const step=snapMeters/(track.scale||.2);p.x=Math.round(p.x/step)*step;p.y=Math.round(p.y/step)*step;}return p;}
function zoom(amount) {view.zoom=clamp(view.zoom*amount,.18,8);updateTransform();}
function fitView(){
  if(mode==='preview')stopPreview();const points=[...track.points,...(track.pit||[]),...(track.barriers||[]).flatMap(b=>b.points),...(track.trees||[]),...(track.buildings||[]).flatMap(b=>buildingCorners(b,track.scale))];if(track.points.length>=2)points.push(...pitLayout.path,...pitLayout.entryConnection,...pitLayout.exitConnection,...pitLayout.bays.flatMap(b=>b.corners),...pitWalls.flatMap(b=>b.points),...turnMarkers.markers);if(gantryLayout)points.push(...gantryLayout.supports);if(!points.length){view={zoom:1,panX:0,panY:0};updateTransform();return;}
  const pad=45/(Math.min(cssW/1000,cssH/740)||1),minX=Math.min(...points.map(p=>p.x))-pad,maxX=Math.max(...points.map(p=>p.x))+pad,minY=Math.min(...points.map(p=>p.y))-pad,maxY=Math.max(...points.map(p=>p.y))+pad,base=Math.min(cssW/1000,cssH/740);
  view.zoom=clamp(Math.min(cssW/(maxX-minX),cssH/(maxY-minY))/base,.18,5);view.panX=(500-(minX+maxX)/2)*base*view.zoom;view.panY=(370-(minY+maxY)/2)*base*view.zoom;updateTransform();
}
function pointHit(p) {let index=-1,best=20/scale;track.points.forEach((v,i)=>{const d=dist(p,v);if(d<best){best=d;index=i;}});return index;}
function strokePath(color,width,points=samples,closed=track.complete!==false) {
  if(!points.length)return;ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);if(closed)ctx.closePath();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
}
function scenery() {
  ctx.fillStyle=grassPattern(ctx,track.grass);ctx.fillRect(-2000,-2000,5000,5000);
  ctx.strokeStyle='#d6dbca';ctx.lineWidth=1;ctx.setLineDash([3,5]);ctx.strokeRect(66,68,870,604);ctx.setLineDash([]);
  ctx.fillStyle='#a4ac94';ctx.font='8px "DM Sans",sans-serif';ctx.textAlign='left';ctx.fillText('APEX / YOUR PROVING GROUND',80,690);ctx.textAlign='right';ctx.fillText('EST. 2026',924,690);
}
function drawTrack() {
  if(track.points.length<2){strokePath('#a9b19a',2,track.points,false);return;}
  // Road finish and kerb dimensions use the circuit's real-world scale.
  const meters=1/(track.scale||.2);strokePath('#d8d9c7',roadWidth+5*meters);strokePath('#c2c6b2',roadWidth+2.4*meters);
  const style=track.asphalt||'fresh';if(!asphaltTextures.has(style))asphaltTextures.set(style,asphaltPattern(ctx,style));
  drawRoadLayout(ctx,roadLayout,asphaltTextures.get(style),track.export?.kerbs!==false);
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
  drawStructures(ctx,track,geometry,scale,selectedPoint);
  drawGantry(ctx,gantryLayout,scale);
  drawTurnMarkers(ctx,turnMarkers,track.scale,scale);
  if(track.complete!==false)for(const gate of timingLayout.gates.filter(g=>g.id)){
    ctx.strokeStyle='#79d8cd';ctx.lineWidth=1.6/scale;ctx.setLineDash([5/scale,4/scale]);ctx.beginPath();ctx.moveTo(gate.left.x,gate.left.y);ctx.lineTo(gate.right.x,gate.right.y);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#244d49';ctx.font=`bold ${10/scale}px sans-serif`;ctx.textAlign='center';ctx.fillText(gate.label,gate.left.x,gate.left.y-8/scale);
  }
  const rad=5/scale;
  track.points.forEach((p,i)=>{
    ctx.beginPath();ctx.arc(p.x,p.y,(i===hoverPoint||i===activePoint||selectedPoints.has(p)?7:5)/scale,0,Math.PI*2);ctx.fillStyle=selectedPoints.has(p)?'#ec7c44':i===hoverPoint&&tool==='erase'?'#d44235':'#f6f2dc';ctx.fill();ctx.lineWidth=1.5/scale;ctx.strokeStyle='#dc7952';ctx.stroke();
    ctx.beginPath();ctx.arc(p.x,p.y,1.7/scale,0,Math.PI*2);ctx.fillStyle='#d8764e';ctx.fill();
    if(i===hoverPoint){ctx.fillStyle='#59654a';ctx.font=`${9/scale}px "DM Sans",sans-serif`;ctx.textAlign='center';ctx.fillText(String(i+1).padStart(2,'0'),p.x,p.y-rad-10/scale);}
  });
  if(!track.points.length){ctx.fillStyle='#8c977f';ctx.textAlign='center';ctx.font='29px "Barlow Condensed",sans-serif';ctx.fillText('Every circuit starts with a point.',500,350);ctx.font='12px "DM Sans",sans-serif';ctx.fillText('Click the canvas to start drawing. Add at least 3 points.',500,384);}
}
function drawBarriers(){
  pitWalls.forEach(b=>drawBarrier(ctx,b,track.scale||.2,scale));
  (track.barriers||[]).forEach((b,index)=>{
    const width=b.width/(track.scale||.2),selected=index===selectedBarrier;
    drawBarrier(ctx,b,track.scale||.2,scale);
    if(selected){ctx.setLineDash([5/scale,4/scale]);strokePath('#ee9557',width+6/scale,b.points,false);ctx.setLineDash([]);}
    if(mode==='build')b.points.forEach((p,i)=>{ctx.beginPath();ctx.rect(p.x-4/scale,p.y-4/scale,8/scale,8/scale);ctx.fillStyle=selected?'#ee9557':'#f8f7ed';ctx.fill();ctx.strokeStyle='#56616a';ctx.lineWidth=1/scale;ctx.stroke();});
  });
}
function drawTrees(){
  (track.trees||[]).forEach((tree,i)=>drawTree(ctx,tree,track.scale,i===selectedTree,scale));
}
function drawPitLane(){
  if(track.points.length<2&&track.pit.length<2)return;const plan=pitLayout,meter=1/(track.scale||.2),style=PIT_STYLES[plan.settings.style],color=`rgb(${style.color.join(',')})`;
  const ribbons=pitRibbonLayout;fillRoadPolygons(ctx,ribbons.map(r=>r.corners),color);fillRoadPolygons(ctx,ribbons.flatMap(r=>r.paint),'#fff7da');
  fillRoadPolygons(ctx,pitArrows(plan),style.line);
  ctx.setLineDash([3*meter,2*meter]);strokePath(style.line,.12*meter,plan.path,false);ctx.setLineDash([]);
  fillRoadPolygons(ctx,plan.apron,'#929e92');fillRoadPolygons(ctx,pitStopPaint(plan),'#ead183');
  plan.bays.forEach(b=>{ctx.beginPath();b.corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle='#aeb6ac';ctx.globalAlpha=.25;ctx.fill();ctx.globalAlpha=1;ctx.save();ctx.translate(b.center.x,b.center.y);ctx.rotate(b.center.angle);ctx.fillStyle='#334d52';ctx.font=`bold ${Math.min(2*meter,16/scale)}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(b.center.number),0,0);ctx.restore();});
  for(const [text,p] of [['PIT ENTRY',plan.entry],['PIT EXIT',plan.exit]]){if(!p)continue;ctx.fillStyle='#315868';ctx.font=`bold ${9/scale}px sans-serif`;ctx.textAlign='center';ctx.fillText(text,p.x,p.y-9/scale);}
  track.pit.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,5/scale,0,Math.PI*2);ctx.fillStyle='#edf9f6';ctx.fill();ctx.strokeStyle='#43889c';ctx.lineWidth=1.5/scale;ctx.stroke();});
}
function drawPlacement(){
  if(drag?.kind==='sketch'){strokePath('#ea9256',2/scale,drag.points,false);return;}
  if(cursorPoint&&tool==='building'){ctx.save();ctx.globalAlpha=.65;drawBuilding(ctx,{...cursorPoint,...buildingBrush},track.scale,true,scale);ctx.restore();return;}
  if(!cursorPoint||!['draw','tree','pit'].includes(tool))return;const p=cursorPoint;
  if(tool==='draw'&&track.points.length){ctx.setLineDash([5/scale,4/scale]);if(track.complete!==false){const i=sampleSegments[nearest(p).index]||0;strokePath('#da9569',1.4/scale,[track.points[i],p,track.points[(i+1)%track.points.length]],false);}else strokePath('#da9569',1.4/scale,[track.points[track.points.length-1],p],false);ctx.setLineDash([]);}
  ctx.beginPath();ctx.arc(p.x,p.y,tool==='tree'?treeRadius(treeBrush)/(track.scale||.2):4/scale,0,Math.PI*2);ctx.fillStyle=tool==='tree'?'#5d966c33':'#ef9d5e44';ctx.fill();ctx.strokeStyle=tool==='tree'?'#589065':'#db8955';ctx.lineWidth=1/scale;ctx.stroke();
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
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,cssW,cssH);ctx.fillStyle=(WEATHER[track.weather]||WEATHER.sunny).ground;ctx.fillRect(0,0,cssW,cssH);
  ctx.save();ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);
  scenery();if(referenceLayer?.image){ctx.save();ctx.globalAlpha=referenceOpacity;ctx.drawImage(referenceLayer.image,0,0,1000,740);ctx.restore();}
  if(showGrid){let step=snapEnabled?snapMeters/(track.scale||.2):40;while(step*scale<8)step*=2;ctx.fillStyle=referenceLayer?.image?'#f6f9eb80':'#9bad9460';const left=-offsetX/scale,top=-offsetY/scale;for(let x=Math.ceil(left/step)*step;x<(cssW-offsetX)/scale;x+=step)for(let y=Math.ceil(top/step)*step;y<(cssH-offsetY)/scale;y+=step){ctx.beginPath();ctx.arc(x,y,.75/scale,0,Math.PI*2);ctx.fill();}}
  ctx.save();if(referenceLayer?.image&&mode==='build'&&traceOverlay)ctx.globalAlpha=.4;drawTrack();ctx.restore();
  drawBarriers();
  drawPitLane();if(track.export?.idealLine)drawIdealLine(ctx,idealGuide,track.scale,scale,track.complete!==false);(track.buildings||[]).forEach((b,i)=>drawBuilding(ctx,b,track.scale,i===selectedBuilding,scale));drawTrees();drawPlacement();
  if(measurement.length){ctx.setLineDash([5/scale,4/scale]);strokePath('#f2b767',2/scale,measurement,false);ctx.setLineDash([]);measurement.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,5/scale,0,Math.PI*2);ctx.fillStyle='#f2b767';ctx.fill();});}
  drawHandles();
  drawAnalysisOverlay();
  ctx.restore();
}

function buildingClear(b){if(gantryLayout?.supports.some(p=>buildingContains(b,p,track.scale,1)))return false;const corners=buildingCorners(b,track.scale);if(corners.some(p=>p.x<0||p.x>1000||p.y<0||p.y>740))return false;const pad=track.width/2+1;if(samples.some(p=>buildingContains(b,p,track.scale,pad)))return false;const pitPoints=[...pitLayout.path,...pitLayout.parkingPath,...pitLayout.connector,...pitLayout.exitConnector,...pitLayout.entryConnection,...pitLayout.exitConnection,...pitLayout.bays.flatMap(v=>v.corners)];if(pitPoints.some(p=>buildingContains(b,p,track.scale,pitLayout.settings.width/2+1)))return false;if((track.trees||[]).some(p=>buildingContains(b,p,track.scale,treeRadius(p))))return false;if((track.barriers||[]).some(v=>v.points.some(p=>buildingContains(b,p,track.scale,v.width/2+1))))return false;return !(track.buildings||[]).some(v=>buildingsOverlap(b,v,track.scale));}
function canPlantTree(p){
  return treeClear({...treeBrush,...p},track,geometry,pitLayout,track.trees||[],gantryLayout);
}
canvas.addEventListener('pointerdown',e=>{
  if(mode!=='build')return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);const p=screenToWorld(e),hit=pointHit(screenToWorld(e,false));
  if(tool==='measure'){if(measurement.length>=2)measurement=[];measurement.push(p);if(measurement.length===2){const distance=dist(...measurement);if(distance<5){measurement=[];toast('Measure a line longer than 5 reference pixels.');}else tracerUI.measure(distance);}return;}
  if(tool==='move'&&e.shiftKey&&hit>=0){
    const point=track.points[hit];if(selectedPoint>=0&&!selectedPoints.size)selectedPoints.add(track.points[selectedPoint]);
    if(selectedPoints.has(point)){selectedPoints.delete(point);selectedPoint=selectedPointIndices().at(-1)??-1;}else{selectedPoints.add(point);selectedPoint=hit;}
    selectedBarrier=selectedTree=selectedBuilding=-1;syncUI();return;
  }
  if(tool==='pan'){drag={kind:'pan',x:e.clientX,y:e.clientY,panX:view.panX,panY:view.panY};canvas.style.cursor='grabbing';return;}
  if(tool==='sketch'){drag={kind:'sketch',before:snapshot(),points:[p],insert:track.complete!==false&&track.points.length>=2?sampleSegments[nearest(p).index]+1:track.points.length};return;}
  if(tool==='building'){const b={...p,...buildingBrush};if((track.buildings||[]).length>=60){toast('Maximum of 60 buildings reached.');return;}if(!buildingClear(b)){toast('Place the entire building on clear ground, away from road, pits, trees, and buildings.');return;}remember();track.buildings||=[];track.buildings.push(b);selectedBuilding=track.buildings.length-1;selectedPoint=selectedBarrier=selectedTree=-1;commit();return;}
  const rotated=track.buildings?.[selectedBuilding];if(tool==='move'&&rotated&&dist(p,buildingRotationHandle(rotated,track.scale,scale))<12/scale){drag={kind:'buildingRotate',index:selectedBuilding,startAngle:Math.atan2(p.y-rotated.y,p.x-rotated.x),rotation:rotated.rotation,before:snapshot(),changed:false};return;}
  let buildingHit=-1;(track.buildings||[]).forEach((b,i)=>{if(buildingContains(b,p,track.scale))buildingHit=i;});
  if(buildingHit>=0&&hit<0&&tool==='move'){const b=track.buildings[buildingHit];selectedBuilding=buildingHit;selectedTree=selectedPoint=selectedBarrier=-1;drag={kind:'building',index:buildingHit,offset:{x:p.x-b.x,y:p.y-b.y},before:snapshot(),changed:false};syncUI();return;}
  if(buildingHit>=0&&hit<0&&tool==='erase'){remember();track.buildings.splice(buildingHit,1);selectedBuilding=-1;commit();return;}
  selectedBuilding=-1;
  if(tool==='tree'){
    if(p.x<20||p.x>980||p.y<20||p.y>720){toast('Plant trees inside the drawing area.');return;}
    if((track.trees||[]).length>=300){toast('Maximum of 300 trees reached.');return;}
    if(!canPlantTree(p)){toast('Leave space between trees, the road, and the pit lane.');return;}
    remember();track.trees||=[];track.trees.push({...p,...treeBrush});selectedTree=track.trees.length-1;selectedPoint=selectedBarrier=-1;commit();return;
  }
  let treeHit=-1;(track.trees||[]).forEach((v,i)=>{if(dist(v,p)<Math.max(12/scale,treeRadius(v)/(track.scale||.2)))treeHit=i;});
  if(treeHit>=0&&hit<0&&tool==='move'){selectedTree=treeHit;selectedPoint=selectedBarrier=-1;drag={kind:'tree',index:treeHit,before:snapshot(),changed:false};syncUI();return;}
  if(treeHit>=0&&hit<0&&tool==='erase'){remember();track.trees.splice(treeHit,1);selectedTree=-1;commit();return;}
  selectedTree=-1;
  if(tool==='barrier'){
    if(p.x<20||p.x>980||p.y<20||p.y>720){toast('Keep barriers inside the canvas.');return;}
    if(activeBarrier<0&&(track.barriers||[]).length>=40){toast('A circuit supports up to 40 barrier paths.');return;}
    if(activeBarrier>=0&&track.barriers[activeBarrier]?.points.length>=100){toast('Finish this barrier and start a new path.');return;}
    if(activeBarrier>=0&&track.barriers[activeBarrier]?.points.some(v=>dist(v,p)<3)){toast('Place barrier points farther apart.');return;}
    remember();track.barriers||=[];if(activeBarrier<0){activeBarrier=track.barriers.length;track.barriers.push({points:[],...barrierProperties({type:$('#new-barrier-type').value,style:$('#auto-barrier-style').value})});}
    const near=nearest(p),height=pointAt(near.progress).elevation||0;track.barriers[activeBarrier].points.push({x:p.x,y:p.y,elevation:height});selectedBarrier=activeBarrier;selectedPoint=-1;commit();return;
  }
  let barrierHit=null;(track.barriers||[]).forEach((b,bi)=>b.points.forEach((v,pi)=>{if(dist(v,p)<12/scale)barrierHit={barrier:bi,index:pi};}));
  if(barrierHit&&hit<0&&tool==='move'){selectedBarrier=barrierHit.barrier;selectedPoint=-1;drag={kind:'barrier',...barrierHit,before:snapshot(),changed:false};tracerUI.refresh();studioUI?.refresh();cornerUI?.refresh();return;}
  if(barrierHit&&hit<0&&tool==='erase'){remember();const b=track.barriers[barrierHit.barrier];b.points.splice(barrierHit.index,1);if(!b.points.length)track.barriers.splice(barrierHit.barrier,1);selectedBarrier=-1;commit();return;}
  if(tool==='pit'){if(p.x<40||p.x>960||p.y<70||p.y>670){toast('Keep the pit lane inside the boundary.');return;}if((track.pit?.length||0)>=100){toast('Pit lane supports up to 100 points.');return;}remember();track.pit||=[];track.pit.push({x:p.x,y:p.y,elevation:nearest(p).distance<roadWidth?pointAt(nearest(p).progress).elevation||0:0});commit();return;}
  let pitHit=-1;(track.pit||[]).forEach((v,i)=>{if(dist(v,p)<15/scale)pitHit=i;});
  if(hit<0&&pitHit>=0&&tool==='move'){selectedPoint=-1;drag={kind:'pit',index:pitHit,before:snapshot(),changed:false};tracerUI.refresh();studioUI?.refresh();cornerUI?.refresh();return;}
  if(hit<0&&pitHit>=0&&tool==='erase'){remember();track.pit.splice(pitHit,1);commit();return;}
  if(tool==='move' && hit>=0){if(!selectedPoints.has(track.points[hit])){selectedPoints.clear();selectedPoints.add(track.points[hit]);}selectedPoint=hit;drag={kind:'point',index:hit,start:screenToWorld(e,false),origins:selectedPointIndices().map(index=>({index,x:track.points[index].x,y:track.points[index].y})),before:snapshot(),changed:false};activePoint=hit;selectedBarrier=-1;syncUI();return;}
  if(tool==='move'&&hit<0){selectedPoint=-1;selectedPoints.clear();syncUI();return;}
  if(tool==='erase' && hit>=0){remember();track.points.splice(hit,1);selectedPoints.clear();selectedPoint=-1;track.start=0;commit();return;}
  if(tool==='start' && track.points.length>=3){const near=nearest(p);if(near.distance<roadWidth){remember();track.start=near.progress;commit();toast('Start line moved. Follow the arrow to begin a lap.');}else toast('Click on the road to place the start line.');return;}
  if(tool==='draw'){
    if(track.complete===false&&track.points.length>=3&&hit===0){editorApi.setComplete(true);return;}
    if(p.x<40||p.x>960||p.y<70||p.y>670){toast('Place points inside the circuit boundary.');return;}
    if(track.points.length>=150){toast('Maximum of 150 control points reached.');return;}
    if(track.points.some(v=>dist(v,p)<Math.max(2,8/scale))){toast('Place the new point a little farther from existing points.');return;}
    let insert=track.points.length;
    if((track.complete!==false||e.altKey)&&track.points.length>=2){insert=sampleSegments[nearest(p).index]+1;}
    remember();track.points.splice(insert,0,{x:p.x,y:p.y,elevation:0,bank:0});selectedPoint=insert;track.start=0;commit();
  }
});
canvas.addEventListener('pointermove',e=>{
  if(mode!=='build')return;const p=screenToWorld(e);cursorPoint=p;hoverPoint=pointHit(p);const coordinates=$('#cursor-coordinates'),game=toGamePoint(p,track);if(coordinates)coordinates.textContent=`X ${game[0].toFixed(1)} m / Z ${game[2].toFixed(1)} m`;
  if(drag?.kind==='sketch'){if(drag.points.length<1200&&dist(p,drag.points[drag.points.length-1])>5/scale)drag.points.push(p);return;}
  if(drag?.kind==='pan'){view.panX=drag.panX+e.clientX-drag.x;view.panY=drag.panY+e.clientY-drag.y;updateTransform();return;}
  if(drag?.kind==='point'){
    const raw=screenToWorld(e,false);let dx=raw.x-drag.start.x,dy=raw.y-drag.start.y;if(snapEnabled){const step=snapMeters/(track.scale||.2);dx=Math.round(dx/step)*step;dy=Math.round(dy/step)*step;}
    dx=clamp(dx,Math.max(...drag.origins.map(v=>40-v.x)),Math.min(...drag.origins.map(v=>960-v.x)));dy=clamp(dy,Math.max(...drag.origins.map(v=>70-v.y)),Math.min(...drag.origins.map(v=>670-v.y)));
    drag.origins.forEach(v=>{track.points[v.index].x=v.x+dx;track.points[v.index].y=v.y+dy;});drag.changed ||= Math.abs(dx)+Math.abs(dy)>.001;track.preset=null;rebuild();syncUI();
  }
  else if(drag?.kind==='pit'){const v=track.pit[drag.index];v.x=clamp(p.x,40,960);v.y=clamp(p.y,70,670);drag.changed=true;rebuild();syncUI();}
  else if(drag?.kind==='barrier'){const v=track.barriers[drag.barrier].points[drag.index];v.x=clamp(p.x,20,980);v.y=clamp(p.y,20,720);v.elevation=pointAt(nearest(v).progress).elevation||0;drag.changed=true;}
  else if(drag?.kind==='buildingRotate'){const b=track.buildings[drag.index],degrees=(Math.atan2(p.y-b.y,p.x-b.x)-drag.startAngle)*180/Math.PI+drag.rotation,snap=e.shiftKey?15:1;b.rotation=((Math.round(degrees/snap)*snap)%360+360)%360;drag.changed=true;sceneryUI?.refresh();}
  else if(drag?.kind==='building'){const b=track.buildings[drag.index];b.x=clamp(p.x-drag.offset.x,0,1000);b.y=clamp(p.y-drag.offset.y,0,740);drag.changed=true;}
  else if(drag?.kind==='tree'){const v=track.trees[drag.index];v.x=clamp(p.x,20,980);v.y=clamp(p.y,20,720);drag.changed=true;}
  else if(tool==='move')canvas.style.cursor=hoverPoint>=0?'grab':'default';
});
function finishDrag() {
  if(drag?.kind==='sketch'){
    const added=simplifyStroke(drag.points,3/scale).map(p=>({x:clamp(p.x,20,980),y:clamp(p.y,20,720),elevation:pointAt(nearest(p).progress).elevation||0,bank:0})).filter((p,i,a)=>(!i||dist(p,a[i-1])>2)&&!track.points.some(v=>dist(v,p)<2)).slice(0,150-track.points.length);
    if(added.length>=2){remember(drag.before);track.points.splice(drag.insert,0,...added);selectedPoint=drag.insert+added.length-1;selectedTree=selectedBarrier=-1;track.start=0;commit();toast(`Sketch created ${added.length} editable points.`);}else toast('Draw a longer stroke to add a road section.');
  }else if(['point','pit','barrier','tree','building','buildingRotate'].includes(drag?.kind)&&drag.changed){remember(drag.before);commit();}
  drag=null;activePoint=-1;if(mode==='build')canvas.style.cursor=tool==='pan'?'grab':tool==='move'?'default':'crosshair';
}
canvas.addEventListener('pointerup',finishDrag);canvas.addEventListener('pointercancel',()=>{if(drag?.before)track=drag.before;drag=null;commit();});canvas.addEventListener('pointerleave',()=>{hoverPoint=-1;cursorPoint=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.08:1/1.08);},{passive:false});
$('#editor-tools').addEventListener('click',e=>{const button=e.target.closest('[data-tool]');if(button)setTool(button.dataset.tool);});
$('#zoom-in').onclick=()=>zoom(1.15);$('#zoom-out').onclick=()=>zoom(1/1.15);$('#zoom-reset').onclick=fitView;
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
$('#new-btn').onclick=()=>changeLayout(()=>{remember();track={...emptyTrack(),background:track.background,scale:track.scale||.2,scaleSource:track.scaleSource||'manual',scaleVerification:track.scaleVerification||null};selectedPoint=selectedBarrier=selectedTree=selectedBuilding=-1;analysisFocus=null;dirty=false;view={zoom:1,panX:0,panY:0};updateTransform();commit();setTool('draw');});
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
    const exportBtn=document.createElement('button');exportBtn.className='icon-button';exportBtn.title='Export circuit';exportBtn.setAttribute('aria-label',`Export ${item.name}`);exportBtn.innerHTML=icon('download');exportBtn.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({format:'apex-circuit',version:1,...item},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`${trackFolder(item)}_editor.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};row.append(exportBtn);
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
  const a=document.createElement('a');a.href=url;a.download=`${trackFolder(track)}_editor.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

function refreshAppData(){
  document.activeElement?.blur();finishDrag();syncCircuitIdentity();
  if(!writeStorage(DRAFT,track))return;
  try{sessionStorage.setItem('apex-refresh-notice','1');}catch{}
  const url=new URL(location.href);url.searchParams.set('apex_reload',String(Date.now()));location.replace(url.href);
}
$('#refresh-app-data').onclick=refreshAppData;
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.shiftKey&&!e.altKey&&(e.code==='KeyR'||e.key.toLowerCase()==='r')){e.preventDefault();e.stopImmediatePropagation();refreshAppData();}
},true);
window.addEventListener('pagehide',()=>{document.activeElement?.blur();syncCircuitIdentity();draftSave();});
document.addEventListener('keydown',e=>{
  if(e.target.matches('input,textarea,select')||$$('dialog').some(d=>d.open))return;
  const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();e.shiftKey?redo():undo();}
  else if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();redo();}
  else if((e.ctrlKey||e.metaKey)&&k==='a'&&e.target===canvas&&tool==='move'){e.preventDefault();selectedPoints.clear();track.points.forEach(p=>selectedPoints.add(p));selectedPoint=track.points.length-1;syncUI();}
  else if((k==='delete'||k==='backspace')&&selectedPoints.size){e.preventDefault();editorApi.deleteSelectedPoints();}
  else if(!(e.ctrlKey||e.metaKey||e.altKey)){const tools={v:'move',p:'draw',e:'erase',s:'start',h:'pan',b:'barrier',k:'sketch',t:'tree',u:'building'};if(k==='r'){e.preventDefault();editorApi.rotateBuilding(e.shiftKey?-15:15);}else if(tools[k]){e.preventDefault();setTool(tools[k]);}else if(k==='escape'){editorApi.clearPointSelection();$('.studio').classList.remove('expanded','drawing-focus');$('#focus-drawing').textContent='Focus canvas ↗';$('#focus-drawing').setAttribute('aria-pressed','false');}}
});
function frame(){draw();requestAnimationFrame(frame);}
function stopPreview(){if(mode!=='preview')return;mode='build';$('.studio').classList.remove('preview-active');$('#preview-canvas').hidden=true;canvas.hidden=false;$('#preview-mode').classList.remove('active');$('#build-mode').classList.add('active');$('#canvas-caption').innerHTML='TRACE EDITOR <span>/</span> TOP VIEW';syncUI();resize();setTool(tool);}
function showPreview(viewMode='orbit'){
  if(track.points.length<3||!length){toast('Trace a circuit with at least three points first.');return;}
  try{if(!preview3D)preview3D=new TrackPreview($('#preview-canvas'));if(!preview3D.gl){toast('3D preview needs WebGL. You can still trace and export the track.');return;}mode='preview';$('.studio').classList.add('preview-active');canvas.hidden=true;$('#preview-canvas').hidden=false;$('#preview-mode').classList.add('active');$('#build-mode').classList.remove('active');$('#canvas-caption').innerHTML='GEOMETRY PREVIEW <span>/</span> 3D';$('#canvas-hint span').textContent='Drag to orbit. Scroll to zoom. Inspect road and pit placement.';preview3D.focusedMode=undefined;preview3D.focusedIndex=undefined;preview3D.cutaway=false;preview3D.load(track);}
  catch(error){stopPreview();toast('3D preview failed: '+error.message);}
  if(mode==='preview'&&['top','reset'].includes(viewMode))preview3D.setView(viewMode==='top');
  syncUI();
}
referenceLayer=new ReferenceLayer(()=>{},toast);
let crossingRepairBusy=false;
const editorApi={
  async fixCrossings(onProgress){if(crossingRepairBusy)return {ok:false,reason:'Automatic crossing fitting is already running.'};const before=JSON.stringify(track);crossingRepairBusy=true;try{const result=await repairCrossings(track,onProgress);if(JSON.stringify(track)!==before)return {ok:false,reason:'The circuit changed while fitting. Click the warning again to fit the current layout.'};if(result.ok&&result.changes.length){editorApi.updateTrack(t=>t.points=result.track.points);selectedPoint=result.changes.at(-1).index;selectedPoints.clear();selectedPoints.add(track.points[selectedPoint]);syncUI();}return result;}finally{crossingRepairBusy=false;}},
  previewPits(){showPreview();if(mode==='preview'){preview3D.focusPits();syncUI();}},
  focusPitStop(index){const p=pitLayout.stalls[index];if(!p)return;stopPreview();analysisFocus=null;view.zoom=2.8;const base=Math.min(cssW/1000,cssH/740)*view.zoom;view.panX=(500-p.x)*base;view.panY=(370-p.y)*base;updateTransform();canvas.focus();toast(`Pit stop ${index+1} · ${pitLayout.settings.boxWidth.toFixed(1)} m wide`);},
  editDrawing(){stopPreview();setTool('move');canvas.focus();},
  previewStructure(index){showPreview();if(mode!=='preview')return;preview3D.focusStructure(track,index);const range=geometry.structureProfile?.ranges.find(r=>r.index===index);if(range?.type==='tunnel')preview3D.setCutaway(true);syncUI();},
  toggleTunnelCutaway(){if(mode!=='preview')showPreview();if(mode==='preview'){preview3D.setCutaway(!preview3D.cutaway);syncUI();}},
  showPanel(section){workspaceUI?.activateSection(section);$('.studio').classList.remove('panel-hidden','drawing-focus','expanded');$('#hide-panel-btn').textContent='Hide panel';$('#hide-panel-btn').setAttribute('aria-pressed','false');$('#focus-drawing').textContent='Focus canvas ↗';$('#focus-drawing').setAttribute('aria-pressed','false');$('#fullscreen-btn').setAttribute('aria-label','Expand canvas');$('#fullscreen-btn').title='Expand canvas';requestAnimationFrame(()=>$(section)?.scrollIntoView({block:'nearest',behavior:'smooth'}));},
  validateTrack,
  openShared(candidate,onOpen){const imported=validateTrack(candidate);if(!imported||imported.points.length<2)throw new Error('Invalid shared circuit.');changeLayout(()=>{if(mode==='preview')stopPreview();finishDrag();remember();track={...imported,id:null};selectedPoint=selectedBarrier=selectedTree=selectedBuilding=-1;activeBarrier=-1;analysisFocus=null;measurement=[];commit();setTool('move');fitView();toast('Shared circuit opened. Every point is editable.');workspaceUI?.activateSection('.circuit-settings');onOpen?.();});},
  selectPoint(index){if(!track.points[index])return;selectedPoints.clear();selectedPoints.add(track.points[index]);if(mode==='preview')stopPreview();selectedPoint=index;selectedBarrier=selectedTree=selectedBuilding=-1;setTool('move');syncUI();},
  useGenerated(candidate){changeLayout(()=>{const previous=snapshot();remember();track={...emptyTrack(),...clone(candidate),complete:true,width:previous.width,weather:previous.weather,asphalt:previous.asphalt,grass:previous.grass,export:previous.export};selectedPoint=selectedBarrier=selectedTree=selectedBuilding=-1;analysisFocus=null;measurement=[];commit();setTool('move');fitView();toast('Generated circuit loaded. Every point is editable.');});},
  getSelectedPoints:()=>{settleSelection();return selectedPointIndices();},
  updateSelectedPoints(change){const indices=selectedPointIndices();if(!indices.length)return;editorApi.updateTrack(t=>indices.forEach(i=>change(t.points[i],i,t)));},
  deleteSelectedPoints(){const indices=selectedPointIndices();if(!indices.length)return;finishDrag();remember();for(const i of indices.sort((a,b)=>b-a))track.points.splice(i,1);selectedPoint=-1;selectedPoints.clear();track.start=0;commit();toast(`${indices.length} road points removed. Undo restores them.`);},
  clearPointSelection(){selectedPoints.clear();selectedPoint=-1;syncUI();},
  getTool:()=>tool,getTree:()=>selectedTree,getTreeBrush:()=>({...treeBrush}),getPitPlan:()=>pitLayout,getTurnMarkers:()=>turnMarkers,getGeometry:()=>geometry,fitView,
  getTimingPlan:()=>timingLayout,
  generateBarriers(options){if(!geometry.length){toast('Draw the circuit before adding automatic barriers.');return;}const generated=automaticBarriers(track,geometry,roadLayout,pitLayout,{...options,gantry:gantryLayout});if(!generated.length){toast('No clear barrier route found. Try a smaller gap or remove nearby scenery.');return;}remember();track.barriers=[...(track.barriers||[]).filter(b=>!b.automatic),...generated];selectedBarrier=-1;activeBarrier=-1;commit();setTool('move');toast(`${generated.length} editable barrier paths added. ${barrierSettings(track).reentry?"Return openings and pit access stay open.":"Pit access stays open."} Undo restores the previous barriers.`);},
  cutBarrier(index,width,position){
    const barrier=track.barriers?.[index];if(!barrier)return;
    const pieces=cutBarrierOpening(barrier,track.scale||.2,width,position);
    if(!pieces){toast(`Choose a barrier at least ${width+4} meters long for this opening.`);return;}
    if(track.barriers.length>=40){toast('Remove a barrier path first. An opening creates two editable paths.');return;}
    if(mode==='preview')stopPreview();finishDrag();remember();track.barriers.splice(index,1,...pieces);selectedBarrier=index;activeBarrier=-1;commit();setTool('move');toast(`${width} m return opening cut. Both remaining barrier paths are editable. Undo restores the barrier.`);
  },
  getBuilding:()=>selectedBuilding,getBuildingBrush:()=>({...buildingBrush}),setBuildingBrush(values){buildingBrush=buildingSettings(values);},
  duplicateBuilding(){const source=track.buildings?.[selectedBuilding];if(!source)return;if(track.buildings.length>=60){toast('Maximum of 60 buildings reached.');return;}const s=track.scale||.2,r=source.rotation*Math.PI/180;for(let ring=1;ring<=4;ring++)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]){const x=dx*(source.width+4)*ring/s,y=dy*(source.depth+4)*ring/s,b={...source,x:source.x+x*Math.cos(r)-y*Math.sin(r),y:source.y+x*Math.sin(r)+y*Math.cos(r)};if(!buildingClear(b))continue;remember();track.buildings.push(b);selectedBuilding=track.buildings.length-1;selectedPoint=selectedTree=selectedBarrier=-1;buildingBrush=buildingSettings(b);commit();setTool('move');toast('Building duplicated on clear ground. Drag it to refine placement.');return;}toast('No clear space nearby. Use Place building to choose another location.');},
  rotateBuilding(degrees){const b=track.buildings?.[selectedBuilding];if(b){remember();b.rotation=((b.rotation+degrees)%360+360)%360;buildingBrush={...buildingBrush,rotation:b.rotation};commit();}else{buildingBrush.rotation=((buildingBrush.rotation+degrees)%360+360)%360;sceneryUI?.refresh();} },
  selectBuilding(index){selectedBuilding=track.buildings?.[index]?index:-1;selectedTree=selectedPoint=selectedBarrier=-1;if(selectedBuilding>=0)setTool('move');syncUI();},
  setSnap(enabled,meters){snapEnabled=enabled;snapMeters=meters;},
  setTreeBrush(values){treeBrush={...treeBrush,...values};},
  scatterTrees(){editorApi.plantRandomTrees({count:40,distribution:'edge',mix:false});},
  plantRandomTrees(settings){if(!geometry.length){toast('Draw the road before planting automatic trees.');return;}if((track.trees||[]).length>=300){toast('Maximum of 300 trees reached. Remove trees before planting more.');return;}const added=randomTrees(track,geometry,pitLayout,treeBrush,{...settings,gantry:gantryLayout});if(!added.length){toast('No clear ground available. Try fewer trees or a different placement style.');return;}remember();track.trees=[...(track.trees||[]),...added];selectedTree=-1;commit();toast(`${added.length} trees planted${added.length<Number(settings.count)?' · remaining spaces were too close to scenery':''}. Undo removes this planting.`);},
  getTrack:()=>track,getSelected:()=>selectedPoint,getBarrier:()=>selectedBarrier,reference:referenceLayer,toast,setTool,preview:showPreview,
  selectBarrier(index){if(mode!=='build')stopPreview();selectedBarrier=index;selectedPoint=-1;setTool('move');tracerUI.refresh();studioUI?.refresh();cornerUI?.refresh();},
  newBarrier(){if(mode==='preview')stopPreview();activeBarrier=-1;selectedBarrier=-1;setTool('barrier');tracerUI.refresh();studioUI?.refresh();cornerUI?.refresh();},
  finishBarrier(){activeBarrier=-1;setTool('move');tracerUI.refresh();studioUI?.refresh();cornerUI?.refresh();},
  setComplete(value){if(mode==='preview')stopPreview();finishDrag();remember();track.complete=value;selectedPoint=selectedBarrier=selectedTree=selectedBuilding=-1;activeBarrier=-1;measurement=[];commit();setTool('move');toast(value?'Circuit closed. Keep editing or inspect the analysis.':'Road opened. You can extend its ends.');},
  editView(){if(mode==='preview')stopPreview();},
  updateTrack(fn){const previousName=track.name;remember();fn(track);commit(previousName);updateTransform();},
  clear(scope){if(mode==='preview')stopPreview();finishDrag();remember();if(scope==='geometry'||scope==='road'){track.points=[];track.complete=false;track.start=0;}if(scope==='geometry'||scope==='pits')track.pit=[];if(scope==='geometry'||scope==='barriers')track.barriers=[];if(scope==='geometry'||scope==='trees')track.trees=[];if(scope==='geometry'||scope==='buildings')track.buildings=[];selectedBuilding=-1;if(scope==='reference'){track.background=null;}selectedPoint=selectedBarrier=selectedTree=selectedBuilding=-1;activeBarrier=-1;analysisFocus=null;analysisData=null;measurement=[];commit();setTool(track.points.length?'move':'draw');toast('Selected items cleared. Undo restores them.');},
  reverseCircuit(){if(track.points.length<2)return;if(mode==='preview')stopPreview();finishDrag();const start=pointAt(track.start);remember();const reverseAnchorOrigin=geometry.closed?(geometry.cumulative[geometry.segments.indexOf(track.points.length-1)]||0)/geometry.length:1,previousCorners=track.points.map(cornerSettings).reverse(),boardCounts=new Map();for(const turn of turnMarkers.turns){if(!boardCounts.has(turn.controlIndex))boardCounts.set(turn.controlIndex,{});const counts=boardCounts.get(turn.controlIndex);counts[turn.direction]=(counts[turn.direction]||0)+1;}track.points.reverse();track.points.forEach((p,i)=>{p.turnBoards=reverseTurnBoards(p,boardCounts.get(track.points.length-1-i));if(p.structure)p.structure={...p.structure,offset:-(p.structure.offset||0),...(Number.isFinite(p.structure.anchorProgress)?{anchorProgress:geometry.closed?((reverseAnchorOrigin-p.structure.anchorProgress)%1+1)%1:1-p.structure.anchorProgress}:{})};p.bank=-(p.bank||0);const entry=p.entryStrength;p.entryStrength=p.exitStrength;p.exitStrength=entry;const previous=previousCorners[(i+1)%previousCorners.length];p.kerbs=previous.kerbs==='left'?'right':previous.kerbs==='right'?'left':previous.kerbs;p.kerbWidth=previous.kerbWidth;});track.pit.reverse();const timing=timingSettings(track);track.timing={...timing,split1:1-timing.split2,split2:1-timing.split1};rebuild();track.start=nearest(start).progress;analysisFocus=null;commit();setTool('move');toast('Direction reversed. Road banking and pit direction updated.');},
  onAnalysis(data){analysisData=data;},getOverlay:()=>analysisOverlay,setOverlay(value){analysisOverlay=value;analysisFocus=null;},
  focusProgress(progress){if(mode==='preview')stopPreview();analysisFocus=progress;const p=pointAt(progress);view.zoom=2.4;const base=Math.min(cssW/1000,cssH/740)*view.zoom;view.panX=(500-p.x)*base;view.panY=(370-p.y)*base;updateTransform();},
  setOpacity(value){referenceOpacity=value;},setTraceOverlay(value){traceOverlay=value;},
  setReference(desc,meters,fresh){const apply=()=>{remember();if(fresh){track={...presetTrack('club'),name:'Traced Circuit',points:[],complete:false,preset:null,background:desc,scale:meters};selectedPoint=selectedBarrier=selectedTree=selectedBuilding=-1;}else{track.background=desc;track.scale=meters;}track.scaleSource=desc.type==='map'?'map':'manual';track.scaleVerification=null;analysisFocus=null;view={zoom:1,panX:0,panY:0};updateTransform();commit();referenceLayer.ensure(track.background);setTool(fresh?'draw':'move');};fresh?changeLayout(apply):apply();}
};
tracerUI=mountTracer(editorApi);studioUI=mountDrawStudio(editorApi);cornerUI=mountCorners(editorApi);structureUI=mountStructures(editorApi);sceneryUI=mountScenery(editorApi);acSetupUI=mountACSetup(editorApi);surfaceUI=mountSurfaces(editorApi);timingUI=mountTiming(editorApi);analysisUI=mountAnalysis(editorApi);shareUI=mountSharing(editorApi);workspaceUI=mountWorkspaceNavigation(editorApi);
$('#build-mode').onclick=stopPreview;
$('#width-range').setAttribute('min','4');$('#width-range').setAttribute('max','30');
syncCircuitIdentity();draftSave();if(storageAvailable)writeStorage(STORAGE,library);
rebuild();syncUI();resize();setTool(track.points.length?'move':'draw');requestAnimationFrame(frame);
const startupUrl=new URL(location.href);if(startupUrl.searchParams.has('apex_reload')){startupUrl.searchParams.delete('apex_reload');history.replaceState(history.state,'',startupUrl.href);}
try{if(sessionStorage.getItem('apex-refresh-notice')){sessionStorage.removeItem('apex-refresh-notice');toast('App data refreshed. Your circuits were kept.');}}catch{}
