// One variable-width ribbon for the editor, native mesh and minimap.
import {pavementSampler} from './pavement-sampler.js?v=20261011-pit-kerbs';
import {buildingContains} from './scenery.js?v=20261011-pit-kerbs';
import {treeRadius} from './trees.js?v=20261011-pit-kerbs';
const railCache=new WeakMap();
export function pitRails(path,plan){
 if(!railCache.has(plan))railCache.set(plan,new Map());const cache=railCache.get(plan);if(cache.has(path))return cache.get(path);const s=plan.scale;
 const rails=path.map((p,i)=>{const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],direction=(a,b)=>{const len=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:(b.y-a.y)/len,y:-(b.x-a.x)/len};},u=i?direction(a,p):direction(p,b),v=i===path.length-1?u:direction(p,b),sum=Math.hypot(u.x+v.x,u.y+v.y);let nx=v.x,ny=v.y;if(sum>1e-5){const factor=Math.min(1.5,1/Math.max(.5,((u.x+v.x)*v.x+(u.y+v.y)*v.y)/sum));nx=(u.x+v.x)/sum*factor;ny=(u.y+v.y)/sum*factor;}if((i===0||i===path.length-1)&&Number.isFinite(p.angle)){nx=Math.sin(p.angle);ny=-Math.cos(p.angle);}return {at(offset){const q={x:p.x+nx*offset/s,y:p.y+ny*offset/s,elevation:(p.elevation||0)+offset*Math.tan((p.bank||0)*Math.PI/180)};if(plan.heightAt)q.elevation=plan.heightAt(q);return q;}};});cache.set(path,rails);return rails;
}
export function pitRibbons(plan){
  const routes=[plan.path,plan.parkingPath,plan.connector,plan.exitConnector,plan.entryConnection,plan.exitConnection],s=plan.scale,result=[],seen=new Set();
  routes.forEach((path,index)=>{
    if(path.length<2||seen.has(path))return;seen.add(path);
    const joined=pitRails(path,plan),rails=path.map((p,i)=>{
      const half=(p.width||plan.settings.width)/2,at=joined[i].at;
      return {left:at(half),right:at(-half),innerLeft:at(half-.12),innerRight:at(-half+.12)};
    });
    for(let i=0;i<rails.length-1;i++){
      const a=rails[i],b=rails[i+1],t=(i+.5)/(rails.length-1);
      result.push({corners:[a.left,b.left,b.right,a.right],paint:[[a.left,b.left,b.innerLeft,a.innerLeft],[a.innerRight,b.innerRight,b.right,a.right]],merge:index===4&&t<.3||index===5&&t>.7});
    }
  });
  return result;
}
export function pitArrows(plan){
 const path=plan.aiPath||[],s=plan.scale,result=[];let station=0,next=8;
 for(let i=1;i<path.length-1;i++){const p=path[i],a=path[i-1],b=path[i+1];station+=Math.hypot(p.x-a.x,p.y-a.y)*s;if(station<next)continue;next+=15;const angle=Math.atan2(b.y-a.y,b.x-a.x),grade=((b.elevation||0)-(a.elevation||0))/(Math.hypot(b.x-a.x,b.y-a.y)*s||1),at=(forward,left)=>({x:p.x+(Math.cos(angle)*forward+Math.sin(angle)*left)/s,y:p.y+(Math.sin(angle)*forward-Math.cos(angle)*left)/s,elevation:(p.elevation||0)+forward*grade+left*Math.tan((p.bank||0)*Math.PI/180)});result.push([at(-1.2,.14),at(.2,.14),at(.2,-.14),at(-1.2,-.14)],[at(0,.55),at(1.25,0),at(0,-.55),at(.18,0)]);}
 return result;
}
export function pitKerbs(track,plan,roadQuads){
 if(plan.settings.mergeKerbs===false||!plan.connected)return [];
 const scale=plan.scale,paved=pavementSampler([...roadQuads,...pitRibbons(plan).map(r=>r.corners),...plan.apron],scale),result=[];
 const clear=point=>{
  if(paved.nearest(point,0))return false;
  if(track.export?.buildings!==false&&(track.buildings||[]).some(b=>buildingContains(b,point,scale,.15)))return false;
  if(track.export?.trees!==false&&(track.trees||[]).some(t=>Math.hypot(t.x-point.x,t.y-point.y)*scale<treeRadius(t)+.15))return false;
  for(const wall of track.barriers||[])for(let i=1;i<wall.points.length;i++){const a=wall.points[i-1],b=wall.points[i],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1)));if(Math.hypot(point.x-a.x-dx*t,point.y-a.y-dy*t)*scale<(wall.width||.8)/2+.15&&Math.abs((point.elevation||0)-(a.elevation||0))<4.5)return false;}
  return true;
 };
 for(const path of [plan.entryConnection,plan.exitConnection]){
  if(path.length<2)continue;
  const side=path[0].mergeSide||path.at(-1).mergeSide||plan.side,rails=pitRails(path,plan),stations=[0];
  for(let i=1;i<path.length;i++)stations.push(stations[i-1]+Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y)*scale);
  const total=stations.at(-1),ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t));};
  const edges=path.map((p,i)=>{const distance=stations[i],width=plan.settings.mergeKerbWidth*ease(distance/4)*ease((total-distance)/4),half=(p.width||plan.settings.width)/2;return {inner:rails[i].at(side*half),outer:rails[i].at(side*(half+width)),width};});
  for(let i=0;i<edges.length-1;i++){
   const a=edges[i],b=edges[i+1];if(Math.max(a.width,b.width)<.04)continue;
   const corners=[a.outer,b.outer,b.inner,a.inner],middle={x:corners.reduce((v,p)=>v+p.x,0)/4,y:corners.reduce((v,p)=>v+p.y,0)/4,elevation:corners.reduce((v,p)=>v+(p.elevation||0),0)/4};
   if(![a.outer,b.outer,middle].every(clear))continue;
   const turns=corners.map((p,j)=>{const q=corners[(j+1)%4],r=corners[(j+2)%4];return (q.x-p.x)*(r.y-q.y)-(q.y-p.y)*(r.x-q.x);});
   if(Math.min(...turns)<-1e-7&&Math.max(...turns)>1e-7)continue;
   result.push({corners,side,white:Math.floor((stations[i]+stations[i+1])/3)%2===1,pitMerge:true});
  }
 }
 return result;
}
