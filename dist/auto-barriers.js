import {clamp,closestOnTrack} from './engine.js?v=20261006-race';
import {buildingContains} from './scenery.js?v=20261006-race';
import {treeRadius} from './trees.js?v=20261006-race';

function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
function simplify(points,tolerance){if(points.length<3)return points;const keep=new Set([0,points.length-1]),pending=[[0,points.length-1]];while(pending.length){const [a,b]=pending.pop();let max=tolerance,index=-1;for(let i=a+1;i<b;i++){const distance=distanceToSegment(points[i],points[a],points[b]);if(distance>max){max=distance;index=i;}}if(index>=0){keep.add(index);pending.push([a,index],[index,b]);}}return [...keep].sort((a,b)=>a-b).map(i=>points[i]);}
export function automaticBarriers(track,geometry,road,pit,options={}){
 const scale=track.scale||.2,gap=clamp(Number(options.gap)||4,2,20),width=.4,height=1.2,style=options.style==='striped'?'striped':'concrete';
 const sides=options.side==='left'?[1]:options.side==='right'?[-1]:[1,-1],paths=[],routes=[pit.path,pit.parkingPath,pit.connector,pit.exitConnector,pit.entryConnection,pit.exitConnection],padding=(pit.settings.width/2+width/2+1.5)/scale;
 function clear(p){if(p.x<2||p.x>998||p.y<2||p.y>738)return false;if(closestOnTrack(geometry,p).distance*scale<track.width/2+gap*.7)return false;
  if(routes.some(path=>path.slice(1).some((b,i)=>distanceToSegment(p,path[i],b)<padding)))return false;
  if(pit.bays.some(b=>Math.hypot(p.x-b.center.x,p.y-b.center.y)*scale<4.7))return false;
  if((track.buildings||[]).some(b=>buildingContains(b,p,scale,width/2+1)))return false;
  if((track.trees||[]).some(t=>Math.hypot(t.x-p.x,t.y-p.y)*scale<treeRadius(t)+width/2+1))return false;
  return true;
 }
 for(const side of sides){const offset=side*(track.width/2+gap+.9+width/2),quads=road.bands(offset,offset+side*.01),points=quads.map(q=>q[0]);if(quads.length)points.push(quads.at(-1)[1]);const rail=simplify(points,.2/scale);if(rail.length<2)continue;
  // Limit curve deviation to 20 cm, then check each chord at 75 cm intervals.
  // This keeps long circuits within the editable point/path limits.
  let segment=[];const finish=()=>{if(segment.length>1)paths.push({points:segment,height,width,style,automatic:true});segment=[];};
  const append=p=>{const n=segment.length;if(n&&Math.hypot(p.x-segment[n-1].x,p.y-segment[n-1].y)<1e-7)return;if(n>=2){const a=segment[n-2],b=segment[n-1],distance=Math.hypot(p.x-a.x,p.y-a.y),t=distance?Math.hypot(b.x-a.x,b.y-a.y)/distance:0;if(distanceToSegment(b,a,p)<.01/scale&&Math.abs(b.elevation-(a.elevation+(p.elevation-a.elevation)*t))<.01)segment.pop();}segment.push({...p});if(segment.length===100){const end=segment.at(-1);finish();segment.push(end);}};
  const count=rail.length-1;
  for(let i=0;i<count;i++){const a=rail[i],b=rail[i+1],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*scale/.75)),at=t=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,elevation:a.elevation+(b.elevation-a.elevation)*t});
   for(let j=0;j<steps;j++){const from=at(j/steps),to=at((j+1)/steps);if(!clear(from)||!clear(to)){finish();continue;}append(from);append(to);}
  }finish();
 }
 return paths.slice(0,Math.max(0,40-(track.barriers||[]).filter(b=>!b.automatic).length));
}
