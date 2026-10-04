import {buildGeometry,pointOnTrack,clamp} from './engine.js';
import {BinaryWriter,zipFiles} from './binary.js';
import {ASPHALT} from './surfaces.js';
import {analyzeTrack} from './analysis.js';

export const DEFAULT_EXPORT={author:'APEX creator',country:'Unknown',city:'',pitboxes:8,kerbs:true,barriers:true,ai:true};
export function trackSlug(name){return ('apex_'+name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')).slice(0,32).replace(/_+$/,'')||'apex_circuit';}
const unit=t=>clamp(Number(t.scale)||.2,.02,10);
const world=(p,t)=>[(p.x-500)*unit(t),Number(p.elevation)||0,(370-p.y)*unit(t)];
const normalize=v=>{const l=Math.hypot(...v)||1;return v.map(n=>n/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
function mesh(name,material){return {name,material,vertices:[],indices:[]};}
function quad(m,a,b,c,d,uvScale=5){
  let normal=normalize(cross(sub(b,a),sub(c,a)));const base=m.vertices.length;
  const surface=/^1(ROAD|PIT|KERB|GRASS)/.test(m.name);
  if(surface&&normal[1]<0)normal=normal.map(v=>-v);
  if(Math.hypot(...normal)<.5)normal=[0,1,0];
  for(const p of [a,b,c,d])m.vertices.push({pos:p,normal,uv:[p[0]/uvScale,p[2]/uvScale],tangent:[1,0,0]});
  for(const triangle of [[0,1,2],[0,2,3]]){const positions=[a,b,c,d],n=cross(sub(positions[triangle[1]],positions[triangle[0]]),sub(positions[triangle[2]],positions[triangle[0]]));if(surface&&n[1]<0)[triangle[1],triangle[2]]=[triangle[2],triangle[1]];m.indices.push(...triangle.map(i=>i+base));}
}
function frame(p,t){const pos=world(p,t),forward=[Math.cos(p.angle),0,-Math.sin(p.angle)],left=[-forward[2],0,forward[0]];return {pos,forward,left,bank:Math.tan((p.bank||0)*Math.PI/180)};}
const edge=(f,offset,lift=0)=>[f.pos[0]+f.left[0]*offset,f.pos[1]+offset*f.bank+lift,f.pos[2]+f.left[2]*offset];
function band(m,frames,left,right,lift=0,closed=true){
  const count=closed?frames.length:frames.length-1;
  for(let i=0;i<count;i++){const a=frames[i],b=frames[(i+1)%frames.length];quad(m,edge(a,left,lift),edge(b,left,lift),edge(b,right,lift),edge(a,right,lift));}
}
function box(m,x,y,z,w,h,d){
  const x0=x-w/2,x1=x+w/2,z0=z-d/2,z1=z+d/2,y1=y+h;
  quad(m,[x0,y,z1],[x1,y,z1],[x1,y1,z1],[x0,y1,z1]);
  quad(m,[x1,y,z0],[x0,y,z0],[x0,y1,z0],[x1,y1,z0]);
  quad(m,[x1,y,z1],[x1,y,z0],[x1,y1,z0],[x1,y1,z1]);
  quad(m,[x0,y,z0],[x0,y,z1],[x0,y1,z1],[x0,y1,z0]);
  quad(m,[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]);
}
function openFrames(points,t){
  const sampled=[];
  for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*unit(t)/1.5));for(let j=0;j<steps;j++){const f=j/steps;sampled.push({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f,elevation:(a.elevation||0)+((b.elevation||0)-(a.elevation||0))*f});}}
  sampled.push(points[points.length-1]);
  return sampled.map((p,i)=>{const a=sampled[Math.max(0,i-1)],b=sampled[Math.min(sampled.length-1,i+1)];return frame({...p,angle:Math.atan2(b.y-a.y,b.x-a.x)},t);});
}
export function createScene(track){
  const closed=track.complete!==false,g=buildGeometry(track.points,track.smooth,closed),options={...DEFAULT_EXPORT,...track.export},s=unit(track),total=g.length*s;
  const pitCount=clamp(Math.round(Number(options.pitboxes)||8),1,16);
  const count=clamp(Math.ceil(total/1.5),64,4000),frames=Array.from({length:count},(_,i)=>frame(pointOnTrack(g,closed?track.start+i/count:i/(count-1)),track));
  const meshes=[],dummies=[],half=track.width/2;
  const add=(name,mat)=>{const m=mesh(name,mat);meshes.push(m);return m;};
  const ground=add('1GRASS_TERRAIN',1),base=Math.min(...frames.map(f=>f.pos[1]))-.08;
  quad(ground,[-500*s,base,-370*s],[-500*s,base,370*s],[500*s,base,370*s],[500*s,base,-370*s],18);
  const road=add('1ROAD_SURFACE',0);band(road,frames,half,-half,0,closed);
  if(options.kerbs){
    const white=add('1KERB_WHITE',2),red=add('1KERB_RED',3);
    for(let i=0;i<(closed?count:count-1);i++){
      const a=frames[i],b=frames[(i+1)%count],m=Math.floor(i*total/count/1.5)%2?white:red;
      for(const side of [-1,1]){const l=side>0?half+.7:-half,r=side>0?half:-half-.7;quad(m,edge(a,l,.035),edge(b,l,.035),edge(b,r,.035),edge(a,r,.035));}
    }
  }
  const markings=add('ROAD_MARKINGS',2);band(markings,frames,half-.15,half-.28,.012,closed);band(markings,frames,-half+.28,-half+.15,.012,closed);
  const start=frames[0];
  for(let side=-half;closed&&side<half;side+=.5)for(let row=0;row<2;row++){
    const m=(Math.floor((side+half)/.5)+row)%2?road:markings;
    const point=(off,fwd)=>[start.pos[0]+start.left[0]*off+start.forward[0]*fwd,start.pos[1]+off*start.bank+.025,start.pos[2]+start.left[2]*off+start.forward[2]*fwd];
    quad(m,point(side,row*.5),point(Math.min(side+.5,half),row*.5),point(Math.min(side+.5,half),(row+1)*.5),point(side,(row+1)*.5));
  }
  // A separate pit ribbon and explicit spawns make practice sessions usable immediately.
  let pitFrames;
  if(track.pit?.length>=2)pitFrames=openFrames(track.pit,track);
  else{
    const pitLength=Math.min(total*.35,(pitCount*6+14)/.7),steps=64,offset=half+7;
    pitFrames=Array.from({length:steps},(_,i)=>{
      const f=frame(pointOnTrack(g,track.start-.03+i/(steps-1)*pitLength/total),track);
      const taper=Math.sin(Math.PI*i/(steps-1));
      return {...f,pos:edge(f,-offset*taper,.015),bank:0};
    });
  }
  const pit=add('1PIT_LANE',0);band(pit,pitFrames,3,-3,.03,false);
  function dummy(name,f,lateral=0){dummies.push({name,pos:edge(f,lateral,1),forward:f.forward});}
  for(let i=0;i<pitCount;i++){
    const f=frame(pointOnTrack(g,track.start-(8+Math.floor(i/2)*6)/total),track);dummy(`AC_START_${i}`,f,(i%2?1:-1)*Math.min(2.2,half*.4));
    const fraction=.15+.7*(i+.5)/pitCount,index=clamp(Math.round(fraction*(pitFrames.length-1)),0,pitFrames.length-1);dummy(`AC_PIT_${i}`,pitFrames[index]);
  }
  dummy('AC_HOTLAP_START_0',frame(pointOnTrack(g,track.start-25/total),track));
  for(let sector=0;sector<3;sector++){
    const f=frame(pointOnTrack(g,track.start+sector/3),track);dummy(`AC_TIME_${sector}_L`,f,half+.75);dummy(`AC_TIME_${sector}_R`,f,-half-.75);
  }
  if(options.barriers){const wall=add('1WALL_BOUNDARY',4),width=1000*s,height=740*s;
    box(wall,0,base,-height/2,width,2,.4);box(wall,0,base,height/2,width,2,.4);box(wall,-width/2,base,0,.4,2,height);box(wall,width/2,base,0,.4,2,height);
  }
  (track.barriers||[]).forEach((barrier,index)=>{
    const solid=add(`1WALL_CUSTOM_${index}`,4),red=barrier.style==='striped'?add(`1WALL_CUSTOM_${index}_RED`,3):null,white=red?add(`1WALL_CUSTOM_${index}_WHITE`,2):null;
    for(let i=1;i<barrier.points.length;i++){
      const a=world(barrier.points[i-1],track),b=world(barrier.points[i],track),span=Math.hypot(b[0]-a[0],b[2]-a[2]);if(span<.01)continue;
      const steps=red?clamp(Math.ceil(span/2),1,32):1;for(let j=0;j<steps;j++){
        const from=a.map((n,k)=>n+(b[k]-n)*j/steps),to=a.map((n,k)=>n+(b[k]-n)*(j+1)/steps),dx=-(to[2]-from[2])/Math.hypot(to[0]-from[0],to[2]-from[2])*barrier.width/2,dz=(to[0]-from[0])/Math.hypot(to[0]-from[0],to[2]-from[2])*barrier.width/2;
        const p=[from[0]+dx,from[1],from[2]+dz],q=[to[0]+dx,to[1],to[2]+dz],r=[to[0]-dx,to[1],to[2]-dz],v=[from[0]-dx,from[1],from[2]-dz],top=x=>[x[0],x[1]+barrier.height,x[2]],m=red?(j%2?red:white):solid;
        quad(m,p,q,top(q),top(p),2);quad(m,r,v,top(v),top(r),2);quad(m,q,r,top(r),top(q),2);quad(m,v,p,top(p),top(v),2);quad(m,top(p),top(q),top(r),top(v),2);
      }
    }
  });
  const asphalt=ASPHALT[track.asphalt]||ASPHALT.fresh;
  const materials=[{name:'Asphalt',color:asphalt.color,noise:asphalt.noise},{name:'Grass',color:[105,127,80]},{name:'White',color:[231,231,215]},{name:'Kerb red',color:[186,56,44]},{name:'Barrier',color:[153,155,153]}];
  return {meshes:meshes.filter(m=>m.indices.length),dummies,materials,frames,pitFrames,length:total,pitCount,options};
}

function dds(color,noiseLevel=5){
  const w=new BinaryWriter(),size=32;
  w.bytes('DDS ').u32(124).u32(0x100f).u32(size).u32(size).u32(size*4).u32(0).u32(0);
  for(let i=0;i<11;i++)w.u32(0);
  w.u32(32).u32(0x41).u32(0).u32(32).u32(0x00ff0000).u32(0x0000ff00).u32(0x000000ff).u32(0xff000000).u32(0x1000);
  for(let i=0;i<4;i++)w.u32(0);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){const noise=(((x*73+y*47)%31)-15)*noiseLevel/15;w.u8(clamp(color[2]+noise,0,255)).u8(clamp(color[1]+noise,0,255)).u8(clamp(color[0]+noise,0,255)).u8(255);}
  return w.finish();
}
export function writeKn5(scene){
  const w=new BinaryWriter();w.bytes('sc6969').u32(6).u32(0).u32(scene.materials.length);
  scene.materials.forEach((m,i)=>{const bytes=dds(m.color,m.noise);w.u32(1).string(`apex_${i}.dds`).u32(bytes.length).bytes(bytes);});
  w.u32(scene.materials.length);
  scene.materials.forEach((m,i)=>{
    w.string(m.name).string('ksPerPixel').u8(0).u8(0).u32(0);
    const properties={ksAmbient:.5,ksDiffuse:.7,ksSpecular:.04,ksSpecularEXP:10};w.u32(Object.keys(properties).length);
    Object.entries(properties).forEach(([name,value])=>{w.string(name).f32(value);for(let j=0;j<9;j++)w.f32(0);});
    w.u32(1).string('txDiffuse').u32(0).string(`apex_${i}.dds`);
  });
  const identity=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
  w.u32(1).string('APEX_ROOT').u32(scene.meshes.length+scene.dummies.length).u8(1).floats(identity);
  scene.meshes.forEach(m=>{
    if(m.vertices.length>65535)throw new Error('Mesh exceeds the KN5 16-bit vertex limit. Reduce circuit complexity.');
    w.u32(2).string(m.name).u32(0).u8(1).u8(1).u8(1).u8(0).u32(m.vertices.length);
    m.vertices.forEach(v=>w.floats(v.pos).floats(v.normal).floats(v.uv).floats(v.tangent));
    w.u32(m.indices.length);m.indices.forEach(i=>w.u16(i));
    const center=[0,0,0];m.vertices.forEach(v=>v.pos.forEach((x,i)=>center[i]+=x/m.vertices.length));
    const radius=Math.max(...m.vertices.map(v=>Math.hypot(...sub(v.pos,center))));
    w.u32(m.material).u32(0).f32(0).f32(100000).floats(center).f32(radius).u8(1);
  });
  scene.dummies.forEach(d=>{const f=d.forward,right=[f[2],0,-f[0]];w.u32(1).string(d.name).u32(0).u8(1).floats([...right,0,0,1,0,0,...f,0,...d.pos,1]);});
  return w.finish();
}
export function writeAi(frames,width,closed=true){
  const points=closed?[...frames,frames[0]]:frames,w=new BinaryWriter();
  w.u32(7).u32(points.length).u32(0).u32(0);
  const distances=[];let distance=0;
  points.forEach((f,i)=>{if(i)distance+=Math.hypot(...sub(f.pos,points[i-1].pos));distances.push(distance);w.floats(f.pos).f32(distance).u32(i);});
  w.u32(points.length);
  points.forEach((f,i)=>{
    const a=points[Math.max(0,i-2)].forward,b=points[Math.min(points.length-1,i+2)].forward;
    const angle=Math.acos(clamp(a[0]*b[0]+a[2]*b[2],-1,1)),radius=angle>.0001?Math.max(2,Math.abs(distances[Math.min(points.length-1,i+2)]-distances[Math.max(0,i-2)])/angle):10000;
    const speed=closed?clamp(Math.sqrt(8*radius)*3.6,25,180):40;
    w.floats([speed,.65,0,0,radius,width/2,width/2,0,0,0,1,0,distances[i],...f.forward,0,0]);
  });
  w.u32(0);return w.finish();
}
function surface(key,valid,pit=false){return `KEY=${key}\nFRICTION=${key==='GRASS'?.7:1}\nDAMPING=0\nWAV=\nWAV_PITCH=0\nFF_EFFECT=NULL\nDIRT_ADDITIVE=${valid?0:1}\nIS_VALID_TRACK=${valid?1:0}\nBLACK_FLAG_TIME=0\nSIN_HEIGHT=0\nSIN_LENGTH=0\nIS_PITLANE=${pit?1:0}\nVIBRATION_GAIN=${key==='KERB'?.1:0}\nVIBRATION_LENGTH=.2\n`;}
export function validateExport(track){
  const errors=[],warnings=[],g=buildGeometry(track.points||[],track.smooth),s=unit(track);
  if((track.points?.length||0)<3||g.length*s<60)errors.push('Create a closed circuit at least 60 meters long.');
  if(track.complete===false)errors.push('Use Complete circuit before exporting the track.');
  if(track.barriers?.some(b=>b.points.length<2))errors.push('Finish each barrier with at least two points or remove it.');
  if(track.pit?.length===1)errors.push('Add a second pit-lane point or choose the automatic pit lane.');
  if(track.points?.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))errors.push('The circuit contains invalid coordinates.');
  if(track.width<4||track.width>30)errors.push('Track width must be between 4 and 30 meters.');
  const pits=clamp(Math.round(Number(track.export?.pitboxes)||8),1,16);
  const pitLength=track.pit?.length>=2?track.pit.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-track.pit[i].x,p.y-track.pit[i].y)*s,0):g.length*s*.35;
  if(pitLength*.7<pits*6+14)errors.push(`Not enough pit-lane space for ${pits} boxes. Draw a longer pit path or reduce the pit count.`);
  const n=clamp(Math.ceil(g.length/8),32,350),poly=Array.from({length:n},(_,i)=>pointOnTrack(g,i/n));
  const orient=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  let intersect=false;
  for(let i=0;i<n&&!intersect;i++)for(let j=i+2;j<n;j++){
    if(i===0&&j===n-1)continue;const a=poly[i],b=poly[(i+1)%n],c=poly[j],d=poly[(j+1)%n];
    if(orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0){intersect=true;break;}
  }
  if(intersect)errors.push('The centerline crosses itself. Separate the crossing before exporting.');
  const radiusSamples=poly.map((p,i)=>{const a=poly[(i+n-1)%n],b=poly[(i+1)%n],cross=Math.abs(orient(a,p,b));return cross>1e-6?Math.hypot(a.x-p.x,a.y-p.y)*Math.hypot(p.x-b.x,p.y-b.y)*Math.hypot(a.x-b.x,a.y-b.y)/(2*cross)*s:Infinity;});
  if(Math.min(...radiusSamples)<track.width/2)warnings.push('Some corners are tighter than half the road width. Check the inner-edge overlap in 3D.');
  if(track.points?.some(p=>Math.abs(p.elevation||0)>0))warnings.push('Elevation is hand-authored; the surrounding terrain remains a flat base.');
  if(!track.pit?.length)warnings.push('An automatic pit lane will be generated near the start. Review it in 3D.');
  if(track.export?.ai!==false)warnings.push('Generated AI follows the centerline. Refine it in-game for competitive races.');
  return {errors,warnings,length:g.length*s};
}
export function exportFiles(track,images={}){
  const report=validateExport(track);if(report.errors.length)throw new Error(report.errors.join(' '));
  const scene=createScene(track),slug=trackSlug(track.name),root=`content/tracks/${slug}/`,files={};
  const put=(p,v)=>files[root+p]=v;
  put(`${slug}.kn5`,writeKn5(scene));put('models.ini',`[MODEL_0]\nFILE=${slug}.kn5\nPOSITION=0,0,0\nROTATION=0,0,0\n`);
  put('data/surfaces.ini',['ROAD','GRASS','KERB','PIT','WALL'].map((key,i)=>`[SURFACE_${i}]\n${surface(key,!['GRASS','WALL'].includes(key),key==='PIT')}`).join('\n'));
  put('data/lighting.ini','[LIGHTING]\nSUN_PITCH_ANGLE=45\nSUN_HEADING_ANGLE=0\n');
  put('data/crew.ini','[HEADER]\nVERSION=1\n[CREW]\nSIDE=1\n');
  put('data/sections.ini','[SECTION_0]\nIN=0\nOUT=.333333\nNAME=Sector 1\n[SECTION_1]\nIN=.333333\nOUT=.666667\nNAME=Sector 2\n[SECTION_2]\nIN=.666667\nOUT=1\nNAME=Sector 3\n');
  const details=track.details||{},tags=[details.type||'circuit','apex','generated',...(details.tags||'').split(',').map(t=>t.trim()).filter(Boolean)];
  put('ui/ui_track.json',JSON.stringify({name:track.name,description:details.description||'A circuit traced and generated with APEX. Browser-generated prototype; verify in practice before racing.',tags:[...new Set(tags)],geotags:track.background?.type==='map'?[String(track.background.lat),String(track.background.lon)]:[],country:scene.options.country,city:scene.options.city,length:`${Math.round(scene.length)} m`,width:`${track.width} m`,pitboxes:String(scene.pitCount),author:scene.options.author,version:details.version||'1.0',url:details.website||'https://deepinkgroup.github.io/apex-circuit-workshop/'},null,2));
  if(scene.options.ai){put('ai/fast_lane.ai',writeAi(scene.frames,track.width));put('ai/pit_lane.ai',writeAi(scene.pitFrames,6,false));}
  for(const [name,bytes] of Object.entries(images))put(name,bytes);
  if(images['map.png'])put('data/map.ini',`[PARAMETERS]\nWIDTH=1000\nHEIGHT=740\nX_OFFSET=${500*unit(track)}\nZ_OFFSET=${370*unit(track)}\nSCALE_FACTOR=${unit(track)}\nDRAWING_SIZE=10\nMARGIN=0\n`);
  put('apex_source.json',JSON.stringify({format:'apex-circuit',version:4,...track,background:null},null,2));
  put('apex_analysis.json',JSON.stringify({...analyzeTrack(track),exportReadiness:report},null,2));
  files['INSTALL.txt']=`APEX / ${track.name}\n\nINSTALL\nDrag this ZIP into Content Manager and install the detected track.\nOr extract the content folder into your Assetto Corsa installation.\nResult: assettocorsa/content/tracks/${slug}/${slug}.kn5\nSelect ${track.name} in Practice and choose one car first.\n\nABOUT THIS EXPORT\nNative KN5 geometry and textures, collision surfaces, start and pit spawns, timing gates, and optional centerline AI are generated in the browser. No Blender or ksEditor conversion is required.\nReference imagery is not included. Manual elevation is exported; surrounding terrain is a flat base.\nAI is a starting line, not a tuned racing line. Inspect spawn positions and test the track in-game.\nThis export has not been certified in Assetto Corsa.\n\n${report.warnings.join('\n')}\n`;
  return {files,scene,slug,report};
}
export function exportZip(track,images={}){const result=exportFiles(track,images);return {...result,bytes:zipFiles(result.files)};}
