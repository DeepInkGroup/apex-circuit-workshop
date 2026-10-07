import {barrierProperties,BARRIER_TYPES} from './barriers.js?v=20261007-safety';
import {clamp,closestOnTrack} from './engine.js?v=20261007-safety';
import {buildingContains} from './scenery.js?v=20261007-safety';
import {treeRadius} from './trees.js?v=20261007-safety';

function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
function simplify(points,tolerance){if(points.length<3)return points;const keep=new Set([0,points.length-1]),pending=[[0,points.length-1]];while(pending.length){const [a,b]=pending.pop();let max=tolerance,index=-1;for(let i=a+1;i<b;i++){const distance=distanceToSegment(points[i],points[a],points[b]);if(distance>max){max=distance;index=i;}}if(index>=0){keep.add(index);pending.push([a,index],[index,b]);}}return [...keep].sort((a,b)=>a-b).map(i=>points[i]);}
export function barrierSettings(track){const o=track.barrierSettings||{};return {reentry:o.reentry!==false,openingWidth:clamp(Number(o.openingWidth)||8,6,16),openingSpacing:clamp(Number(o.openingSpacing)||150,50,300)};}
function pathStations(points,scale){let total=0;const stations=[0];for(let i=1;i<points.length;i++){total+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y)*scale;stations.push(total);}return {total,stations};}
function pathSlice(points,stations,from,to){
 const at=distance=>{let i=1;while(i<points.length-1&&stations[i]<distance)i++;const a=points[i-1],b=points[i],span=stations[i]-stations[i-1],t=span?clamp((distance-stations[i-1])/span,0,1):0;return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,elevation:(a.elevation||0)+((b.elevation||0)-(a.elevation||0))*t};};
 return [at(from),...points.filter((_,i)=>stations[i]>from+1e-6&&stations[i]<to-1e-6),at(to)];
}
// Split the actual collision path; the gap is empty in the editor and KN5.
export function cutBarrierOpening(barrier,scale,width=8,position=.5){
 const {total,stations}=pathStations(barrier.points,scale);width=clamp(Number(width)||8,6,16);
 if(total<width+4)return null;
 const center=clamp(total*clamp(Number(position)||.5,.1,.9),width/2+2,total-width/2-2);
 return [pathSlice(barrier.points,stations,0,center-width/2),pathSlice(barrier.points,stations,center+width/2,total)].map(points=>({...barrier,points}));
}
export function automaticBarriers(track,geometry,road,pit,options={}){
 const scale=track.scale||.2,gap=clamp(Number(options.gap)||4,2,20),type=BARRIER_TYPES[options.type]?options.type:'concrete',width=BARRIER_TYPES[type].width,height=1.2,style=options.style==='striped'?'striped':'concrete';
 const access=barrierSettings({barrierSettings:{...barrierSettings(track),...options}});
 const sides=options.side==='left'?[1]:options.side==='right'?[-1]:[1,-1],paths=[],routes=[pit.path,pit.parkingPath,pit.connector,pit.exitConnector,pit.entryConnection,pit.exitConnection],padding=(pit.settings.width/2+width/2+1.5)/scale;
 function clear(p){if(p.x<2||p.x>998||p.y<2||p.y>738)return false;if(closestOnTrack(geometry,p).distance*scale<track.width/2+gap*.7)return false;
  if(options.gantry?.supports.some(v=>Math.hypot(v.x-p.x,v.y-p.y)*scale<1.4))return false;
  if(routes.some(path=>path.slice(1).some((b,i)=>distanceToSegment(p,path[i],b)<padding)))return false;
  if(pit.bays.some(b=>Math.hypot(p.x-b.center.x,p.y-b.center.y)*scale<4.7))return false;
  if((track.buildings||[]).some(b=>buildingContains(b,p,scale,width/2+1)))return false;
  if((track.trees||[]).some(t=>Math.hypot(t.x-p.x,t.y-p.y)*scale<treeRadius(t)+width/2+1))return false;
  return true;
 }
 for(const side of sides){const offset=side*(track.width/2+gap+.9+width/2),quads=road.bands(offset,offset+side*.01),points=quads.map(q=>q[0]);if(quads.length)points.push(quads.at(-1)[1]);const rail=simplify(points,.2/scale);if(rail.length<2)continue;
  const {total,stations}=pathStations(rail,scale),openingCount=access.reentry&&total>access.openingWidth+8?clamp(Math.ceil(total/access.openingSpacing),1,10):0;
  // Stagger the sides, rather than leaving a single straight corridor across
  // the entire circuit. Keep each opening clear of the closed path seam.
  const centers=Array.from({length:openingCount},(_,i)=>total*(i+(side>0?.3:.7))/openingCount);
  const isOpening=(from,to)=>centers.some(center=>to>center-access.openingWidth/2&&from<center+access.openingWidth/2);
  // Limit curve deviation to 20 cm, then check each chord at 75 cm intervals.
  // This keeps long circuits within the editable point/path limits.
  let segment=[];const finish=()=>{if(segment.length>1)paths.push({points:segment,type,height,width,style,automatic:true});segment=[];};
  const append=p=>{const n=segment.length;if(n&&Math.hypot(p.x-segment[n-1].x,p.y-segment[n-1].y)<1e-7)return;if(n>=2){const a=segment[n-2],b=segment[n-1],distance=Math.hypot(p.x-a.x,p.y-a.y),t=distance?Math.hypot(b.x-a.x,b.y-a.y)/distance:0;if(distanceToSegment(b,a,p)<.01/scale&&Math.abs(b.elevation-(a.elevation+(p.elevation-a.elevation)*t))<.01)segment.pop();}segment.push({...p});if(segment.length===100){const end=segment.at(-1);finish();segment.push(end);}};
  const count=rail.length-1;
  for(let i=0;i<count;i++){const a=rail[i],b=rail[i+1],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*scale/.75)),at=t=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,elevation:a.elevation+(b.elevation-a.elevation)*t});
   for(let j=0;j<steps;j++){const from=at(j/steps),to=at((j+1)/steps),start=stations[i]+(stations[i+1]-stations[i])*j/steps,end=stations[i]+(stations[i+1]-stations[i])*(j+1)/steps;if(isOpening(start,end)||!clear(from)||!clear(to)){finish();continue;}append(from);append(to);}
  }finish();
 }
 return paths.slice(0,Math.max(0,40-(track.barriers||[]).filter(b=>!b.automatic).length));
}
