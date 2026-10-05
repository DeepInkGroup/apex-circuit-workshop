import {buildGeometry,pointOnTrack,closestOnTrack,clamp} from './engine.js?v=20261006-scene';
const lerp=(a,b,t)=>a+(b-a)*t;
export const PIT_STYLES={blue:{label:'Blue pit lane',color:[60,89,108],line:'#81c1d4'},classic:{label:'Classic asphalt',color:[61,65,69],line:'#e3d79c'}};
export function pitSettings(track){return {width:clamp(Number(track.pitSettings?.width)||6,4,10),setback:clamp(Number(track.pitSettings?.setback)||5,3,30),style:PIT_STYLES[track.pitSettings?.style]?track.pitSettings.style:'blue',side:['left','right'].includes(track.pitSettings?.side)?track.pitSettings.side:'auto',autoConnect:track.pitSettings?.autoConnect!==false};}
export function resamplePath(points,scale){
  if(points.length<2)return points.map(p=>({...p}));
  const stat=stations(points,scale),count=clamp(Math.ceil(stat.length/1.5),1,3500),result=[],plan={path:points,...stat};for(let i=0;i<=count;i++)result.push(pointOnPit(plan,stat.length*i/count));return result;
}
function stations(path,scale){let length=0;const distances=[0];for(let i=1;i<path.length;i++){length+=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y)*scale;distances.push(length);}return {length,distances};}
export function pointOnPit(plan,distance){
  const path=plan.path;if(!path.length)return {x:500,y:370,elevation:0,angle:0};if(path.length===1)return {...path[0],angle:0};
  let i=1;while(i<path.length-1&&plan.distances[i]<distance)i++;const a=path[i-1],b=path[i],span=plan.distances[i]-plan.distances[i-1],t=span?clamp((distance-plan.distances[i-1])/span,0,1):0;
  return {x:lerp(a.x,b.x,t),y:lerp(a.y,b.y,t),elevation:lerp(a.elevation||0,b.elevation||0,t),bank:lerp(a.bank||0,b.bank||0,t),angle:Math.atan2(b.y-a.y,b.x-a.x)};
}
export function shifted(p,offsetMeters,scale){return {...p,x:p.x+Math.sin(p.angle)*offsetMeters/scale,y:p.y-Math.cos(p.angle)*offsetMeters/scale};}
export function bayCorners(p,length,width,scale){
  const point=(forward,left)=>({x:p.x+(Math.cos(p.angle)*forward+Math.sin(p.angle)*left)/scale,y:p.y+(Math.sin(p.angle)*forward-Math.cos(p.angle)*left)/scale,elevation:p.elevation||0});
  return [point(-length/2,width/2),point(length/2,width/2),point(length/2,-width/2),point(-length/2,-width/2)];
}
function connection(a,b,firstAngle,lastAngle,scale){
  const span=Math.hypot(b.x-a.x,b.y-a.y),handle=Math.min(span*.42,24/scale),c={x:a.x+Math.cos(firstAngle)*handle,y:a.y+Math.sin(firstAngle)*handle},d={x:b.x-Math.cos(lastAngle)*handle,y:b.y-Math.sin(lastAngle)*handle},steps=clamp(Math.ceil(span*scale/1.5),8,600);
  return Array.from({length:steps+1},(_,i)=>{const t=i/steps,u=1-t,smooth=t*t*(3-2*t);return {x:u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*c.y+3*u*t*t*d.y+t*t*t*b.y,elevation:lerp(a.elevation||0,b.elevation||0,smooth),bank:lerp(a.bank||0,b.bank||0,smooth)};});
}
function inside(p,polygon){let value=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)value=!value;}return value;}
// Place the service straight independently of the racing line. Only the short
// entry/exit ribbons touch the road; the working lane and bays remain outside it.
function automaticLane(track,g,settings,scale,count,side){
  const total=g.length*scale,rowLength=count*6+12,half=track.width/2,lead=Math.min(24,Math.max(12,total*.04)),roadClear=half+settings.width/2+1.5;
  let best=null;
  for(let i=0;i<48;i++){
    const progress=g.closed?(track.start||0)+i/48:(i+.5)/48,center=pointOnTrack(g,progress),angle=center.angle;
    const row=(offset,forward)=>{const p=shifted(center,side*offset,scale);return {...p,x:p.x+Math.cos(angle)*forward/scale,y:p.y+Math.sin(angle)*forward/scale,bank:0};};
    let offset=half+settings.width/2+settings.setback,points;
    for(let attempt=0;attempt<14;attempt++){
      points=Array.from({length:17},(_,j)=>row(offset,(j/16-.5)*rowLength));
      const clear=points.every(p=>closestOnTrack(g,p).distance*scale>=roadClear&&closestOnTrack(g,shifted({...p,angle},side*(settings.width/2+3.2),scale)).distance*scale>=half+1&&(!g.closed||settings.side!=='auto'||!inside(p,g.samples)));
      if(clear)break;
      offset+=Math.max(8,rowLength*.18);
    }
    if(!points.every(p=>closestOnTrack(g,p).distance*scale>=roadClear&&closestOnTrack(g,shifted({...p,angle},side*(settings.width/2+3.2),scale)).distance*scale>=half+1&&(!g.closed||settings.side!=='auto'||!inside(p,g.samples))))continue;
    const first=points[0],last=points.at(-1),fraction=Math.min((rowLength/2+lead)/total,.22),entry=pointOnTrack(g,progress-fraction),exit=pointOnTrack(g,progress+fraction);
    const entryConnection=connection(entry,first,entry.angle,angle,scale),exitConnection=connection(last,exit,angle,exit.angle,scale);
    // Prefer a straight, nearby shoulder. Penalize connectors crossing unrelated
    // road sections, but allow their intentional merges at the track endpoints.
    const joins=[[entryConnection,true],[exitConnection,false]];let crossings=0;
    for(const [join,entering] of joins)for(let j=2;j<join.length-2;j+=3){const p=join[j],near=closestOnTrack(g,p),endpoint=entering?entry:exit;if(near.distance*scale<half+settings.width/2&&Math.hypot(p.x-endpoint.x,p.y-endpoint.y)*scale>lead+half+settings.width)crossings++;}
    const bend=1-Math.cos(entry.angle-angle)+1-Math.cos(exit.angle-angle),distance=(Math.hypot(entry.x-first.x,entry.y-first.y)+Math.hypot(exit.x-last.x,exit.y-last.y))*scale;
    const outside=points.reduce((n,p)=>n+Math.max(0,-p.x,p.x-1000,-p.y,p.y-740)*scale,0)/points.length;
    const score=offset*2+distance+bend*rowLength+crossings*rowLength*4+outside*.8+i*.12;
    if(!best||score<best.score)best={score,path:resamplePath([first,last],scale),entryConnection,exitConnection,setback:offset-half-settings.width/2};
  }
  if(!best){
    // Dense layouts still get a service row beyond the circuit's outer extent.
    const progress=track.start||0,center=pointOnTrack(g,progress),nx=side*Math.sin(center.angle),ny=-side*Math.cos(center.angle),extent=Math.max(0,...g.samples.map(p=>((p.x-center.x)*nx+(p.y-center.y)*ny)*scale)),offset=extent+roadClear+settings.setback,c=shifted(center,side*offset,scale),row=f=>({...c,x:c.x+Math.cos(center.angle)*f/scale,y:c.y+Math.sin(center.angle)*f/scale,bank:0}),first=row(-rowLength/2),last=row(rowLength/2),entry=pointOnTrack(g,progress-.15),exit=pointOnTrack(g,progress+.15);
    best={path:resamplePath([first,last],scale),entryConnection:connection(entry,first,entry.angle,center.angle,scale),exitConnection:connection(last,exit,center.angle,exit.angle,scale),setback:offset-half-settings.width/2};
  }
  return best;
}
export function buildPitPlan(track){
  const scale=clamp(Number(track.scale)||.2,.02,10),g=buildGeometry(track.points||[],track.smooth,track.complete!==false),total=g.length*scale,settings=pitSettings(track),count=clamp(Math.round(Number(track.export?.pitboxes)||8),1,16);
  let winding=0;for(let i=0;i<g.samples.length;i++){const a=g.samples[i],b=g.samples[(i+1)%g.samples.length];winding+=a.x*b.y-b.x*a.y;}
  const side=settings.side==='left'?1:settings.side==='right'?-1:winding>=0?1:-1;
  let path=track.pit?.length>=2?resamplePath(track.pit,scale):[];
  let generated=null;
  if(!path.length&&total>0){
    generated=automaticLane(track,g,settings,scale,count,side);path=generated?.path||[];
  }
  if(!path.length)path=[{x:500,y:370,elevation:0},{x:550,y:370,elevation:0}];
  const stat=stations(path,scale),plan={path,...stat,count,settings,scale,side,automatic:!(track.pit?.length>=2),entryConnection:[],exitConnection:[],connected:false},need=count*6+8;
  // A short trace uses a connected parking apron. It does not reduce the selected grid size.
  plan.expanded=stat.length<need;plan.stalls=[];plan.parkingPath=[];plan.connector=[];
  if(plan.expanded){
    const middle=pointOnPit(plan,stat.length/2),center=shifted(middle,side*(settings.width/2+5),scale),rowLength=count*6+4;
    const rowPoint=forward=>({...center,x:center.x+Math.cos(center.angle)*forward/scale,y:center.y+Math.sin(center.angle)*forward/scale});
    plan.parkingPath=resamplePath([rowPoint(-rowLength/2),rowPoint(rowLength/2)],scale);
    plan.connector=resamplePath([path[0],rowPoint(-rowLength/2)],scale);
    plan.exitConnector=resamplePath([rowPoint(rowLength/2),path[path.length-1]],scale);
    plan.aiPath=resamplePath([path[0],rowPoint(-rowLength/2),rowPoint(rowLength/2),path[path.length-1]],scale);
    for(let i=0;i<count;i++)plan.stalls.push({...shifted(rowPoint((i-(count-1)/2)*6),side*(settings.width/2+1.45),scale),number:i+1});
  }else for(let i=0;i<count;i++){const p=pointOnPit(plan,4+(i+.5)*(stat.length-8)/count);plan.stalls.push({...shifted(p,side*(settings.width/2+1.45),scale),number:i+1});}
  plan.bays=plan.stalls.map(p=>({center:p,corners:bayCorners(p,5.4,3.1,scale)}));
  if(!plan.aiPath)plan.aiPath=path;if(!plan.exitConnector)plan.exitConnector=[];
  if(total>0){
    if(generated){plan.entryConnection=generated.entryConnection;plan.exitConnection=generated.exitConnection;plan.setback=generated.setback;plan.aiPath=[...plan.entryConnection.slice(0,-1),...plan.aiPath,...plan.exitConnection.slice(1)];plan.connected=true;}
    else if(settings.autoConnect){
      const first=path[0],last=path[path.length-1],startNear=closestOnTrack(g,first),endNear=closestOnTrack(g,last),firstAngle=Math.atan2(path[1].y-first.y,path[1].x-first.x),lastAngle=Math.atan2(last.y-path[path.length-2].y,last.x-path[path.length-2].x);
      const lead=distance=>Math.min(total*.08,Math.max(settings.width*2,Math.min(30,distance*scale*.5)))/total;
      const entry=pointOnTrack(g,startNear.progress-(startNear.distance*scale>.15?lead(startNear.distance):0)),exit=pointOnTrack(g,endNear.progress+(endNear.distance*scale>.15?lead(endNear.distance):0));
      plan.entryConnection=startNear.distance*scale>.15?connection(entry,first,entry.angle,firstAngle,scale):[];
      plan.exitConnection=endNear.distance*scale>.15?connection(last,exit,lastAngle,exit.angle,scale):[];
      plan.aiPath=[...plan.entryConnection.slice(0,-1),...plan.aiPath,...plan.exitConnection.slice(1)];plan.connected=true;
    }
  }
  plan.entry=plan.entryConnection[0]||path[0];plan.exit=plan.exitConnection.at(-1)||path.at(-1);
  plan.connectionLength=stations(plan.entryConnection,scale).length+stations(plan.exitConnection,scale).length;
  plan.overlapsRoad=total>0&&path.some(p=>closestOnTrack(g,p).distance*scale<track.width/2+settings.width/2-.2);
  const all=[...path,...plan.parkingPath,...plan.entryConnection,...plan.exitConnection,...plan.bays.flatMap(b=>b.corners)];plan.bounds={minX:Math.min(...all.map(p=>p.x)),maxX:Math.max(...all.map(p=>p.x)),minY:Math.min(...all.map(p=>p.y)),maxY:Math.max(...all.map(p=>p.y))};
  return plan;
}
