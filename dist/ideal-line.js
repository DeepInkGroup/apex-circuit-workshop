import {clamp} from './engine.js?v=20261008-terrain';
// A generated learning guide: smooth the path within joined road cross-sections.
// This is not a lap-time optimizer or a substitute for recorded race AI.
export function idealLine(track,road){
  const n=road.center.length;if(n<3)return [];
  const scale=track.scale||.2,closed=track.complete!==false,ratios=Array(n).fill(.5);
  const point=(i,r=ratios[i])=>{const a=road.right[i],b=road.left[i],width=Math.hypot(b.x-a.x,b.y-a.y)*scale;return {x:a.x+(b.x-a.x)*r,y:a.y+(b.y-a.y)*r,elevation:a.elevation+(b.elevation-a.elevation)*r,bank:road.center[i].bank||0,station:road.center[i].station,leftDistance:width*(1-r),rightDistance:width*r};};
  for(let pass=0;pass<90;pass++){
    const next=ratios.slice();
    for(let i=closed?0:1;i<(closed?n:n-1);i++){
      const a=point((i+n-1)%n),b=point((i+1)%n),r=road.right[i],l=road.left[i],dx=l.x-r.x,dy=l.y-r.y,span=dx*dx+dy*dy;
      const margin=Math.min(.4,1.1/(Math.sqrt(span)*scale||1)),target=span?(((a.x+b.x)/2-r.x)*dx+((a.y+b.y)/2-r.y)*dy)/span:.5;
      next[i]=clamp(ratios[i]+(target-ratios[i])*.45,margin,1-margin);
    }
    ratios.splice(0,n,...next);
  }
  let points=ratios.map((r,i)=>point(i,r));
  if(closed){const station=((track.start||0)%1+1)%1*(road.totalMeters||road.center.at(-1).station);let start=0,error=Infinity;road.center.forEach((p,i)=>{const d=Math.abs(p.station-station);if(d<error){error=d;start=i;}});points=[...points.slice(start),...points.slice(0,start)];}
  return points.map((p,i)=>{const a=points[closed?(i+n-1)%n:Math.max(0,i-1)],b=points[closed?(i+1)%n:Math.min(n-1,i+1)],u=Math.atan2(p.y-a.y,p.x-a.x),v=Math.atan2(b.y-p.y,b.x-p.x),bend=Math.abs(Math.atan2(Math.sin(v-u),Math.cos(v-u))),span=(Math.hypot(p.x-a.x,p.y-a.y)+Math.hypot(b.x-p.x,b.y-p.y))*scale,radius=bend>.0001?span/(2*bend):10000;return {...p,angle:Math.atan2(b.y-a.y,b.x-a.x),color:radius<18?'#ed7851':radius<45?'#e9c452':'#68c89a',tone:radius<18?2:radius<45?1:0};});
}
export function drawIdealLine(ctx,points,scale,zoom=1,closed=true){
  const n=points.length;if(n<3)return;ctx.save();ctx.lineWidth=.24/(scale||.2);ctx.lineCap='butt';
  for(let i=0;i<(closed?n:n-1);i++){const a=points[i],b=points[(i+1)%n];if(Math.floor(a.station/3)%2)continue;ctx.strokeStyle=a.color;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  ctx.restore();
}
