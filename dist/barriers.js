import {clamp,closestOnTrack,pointOnTrack} from './engine.js?v=20261008-corners';
import {buildingContains} from './scenery.js?v=20261008-corners';
import {treeRadius} from './trees.js?v=20261008-corners';
export const BARRIER_TYPES={concrete:{label:'Concrete safety wall',width:.8,color:'#a9adb0'},tyres:{label:'Tyre wall',width:1.1,color:'#303734'},steel:{label:'Steel crash barrier',width:.8,color:'#a1b4bc'}};
export function barrierProperties(raw={}){const type=BARRIER_TYPES[raw.type]?raw.type:'concrete';return {type,width:clamp(Number(raw.width)||BARRIER_TYPES[type].width,BARRIER_TYPES[type].width,2),height:clamp(Number(raw.height)||1.2,1,4),style:raw.style==='striped'?'striped':'concrete'};}
export function pitOuterBarriers(track,plan,geometry,gantry=null){
 if(plan.settings.outerBarriers===false||!geometry.length)return [];
 const source=plan.expanded?plan.parkingPath:plan.path,s=plan.scale,side=plan.side,props=barrierProperties({type:plan.settings.barrierType,height:plan.settings.barrierHeight}),offset=side*(plan.settings.width/2+4.2+props.width/2),paths=[];
 let distance=0;const stations=source.map((p,i)=>{if(i)distance+=Math.hypot(p.x-source[i-1].x,p.y-source[i-1].y)*s;return distance;});
 let segment=[];const finish=()=>{if(segment.length>1)paths.push({...props,points:segment,pitOuter:true});segment=[];};
 source.forEach((p,i)=>{
  // The back wall leaves the first and last 6 meters open for pit access.
  if(stations[i]<6||stations[i]>distance-6){finish();return;}
  const a=source[Math.max(0,i-1)],b=source[Math.min(source.length-1,i+1)],angle=Math.atan2(b.y-a.y,b.x-a.x),v={x:p.x+Math.sin(angle)*offset/s,y:p.y-Math.cos(angle)*offset/s,elevation:(p.elevation||0)+offset*Math.tan((p.bank||0)*Math.PI/180)};
  const near=closestOnTrack(geometry,v),entryExit=[plan.entryConnection,plan.exitConnection,plan.connector,plan.exitConnector];
  const blocked=near.distance*s<track.width/2+props.width/2+1||entryExit.some(route=>route.some(q=>Math.hypot(q.x-v.x,q.y-v.y)*s<(q.width||plan.settings.width)/2+props.width/2+1.2))||plan.stalls.some(q=>Math.hypot(q.x-v.x,q.y-v.y)*s<3)||gantry?.supports.some(q=>Math.hypot(q.x-v.x,q.y-v.y)*s<props.width/2+1)||track.buildings?.some(q=>buildingContains(q,v,s,props.width/2+1))||track.trees?.some(q=>Math.hypot(q.x-v.x,q.y-v.y)*s<treeRadius(q)+props.width/2+.5);
  if(blocked){finish();return;}segment.push(v);
 });finish();return paths;
}
export function drawBarrier(ctx,raw,scale,zoom=1){
 const b={...raw,...barrierProperties(raw)},points=b.points;if(points.length<2)return;
 ctx.save();ctx.lineJoin='miter';ctx.lineCap='butt';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.strokeStyle='#273430';ctx.lineWidth=b.width/scale+1/zoom;ctx.stroke();ctx.strokeStyle=BARRIER_TYPES[b.type].color;ctx.lineWidth=b.width/scale;ctx.stroke();
 if(b.style==='striped'){ctx.setLineDash([2/scale,2/scale]);ctx.strokeStyle='#bc5345';ctx.stroke();}
 if(b.type==='tyres'){ctx.setLineDash([.1/scale,.8/scale]);ctx.strokeStyle='#66706a';ctx.lineWidth=Math.max(.12/scale,1/zoom);ctx.stroke();}
 if(b.type==='steel'){ctx.setLineDash([]);ctx.strokeStyle='#e1e7e3';ctx.lineWidth=.12/scale;ctx.stroke();}ctx.restore();
}
// Closed, joined prisms: outward-facing sides, end caps, top and buried bottom.
// Small faces and a minimum thickness replace the old independent thin blocks.
export function addBarrierMeshes(raw,track,geometry,ground,add,quad,world,materials,prefix){
 const b={...raw,...barrierProperties(raw)},s=track.scale||.2,source=b.points.filter((p,i,a)=>!i||Math.hypot(p.x-a[i-1].x,p.y-a[i-1].y)*s>.001);if(source.length<2)return;
 const length=source.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-source[i].x,p.y-source[i].y)*s,0),spacing=Math.max(2,length/1800),path=[source[0]];
 for(let i=1;i<source.length;i++){const a=source[i-1],b=source[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)*s/spacing));for(let j=1;j<=steps;j++){const t=j/steps;path.push({...b,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,elevation:(a.elevation||0)+((b.elevation||0)-(a.elevation||0))*t});}}
 const colors={concrete:[166,171,172],tyres:[35,40,37],steel:[137,158,167]},mat=materials.length;materials.push({name:`${prefix} ${b.type}`,color:colors[b.type],noise:b.type==='tyres'?3:5});
 const meshes=new Map(),emit=(material,name,...corners)=>{let m=meshes.get(material);if(!m||m.vertices.length>47000){m=add(name+(meshes.has(material)?'_'+meshes.get(material).part:''),material);m.part=(meshes.get(material)?.part||0)+1;meshes.set(material,m);}quad(m,...corners,2);};
 const centers=path.map(p=>{const near=closestOnTrack(geometry,p),road=pointOnTrack(geometry,near.progress),signed=((p.x-road.x)*Math.sin(road.angle)-(p.y-road.y)*Math.cos(road.angle))*s,pos=world(p,track),floor=typeof ground==='function'?ground(pos[0],pos[2]):(road.elevation||0)+signed*Math.tan((road.bank||0)*Math.PI/180);return {pos,top:Math.max(p.elevation||0,floor)+b.height};});
 const rails=centers.map((p,i)=>{
  const prev=centers[Math.max(0,i-1)].pos,next=centers[Math.min(centers.length-1,i+1)].pos,v=p.pos,dir=(a,c)=>{const d=Math.hypot(c[0]-a[0],c[2]-a[2])||1;return [(c[2]-a[2])/d,-(c[0]-a[0])/d];},u=i?dir(prev,v):dir(v,next),w=i===centers.length-1?u:dir(v,next),len=Math.hypot(u[0]+w[0],u[1]+w[1]);let nx=w[0],nz=w[1],factor=1;if(len>.001){nx=(u[0]+w[0])/len;nz=(u[1]+w[1])/len;factor=Math.min(2,1/Math.max(.5,nx*w[0]+nz*w[1]));}
  const half=b.width/2*factor,foot=Math.min(typeof ground==='function'?Math.min(ground(v[0]+nx*half,v[2]+nz*half),ground(v[0]-nx*half,v[2]-nz*half)):ground,v[1])-.25;return {l:[v[0]+nx*half,foot,v[2]+nz*half],r:[v[0]-nx*half,foot,v[2]-nz*half],tl:[v[0]+nx*half,p.top,v[2]+nz*half],tr:[v[0]-nx*half,p.top,v[2]-nz*half]};
 });
 const mix=(a,c,t)=>a.map((v,i)=>v+(c[i]-v)*t),total=centers.slice(1).reduce((sum,p,i)=>sum+Math.hypot(...p.pos.map((v,k)=>v-centers[i].pos[k])),0),faceLength=Math.max(2,total/1800);let station=0;
 for(let i=1;i<rails.length;i++){
  const a=rails[i-1],c=rails[i],length=Math.hypot(...centers[i].pos.map((v,k)=>v-centers[i-1].pos[k])),steps=Math.max(1,Math.ceil(length/faceLength));
  for(let j=0;j<steps;j++){
   const from=Object.fromEntries(Object.keys(a).map(k=>[k,mix(a[k],c[k],j/steps)])),to=Object.fromEntries(Object.keys(a).map(k=>[k,mix(a[k],c[k],(j+1)/steps)])),material=b.style==='striped'?(Math.floor((station+length*j/steps)/2)%2?3:2):mat;
   const name=material===mat?prefix:prefix+(material===2?'_WHITE':'_RED');
   emit(material,name,to.l,from.l,from.tl,to.tl);emit(material,name,from.r,to.r,to.tr,from.tr);emit(material,name,from.tl,from.tr,to.tr,to.tl);emit(material,name,from.l,to.l,to.r,from.r);
   if(i===1&&j===0)emit(material,name,from.l,from.r,from.tr,from.tl);
   if(i===rails.length-1&&j===steps-1)emit(material,name,to.r,to.l,to.tl,to.tr);
  }
  station+=length;
 }
 // Tyre stacks and raised steel ribs decorate the continuous collision core.
 if(b.type==='concrete')return;
 const detail=materials.length;materials.push({name:`${prefix} detail`,color:b.type==='tyres'?[63,69,63]:[198,211,215],noise:2});
 let count=0;
 for(let i=1;i<centers.length;i++){
  const a=centers[i-1].pos,c=centers[i].pos,length=Math.hypot(c[0]-a[0],c[2]-a[2]),nx=(c[2]-a[2])/(length||1),nz=-(c[0]-a[0])/(length||1),steps=Math.ceil(length/1.1);
  for(let j=0;j<steps&&count<600;j++,count++){
   const p=mix(a,c,(j+.5)/steps),height=b.height;
   if(b.type==='tyres')for(let row=0;row<Math.min(8,Math.ceil(height/.38));row++){
    const y=p[1]+row*.38,top=Math.min(p[1]+height,y+.34),radius=b.width*.51;
    for(let k=0;k<10;k++){const angle=k*Math.PI/5,next=(k+1)*Math.PI/5,at=(r,t,h)=>[p[0]+Math.cos(t)*r,h,p[2]+Math.sin(t)*r];emit(detail,`${prefix.replace(/^1/,'')}_TYRES`,at(radius,next,y),at(radius,angle,y),at(radius,angle,top),at(radius,next,top));emit(detail,`${prefix.replace(/^1/,'')}_TYRES`,at(radius,next,top),at(radius,angle,top),at(radius*.55,angle,top),at(radius*.55,next,top));}
   }
   if(b.type==='steel')for(const side of [-1,1])for(const h of [.35,.7,1]){
    const off=side*(b.width/2+.025),along=.5,dx=(c[0]-a[0])/(length||1)*along,dz=(c[2]-a[2])/(length||1)*along,x=p[0]+nx*off,z=p[2]+nz*off,y=p[1]+height*h;
    emit(detail,`${prefix.replace(/^1/,'')}_STEEL`,[x-dx,y-.045,z-dz],[x+dx,y-.045,z+dz],[x+dx,y+.045,z+dz],[x-dx,y+.045,z-dz]);
   }
  }
 }
}
