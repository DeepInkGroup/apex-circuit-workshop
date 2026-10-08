import {pointOnTrack} from './engine.js?v=20261008-structures';
import {toGamePoint,gameDirection,trackScale} from './coordinates.js?v=20261008-structures';
import {buildRoadLayout} from './road-layout.js?v=20261008-structures';
const layoutCache=new WeakMap();
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function structureAtQuad(g,corners){const profile=g.structureProfile;if(!profile)return null;const a=corners[0].station,b=corners[1].station,total=profile.total,mid=((a+((b<a?b+total:b)-a)/2)%total+total)%total,section=profile.sectionAt(mid);if(!section)return null;const difference=Math.abs(section.center-mid);return {...section,centerDistance:g.closed?Math.min(difference,total-difference):difference};}
export function terrainQuadExcluded(g,corners){return !!structureAtQuad(g,corners)?.core;}
function spanPoints(track,g,range){
 const s=trackScale(track),total=g.length*s,start=range.center-range.span/2,end=range.center+range.span/2;
 if(!layoutCache.has(g))layoutCache.set(g,buildRoadLayout(track,g));
 const stations=[start,end];for(const p of layoutCache.get(g).center){let station=p.station;if(g.closed){while(station<start)station+=total;while(station>end)station-=total;}if(station>start+1e-6&&station<end-1e-6)stations.push(station);}
 return stations.sort((a,b)=>a-b).map(station=>{const progress=station/total,p=pointOnTrack(g,progress),before=gameDirection(pointOnTrack(g,progress-1e-7).angle).left,after=gameDirection(pointOnTrack(g,progress+1e-7).angle).left,dx=before[0]+after[0],dz=before[2]+after[2],len=Math.hypot(dx,dz),dir=gameDirection(p.angle);if(len>1e-5){const factor=Math.min(2,1/Math.max(.05,(dx*after[0]+dz*after[2])/len));dir.left=[dx/len*factor,0,dz/len*factor];}return {...p,station,pos:toGamePoint(p,track),...dir};});
}
export function structureGroundRule(track,g){
 if(!g.structureProfile?.ranges.length)return null;
 const segments=[];
 for(const range of g.structureProfile.ranges){const points=spanPoints(track,g,range),start=points[0],end=points.at(-1),kerb=track.export?.kerbs===false?0:Math.max(.7,...points.map(p=>p.kerbWidth||.7));for(let i=1;i<points.length;i++)segments.push({a:points[i-1].pos,b:points[i].pos,type:range.type,start,end,half:(track.width/2+kerb+1.1)*Math.max(1,Math.hypot(...points[i-1].left),Math.hypot(...points[i].left)),ya:g.structureProfile.original(points[i-1].station),yb:g.structureProfile.original(points[i].station)});}
 return (x,z,height,nearest,paved=false)=>{let best=null;for(const segment of segments){const {a,b,start,end}=segment;if(segment.type==='tunnel'&&((x-start.pos[0])*start.forward[0]+(z-start.pos[2])*start.forward[2]<-1e-5||(x-end.pos[0])*end.forward[0]+(z-end.pos[2])*end.forward[2]>1e-5))continue;const dx=b[0]-a[0],dz=b[2]-a[2],raw=((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz||1),t=Math.max(0,Math.min(1,raw)),d=Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t);if(d<segment.half+6&&(!best||d<best.d))best={...segment,d,t};}if(!best||paved&&best.type==='bridge')return height;const target=best.ya+(best.yb-best.ya)*best.t-.08,weight=(1-smooth((best.d-best.half)/6))*(best.type==='tunnel'?1:smooth(nearest/3)),value=best.type==='bridge'?Math.min(height,target):Math.max(height,target);return height+(value-height)*weight;};
}
export function addStructures(track,g,terrain,add,quad,materials){
 const ranges=g.structureProfile?.ranges||[];if(!ranges.length)return;
 const concrete=materials.length;materials.push({name:'Structure concrete',color:[151,157,153],noise:8});const dark=materials.length;materials.push({name:'Tunnel interior',color:[86,98,102],noise:5});const steel=materials.length;materials.push({name:'Bridge guard rails',color:[132,151,154],noise:3,finish:'steel'});const light=materials.length;materials.push({name:'Tunnel ceiling panels',color:[230,227,195],noise:1});
 const at=(p,offset,y)=>[p.pos[0]+p.left[0]*offset,y,p.pos[2]+p.left[2]*offset];
 function solid(mesh,p,q,left,right,bottom,top){const lo=Math.min(left,right),hi=Math.max(left,right);left=hi;right=lo;const a=at(p,left,bottom(p)),b=at(q,left,bottom(q)),c=at(q,right,bottom(q)),d=at(p,right,bottom(p)),e=at(p,left,top(p)),f=at(q,left,top(q)),h=at(q,right,top(q)),i=at(p,right,top(p));quad(mesh,a,b,c,d);quad(mesh,i,h,f,e);quad(mesh,e,f,b,a);quad(mesh,d,c,h,i);quad(mesh,a,d,i,e);quad(mesh,f,h,c,b);}
 for(const range of ranges){
  const points=spanPoints(track,g,range),kerb=track.export?.kerbs===false?0:Math.max(.7,...points.map(p=>p.kerbWidth||.7)),half=track.width/2+kerb+1.1,body=add(`1WALL_${range.type.toUpperCase()}_${range.index}`,range.type==='bridge'?concrete:dark),guard=add(`1WALL_${range.type.toUpperCase()}_GUARDS_${range.index}`,range.type==='bridge'?steel:concrete),lamps=range.type==='tunnel'?add(`TUNNEL_CEILING_PANELS_${range.index}`,light):null;
  for(let i=1;i<points.length;i++){const p=points[i-1],q=points[i];
   if(range.type==='bridge'){
    // The collision road is the deck top. A separate underside never raises it.
    const a=at(p,half,p.pos[1]-.6),b=at(q,half,q.pos[1]-.6),c=at(q,-half,q.pos[1]-.6),d=at(p,-half,p.pos[1]-.6);quad(body,a,b,c,d);quad(body,at(p,half,p.pos[1]),at(q,half,q.pos[1]),b,a);quad(body,d,c,at(q,-half,q.pos[1]),at(p,-half,p.pos[1]));
    for(const side of [-1,1]){solid(guard,p,q,side*(half-.3),side*half,v=>v.pos[1],v=>v.pos[1]+1.2);solid(body,p,q,side*(track.width/2+kerb),side*(half-.3),v=>v.pos[1]-.6,v=>v.pos[1]);}
   }else{
    for(const side of [-1,1])solid(body,p,q,side*half,side*(half+.65),v=>v.pos[1]-.25,v=>v.pos[1]+range.clearance+.45);
    solid(guard,p,q,half+.65,-half-.65,v=>v.pos[1]+range.clearance,v=>v.pos[1]+range.clearance+.45);
    if(i%5===0)solid(lamps,p,q,.24,-.24,v=>v.pos[1]+range.clearance-.055,v=>v.pos[1]+range.clearance-.015);
   }
  }
  if(range.type==='bridge')for(let i=2;i<points.length-2;i+=Math.max(2,Math.round(18/(range.span/(points.length-1))))){const p=points[i];for(const side of [-1,1]){const center=at(p,side*(half-.5),0);if([-1,0,1].some(dx=>[-1,0,1].some(dz=>terrain.isPaved(center[0]+dx,center[2]+dz))))continue;const foot=terrain.heightAt(center[0],center[2])-.15,top=p.pos[1]-.6;if(top<=foot+.2)continue;const q={...p,pos:[p.pos[0]+p.forward[0]*1.2,p.pos[1],p.pos[2]+p.forward[2]*1.2]};solid(body,p,q,side*(half-.9),side*(half-.1),()=>foot,()=>top);}}
  if(range.type==='tunnel')for(const p of [points[0],points.at(-1)]){const q={...p,pos:[p.pos[0]+p.forward[0]*.45,p.pos[1],p.pos[2]+p.forward[2]*.45]};for(const side of [-1,1])solid(guard,p,q,side*half,side*(half+1.1),v=>v.pos[1]-.2,v=>v.pos[1]+range.clearance+.75);solid(guard,p,q,half+1.1,-half-1.1,v=>v.pos[1]+range.clearance,v=>v.pos[1]+range.clearance+.75);}
 }
}
export function drawStructures(ctx,track,g,zoom){
 ctx.save();const s=trackScale(track);for(const range of g.structureProfile?.ranges||[]){const points=spanPoints(track,g,range);ctx.strokeStyle=range.type==='bridge'?'#dba24a':'#538592';ctx.globalAlpha=.38;ctx.lineWidth=track.width/s;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.globalAlpha=1;ctx.lineWidth=2/zoom;ctx.setLineDash(range.type==='tunnel'?[5/zoom,4/zoom]:[]);for(const side of [-1,1]){ctx.beginPath();points.forEach((p,i)=>{const offset=side*(track.width/2+.8)/s,x=p.x+Math.sin(p.angle)*offset,y=p.y-Math.cos(p.angle)*offset;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();}ctx.setLineDash([]);const p=pointOnTrack(g,range.center/(g.length*s));ctx.font=`bold ${10/zoom}px sans-serif`;ctx.textAlign='center';ctx.fillStyle=range.type==='bridge'?'#785020':'#285763';ctx.fillText(`${range.type.toUpperCase()} · ${range.level.toFixed(1)} m`,p.x,p.y-(track.width/2+3)/s);}
 ctx.restore();
}
