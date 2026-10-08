import {BARRIER_TYPES} from './barriers.js?v=20261008-structure-design';
import {buildGeometry,pointOnTrack,closestOnTrack,clamp} from './engine.js?v=20261008-structure-design';
import {buildRoadLayout} from './road-layout.js?v=20261008-structure-design';
import {heightProfile,profileAt} from './height-profile.js?v=20261008-structure-design';
import {buildingContains} from './scenery.js?v=20261008-structure-design';
import {treeRadius} from './trees.js?v=20261008-structure-design';
const lerp=(a,b,t)=>a+(b-a)*t;
export const PIT_STYLES={blue:{label:'Blue pit lane',color:[60,89,108],line:'#81c1d4'},classic:{label:'Classic asphalt',color:[61,65,69],line:'#e3d79c'}};
export function pitSettings(track){return {width:clamp(Number(track.pitSettings?.width)||6,4,10),setback:clamp(Number(track.pitSettings?.setback)||5,3,30),mergeLength:clamp(Number(track.pitSettings?.mergeLength)||28,12,60),bendRadius:clamp(Number(track.pitSettings?.bendRadius)||14,4,30),autoElevation:track.pitSettings?.autoElevation!==false,style:PIT_STYLES[track.pitSettings?.style]?track.pitSettings.style:'blue',side:['left','right'].includes(track.pitSettings?.side)?track.pitSettings.side:'auto',outerBarriers:track.pitSettings?.outerBarriers!==false,barrierType:BARRIER_TYPES[track.pitSettings?.barrierType]?track.pitSettings.barrierType:'concrete',barrierHeight:clamp(Number(track.pitSettings?.barrierHeight)||1.2,1,4),autoConnect:track.pitSettings?.autoConnect!==false};}
export function resamplePath(points,scale){
  if(points.length<2)return points.map(p=>({...p}));
  const stat=stations(points,scale),count=clamp(Math.ceil(stat.length/.75),1,3500),result=[],plan={path:points,...stat,elevationProfile:heightProfile(stat.distances,points.map(p=>p.elevation),stat.length),bankProfile:heightProfile(stat.distances,points.map(p=>p.bank),stat.length),scale};for(let i=0;i<=count;i++)result.push(pointOnPit(plan,stat.length*i/count));return result;
}
// Tangent fillets stay within each authored corner's triangle instead of
// overshooting into the racing road. The original handles remain editable.
export function smoothPitPath(points,scale,width=6,bendRadius=14){
 if(points.length<3)return resamplePath(points,scale);
 const stat=stations(points,scale),height=heightProfile(stat.distances,points.map(p=>p.elevation),stat.length),bank=heightProfile(stat.distances,points.map(p=>p.bank),stat.length),result=[{...points[0]}];
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1],before=Math.hypot(b.x-a.x,b.y-a.y)*scale,after=Math.hypot(c.x-b.x,c.y-b.y)*scale,cut=Math.min(before*.45,after*.45,Math.max(width*.9,bendRadius));
  if(cut<.05){result.push({...b});continue;}
  const p={x:b.x+(a.x-b.x)*cut/before,y:b.y+(a.y-b.y)*cut/before},q={x:b.x+(c.x-b.x)*cut/after,y:b.y+(c.y-b.y)*cut/after},steps=Math.max(6,Math.ceil(cut*2/.5));
  for(let j=0;j<=steps;j++){const t=j/steps,u=1-t,d=stat.distances[i]+cut*(2*t-1);result.push({...b,x:u*u*p.x+2*u*t*b.x+t*t*q.x,y:u*u*p.y+2*u*t*b.y+t*t*q.y,elevation:profileAt(height,d).value,bank:profileAt(bank,d).value});}
 }
 result.push({...points.at(-1)});return resamplePath(result,scale);
}
function stations(path,scale){let length=0;const distances=[0];for(let i=1;i<path.length;i++){length+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y)*scale;distances.push(length);}return {length,distances};}
export function pointOnPit(plan,distance){
  const path=plan.path;if(!path.length)return {x:500,y:370,elevation:0,angle:0};if(path.length===1)return {...path[0],angle:0};
  let i=1;while(i<path.length-1&&plan.distances[i]<distance)i++;const a=path[i-1],b=path[i],span=plan.distances[i]-plan.distances[i-1],t=span?clamp((distance-plan.distances[i-1])/span,0,1):0;
  const height=plan.elevationProfile?profileAt(plan.elevationProfile,distance):{value:lerp(a.elevation||0,b.elevation||0,t),grade:span?((b.elevation||0)-(a.elevation||0))/span:0};
  const banking=plan.bankProfile?profileAt(plan.bankProfile,distance):{value:lerp(a.bank||0,b.bank||0,t),grade:span?((b.bank||0)-(a.bank||0))/span:0};
  return {x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),elevation:height.value,grade:height.grade*(plan.scale||1),bank:banking.value,bankGrade:banking.grade*(plan.scale||1),angle:Math.atan2(b.y-a.y,b.x-a.x),...(Number.isFinite(a.width)&&Number.isFinite(b.width)?{width:lerp(a.width,b.width,t)}:{})};
}
export function shifted(p,offsetMeters,scale){return {...p,x:p.x+Math.sin(p.angle)*offsetMeters/scale,y:p.y-Math.cos(p.angle)*offsetMeters/scale,elevation:(p.elevation||0)+offsetMeters*Math.tan((p.bank||0)*Math.PI/180),grade:(p.grade||0)+offsetMeters*(p.bankGrade||0)*Math.PI/180/Math.cos((p.bank||0)*Math.PI/180)**2};}
// Narrow mouths overlap the outer driving lane, then widen toward the service road.
// Joined road edges keep merge points correct on banked and sharp corners.
function shoulder(g,progress,track,settings,scale,side,road){const p=pointOnTrack(g,progress),rail=side>0?road.left:road.right,n=rail.length,mouth=Math.min(settings.width,Math.max(2.2,Math.min(3.2,track.width*.5))),station=(g.closed===false?clamp(progress,0,1):((progress%1)+1)%1)*g.length*scale;if(!n)return {...shifted(p,side*(track.width/2-mouth/2+.25),scale),width:mouth};let i=0;while(i<n-1&&road.center[i+1].station<=station)i++;const j=(i+1)%n,span=(j===0?g.length*scale:road.center[j].station)-road.center[i].station,t=span?clamp((station-road.center[i].station)/span,0,1):0;return {...shifted({...p,x:lerp(rail[i].x,rail[j].x,t),y:lerp(rail[i].y,rail[j].y,t),elevation:lerp(rail[i].elevation,rail[j].elevation,t),grade:(p.grade||0)+side*track.width/2*(p.bankGrade||0)*Math.PI/180/Math.cos((p.bank||0)*Math.PI/180)**2},side*(-mouth/2+.25),scale),width:mouth};}
function endpointSide(g,p){const near=closestOnTrack(g,p),road=pointOnTrack(g,near.progress);return (p.x-road.x)*Math.sin(road.angle)-(p.y-road.y)*Math.cos(road.angle)>=0?1:-1;}
export function bayCorners(p,length,width,scale){
  const point=(forward,left)=>({x:p.x+(Math.cos(p.angle)*forward+Math.sin(p.angle)*left)/scale,y:p.y+(Math.sin(p.angle)*forward-Math.cos(p.angle)*left)/scale,elevation:(p.elevation||0)+left*Math.tan((p.bank||0)*Math.PI/180)+forward*(p.grade||0)/scale});
  return [point(-length/2,width/2),point(length/2,width/2),point(length/2,-width/2),point(-length/2,-width/2)];
}
function connection(a,b,firstAngle,lastAngle,scale,width){
  const span=Math.hypot(b.x-a.x,b.y-a.y),handle=Math.min(span*.42,24/scale),c={x:a.x+Math.cos(firstAngle)*handle,y:a.y+Math.sin(firstAngle)*handle},d={x:b.x-Math.cos(lastAngle)*handle,y:b.y-Math.sin(lastAngle)*handle},steps=clamp(Math.ceil((span+handle*2)*scale/.75),12,800),y0=a.elevation||0,y1=b.elevation||0,m0=(a.grade||0)*3*handle,m1=(b.grade||0)*3*handle,k0=(a.bankGrade||0)*3*handle,k1=(b.bankGrade||0)*3*handle;
  return Array.from({length:steps+1},(_,i)=>{const t=i/steps,u=1-t,smooth=t*t*(3-2*t),dx=3*u*u*(c.x-a.x)+6*u*t*(d.x-c.x)+3*t*t*(b.x-d.x),dy=3*u*u*(c.y-a.y)+6*u*t*(d.y-c.y)+3*t*t*(b.y-d.y),vertical=(6*t*t-6*t)*y0+(3*t*t-4*t+1)*m0+(-6*t*t+6*t)*y1+(3*t*t-2*t)*m1;return {x:u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*c.y+3*u*t*t*d.y+t*t*t*b.y,elevation:(2*t*t*t-3*t*t+1)*y0+(t*t*t-2*t*t+t)*m0+(-2*t*t*t+3*t*t)*y1+(t*t*t-t*t)*m1,grade:vertical/(Math.hypot(dx,dy)||1),bank:(2*t*t*t-3*t*t+1)*(a.bank||0)+(t*t*t-2*t*t+t)*k0+(-2*t*t*t+3*t*t)*(b.bank||0)+(t*t*t-t*t)*k1,width:lerp(a.width||width,b.width||width,smooth),angle:Math.atan2(dy,dx)};});
}
function inside(p,polygon){let value=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)value=!value;}return value;}
// Place the service straight independently of the racing line. Only the short
// entry/exit ribbons touch the road; the working lane and bays remain outside it.
function roadDistance(g,p,scale){const near=closestOnTrack(g,p,true);return Math.abs((near.elevation||0)-(p.elevation||0))>=4.5?Infinity:near.distance*scale;}
function sceneryClear(track,p,radius,scale){
 if(track.export?.buildings!==false&&(track.buildings||[]).some(b=>buildingContains(b,p,scale,radius)))return false;
 if(track.export?.trees!==false&&(track.trees||[]).some(t=>Math.hypot(t.x-p.x,t.y-p.y)*scale<treeRadius(t)+radius))return false;
 for(const wall of (track.barriers||[]).filter(w=>!w.automatic))for(let i=1;i<wall.points.length;i++){const a=wall.points[i-1],b=wall.points[i],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);if(Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t)*scale<radius+(wall.width||.8)/2)return false;}return true;
}
function joinProblems(track,g,join,entry,scale,settings){let crossings=0,blocked=0,maxGrade=0;const half=track.width/2;for(let j=0;j<join.length;j++){const p=join[j],t=j/(join.length-1),mouth=(entry?join[0]:join.at(-1)).width,allowance=mouth*(entry?1-t:t);if(roadDistance(g,p,scale)<Math.max(.05,half+(p.width||settings.width)/2-.4-allowance))crossings++;if(j%4===0&&!sceneryClear(track,p,(p.width||settings.width)/2,scale))blocked++;maxGrade=Math.max(maxGrade,Math.abs(p.grade||0)/scale*100);}return {crossings,blocked,maxGrade};}
function bestJoin(track,g,settings,scale,road,p,angle,entry){
 const near=closestOnTrack(g,p,true),total=g.length*scale,side=endpointSide(g,p),base=Math.max(settings.mergeLength,Math.min(60,near.distance*scale*.5));let best=null;
 for(const reach of [...new Set([base,base*1.35,base*1.8,base*2.4])]){const progress=near.progress+(entry?-1:1)*Math.min(total*.22,reach)/total,section=g.structureProfile?.sectionAt((g.closed?((progress%1)+1)%1:clamp(progress,0,1))*total);if(section?.core)continue;const mouth=shoulder(g,progress,track,settings,scale,side,road),path=entry?connection(mouth,p,mouth.angle,angle,scale,settings.width):connection(p,mouth,angle,mouth.angle,scale,settings.width),quality=joinProblems(track,g,path,entry,scale,settings),score=quality.crossings*10000+quality.blocked*10000+Math.max(0,quality.maxGrade-12)*100+reach;if(!best||score<best.score)best={path,score,...quality};}
 if(!best){const mouth=shoulder(g,near.progress,track,settings,scale,side,road),path=entry?connection(mouth,p,mouth.angle,angle,scale,settings.width):connection(p,mouth,angle,mouth.angle,scale,settings.width);best={path,score:Infinity,...joinProblems(track,g,path,entry,scale,settings)};}return best;
}
const pitCache=new Map();
function automaticLane(track,g,settings,scale,count,side,road){
  const total=g.length*scale,rowLength=count*6+12,half=track.width/2,lead=Math.min(settings.mergeLength,total*.12),roadClear=half+settings.width/2+1.5;
  let best=null;
  for(let i=0;i<64;i++){
    const progress=g.closed?(track.start||0)+i/64:(i+.5)/64,center=pointOnTrack(g,progress),angle=center.angle;if(g.structureProfile?.sectionAt(((progress%1)+1)%1*total)?.core)continue;
    const row=(offset,forward)=>{const p=shifted({...center,bank:0,grade:0,bankGrade:0},side*offset,scale);return {...p,x:p.x+Math.cos(angle)*forward/scale,y:p.y+Math.sin(angle)*forward/scale,bank:0,grade:0,bankGrade:0};};
    let offset=half+settings.width/2+settings.setback,points;
    for(let attempt=0;attempt<14;attempt++){
      points=Array.from({length:17},(_,j)=>row(offset,(j/16-.5)*rowLength));
      const clear=points.every(p=>roadDistance(g,p,scale)>=roadClear&&sceneryClear(track,p,settings.width/2+1,scale)&&roadDistance(g,shifted({...p,angle},side*(settings.width/2+3.2),scale),scale)>=half+1&&sceneryClear(track,shifted({...p,angle},side*(settings.width/2+3.2),scale),2,scale)&&(!g.closed||settings.side!=='auto'||!inside(p,g.samples)));
      if(clear)break;
      offset+=Math.max(8,rowLength*.18);
    }
    if(!points.every(p=>roadDistance(g,p,scale)>=roadClear&&sceneryClear(track,p,settings.width/2+1,scale)&&roadDistance(g,shifted({...p,angle},side*(settings.width/2+3.2),scale),scale)>=half+1&&sceneryClear(track,shifted({...p,angle},side*(settings.width/2+3.2),scale),2,scale)&&(!g.closed||settings.side!=='auto'||!inside(p,g.samples))))continue;
    const first=points[0],last=points.at(-1),fraction=Math.min((rowLength/2+lead)/total,.22),entry=shoulder(g,progress-fraction,track,settings,scale,side,road),exit=shoulder(g,progress+fraction,track,settings,scale,side,road);
    if([progress-fraction,progress+fraction].some(value=>g.structureProfile?.sectionAt(((value%1)+1)%1*total)?.core))continue;
    const entryConnection=connection(entry,first,entry.angle,angle,scale,settings.width),exitConnection=connection(last,exit,angle,exit.angle,scale,settings.width);
    // Reject joins that cross racing asphalt instead of branching beside it.
    const checks=[joinProblems(track,g,entryConnection,true,scale,settings),joinProblems(track,g,exitConnection,false,scale,settings)];if(checks.some(check=>check.crossings||check.blocked||check.maxGrade>18))continue;
    const crossings=0;
    const bend=1-Math.cos(entry.angle-angle)+1-Math.cos(exit.angle-angle),distance=(Math.hypot(entry.x-first.x,entry.y-first.y)+Math.hypot(exit.x-last.x,exit.y-last.y))*scale;
    const outside=points.reduce((n,p)=>n+Math.max(0,-p.x,p.x-1000,-p.y,p.y-740)*scale,0)/points.length;
    const score=offset*2+distance+bend*rowLength+crossings*rowLength*4+outside*.8+i*.12+Math.max(...checks.map(check=>check.maxGrade))*2;
    if(!best||score<best.score)best={score,side,safe:true,path:resamplePath([first,last],scale),entryConnection,exitConnection,setback:offset-half-settings.width/2};
  }
  if(!best){
    // Dense layouts still get a service row beyond the circuit's outer extent.
    const progress=track.start||0,center=pointOnTrack(g,progress),nx=side*Math.sin(center.angle),ny=-side*Math.cos(center.angle),extent=Math.max(0,...g.samples.map(p=>((p.x-center.x)*nx+(p.y-center.y)*ny)*scale)),offset=extent+roadClear+settings.setback,c=shifted({...center,bank:0,grade:0,bankGrade:0},side*offset,scale),row=f=>({...c,x:c.x+Math.cos(center.angle)*f/scale,y:c.y+Math.sin(center.angle)*f/scale,bank:0}),first=row(-rowLength/2),last=row(rowLength/2),entry=shoulder(g,progress-.15,track,settings,scale,side,road),exit=shoulder(g,progress+.15,track,settings,scale,side,road);
    best={score:1e12,side,safe:false,path:resamplePath([first,last],scale),entryConnection:connection(entry,first,entry.angle,center.angle,scale,settings.width),exitConnection:connection(last,exit,center.angle,exit.angle,scale,settings.width),setback:offset-half-settings.width/2};
  }
  return best;
}
export function buildPitPlan(track){
  const cacheKey=JSON.stringify([track.points,track.smooth,track.complete,track.width,track.scale,track.start,track.pit,track.pitSettings,track.export?.pitboxes,track.trees,track.buildings,track.barriers,track.export?.trees,track.export?.buildings]);if(pitCache.has(cacheKey))return pitCache.get(cacheKey);
  const scale=clamp(Number(track.scale)||.2,.02,10),g=buildGeometry(track.points||[],track.smooth,track.complete!==false,track),total=g.length*scale,settings=pitSettings(track),count=clamp(Math.round(Number(track.export?.pitboxes)||8),1,16);
  const road=buildRoadLayout(track,g);
  let winding=0;for(let i=0;i<g.samples.length;i++){const a=g.samples[i],b=g.samples[(i+1)%g.samples.length];winding+=a.x*b.y-b.x*a.y;}
  let side=settings.side==='left'?1:settings.side==='right'?-1:winding>=0?1:-1;
  const authored=(track.pit||[]).map(p=>{if(!settings.autoElevation||!g.length)return p;const near=closestOnTrack(g,p,true);return {...p,elevation:profileAt(g.elevationProfile,near.progress*g.length).value,bank:0};});
  let path=authored.length>=2?smoothPitPath(authored,scale,settings.width,settings.bendRadius):[],adjustedCustom=false;
  // Older custom routes often include clicks ON the main road for their entry
  // and exit. Treat those as join hints, not as speed-limited pit pavement.
  if(path.length&&settings.autoConnect&&total>0){const clear=p=>roadDistance(g,p,scale)>=track.width/2+settings.width/2+.5,first=path.findIndex(clear);let last=path.length-1;while(last>=first&&!clear(path[last]))last--;if(first<0||last<=first){path=[];adjustedCustom=true;}else if(first>0||last<path.length-1){path=path.slice(first,last+1);adjustedCustom=true;}}
  let generated=null;
  if(!path.length&&total>0){
    const candidates=(settings.side==='auto'?[side,-side]:[side]).map(value=>automaticLane(track,g,settings,scale,count,value,road));generated=candidates.sort((a,b)=>a.score-b.score)[0];side=generated.side;path=generated?.path||[];
  }
  if(!path.length)path=[{x:500,y:370,elevation:0},{x:550,y:370,elevation:0}];
  const stat=stations(path,scale),plan={path,...stat,count,settings,scale,side,automatic:!!generated||!(track.pit?.length>=2),adjustedCustom,entryConnection:[],exitConnection:[],connected:false,connectionIssues:[]},need=count*6+8;
  // A short trace uses a connected parking apron. It does not reduce the selected grid size.
  plan.expanded=stat.length<need;plan.stalls=[];plan.parkingPath=[];plan.connector=[];
  if(plan.expanded){
    const middle=pointOnPit(plan,stat.length/2),rowLength=count*6+4;let center=shifted({...middle,bank:0,grade:0,bankGrade:0},side*(settings.width/2+5),scale);
    const rowPoint=forward=>({...center,x:center.x+Math.cos(center.angle)*forward/scale,y:center.y+Math.sin(center.angle)*forward/scale});
    for(let attempt=0;attempt<10;attempt++){const clear=Array.from({length:17},(_,j)=>rowPoint((j/16-.5)*rowLength)).every(p=>roadDistance(g,p,scale)>=track.width/2+settings.width/2+1&&sceneryClear(track,p,settings.width/2+4,scale));if(clear)break;center=shifted({...center,bank:0,grade:0,bankGrade:0},side*7,scale);}
    plan.parkingPath=resamplePath([rowPoint(-rowLength/2),rowPoint(rowLength/2)],scale);
    plan.connector=connection(path[0],rowPoint(-rowLength/2),path[0].angle,center.angle,scale,settings.width);
    plan.exitConnector=connection(rowPoint(rowLength/2),path.at(-1),center.angle,path.at(-1).angle,scale,settings.width);
    plan.aiPath=[...plan.connector.slice(0,-1),...plan.parkingPath,...plan.exitConnector.slice(1)];
    for(let i=0;i<count;i++)plan.stalls.push({...shifted(rowPoint((i-(count-1)/2)*6),side*(settings.width/2+1.45),scale),number:i+1});
  }else for(let i=0;i<count;i++){const p=pointOnPit(plan,4+(i+.5)*(stat.length-8)/count);plan.stalls.push({...shifted(p,side*(settings.width/2+1.45),scale),number:i+1});}
  plan.bays=plan.stalls.map(p=>({center:p,corners:bayCorners(p,5.4,3.1,scale)}));
  if(!plan.aiPath)plan.aiPath=path;if(!plan.exitConnector)plan.exitConnector=[];
  if(total>0){
    if(generated){plan.entryConnection=generated.entryConnection;plan.exitConnection=generated.exitConnection;plan.setback=generated.setback;plan.aiPath=[...plan.entryConnection.slice(0,-1),...plan.aiPath,...plan.exitConnection.slice(1)];plan.connected=generated.safe;if(!generated.safe)plan.connectionIssues.push('Automatic fitting found no unobstructed merge. Move scenery or draw a clear service route.');}
    else if(settings.autoConnect){
      const first=path[0],last=path.at(-1),firstAngle=Math.atan2(path[1].y-first.y,path[1].x-first.x),lastAngle=Math.atan2(last.y-path[path.length-2].y,last.x-path[path.length-2].x);
      const entry=bestJoin(track,g,settings,scale,road,first,firstAngle,true),exit=bestJoin(track,g,settings,scale,road,last,lastAngle,false);
      plan.entryConnection=entry.path;plan.exitConnection=exit.path;plan.aiPath=[...entry.path.slice(0,-1),...plan.aiPath,...exit.path.slice(1)];plan.connected=!entry.crossings&&!exit.crossings&&!entry.blocked&&!exit.blocked&&Math.max(entry.maxGrade,exit.maxGrade)<=18;
      if(entry.crossings||exit.crossings)plan.connectionIssues.push('A merge crosses racing asphalt outside its mouth. Move pit handles farther out or fit automatically.');
      if(entry.blocked||exit.blocked)plan.connectionIssues.push('Scenery blocks a pit merge. Move trees, buildings or custom walls.');
      if(Math.max(entry.maxGrade,exit.maxGrade)>18)plan.connectionIssues.push('Pit approach exceeds 18% grade. Lengthen the merge or adjust the route elevation.');
    }
  }
  plan.entry=plan.entryConnection[0]||path[0];plan.exit=plan.exitConnection.at(-1)||path.at(-1);
  plan.connectionLength=stations(plan.entryConnection,scale).length+stations(plan.exitConnection,scale).length;
  plan.overlapsRoad=total>0&&[...path,...plan.parkingPath,...plan.connector,...plan.exitConnector].some(p=>roadDistance(g,p,scale)<track.width/2+settings.width/2-.2);
  const all=[...path,...plan.parkingPath,...plan.connector,...plan.exitConnector,...plan.entryConnection,...plan.exitConnection,...plan.bays.flatMap(b=>b.corners)];plan.bounds={minX:Math.min(...all.map(p=>p.x)),maxX:Math.max(...all.map(p=>p.x)),minY:Math.min(...all.map(p=>p.y)),maxY:Math.max(...all.map(p=>p.y))};
  plan.maxGrade=plan.aiPath.slice(1).reduce((maximum,p,i)=>{const a=plan.aiPath[i],length=Math.hypot(p.x-a.x,p.y-a.y)*scale;return Math.max(maximum,length>.01?Math.abs((p.elevation||0)-(a.elevation||0))/length*100:0);},0);
  pitCache.set(cacheKey,plan);if(pitCache.size>8)pitCache.delete(pitCache.keys().next().value);return plan;
}
