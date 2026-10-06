import {buildGeometry,pointOnTrack,clamp} from './engine.js?v=20261006-race';
import {BinaryWriter,zipFiles} from './binary.js?v=20261006-race';
import {ASPHALT} from './surfaces.js?v=20261006-race';
import {analyzeTrack} from './analysis.js?v=20261006-race';
import {buildPitPlan,PIT_STYLES,resamplePath} from './pit-plan.js?v=20261006-race';
import {WEATHER} from './environment.js?v=20261006-race';
import {TREE_SPECIES,treeSettings} from './trees.js?v=20261006-race';
import {buildRoadLayout} from './road-layout.js?v=20261006-race';
import {createTrackMap,mapIni} from './track-map.js?v=20261006-race';
import {createTexture,materialProperties} from './textures.js?v=20261006-race';
import {GRASS,BUILDING_FACADES,BUILDING_ROOFS,buildingSettings,buildingCorners,buildingContains} from './scenery.js?v=20261006-race';
import {trackScale,toGamePoint,gameDirection} from './coordinates.js?v=20261006-race';
import {buildTimingPlan,sectionsIni} from './timing.js?v=20261006-race';

export const DEFAULT_EXPORT={author:'APEX creator',country:'Unknown',city:'',pitboxes:8,kerbs:true,barriers:true,ai:true,trees:true,buildings:true,roadGrip:1,grassGrip:.7,grassFx:true,gridSpacing:6,wallHeight:2};
export function trackSlug(name){return ('apex_'+name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')).slice(0,32).replace(/_+$/,'')||'apex_circuit';}
const unit=trackScale;
const world=toGamePoint;
const normalize=v=>{const l=Math.hypot(...v)||1;return v.map(n=>n/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
function mesh(name,material){return {name,material,vertices:[],indices:[]};}
function quad(m,a,b,c,d,uvScale=5){
  let face=cross(sub(b,a),sub(c,a));if(Math.hypot(...face)<1e-9)face=cross(sub(c,a),sub(d,a));let normal=normalize(face);const base=m.vertices.length;
  const surface=/^1(ROAD|PIT|KERB|GRASS)/.test(m.name);
  if(surface&&normal[1]<0)normal=normal.map(v=>-v);
  if(Math.hypot(...normal)<.5)normal=[0,1,0];
  const vertical=Math.abs(normal[1])<.5,side=vertical&&Math.abs(normal[0])>Math.abs(normal[2]);
  for(const p of [a,b,c,d])m.vertices.push({pos:p,normal,uv:vertical?[p[side?2:0]/uvScale,p[1]/uvScale]:[p[0]/uvScale,p[2]/uvScale],tangent:side?[0,0,1]:[1,0,0]});
  for(const triangle of [[0,1,2],[0,2,3]]){const positions=[a,b,c,d],n=cross(sub(positions[triangle[1]],positions[triangle[0]]),sub(positions[triangle[2]],positions[triangle[0]]));if(Math.hypot(...n)<1e-9)continue;if(surface&&n[1]<0)[triangle[1],triangle[2]]=[triangle[2],triangle[1]];m.indices.push(...triangle.map(i=>i+base));}
}
function frame(p,t){return {pos:world(p,t),...gameDirection(p.angle),bank:Math.tan((p.bank||0)*Math.PI/180),kerbs:p.kerbs||'inherit',kerbWidth:p.kerbWidth||.7};}
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
function drapePaint(paint,road){
  const triangles=[];for(let i=0;i<road.indices.length;i+=3){const [a,b,c]=road.indices.slice(i,i+3).map(j=>road.vertices[j].pos);triangles.push({a,b,c,minX:Math.min(a[0],b[0],c[0]),maxX:Math.max(a[0],b[0],c[0]),minZ:Math.min(a[2],b[2],c[2]),maxZ:Math.max(a[2],b[2],c[2])});}
  for(const v of paint.vertices){const [x,expected,z]=v.pos;let height=null,error=Infinity;
    for(const triangle of triangles){if(x<triangle.minX-1e-6||x>triangle.maxX+1e-6||z<triangle.minZ-1e-6||z>triangle.maxZ+1e-6)continue;const {a,b,c}=triangle;
      const den=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(den)<1e-10)continue;
      const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/den,w=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/den,t=1-u-w;if(Math.min(u,w,t)<-1e-6)continue;const y=u*a[1]+w*b[1]+t*c[1],delta=Math.abs(y-expected);if(delta<error){height=y;error=delta;}
    }
    if(height!==null)v.pos[1]=height+.002;
  }
}
function openFrames(points,t){
  const sampled=resamplePath(points,unit(t));
  return sampled.map((p,i)=>{const a=sampled[Math.max(0,i-1)],b=sampled[Math.min(sampled.length-1,i+1)];return frame({...p,angle:Math.atan2(b.y-a.y,b.x-a.x)},t);});
}
export function createScene(track){
  const closed=track.complete!==false,g=buildGeometry(track.points,track.smooth,closed),options={...DEFAULT_EXPORT,...track.export},s=unit(track),total=g.length*s;
  const pitCount=clamp(Math.round(Number(options.pitboxes)||8),1,16);
  const count=clamp(Math.ceil(total/1.5),64,4000),frames=Array.from({length:count},(_,i)=>frame(pointOnTrack(g,closed?track.start+i/count:i/(count-1)),track));
  const pitPlan=buildPitPlan(track),weather=WEATHER[track.weather]||WEATHER.sunny;
  const meshes=[],dummies=[],half=track.width/2;
  const add=(name,mat)=>{const m=mesh(name,mat);meshes.push(m);return m;};
  const ground=add('1GRASS_TERRAIN',1),base=Math.min(...frames.map(f=>f.pos[1]))-.08;
  const footprint=(options.buildings?(track.buildings||[]):[]).flatMap(b=>buildingCorners({...b,...buildingSettings(b)},s)).map(p=>world(p,track));
  const xmin=Math.min(-500*s,...footprint.map(p=>p[0]-2),(pitPlan.bounds.minX-500)*s-12),xmax=Math.max(500*s,...footprint.map(p=>p[0]+2),(pitPlan.bounds.maxX-500)*s+12),zmin=Math.min(-370*s,...footprint.map(p=>p[2]-2),(pitPlan.bounds.minY-370)*s-12),zmax=Math.max(370*s,...footprint.map(p=>p[2]+2),(pitPlan.bounds.maxY-370)*s+12);
  quad(ground,[xmin,base,zmin],[xmin,base,zmax],[xmax,base,zmax],[xmax,base,zmin],18);
  const roadLayout=buildRoadLayout(track,g,pitPlan),road=add('1ROAD_SURFACE',0);
  roadLayout.quads.forEach(corners=>quad(road,...corners.map(p=>world(p,track))));
  if(options.kerbs){
    const white=add('1KERB_WHITE',2),red=add('1KERB_RED',3);
    roadLayout.kerbs.forEach(panel=>quad(panel.white?white:red,...panel.corners.map(p=>{const v=world(p,track);v[1]+=.035;return v;})));
  }
  const markings=add('ROAD_MARKINGS',2);for(const corners of [...roadLayout.bands(half-.15,half-.28),...roadLayout.bands(-half+.28,-half+.15)])quad(markings,...corners.map(p=>{const v=world(p,track);v[1]+=.002;return v;}));
  const start=frames[0];
  // Painted arrows keep the actual driving direction visible in 3D and in-game.
  for(const progress of (closed?[.015,.25,.5,.75]:[.1,.6])){
    const f=frame(pointOnTrack(g,closed?(track.start||0)+progress:progress),track),size=Math.min(1.2,half*.28),point=(along,left)=>[f.pos[0]+f.forward[0]*along+f.left[0]*left,f.pos[1]+left*f.bank+.027,f.pos[2]+f.forward[2]*along+f.left[2]*left];
    quad(markings,point(-size*1.5,size*.17),point(size*.25,size*.17),point(size*.25,-size*.17),point(-size*1.5,-size*.17));
    quad(markings,point(0,size*.65),point(size*1.5,0),point(0,-size*.65),point(size*.2,0));
  }
  const finishPaint=add('START_FINISH_PAINT',2);
  for(let side=-half;closed&&side<half;side+=.5)for(let row=0;row<2;row++){
    // White squares are paint only. Dark squares are the existing asphalt:
    // never append checkerboard faces to the 1ROAD collision surface.
    if((Math.floor((side+half)/.5)+row)%2===0)continue;
    const point=(off,fwd)=>[start.pos[0]+start.left[0]*off+start.forward[0]*fwd,start.pos[1]+off*start.bank,start.pos[2]+start.left[2]*off+start.forward[2]*fwd];
    quad(finishPaint,point(side,row*.5),point(Math.min(side+.5,half),row*.5),point(Math.min(side+.5,half),(row+1)*.5),point(side,(row+1)*.5));
  }
  drapePaint(finishPaint,road);
  // A separate pit ribbon and explicit spawns make practice sessions usable immediately.
  const pitFrames=openFrames(pitPlan.aiPath,track),laneFrames=openFrames(pitPlan.path,track),pitHalf=pitPlan.settings.width/2;
  const pit=add('1PIT_LANE',5);band(pit,laneFrames,pitHalf,-pitHalf,.035,false);
  for(const path of [pitPlan.parkingPath,pitPlan.connector,pitPlan.exitConnector])if(path.length>=2)band(pit,openFrames(path,track),pitHalf,-pitHalf,.035,false);
  const entryFrames=openFrames(pitPlan.entryConnection,track),exitFrames=openFrames(pitPlan.exitConnection,track);for(const [frames,entering] of [[entryFrames,true],[exitFrames,false]])frames.forEach((f,i)=>{const t=i/Math.max(1,frames.length-1),smooth=t*t*(3-2*t);f.pos[1]-=.031*(entering?1-smooth:smooth);});for(const frames of [entryFrames,exitFrames])if(frames.length>=2)band(pit,frames,pitHalf,-pitHalf,.035,false);
  const pitPaint=add('PIT_EDGE_MARKINGS',2);for(const frames of [entryFrames,exitFrames])if(frames.length>=2){band(pitPaint,frames,pitHalf-.08,pitHalf-.2,.05,false);band(pitPaint,frames,-pitHalf+.2,-pitHalf+.08,.05,false);}for(const path of [pitPlan.path,pitPlan.parkingPath,pitPlan.connector,pitPlan.exitConnector])if(path.length>=2){const frames=openFrames(path,track);band(pitPaint,frames,pitHalf-.08,pitHalf-.2,.05,false);band(pitPaint,frames,-pitHalf+.2,-pitHalf+.08,.05,false);}
  const apron=add('1PIT_PARKING_APRON',6),bayPaint=add('PIT_BAY_MARKINGS',7);
  pitPlan.bays.forEach(b=>{const corners=b.corners.map(p=>world(p,track));quad(apron,...corners.map(p=>[p[0],p[1]+.04,p[2]]),3);for(let i=0;i<4;i++)band(bayPaint,openFrames([b.corners[i],b.corners[(i+1)%4]],track),.06,-.06,.055,false);});
  const digits=['abcdef','bc','abdeg','abcdg','bcfg','acdfg','acdefg','abc','abcdefg','abcdfg'],segments={a:[[-.3,.6],[.3,.6]],b:[[.3,.6],[.3,0]],c:[[.3,0],[.3,-.6]],d:[[.3,-.6],[-.3,-.6]],e:[[-.3,-.6],[-.3,0]],f:[[-.3,0],[-.3,.6]],g:[[-.3,0],[.3,0]]};
  pitPlan.stalls.forEach(p=>{const f=frame(p,track),number=String(p.number);[...number].forEach((digit,index)=>{for(const key of digits[Number(digit)]){const [a,b]=segments[key],off=(index-(number.length-1)/2)*.8,point=v=>({x:p.x+(f.forward[0]*(v[0]+off)+f.left[0]*v[1])/s,y:p.y+(f.forward[2]*(v[0]+off)+f.left[2]*v[1])/s,elevation:p.elevation||0});band(bayPaint,openFrames([point(a),point(b)],track),.035,-.035,.065,false);}});});
  function dummy(name,f,lateral=0){dummies.push({name,pos:edge(f,lateral,1),forward:f.forward});}
  for(let i=0;i<pitCount;i++){
    const f=frame(pointOnTrack(g,track.start-(8+Math.floor(i/2)*clamp(Number(options.gridSpacing)||6,4,12))/total),track);dummy(`AC_START_${i}`,f,(i%2?1:-1)*Math.min(2.2,half*.4));
    dummy(`AC_PIT_${i}`,frame(pitPlan.stalls[i],track));
  }
  dummy('AC_HOTLAP_START_0',frame(pointOnTrack(g,track.start-25/total),track));
  const timingPlan=buildTimingPlan(track,g,roadLayout);
  for(const gate of timingPlan.gates)for(const [side,p] of [['L',gate.left],['R',gate.right]])dummies.push({name:`AC_TIME_${gate.id}_${side}`,pos:world(p,track),forward:gameDirection(gate.point.angle).forward});
  if(options.barriers){const wall=add('1WALL_BOUNDARY',4),width=xmax-xmin,depth=zmax-zmin,cx=(xmin+xmax)/2,cz=(zmin+zmax)/2;
    const height=clamp(Number(options.wallHeight)||2,.5,4);box(wall,cx,base,zmin,width,height,.4);box(wall,cx,base,zmax,width,height,.4);box(wall,xmin,base,cz,.4,height,depth);box(wall,xmax,base,cz,.4,height,depth);
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
  const materials=[{name:'Asphalt',color:asphalt.color,noise:asphalt.noise},{name:'Grass',color:(GRASS[track.grass]||GRASS.mown).color,grass:track.grass||'mown'},{name:'White',color:[231,231,215]},{name:'Kerb red',color:[186,56,44]},{name:'Barrier',color:[153,155,153]},{name:'Pit asphalt',color:PIT_STYLES[pitPlan.settings.style].color,noise:7},{name:'Pit apron',color:[148,153,147],noise:9},{name:'Pit bay paint',color:[228,199,114]},{name:'Tree bark',color:[97,75,54]},{name:'Foliage',color:[58,104,65]},{name:'Foliage light',color:[83,132,74]}];
  const trunks=add('1WALL_TREE_TRUNKS',8),leaves=add('SCENERY_TREE_CANOPY',9),leafHighlights=add('SCENERY_TREE_HIGHLIGHTS',10);
  const triangle=(m,a,b,c)=>{const index=m.vertices.length,n=normalize(cross(sub(b,a),sub(c,a)));[a,b,c].forEach(p=>m.vertices.push({pos:p,normal:n,uv:[p[0]/3,p[2]/3],tangent:[1,0,0]}));m.indices.push(index,index+1,index+2);};
  const crown=(m,x,y,z,r,h)=>{const ring=[[x+r,y,z],[x,y,z+r],[x-r,y,z],[x,y,z-r]],top=[x,y+h,z],bottom=[x,y-h*.6,z];for(let i=0;i<4;i++){triangle(m,ring[(i+1)%4],ring[i],top);triangle(m,ring[i],ring[(i+1)%4],bottom);}};
  materials.push({name:'Building plaster',color:[196,191,172],noise:4},{name:'Roof graphite',color:[74,85,90],noise:5},{name:'Building glass',color:[57,91,105],noise:2},{name:'Building trim',color:[211,220,210],noise:2},{name:'Roof terracotta',color:[160,105,78],noise:6},{name:'Roof blue',color:[75,115,133],noise:5},{name:'Grandstand seats',color:[151,87,49],noise:3});
  materials[8].tree=materials[9].tree=materials[10].tree=true;
  const foliage={broadleaf:[leaves,leafHighlights],pine:[leaves,leafHighlights]},used=new Set((options.trees?track.trees||[]:[]).map(t=>treeSettings(t).type));
  for(const type of used)if(!foliage[type])foliage[type]=TREE_SPECIES[type].colors.slice(0,2).map((color,i)=>{const mat=materials.length;materials.push({name:`Tree ${type} ${i?'highlight':'foliage'}`,color:[1,3,5].map(j=>parseInt(color.slice(j,j+2),16)),noise:7,tree:true});return add(`SCENERY_TREE_${type.toUpperCase()}_${i}`,mat);});
  let birchBark=trunks;if(used.has('birch')){const mat=materials.length;materials.push({name:'Tree birch bark',color:[212,212,187],noise:16,tree:true});birchBark=add('1WALL_TREE_BIRCH_TRUNKS',mat);}
  for(const source of (options.trees?track.trees||[]:[]).slice(0,300)){
    const tree=treeSettings(source),p=world({...source,elevation:base},track),h=tree.height,[dark,light]=foliage[tree.type],x=p[0],z=p[2];
    box(tree.type==='birch'?birchBark:trunks,x,base,z,Math.max(.16,h*.035),h*(tree.type==='palm'?.84:.7),Math.max(.16,h*.035));
    if(tree.type==='pine')for(let i=0;i<3;i++)crown(i%2?light:dark,x,base+h*(.35+i*.2),z,h*(.27-i*.06),h*.23);
    else if(tree.type==='cypress'){crown(dark,x,base+h*.59,z,h*.16,h*.41);crown(light,x+h*.025,base+h*.72,z,h*.11,h*.27);}
    else if(tree.type==='palm'){
      crown(dark,x,base+h*.84,z,h*.09,h*.08);
      for(let i=0;i<8;i++){const a=i*Math.PI/4,dir=[Math.cos(a),Math.sin(a)],side=[-dir[1],dir[0]],stem=[x,base+h*.86,z],mid=[x+dir[0]*h*.23,base+h*.98,z+dir[1]*h*.23],tip=[x+dir[0]*h*.42,base+h*.77,z+dir[1]*h*.42],a1=[mid[0]+side[0]*h*.065,mid[1],mid[2]+side[1]*h*.065],b1=[mid[0]-side[0]*h*.065,mid[1],mid[2]-side[1]*h*.065],m=i%2?light:dark;for(const pts of [[stem,a1,b1],[a1,tip,b1]]){triangle(m,...pts);triangle(m,...[...pts].reverse());}}
    }else if(tree.type==='birch'){for(let i=0;i<3;i++)crown(i%2?light:dark,x+(i-1)*h*.09,base+h*(.58+i*.12),z+(i%2)*h*.06,h*.19,h*.16);}
    else if(tree.type==='blossom'){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;crown(i%2?light:dark,x+Math.cos(a)*h*.1,base+h*(.68+(i%2)*.08),z+Math.sin(a)*h*.1,h*.25,h*.21);}}
    else{crown(dark,x,base+h*.72,z,h*.32,h*.28);crown(light,x+h*.14,base+h*.79,z+h*.09,h*.23,h*.21);}
  }
  const facadeMaterials={plaster:11},roofMaterials={graphite:12,terracotta:15,blue:16};
  for(const [key,value] of Object.entries(BUILDING_FACADES))if(key!=='plaster'){facadeMaterials[key]=materials.length;materials.push({name:'Building '+key,color:value.color,noise:5,finish:key});}
  for(const [key,value] of Object.entries(BUILDING_ROOFS))if(!(key in roofMaterials)){roofMaterials[key]=materials.length;materials.push({name:'Roof '+key,color:value.color,noise:5});}
  const fuelAccent=materials.length;materials.push({name:'Fuel station amber',color:[197,150,52],noise:3});
  (options.buildings?(track.buildings||[]):[]).slice(0,60).forEach((source,index)=>{
    const b={...source,...buildingSettings(source)},center=world(b,track),parts=[],part=(name,mat)=>{const m=add(name,mat);parts.push(m);return m;};
    const body=part(`1WALL_BUILDING_${index}`,facadeMaterials[b.facade]),roof=part(`1WALL_BUILDING_ROOF_${index}`,roofMaterials[b.roof]),glass=part(`BUILDING_WINDOWS_${index}`,13),trim=part(`BUILDING_TRIM_${index}`,14);
    if(b.type==='grandstand'){
      const seats=part(`BUILDING_SEATS_${index}`,17),rows=6;for(let row=0;row<rows;row++){const z=-b.depth/2+(row+.5)*b.depth/rows,h=b.height*.65*(row+1)/rows;box(body,0,0,z,b.width,h,b.depth/rows+.02);box(seats,0,h+.06,z,b.width*.94,.18,b.depth/rows*.32);}
      for(const x of [-b.width*.46,b.width*.46])for(const z of [-b.depth*.45,b.depth*.45])box(body,x,0,z,.22,b.height,.22);box(roof,0,b.height,0,b.width+.6,.22,b.depth+.6);
    }else if(b.type==='warehouse'){
      box(body,0,0,0,b.width,b.height,b.depth);const ridge=b.height+Math.min(3,b.depth*.2);
      quad(roof,[-b.width/2-.25,b.height,-b.depth/2-.25],[-b.width/2-.25,ridge,0],[b.width/2+.25,ridge,0],[b.width/2+.25,b.height,-b.depth/2-.25]);
      quad(roof,[-b.width/2-.25,ridge,0],[-b.width/2-.25,b.height,b.depth/2+.25],[b.width/2+.25,b.height,b.depth/2+.25],[b.width/2+.25,ridge,0]);
      triangle(body,[-b.width/2,b.height,-b.depth/2],[-b.width/2,b.height,b.depth/2],[-b.width/2,ridge,0]);triangle(body,[b.width/2,b.height,b.depth/2],[b.width/2,b.height,-b.depth/2],[b.width/2,ridge,0]);
      for(const x of [-b.width*.22,b.width*.22]){box(trim,x,.1,-b.depth/2-.025,b.width*.35,b.height*.78,.08);box(glass,x,.25,-b.depth/2-.08,b.width*.3,b.height*.7,.04);}box(trim,0,.03,0,b.width+.12,.14,b.depth+.12);
    }else if(b.type==='fuel'){
      box(trim,0,0,0,b.width,.15,b.depth);
      for(const x of [-b.width*.42,b.width*.42])for(const z of [-b.depth*.38,b.depth*.38])box(body,x,.15,z,.3,b.height-.15,.3);
      box(roof,0,b.height,0,b.width+.6,.28,b.depth+.6);
      const accent=part(`BUILDING_FUEL_FASCIA_${index}`,fuelAccent);box(accent,0,b.height-.25,-b.depth/2-.26,b.width+.6,.4,.18);
      for(const x of [-b.width*.22,b.width*.22]){box(body,x,.15,0,1.15,1.65,.65);box(trim,x,1.45,-.37,.85,.25,.06);box(glass,x,.85,-.37,.55,.4,.06);box(accent,x,.2,0,1.22,.18,.7);}
    }else if(b.type==='hospitality'){
      const lower=b.height*.45;box(body,0,0,0,b.width,lower,b.depth);box(body,0,lower,b.depth*.12,b.width*.86,b.height-lower,b.depth*.76);
      box(roof,0,b.height,b.depth*.12,b.width*.86+.5,.3,b.depth*.76+.5);
      box(trim,0,lower,-b.depth*.38,b.width+.15,.2,b.depth*.24);
      for(const x of [-b.width*.47,b.width*.47])box(trim,x,lower,-b.depth*.37,.12,.85,b.depth*.26);
      box(trim,0,lower+.75,-b.depth*.5,b.width,.12,.12);
      for(const [y,h,z,width] of [[.7,Math.min(2,lower-1),-b.depth/2-.035,b.width*.86],[lower+.7,Math.min(2,b.height-lower-.9),-b.depth*.26-.035,b.width*.73]]){box(glass,0,y,z,width,h,.06);for(let x=-width/2;x<=width/2;x+=Math.max(1.8,width/8))box(trim,x,y,z-.04,.1,h,.1);}
    }else if(b.type==='medical'){
      box(body,0,0,0,b.width,b.height,b.depth);box(roof,0,b.height,0,b.width+.5,.3,b.depth+.5);
      for(const x of [-b.width*.29,b.width*.12,b.width*.32])box(glass,x,.9,-b.depth/2-.04,b.width*.14,1.35,.06);
      box(trim,-b.width*.05,.1,-b.depth/2-.06,b.width*.13,2.35,.12);box(roof,-b.width*.05,b.height*.58,-b.depth/2-.7,b.width*.22,.18,1.5);
      const crossRoof=part(`BUILDING_MEDICAL_CROSS_${index}`,3),size=Math.min(b.width,b.depth)*.42;box(crossRoof,0,b.height+.32,0,size,.045,size*.25);box(crossRoof,0,b.height+.32,0,size*.25,.045,size);
    }else if(b.type==='cafe'){
      box(body,0,0,0,b.width,b.height,b.depth);box(roof,0,b.height,0,b.width+.4,.3,b.depth+.4);
      box(glass,0,.6,-b.depth/2-.035,b.width*.82,Math.min(2,b.height-.9),.06);
      box(roof,0,b.height*.72,-b.depth*.57,b.width*.93,.18,b.depth*.28);
      for(const x of [-b.width*.4,b.width*.4])box(trim,x,0,-b.depth*.68,.15,b.height*.72,.15);
      const furniture=part(`BUILDING_CAFE_FURNITURE_${index}`,17);for(const x of [-b.width*.22,b.width*.22]){box(trim,x,.02,-b.depth*.6,.13,.72,.13);box(furniture,x,.74,-b.depth*.6,1.1,.12,.7);}
    }else{
      box(body,0,0,0,b.width,b.height,b.depth);box(roof,0,b.height,0,b.width+.5,.35,b.depth+.5);
      if(b.type==='garage'){const bays=Math.max(1,Math.floor(b.width/4));for(let i=0;i<bays;i++){const x=-b.width/2+(i+.5)*b.width/bays;box(trim,x,.12,-b.depth/2-.03,b.width/bays*.86,b.height*.72,.07);box(glass,x,.3,-b.depth/2-.08,b.width/bays*.75,b.height*.6,.04);for(let y=.6;y<b.height*.6;y+=.6)box(trim,x,y,-b.depth/2-.11,b.width/bays*.75,.045,.04);}}
      else{const floors=b.type==='tower'?Math.max(1,Math.floor(b.height/3)):1;for(let f=0;f<floors;f++){const y=f*b.height/floors+.7,h=Math.min(1.5,b.height/floors-.9);for(const side of [-1,1]){box(glass,0,y,side*(b.depth/2+.025),b.width*.8,h,.045);box(glass,side*(b.width/2+.025),y,0,.045,h,b.depth*.8);}box(trim,0,y-.15,0,b.width+.15,.12,b.depth+.15);}box(trim,0,.1,-b.depth/2-.05,1.1,Math.min(2.2,b.height-.2),.1);if(b.type==='marshal'){box(trim,0,.2,0,b.width+.3,.35,b.depth+.3);for(const x of [-b.width*.4,b.width*.4])box(trim,x,0,-b.depth/2-.3,.16,b.height,.16);}}
    }
    if(!b.windows){glass.vertices=[];glass.indices=[];}
    const r=b.rotation*Math.PI/180,c=Math.cos(r),s=Math.sin(r);for(const m of parts)for(const v of m.vertices){const [x,y,z]=v.pos,[nx,ny,nz]=v.normal,[tx,ty,tz]=v.tangent;v.pos=[center[0]+x*c-z*s,base+y,center[2]+x*s+z*c];v.normal=[nx*c-nz*s,ny,nx*s+nz*c];v.tangent=[tx*c-tz*s,ty,tx*s+tz*c];}
  });
  return {meshes:meshes.filter(m=>m.indices.length),dummies,materials,frames,pitFrames,pitPlan,roadLayout,timingPlan,weather,length:total,pitCount,options};
}

export function writeKn5(scene){
  const textures=scene.textures||(scene.textures=scene.materials.map(m=>createTexture(m)));
  const w=new BinaryWriter();w.bytes('sc6969').u32(6).u32(0).u32(scene.materials.length);
  textures.forEach(({name,bytes})=>w.u32(1).string(name).u32(bytes.length).bytes(bytes));
  w.u32(scene.materials.length);
  scene.materials.forEach((m,i)=>{
    w.string(m.name).string('ksPerPixel').u8(0).u8(0).u32(0);
    const properties=materialProperties(m);w.u32(Object.keys(properties).length);
    Object.entries(properties).forEach(([name,value])=>{w.string(name).f32(Array.isArray(value)?0:value).floats([0,0]).floats(Array.isArray(value)?value:[0,0,0]).floats([0,0,0,0]);});
    w.u32(1).string('txDiffuse').u32(0).string(textures[i].name);
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
  // Local X is the car's left side, not its right. Use a proper rotation (det +1).
  scene.dummies.forEach(d=>{const f=d.forward,left=[f[2],0,-f[0]];w.u32(1).string(d.name).u32(0).u8(1).floats([...left,0,0,1,0,0,...f,0,...d.pos,1]);});
  return w.finish();
}
export function writeAi(frames,width,closed=true){
  // Native closed splines wrap to point zero. A duplicate seam point creates
  // a zero-length segment and can confuse lap progress and spline lookup.
  const points=frames,w=new BinaryWriter();
  w.u32(7).u32(points.length).u32(0).u32(0);
  const distances=[];let distance=0;
  points.forEach((f,i)=>{if(i)distance+=Math.hypot(...sub(f.pos,points[i-1].pos));distances.push(distance);w.floats(f.pos).f32(distance).u32(i);});
  w.u32(points.length);
  points.forEach((f,i)=>{
    const before=points[closed?(i+points.length-1)%points.length:Math.max(0,i-1)],after=points[closed?(i+1)%points.length:Math.min(points.length-1,i+1)],a=before.forward,b=after.forward;
    const span=Math.hypot(...sub(f.pos,before.pos))+Math.hypot(...sub(after.pos,f.pos)),angle=Math.acos(clamp(a[0]*b[0]+a[2]*b[2],-1,1)),radius=angle>.0001?Math.max(2,span/angle):10000;
    const speed=closed?clamp(Math.sqrt(8*radius)*3.6,25,180):40;
    const segmentLength=Math.hypot(...sub(f.pos,before.pos)),normal=normalize([-f.left[0]*f.bank,1,-f.left[2]*f.bank]),grade=segmentLength?(f.pos[1]-before.pos[1])/segmentLength:0;
    // AiPoint.Length is cumulative; AiPointExtra.Length is the local segment.
    // Stock splines use Direction=-1 and a bank-aware surface normal.
    w.floats([speed,.65,0,0,radius,width/2,width/2,0,-1,...normal,segmentLength,...f.forward,0,grade]);
  });
  w.u32(0);return w.finish();
}
function surface(key,valid,pit=false,options=DEFAULT_EXPORT){return `KEY=${key}\nFRICTION=${key==='GRASS'?clamp(Number(options.grassGrip)||.7,.3,.9):['ROAD','PIT','KERB'].includes(key)?clamp(Number(options.roadGrip)||1,.8,1.2):1}\nDAMPING=0\nWAV=\nWAV_PITCH=0\nFF_EFFECT=NULL\nDIRT_ADDITIVE=${valid?0:1}\nIS_VALID_TRACK=${valid?1:0}\nBLACK_FLAG_TIME=0\nSIN_HEIGHT=0\nSIN_LENGTH=0\nIS_PITLANE=${pit?1:0}\nVIBRATION_GAIN=${key==='KERB'?.1:0}\nVIBRATION_LENGTH=.2\n`;}
export function validateExport(track){
  const errors=[],warnings=[],g=buildGeometry(track.points||[],track.smooth),s=unit(track);
  if((track.points?.length||0)<3||g.length*s<60)errors.push('Create a closed circuit at least 60 meters long.');
  if(track.complete===false)errors.push('Use Complete circuit before exporting the track.');
  if(track.barriers?.some(b=>b.points.length<2))errors.push('Finish each barrier with at least two points or remove it.');
  if(track.pit?.length===1)errors.push('Add a second pit-lane point or choose the automatic pit lane.');
  if(track.points?.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))errors.push('The circuit contains invalid coordinates.');
  if(track.width<4||track.width>30)errors.push('Track width must be between 4 and 30 meters.');
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
  if(!track.pit?.length)warnings.push('An automatic service lane is fitted beside a clear section of track, with entry and exit joins. Review it in 3D.');
  if(track.export?.ai!==false)warnings.push('Generated AI follows the centerline. Refine it in-game for competitive races.');
  const slots=clamp(Math.round(Number(track.export?.pitboxes)||8),1,16),gridLength=8+Math.floor((slots-1)/2)*clamp(Number(track.export?.gridSpacing)||6,4,12);if(track.points?.length>=3&&gridLength>=g.length*s)warnings.push('The starting grid wraps around this short circuit. Reduce pit count or grid row spacing.');
  const buildingPitPlan=buildPitPlan(track);if(buildingPitPlan.overlapsRoad)warnings.push('The custom service lane overlaps the racing road. Use Fit automatic connected lane or move the pit handles onto clear ground.');
  for(const [index,raw] of (track.export?.buildings!==false?(track.buildings||[]):[]).entries()){const b={...raw,...buildingSettings(raw)},plan=buildingPitPlan,corners=buildingCorners(b,s);if(poly.some(p=>buildingContains(b,p,s,track.width/2))||[...plan.path,...plan.parkingPath,...plan.entryConnection,...plan.exitConnection,...plan.bays.flatMap(v=>v.corners)].some(p=>buildingContains(b,p,s,plan.settings.width/2)))warnings.push(`Building ${index+1} overlaps road or pits. Move it before driving.`);if(corners.some(p=>p.x<0||p.x>1000||p.y<0||p.y>740))warnings.push(`Building ${index+1} extends beyond the editor area. The exported grass base will expand to support it.`);}
  return {errors,warnings,length:g.length*s};
}
function sceneExtension(scene,track){
  const lines=['[ABOUT]','AUTHOR=APEX Circuit Workshop','VERSION=11.0','DESCRIPTION=Explicit opaque material bindings and grass scenery',''];
  scene.materials.forEach((m,index)=>{lines.push(`[SHADER_REPLACEMENT_${index}]`,`MATERIALS=${m.name}`,'SHADER=ksPerPixel','RESOURCE_0=txDiffuse',`RESOURCE_TEXTURE_0=${scene.textures[index].name}`);Object.entries(materialProperties(m)).forEach(([key,value],i)=>lines.push(`PROP_${i}=${key}, ${Array.isArray(value)?value.join(', '):value}`));lines.push('');});
  const grass=GRASS[track.grass]||GRASS.mown;lines.push('[GRASS_FX]',`ACTIVE=${scene.options.grassFx?1:0}`,'GRASS_MESHES=1GRASS_TERRAIN','GRASS_MATERIALS=Grass',`OCCLUDING_MATERIALS=${scene.materials.filter(m=>m.name!=='Grass'&&!m.tree).map(m=>m.name).join(', ')}`,'ORIGINAL_GRASS_MATERIALS=','MASK_MAIN_THRESHOLD=-1','MASK_RED_THRESHOLD=0','MASK_MIN_LUMINANCE=-1','MASK_MAX_LUMINANCE=1',`SHAPE_SIZE=${grass.size}`,`SHAPE_TIDY=${grass.tidy}`,`SHAPE_CUT=${grass.cut}`,'SHAPE_WIDTH=1','');return lines.join('\n');
}
export function exportFiles(track,images={}){
  const report=validateExport(track);if(report.errors.length)throw new Error(report.errors.join(' '));
  const scene=createScene(track),slug=trackSlug(track.name),root=`content/tracks/${slug}/`,files={};
  const put=(p,v)=>files[root+p]=v;
  put(`${slug}.kn5`,writeKn5(scene));put('models.ini',`[MODEL_0]\nFILE=${slug}.kn5\nPOSITION=0,0,0\nROTATION=0,0,0\n`);
  scene.textures.forEach(texture=>put(`texture/${texture.name}`,texture.bytes));
  put('data/surfaces.ini',['ROAD','GRASS','KERB','PIT','WALL'].map((key,i)=>`[SURFACE_${i}]\n${surface(key,!['GRASS','WALL'].includes(key),key==='PIT',scene.options)}`).join('\n'));
  put('data/lighting.ini',`[LIGHTING]\nSUN_PITCH_ANGLE=${scene.weather.sunPitch}\nSUN_HEADING_ANGLE=${scene.weather.sunHeading}\n`);
  put('data/crew.ini','[HEADER]\nSIDE=1\n');
  put('data/sections.ini',sectionsIni(scene.timingPlan));
  put('apex_timing.json',JSON.stringify({start:track.start||0,splits:scene.timingPlan.splits,sectorLengthsMeters:scene.timingPlan.sectorLengths,gates:scene.timingPlan.gates.map(g=>({name:`AC_TIME_${g.id}`,lapProgress:g.progress,left:world(g.left,track),right:world(g.right,track)}))},null,2));
  const details=track.details||{},tags=[details.type||'circuit','apex','generated',...(details.tags||'').split(',').map(t=>t.trim()).filter(Boolean)];
  put('ui/ui_track.json',JSON.stringify({name:track.name,description:details.description||'A circuit traced and generated with APEX. Browser-generated prototype; verify in practice before racing.',tags:[...new Set(tags)],geotags:track.background?.type==='map'?[String(track.background.lat),String(track.background.lon)]:[],country:scene.options.country,city:scene.options.city,length:`${Math.round(scene.length)} m`,width:`${track.width} m`,pitboxes:String(scene.pitCount),author:scene.options.author,version:details.version||'1.0',url:details.website||'https://deepinkgroup.github.io/apex-circuit-workshop/'},null,2));
  if(scene.options.ai){put('ai/fast_lane.ai',writeAi(scene.frames,track.width));put('ai/pit_lane.ai',writeAi(scene.pitFrames,scene.pitPlan.settings.width,false));}
  for(const [name,bytes] of Object.entries(images))put(name,bytes);
  if(images['map.png'])put('data/map.ini',mapIni(createTrackMap(track,undefined,scene.pitPlan,scene.roadLayout)));
  put('apex_source.json',JSON.stringify({...track,format:'apex-circuit',version:11,background:null},null,2));
  put('apex_analysis.json',JSON.stringify({...analyzeTrack(track),exportReadiness:report},null,2));
  files['INSTALL.txt']=`APEX / ${track.name}\n\nINSTALL\nDrag this ZIP into Content Manager and install the detected track.\nOr extract the content folder into your Assetto Corsa installation.\nResult: assettocorsa/content/tracks/${slug}/${slug}.kn5\nSelect ${track.name} in Practice and choose one car first.\n\nYOUR PACKAGE\n${scene.pitCount} pit boxes and grid slots · ${scene.options.gridSpacing} m row spacing\nRoad grip ${scene.options.roadGrip} · grass grip ${scene.options.grassGrip}\nGrass: ${(GRASS[track.grass]||GRASS.mown).label} · Buildings: ${scene.options.buildings?(track.buildings||[]).length:0} · Trees: ${scene.options.trees?(track.trees||[]).length:0}\n\nABOUT THIS EXPORT\nNative KN5 geometry and textures, collision surfaces, start and pit spawns, timing gates, and optional centerline AI are generated in the browser. No Blender or ksEditor conversion is required.\nOpaque uncompressed BGRA DDS textures with mipmaps are embedded in the KN5 and copied to texture/. Opaque materials include explicit shader properties with moderated diffuse lighting and zero emissive output. An extension/ext_config.ini supplies explicit texture bindings and optional Grass FX for CSP; the colored base works without CSP. Textured grass covers the empty ground. Placed buildings have collision bodies and detailed roofs, windows, and garage doors. Trees and buildings follow the scenery switches in Assetto Corsa setup. Custom corners and styled pit lanes are included. Road and kerbs share joined boundary geometry at sharp turns. Start/finish white tiles are visual paint on a non-collision mesh; no raised tiles are added to the collision road. Preview weather does not enable rain physics; choose game weather in Content Manager. Reference imagery is not included. Manual elevation is exported; surrounding terrain is a flat base.\nLap timing uses start/finish plus S1 and S2 in driving order. Exported gates span the actual joined road edges, and sections.ini follows the configured split percentages. apex_timing.json lists native checkpoint positions and sector lengths. Fast-lane AI uses unique cyclic points and local segment lengths, with progress starting at the same finish line. Replace both AI files when updating an installed mod; old AI data can misreport progress. AI is a starting line, not a tuned racing line. Inspect spawn positions and test the track in-game.\nThe minimap PNG and map.ini share one native X/Z projection, including pits beyond the drawing bounds. Image dimensions are pixels, offsets are world meters, and SCALE_FACTOR is meters per pixel. Replace both map.png and data/map.ini when updating an installed track. Exit the current driving session, export a fresh ZIP, and replace the old track files in Content Manager. Re-enter the session to load the new model and versioned textures. Old downloads cannot update themselves. ui/preview.png is the color overview; map.png and ui/outline.png are white route masks by design. This export has not been certified in Assetto Corsa.\n\n${report.warnings.join('\n')}\n`;
  put('extension/ext_config.ini',sceneExtension(scene,track));
  return {files,scene,slug,report};
}
export function exportZip(track,images={}){const result=exportFiles(track,images);return {...result,bytes:zipFiles(result.files)};}
