import {pointOnTrack} from './engine.js?v=20261008-structure-design';
import {toGamePoint,gameDirection,trackScale} from './coordinates.js?v=20261008-structure-design';
import {buildRoadLayout} from './road-layout.js?v=20261008-structure-design';
const layoutCache=new WeakMap();
const spanCache=new WeakMap();
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
export function structureAtQuad(g,corners){const profile=g.structureProfile;if(!profile)return null;const a=corners[0].station,b=corners[1].station,total=profile.total,mid=((a+((b<a?b+total:b)-a)/2)%total+total)%total,section=profile.sectionAt(mid);if(!section)return null;const difference=Math.abs(section.center-mid);return {...section,centerDistance:g.closed?Math.min(difference,total-difference):difference};}
export function terrainQuadExcluded(g,corners){return !!structureAtQuad(g,corners)?.core;}
function spanPoints(track,g,range,padding=0){
 const key=range.index+':'+padding;if(!spanCache.has(g))spanCache.set(g,new Map());const cache=spanCache.get(g);if(cache.has(key))return cache.get(key);
 const s=trackScale(track),total=g.length*s,start=g.closed?range.center-range.span/2-padding:Math.max(0,range.center-range.span/2-padding),end=g.closed?range.center+range.span/2+padding:Math.min(total,range.center+range.span/2+padding);
 if(!layoutCache.has(g))layoutCache.set(g,buildRoadLayout(track,g));
 const stations=[start,end];for(const p of layoutCache.get(g).center){let station=p.station;if(g.closed){while(station<start)station+=total;while(station>end)station-=total;}if(station>start+1e-6&&station<end-1e-6)stations.push(station);}
 const result=stations.sort((a,b)=>a-b).map(station=>{const progress=station/total,p=pointOnTrack(g,progress),before=gameDirection(pointOnTrack(g,progress-1e-7).angle).left,after=gameDirection(pointOnTrack(g,progress+1e-7).angle).left,dx=before[0]+after[0],dz=before[2]+after[2],len=Math.hypot(dx,dz),dir=gameDirection(p.angle);if(len>1e-5){const factor=Math.min(2,1/Math.max(.05,(dx*after[0]+dz*after[2])/len));dir.left=[dx/len*factor,0,dz/len*factor];}return {...p,station,pos:toGamePoint(p,track),...dir};});cache.set(key,result);return result;
}
export function structureGroundRule(track,g){
 if(!g.structureProfile?.ranges.length)return null;
 const segments=[];
 for(const range of g.structureProfile.ranges){const points=spanPoints(track,g,range),start=points[0],end=points.at(-1),kerb=track.export?.kerbs===false?0:Math.max(.7,...points.map(p=>p.kerbWidth||.7));for(let i=1;i<points.length;i++)segments.push({a:points[i-1].pos,b:points[i].pos,type:range.type,start,end,half:(track.width/2+kerb+1.1)*Math.max(1,Math.hypot(...points[i-1].left),Math.hypot(...points[i].left)),ya:g.structureProfile.original(points[i-1].station),yb:g.structureProfile.original(points[i].station)});}
 return (x,z,height,nearest,paved=false)=>{let best=null;for(const segment of segments){const {a,b,start,end}=segment;if(segment.type==='tunnel'&&((x-start.pos[0])*start.forward[0]+(z-start.pos[2])*start.forward[2]<-1e-5||(x-end.pos[0])*end.forward[0]+(z-end.pos[2])*end.forward[2]>1e-5))continue;const dx=b[0]-a[0],dz=b[2]-a[2],raw=((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz||1),t=Math.max(0,Math.min(1,raw)),d=Math.hypot(x-a[0]-dx*t,z-a[2]-dz*t);if(d<segment.half+6&&(!best||d<best.d))best={...segment,d,t};}if(!best||paved&&best.type==='bridge')return height;const target=best.ya+(best.yb-best.ya)*best.t-.08,weight=(1-smooth((best.d-best.half)/6))*(best.type==='tunnel'?1:smooth(nearest/3)),value=best.type==='bridge'?Math.min(height,target):Math.max(height,target);return height+(value-height)*weight;};
}
export function addStructures(track,g,terrain,add,quad,materials){
 const ranges=g.structureProfile?.ranges||[];if(!ranges.length)return;
 const concrete=materials.length;materials.push({name:'Structure concrete',color:[162,166,159],noise:6,finish:'concrete'});const dark=materials.length;materials.push({name:'Tunnel interior',color:[128,140,143],noise:4,finish:'concrete'});const steel=materials.length;materials.push({name:'Bridge guard rails',color:[75,104,114],noise:3,finish:'steel'});const light=materials.length;materials.push({name:'Tunnel ceiling panels',color:[222,226,209],noise:1,emissive:[.12,.14,.1]});const trim=materials.length;materials.push({name:'Structure edge trim',color:[216,198,133],noise:2});
 const at=(p,offset,y)=>[p.pos[0]+p.left[0]*offset,y,p.pos[2]+p.left[2]*offset];
 function solid(mesh,p,q,left,right,bottom,top){const lo=Math.min(left,right),hi=Math.max(left,right);left=hi;right=lo;const a=at(p,left,bottom(p)),b=at(q,left,bottom(q)),c=at(q,right,bottom(q)),d=at(p,right,bottom(p)),e=at(p,left,top(p)),f=at(q,left,top(q)),h=at(q,right,top(q)),i=at(p,right,top(p));quad(mesh,a,b,c,d);quad(mesh,i,h,f,e);quad(mesh,e,f,b,a);quad(mesh,d,c,h,i);quad(mesh,a,d,i,e);quad(mesh,f,h,c,b);}
 function arch(mesh,p,q,half,rise,clearance,thickness,capStart=false,capEnd=false){
  const count=24,ring=(point,theta,outer)=>at(point,(half+(outer?thickness:0))*Math.cos(theta),point.pos[1]+clearance+(outer?thickness:0)+rise*Math.sin(theta));
  const face=(vertices,points,angles,outer)=>{const start=mesh.vertices.length;quad(mesh,...vertices);mesh.vertices.slice(start).forEach((v,i)=>{const p=points[i],a=angles[i],direction=outer?1:-1,nx=Math.cos(a)/(half+(outer?thickness:0)),ny=Math.sin(a)/Math.max(.01,rise),len=Math.hypot(nx,ny)||1,l=Math.hypot(...p.left)||1;v.normal=[direction*p.left[0]/l*nx/len,direction*ny/len,direction*p.left[2]/l*nx/len];v.uv=[p.station/4,a/Math.PI*half];});};
  for(let j=0;j<count;j++){const a=j/count*Math.PI,b=(j+1)/count*Math.PI,pa=ring(p,a,false),pb=ring(p,b,false),qa=ring(q,a,false),qb=ring(q,b,false),poa=ring(p,a,true),pob=ring(p,b,true),qoa=ring(q,a,true),qob=ring(q,b,true);face([pa,qa,qb,pb],[p,q,q,p],[a,a,b,b],false);face([pob,qob,qoa,poa],[p,q,q,p],[b,b,a,a],true);if(capStart)quad(mesh,pa,pb,pob,poa);if(capEnd)quad(mesh,qb,qa,qoa,qob);}
 }
 const advance=(p,distance)=>({...p,pos:[p.pos[0]+p.forward[0]*distance,p.pos[1],p.pos[2]+p.forward[2]*distance],station:p.station+distance});
 for(const range of ranges){
  const points=spanPoints(track,g,range),kerb=track.export?.kerbs===false?0:Math.max(.7,...points.map(p=>p.kerbWidth||.7)),half=track.width/2+kerb+1.1,body=add(`1WALL_${range.type.toUpperCase()}_${range.index}`,range.type==='bridge'?concrete:dark),guard=add(`1WALL_${range.type.toUpperCase()}_GUARDS_${range.index}`,range.type==='bridge'?steel:concrete),roof=range.type==='tunnel'?add(`1WALL_TUNNEL_ROOF_${range.index}`,dark):null,portalRoof=range.type==='tunnel'?add(`1WALL_TUNNEL_PORTAL_ROOF_${range.index}`,concrete):null,details=add(`SCENERY_${range.type.toUpperCase()}_GUIDES_${range.index}`,trim),lamps=range.type==='tunnel'?add(`TUNNEL_CEILING_PANELS_${range.index}`,light):null;
  for(let i=1;i<points.length;i++){const p=points[i-1],q=points[i];
   if(range.type==='bridge'){
    // The collision road is the deck top. A separate underside never raises it.
    const a=at(p,half,p.pos[1]-.6),b=at(q,half,q.pos[1]-.6),c=at(q,-half,q.pos[1]-.6),d=at(p,-half,p.pos[1]-.6);quad(body,a,b,c,d);quad(body,at(p,half,p.pos[1]),at(q,half,q.pos[1]),b,a);quad(body,d,c,at(q,-half,q.pos[1]),at(p,-half,p.pos[1]));
    for(const side of [-1,1]){solid(body,p,q,side*(track.width/2+kerb),side*(half-.3),v=>v.pos[1]-.6,v=>v.pos[1]);solid(guard,p,q,side*(half-.15),side*(half+.05),v=>v.pos[1]-.58,v=>v.pos[1]-.12);}
   }else{
    for(const side of [-1,1])solid(body,p,q,side*half,side*(half+.65),v=>v.pos[1]-.25,v=>v.pos[1]+range.clearance+(range.roofRise>0?.65:.45));
    if(range.roofRise>0)arch(roof,p,q,half,range.roofRise,range.clearance,.65,i===1,i===points.length-1);else solid(roof,p,q,half+.65,-half-.65,v=>v.pos[1]+range.clearance,v=>v.pos[1]+range.clearance+.45);
    for(const side of [-1,1]){solid(guard,p,q,side*(half-.2),side*half,v=>v.pos[1],v=>v.pos[1]+.3);quad(details,at(p,side*(half-.004),p.pos[1]+1.1),at(q,side*(half-.004),q.pos[1]+1.1),at(q,side*(half-.004),q.pos[1]+1.18),at(p,side*(half-.004),p.pos[1]+1.18));}
    for(const side of [-1,1]){const offset=side*Math.min(half*.55,3),ceiling=range.clearance+(range.roofRise||0)*Math.sqrt(Math.max(0,1-(offset/half)**2));solid(lamps,p,q,offset-.08,offset+.08,v=>v.pos[1]+ceiling-.06,v=>v.pos[1]+ceiling-.025);}
   }
  }
  if(range.type==='bridge'){
   const padding=Math.min(12,range.ramp*.15),guards=spanPoints(track,g,range,padding);let nextPost=guards[0].station+1.5;
   for(let i=1;i<guards.length;i++){const p=guards[i-1],q=guards[i],factor=v=>.25+.75*smooth(Math.min(v.station-guards[0].station,guards.at(-1).station-v.station)/4);
    for(const side of [-1,1]){const base=v=>v.pos[1]+side*(half-.2)*Math.tan((v.bank||0)*Math.PI/180);solid(body,p,q,side*(half-.34),side*(half+.04),base,v=>base(v)+(range.bridgeStyle==='concrete'?1.12:.72)*factor(v));for(const height of (range.bridgeStyle==='concrete'?[1.16]:[.81,.99,1.17]))solid(guard,p,q,side*(half-.31),side*(half+.02),v=>base(v)+(height-.045)*factor(v),v=>base(v)+(height+.045)*factor(v));}
    if(p.station>=nextPost){nextPost=p.station+3;const postEnd=advance(p,.12);for(const side of [-1,1]){const base=v=>v.pos[1]+side*(half-.2)*Math.tan((v.bank||0)*Math.PI/180);solid(guard,p,postEnd,side*(half-.1),side*(half+.02),v=>base(v)+.65*factor(p),v=>base(v)+1.22*factor(p));}}
   }
   for(const [p,sign] of [[points[0],1],[points.at(-1),-1]]){const cap=[at(p,half,p.pos[1]-.6),at(p,-half,p.pos[1]-.6),at(p,-half,p.pos[1]),at(p,half,p.pos[1])];quad(body,...(sign>0?cap:cap.reverse()));}
  }
  if(range.type==='bridge')for(let i=2;i<points.length-2;i+=Math.max(2,Math.round(18/(range.span/(points.length-1))))){const p=points[i];for(const side of [-1,1]){const center=at(p,side*(half-.5),0);if([-1,0,1].some(dx=>[-1,0,1].some(dz=>terrain.isPaved(center[0]+dx,center[2]+dz))))continue;const foot=terrain.heightAt(center[0],center[2])-.15,top=p.pos[1]-.6;if(top<=foot+.2)continue;const q={...p,pos:[p.pos[0]+p.forward[0]*1.2,p.pos[1],p.pos[2]+p.forward[2]*1.2]};solid(body,p,q,side*(half-.9),side*(half-.1),()=>foot,()=>top);}}
  if(range.type==='tunnel')for(const [p,sign] of [[points[0],1],[points.at(-1),-1]]){const q=advance(p,sign*.6),a=sign>0?p:q,b=sign>0?q:p;if(range.roofRise>0)arch(portalRoof,sign>0?p:q,sign>0?q:p,half,range.roofRise,range.clearance,.85,true,true);else solid(portalRoof,a,b,half+1.1,-half-1.1,v=>v.pos[1]+range.clearance,v=>v.pos[1]+range.clearance+.85);for(const side of [-1,1]){solid(guard,a,b,side*half,side*(half+1.1),v=>v.pos[1]-.2,v=>v.pos[1]+range.clearance+.85);const approach=pointOnTrack(g,(p.station-sign*6)/(g.length*trackScale(track))),wing={...approach,station:p.station-sign*6,pos:toGamePoint(approach,track),...gameDirection(approach.angle)};wing.pos[0]+=wing.left[0]*side*1.5;wing.pos[2]+=wing.left[2]*side*1.5;solid(guard,sign>0?wing:p,sign>0?p:wing,side*half,side*(half+.5),v=>v.pos[1]-.15,v=>v.pos[1]+1.1);const reflector=advance(p,sign*.15);solid(details,sign>0?p:reflector,sign>0?reflector:p,side*(half+.02),side*(half+.12),v=>v.pos[1]+.5,v=>v.pos[1]+2.2);}}
 }
}
export function drawStructures(ctx,track,g,zoom,selectedIndex=-1){
 ctx.save();const s=trackScale(track),path=points=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));};
 for(const range of g.structureProfile?.ranges||[]){
  const active=range.index===selectedIndex,points=spanPoints(track,g,range),approaches=spanPoints(track,g,range,range.ramp),color=range.type==='bridge'?'#b88c45':'#538b98';ctx.strokeStyle=color;ctx.lineWidth=(track.width+2)/s;ctx.globalAlpha=active?.14:.065;path(approaches);ctx.stroke();ctx.globalAlpha=active?.25:.13;ctx.lineWidth=track.width/s;path(points);ctx.stroke();
  ctx.globalAlpha=active?1:.7;ctx.lineWidth=(active?2:1.2)/zoom;ctx.setLineDash([4/zoom,5/zoom]);for(const side of [-1,1]){const edge=approaches.map(p=>({x:p.x+p.left[0]*side*(track.width/2+1.3)/s,y:p.y+p.left[2]*side*(track.width/2+1.3)/s}));path(edge);ctx.stroke();}ctx.setLineDash([]);
  for(const side of [-1,1]){path(points.map(p=>({x:p.x+p.left[0]*side*(track.width/2+.8)/s,y:p.y+p.left[2]*side*(track.width/2+.8)/s})));ctx.stroke();}
  for(const p of [points[0],points.at(-1)]){const offset=(track.width/2+1.3)/s;ctx.beginPath();ctx.moveTo(p.x+p.left[0]*offset,p.y+p.left[2]*offset);ctx.lineTo(p.x-p.left[0]*offset,p.y-p.left[2]*offset);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,3/zoom,0,Math.PI*2);ctx.fill();}
  const p=pointOnTrack(g,range.center/(g.length*s)),label=`${range.type==='bridge'?'↑ BRIDGE':'↓ TUNNEL'} · ${range.span.toFixed(0)} m`;ctx.globalAlpha=1;ctx.font=`600 ${10/zoom}px sans-serif`;ctx.textAlign='center';const width=ctx.measureText(label).width+16/zoom,y=p.y-(track.width/2+3)/s;ctx.fillStyle=active?'#fff7e7':'#fdfdf3';ctx.fillRect(p.x-width/2,y-13/zoom,width,20/zoom);ctx.strokeStyle=color;ctx.lineWidth=1/zoom;ctx.strokeRect(p.x-width/2,y-13/zoom,width,20/zoom);ctx.fillStyle=range.type==='bridge'?'#815c28':'#356774';ctx.fillText(label,p.x,y);
 }
 ctx.restore();
}
