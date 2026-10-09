import {buildGeometry,pointOnTrack,clamp} from './engine.js?v=20261009-auto-crossing';

export const CROSSING_ERROR='The road crosses itself without enough vertical clearance. Add a bridge/tunnel at the crossing or separate the roads.';
const wrap=n=>((n%1)+1)%1;
const cache=new Map();
// Share the same crossing measurements between export and automatic repair.
// Check the overlap footprint, rather than only the centerline intersection.
export function roadCrossings(track,g=buildGeometry(track.points||[],track.smooth,track.complete!==false,track)){
 const key=JSON.stringify([track.points,track.width,track.scale,track.smooth,track.complete]);if(cache.has(key))return cache.get(key);
 const scale=clamp(Number(track.scale)||.2,.02,10),total=g.length*scale;if(!total)return [];
 const count=clamp(Math.ceil(total/2),32,2000),stations=Array.from({length:g.closed?count:count+1},(_,i)=>i/count*g.length);g.cumulative.forEach((d,i)=>{if(!i||g.segments[i]!==g.segments[i-1])stations.push(d);});stations.sort((a,b)=>a-b);
 const poly=stations.filter((d,i)=>!i||d-stations[i-1]>1e-6).map(d=>({...pointOnTrack(g,d/g.length),station:d})),n=poly.length,segments=g.closed?n:n-1,cellSize=Math.max(8,track.width*2)/scale,cells=new Map(),pairs=new Set(),hits=[];
 const routeDistance=(a,b)=>{const d=Math.abs(a-b)*total;return g.closed?Math.min(d,total-d):d;};
 const cross=(x,y,u,v)=>x*v-y*u;
 function inspect(i,j){
  if(j<i)[i,j]=[j,i];if(j-i<2||g.closed&&i===0&&j===segments-1)return;const pair=i+':'+j;if(pairs.has(pair))return;pairs.add(pair);
  const a=poly[i],b=poly[(i+1)%n],c=poly[j],d=poly[(j+1)%n],dx=b.x-a.x,dy=b.y-a.y,ux=d.x-c.x,uy=d.y-c.y,den=cross(dx,dy,ux,uy);if(Math.abs(den)<1e-9)return;
  const t=cross(c.x-a.x,c.y-a.y,ux,uy)/den,u=cross(c.x-a.x,c.y-a.y,dx,dy)/den;if(t< -1e-7||t>1+1e-7||u< -1e-7||u>1+1e-7)return;
  const firstProgress=(a.station+(i===n-1?g.length-a.station:b.station-a.station)*clamp(t,0,1))/g.length,secondProgress=(c.station+(j===n-1?g.length-c.station:d.station-c.station)*clamp(u,0,1))/g.length;
  if(routeDistance(firstProgress,secondProgress)<.05)return;
  if(hits.some(h=>routeDistance(h.first.progress,firstProgress)<2&&routeDistance(h.second.progress,secondProgress)<2))return;
  const first={...pointOnTrack(g,firstProgress),progress:firstProgress},second={...pointOnTrack(g,secondProgress),progress:secondProgress},sin=Math.sin(second.angle-first.angle),cos=Math.cos(second.angle-first.angle),half=track.width/2;
  if(Math.abs(sin)<1e-5)return;
  let safe=true,gap=Infinity,requiredGap=4.5;
  for(const o1 of [-half,0,half])for(const o2 of [-half,0,half]){
   const alongA=(o2-cos*o1)/sin,alongB=alongA*cos-o1*sin,pa=firstProgress+alongA/total,pb=secondProgress+alongB/total;
   if(!g.closed&&(pa<0||pa>1||pb<0||pb>1))continue;
   const p=pointOnTrack(g,pa),q=pointOnTrack(g,pb),ha=p.elevation+o1*Math.tan(p.bank*Math.PI/180),hb=q.elevation+o2*Math.tan(q.bank*Math.PI/180),sectionA=g.structureProfile?.sectionAt((g.closed?wrap(pa):clamp(pa,0,1))*total),sectionB=g.structureProfile?.sectionAt((g.closed?wrap(pb):clamp(pb,0,1))*total),lower=ha<hb?sectionA:sectionB,upper=ha<hb?sectionB:sectionA;
   const required=lower?.core&&lower.type==='tunnel'?lower.clearance+(lower.roofRise||0)+1+(upper?.core&&upper.type==='bridge'?.6:0):4.5,current=Math.abs(ha-hb)-.6;
   gap=Math.min(gap,current);requiredGap=Math.max(requiredGap,required);if(current<required||!(upper?.core&&upper.type==='bridge'||lower?.core&&lower.type==='tunnel'))safe=false;
  }
  hits.push({first,second,x:a.x+dx*t,y:a.y+dy*t,safe,gap,requiredGap,spanNeeded:Math.max(24,track.width*(1+Math.abs(cos))/Math.abs(sin)+12)});
 }
 for(let i=0;i<segments;i++){const a=poly[i],b=poly[(i+1)%n];for(let x=Math.floor(Math.min(a.x,b.x)/cellSize);x<=Math.floor(Math.max(a.x,b.x)/cellSize);x++)for(let y=Math.floor(Math.min(a.y,b.y)/cellSize);y<=Math.floor(Math.max(a.y,b.y)/cellSize);y++){const k=x+','+y,list=cells.get(k)||[];for(const j of list)inspect(j,i);list.push(i);cells.set(k,list);}}
 cache.set(key,hits);if(cache.size>12)cache.delete(cache.keys().next().value);return hits;
}
