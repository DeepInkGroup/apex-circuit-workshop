import {pointOnTrack} from './engine.js?v=20261010-smooth-grid';
import {trackScale} from './coordinates.js?v=20261010-smooth-grid';

export const lapProgress=value=>((value%1)+1)%1;
export const gridStartSetting=value=>Number.isFinite(value)?lapProgress(value):null;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function gridSettings(value={}){value=value||{};return {gridLayout:['paired','staggered','single'].includes(value.gridLayout)?value.gridLayout:'paired',gridPoleSide:value.gridPoleSide==='left'?'left':'right',gridSpacing:clamp(Number(value.gridSpacing)||6,4,20),gridGap:Number.isFinite(value.gridGap)?clamp(value.gridGap,1.5,12):null,gridStagger:clamp(Number.isFinite(value.gridStagger)?value.gridStagger:2.5,.5,8),gridOffset:clamp(Number(value.gridOffset)||0,-10,10)};}

// A custom anchor is the center of the front row. Null follows start/finish.
export function buildGridPlan(track,g){
 const settings=gridSettings(track.export),total=g.length*trackScale(track),custom=gridStartSetting(track.export?.gridStart),count=Math.max(1,Math.min(16,Math.round(Number(track.export?.pitboxes)||8))),spacing=settings.gridSpacing;
 const progress=custom??lapProgress((track.start||0)-8/(total||1)),slots=[];
 const scale=trackScale(track),boxWidth=Math.min(1.6,track.width*.28),paired=settings.gridLayout!=='single',requestedGap=settings.gridGap??Math.min(4.4,track.width*.4),gap=paired?clamp(requestedGap,boxWidth+.3,Math.max(boxWidth+.3,track.width-boxWidth-.6)):0,lateral=gap/2,offsetLimit=Math.max(0,track.width/2-boxWidth/2-.3-lateral),offset=clamp(settings.gridOffset,-offsetLimit,offsetLimit),stagger=settings.gridLayout==='staggered'?Math.min(settings.gridStagger,spacing*.8):0,pole=settings.gridPoleSide==='left'?1:-1;
 const result={progress,custom:custom!==null,spacing,slots,total,layout:settings.gridLayout,poleSide:settings.gridPoleSide,gap,offset,stagger,adjusted:paired&&Math.abs(gap-requestedGap)>.01||Math.abs(offset-settings.gridOffset)>.01||settings.gridLayout==='staggered'&&stagger<settings.gridStagger-.01,footprint:0};
 if(!total||track.complete===false)return result;
 for(let i=0;i<count;i++){
  const row=paired?Math.floor(i/2):i,behind=row*spacing+(paired&&i%2?stagger:0),station=lapProgress(progress-behind/total),road=pointOnTrack(g,station),side=offset+(paired?(i%2?-pole:pole)*lateral:0),dx=Math.cos(road.angle),dy=Math.sin(road.angle),point={...road,x:road.x+dy*side/scale,y:road.y-dx*side/scale,elevation:(road.elevation||0)+side*Math.tan((road.bank||0)*Math.PI/180)};
  const at=(along,left)=>({x:point.x+(dx*along+dy*left)/scale,y:point.y+(dy*along-dx*left)/scale,elevation:point.elevation});
  const a=at(1.7,-boxWidth/2),b=at(1.7,boxWidth/2),c=at(-1.7,boxWidth/2),d=at(-1.7,-boxWidth/2);
  slots.push({index:i,row,behind,side,progress:station,point,corners:[a,b,c,d]});result.footprint=Math.max(result.footprint,behind+3.4);
 }
 return result;
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
