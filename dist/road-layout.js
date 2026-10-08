import {buildGeometry,pointOnTrack,clamp} from './engine.js?v=20261008-structures';
import {trackScale} from './coordinates.js?v=20261008-structures';
import {kerbSides} from './corner-settings.js?v=20261008-structures';

const distance=(a,b)=>Math.hypot(b.x-a.x,b.y-a.y);
const direction=(a,b)=>{const l=distance(a,b)||1;return {x:(b.x-a.x)/l,y:(b.y-a.y)/l};};
function intersection(a,b,c,d){
  const x=b.x-a.x,y=b.y-a.y,u=d.x-c.x,v=d.y-c.y,den=x*v-y*u;if(Math.abs(den)<1e-9)return null;
  const t=((c.x-a.x)*v-(c.y-a.y)*u)/den,s=((c.x-a.x)*y-(c.y-a.y)*x)/den;
  const ya=a.elevation+(b.elevation-a.elevation)*t,yb=c.elevation+(d.elevation-c.elevation)*s;if(Math.abs(ya-yb)>.5)return null;
  return t>=-1e-7&&t<=1+1e-7&&s>=-1e-7&&s<=1+1e-7?{x:a.x+x*t,y:a.y+y*t,elevation:a.elevation+(b.elevation-a.elevation)*t}:null;
}
function trimLoops(rail,center,closed,radius){
  // Inner offsets can double back around a zero-radius corner. Collapse that
  // local loop to the intersection; the outer road edge remains continuous.
  const n=rail.length,segments=closed?n:n-1;
  for(let i=0;i<segments;i++){
    const a=rail[i],b=rail[(i+1)%n];if(distance(a,b)<1e-7)continue;let travel=0;
    for(let step=2;step<Math.min(n-1,96);step++){
      const j=(i+step)%n;if(!closed&&i+step>=segments)break;
      travel+=distance(center[(i+step-1)%n],center[j]);if(travel>radius*6)break;
      const c=rail[j],d=rail[(j+1)%n];if(distance(c,d)<1e-7)continue;
      const hit=intersection(a,b,c,d);if(!hit)continue;
      for(let k=1;k<=step;k++)rail[(i+k)%n]={...rail[(i+k)%n],...hit};break;
    }
  }
  return rail;
}
function pitOpening(p,plan,scale){
  if(!plan)return false;const padding=(plan.settings.width/2+.25)/scale;
  return [plan.path,plan.parkingPath,plan.connector,plan.exitConnector,plan.entryConnection,plan.exitConnection].some(path=>path.slice(1).some((b,i)=>{const a=path[i];if(p.x<Math.min(a.x,b.x)-padding||p.x>Math.max(a.x,b.x)+padding||p.y<Math.min(a.y,b.y)-padding||p.y>Math.max(a.y,b.y)+padding)return false;const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1):0;const localPadding=(((a.width||plan.settings.width)*(1-t)+(b.width||plan.settings.width)*t)/2+.25)/scale;return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t)<localPadding&&Math.abs((p.elevation||0)-((a.elevation||0)*(1-t)+(b.elevation||0)*t))<1.5;}));
}
export function buildRoadLayout(track,geometry=buildGeometry(track.points||[],track.smooth,track.complete!==false,track),pit=null){
  const s=trackScale(track),closed=track.complete!==false,total=geometry.length,half=track.width/2;
  if(!total)return {center:[],left:[],right:[],quads:[],kerbs:[],bands:()=>[]};
  const count=clamp(Math.ceil(total*s/.75),32,7000),stations=Array.from({length:closed?count:count+1},(_,i)=>total*i/count);
  // Retain exact control-point stations so sharp corners cannot be cut across
  // by uniform sampling. Include the start seam without altering point order.
  geometry.cumulative.forEach((d,i)=>{if(i===0||geometry.segments[i]!==geometry.segments[i-1])stations.push(d);});
  if(closed)stations.push(((track.start||0)%1+1)%1*total);
  for(const range of geometry.structureProfile?.ranges||[])for(const offset of [-range.span/2-range.ramp,-range.span/2,-range.span/2+2,range.span/2-2,range.span/2,range.span/2+range.ramp]){const station=(range.center+offset)/s;stations.push(closed?((station%total)+total)%total:Math.max(0,Math.min(total,station)));}
  stations.sort((a,b)=>a-b);const center=stations.filter((d,i)=>!i||d-stations[i-1]>1e-5).map(d=>({...pointOnTrack(geometry,d/total),station:d*s}));
  const n=center.length,joins=center.map((p,i)=>{
    const before=closed?center[(i+n-1)%n]:center[Math.max(0,i-1)],after=closed?center[(i+1)%n]:center[Math.min(n-1,i+1)],a=i===0&&!closed?direction(p,after):direction(before,p),b=i===n-1&&!closed?a:direction(p,after),nx=a.y+b.y,ny=-a.x-b.x,len=Math.hypot(nx,ny);
    if(len<1e-5)return {x:b.y,y:-b.x};const x=nx/len,y=ny/len,factor=Math.min(2,1/Math.max(.05,x*b.y-y*b.x));return {x:x*factor,y:y*factor};
  });
  const rail=offset=>trimLoops(center.map((p,i)=>{const off=typeof offset==='function'?offset(p):offset;return {station:p.station,x:p.x+joins[i].x*off/s,y:p.y+joins[i].y*off/s,elevation:(p.elevation||0)+off*Math.tan((p.bank||0)*Math.PI/180)};}),center,closed,(half+2)/s);
  const left=rail(half),right=rail(-half),outerLeft=rail(p=>half+(p.kerbWidth||.7)),outerRight=rail(p=>-half-(p.kerbWidth||.7)),segments=closed?n:n-1,quads=[],kerbs=[];
  for(let i=0;i<segments;i++){
    const j=(i+1)%n;quads.push([left[i],left[j],right[j],right[i]]);
    for(const side of kerbSides(center[i].kerbs)){
      const inner=side>0?left:right,outer=side>0?outerLeft:outerRight;if(pitOpening(inner[i],pit,s)||pitOpening(inner[j],pit,s))continue;
      const corners=[outer[i],outer[j],inner[j],inner[i]],area=corners.reduce((v,p,k)=>{const q=corners[(k+1)%4];return v+p.x*q.y-q.x*p.y;},0);
      if(Math.abs(area)<1e-7)continue;kerbs.push({corners,side,white:Math.floor(center[i].station/1.5)%2===1});
    }
  }
  const cache=new Map(),bands=(a,b)=>{const key=a+','+b;if(cache.has(key))return cache.get(key);const inner=rail(a),outer=rail(b),result=Array.from({length:segments},(_,i)=>{const j=(i+1)%n;return [inner[i],inner[j],outer[j],outer[i]];});cache.set(key,result);return result;};
  const edgeMarkings=[...bands(half-.15,half-.28),...bands(-half+.28,-half+.15)].filter(corners=>!corners.some(p=>pitOpening(p,pit,s)));
  return {center,left,right,quads,kerbs,bands,half,edgeMarkings,totalMeters:total*s,whiteKerbs:kerbs.filter(p=>p.white).map(p=>p.corners),redKerbs:kerbs.filter(p=>!p.white).map(p=>p.corners)};
}
export function fillRoadPolygons(ctx,polygons,color){ctx.beginPath();for(const corners of polygons){corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();}ctx.fillStyle=color;ctx.fill();}
export function drawRoadLayout(ctx,layout,surface,kerbs=true){
  if(kerbs){fillRoadPolygons(ctx,layout.whiteKerbs||[],'#eee9d9');fillRoadPolygons(ctx,layout.redKerbs||[],'#b95040');}
  fillRoadPolygons(ctx,layout.quads,surface);if(!layout.quads.length)return;
  fillRoadPolygons(ctx,layout.edgeMarkings||[],'#e5e4d9');
}
