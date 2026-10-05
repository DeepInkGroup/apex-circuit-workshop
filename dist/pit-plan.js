import {buildGeometry,pointOnTrack,closestOnTrack,clamp} from './engine.js';
const lerp=(a,b,t)=>a+(b-a)*t;
export const PIT_STYLES={blue:{label:'Blue pit lane',color:[60,89,108],line:'#81c1d4'},classic:{label:'Classic asphalt',color:[61,65,69],line:'#e3d79c'}};
export function pitSettings(track){return {width:clamp(Number(track.pitSettings?.width)||6,4,10),style:PIT_STYLES[track.pitSettings?.style]?track.pitSettings.style:'blue',side:['left','right'].includes(track.pitSettings?.side)?track.pitSettings.side:'auto',autoConnect:track.pitSettings?.autoConnect!==false};}
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
export function buildPitPlan(track){
  const scale=clamp(Number(track.scale)||.2,.02,10),g=buildGeometry(track.points||[],track.smooth,track.complete!==false),total=g.length*scale,settings=pitSettings(track),count=clamp(Math.round(Number(track.export?.pitboxes)||8),1,16);
  let winding=0;for(let i=0;i<g.samples.length;i++){const a=g.samples[i],b=g.samples[(i+1)%g.samples.length];winding+=a.x*b.y-b.x*a.y;}
  const side=settings.side==='left'?1:settings.side==='right'?-1:winding>=0?1:-1;
  let path=track.pit?.length>=2?resamplePath(track.pit,scale):[];
  if(!path.length&&total>0){
    const span=Math.min(total*.65,Math.max(total*.28,count*6+12)),steps=96,offset=side*(track.width/2+settings.width/2+2);
    path=Array.from({length:steps},(_,i)=>{const t=i/(steps-1),p=pointOnTrack(g,(track.start||0)-.035+t*span/total),ease=Math.sin(Math.PI*t);return shifted(p,offset*ease,scale);});
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
    if(plan.automatic)plan.connected=true;
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
  const all=[...path,...plan.parkingPath,...plan.entryConnection,...plan.exitConnection,...plan.bays.flatMap(b=>b.corners)];plan.bounds={minX:Math.min(...all.map(p=>p.x)),maxX:Math.max(...all.map(p=>p.x)),minY:Math.min(...all.map(p=>p.y)),maxY:Math.max(...all.map(p=>p.y))};
  return plan;
}
