// One variable-width ribbon for the editor, native mesh and minimap.
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
