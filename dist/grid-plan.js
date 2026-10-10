import {pointOnTrack} from './engine.js?v=20261010-performance';
import {trackScale} from './coordinates.js?v=20261010-performance';

export const lapProgress=value=>((value%1)+1)%1;
export const gridStartSetting=value=>Number.isFinite(value)?lapProgress(value):null;

// A custom anchor is the center of the front row. Null follows start/finish.
export function buildGridPlan(track,g){
 const total=g.length*trackScale(track),custom=gridStartSetting(track.export?.gridStart),count=Math.max(1,Math.min(16,Math.round(Number(track.export?.pitboxes)||8))),spacing=Math.max(4,Math.min(12,Number(track.export?.gridSpacing)||6));
 const progress=custom??lapProgress((track.start||0)-8/(total||1)),slots=[];
 if(!total||track.complete===false)return {progress,custom:custom!==null,spacing,slots,total};
 const scale=trackScale(track),lateral=Math.min(2.2,track.width*.2),boxWidth=Math.min(1.6,track.width*.28);
 for(let i=0;i<count;i++){
  const station=lapProgress(progress-Math.floor(i/2)*spacing/total),road=pointOnTrack(g,station),side=(i%2?1:-1)*lateral,dx=Math.cos(road.angle),dy=Math.sin(road.angle),point={...road,x:road.x+dy*side/scale,y:road.y-dx*side/scale,elevation:(road.elevation||0)+side*Math.tan((road.bank||0)*Math.PI/180)};
  const at=(along,left)=>({x:point.x+(dx*along+dy*left)/scale,y:point.y+(dy*along-dx*left)/scale,elevation:point.elevation});
  const a=at(1.7,-boxWidth/2),b=at(1.7,boxWidth/2),c=at(-1.7,boxWidth/2),d=at(-1.7,-boxWidth/2);
  slots.push({index:i,progress:station,point,corners:[a,b,c,d]});
 }
 return {progress,custom:custom!==null,spacing,slots,total};
}

export function gridPaintQuads(plan,scale){
 const quads=[];
 for(const slot of plan.slots)for(const [a,b] of [[slot.corners[0],slot.corners[1]],[slot.corners[1],slot.corners[2]],[slot.corners[3],slot.corners[0]]]){
  const length=Math.hypot(b.x-a.x,b.y-a.y)||1,x=-(b.y-a.y)/length*.045/scale,y=(b.x-a.x)/length*.045/scale;
  quads.push([{...a,x:a.x+x,y:a.y+y},{...b,x:b.x+x,y:b.y+y},{...b,x:b.x-x,y:b.y-y},{...a,x:a.x-x,y:a.y-y}]);
 }
 return quads;
}

export function drawGrid(ctx,plan,zoom,scale){
 ctx.save();ctx.strokeStyle='#f0df9b';ctx.lineWidth=Math.max(.09/scale,1/zoom);ctx.fillStyle='#f0df9b';ctx.font=`bold ${9/zoom}px sans-serif`;ctx.textAlign='center';
 for(const slot of plan.slots){const [a,b,c,d]=slot.corners;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(c.x,c.y);ctx.stroke();ctx.fillText(String(slot.index+1),slot.point.x,slot.point.y+3/zoom);}
 ctx.restore();
}
