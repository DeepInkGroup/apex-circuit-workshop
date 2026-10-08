import {pointOnTrack,closestOnTrack} from './engine.js?v=20261008-structure-design';
import {trackScale,toGamePoint,gameDirection} from './coordinates.js?v=20261008-structure-design';
import {buildingContains,buildingSettings,buildingCorners} from './scenery.js?v=20261008-structure-design';
import {treeRadius} from './trees.js?v=20261008-structure-design';
import {barrierProperties} from './barriers.js?v=20261008-structure-design';
import {boardSettings,boardCard,BOARD_COLORS} from './board-design.js?v=20261008-structure-design';

import {detectTurns,roadDistanceProfile} from './corner-analysis.js?v=20261008-structure-design';
import {kerbSides} from './corner-settings.js?v=20261008-structure-design';
export {detectTurns} from './corner-analysis.js?v=20261008-structure-design';
const segmentDistance=(p,a,b,s)=>{const x=b.x-a.x,y=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return Math.hypot(p.x-a.x-x*t,p.y-a.y-y*t)*s;};
function segmentCross(a,b,c,d){const dx=b.x-a.x,dy=b.y-a.y,ux=d.x-c.x,uy=d.y-c.y,den=dx*uy-dy*ux;if(Math.abs(den)<1e-9)return null;const t=((c.x-a.x)*uy-(c.y-a.y)*ux)/den,u=((c.x-a.x)*dy-(c.y-a.y)*dx)/den;return t>=0&&t<=1&&u>=0&&u<=1?{t,u}:null;}
export function turnMarkerPlan(track,g,pit,pitWalls=[]){
 const turns=detectTurns(track,g),markers=[],s=trackScale(track),total=g.length*s,closed=g.closed!==false,settings=boardSettings(track),radius=settings.width/2+.25,issues=[],selectedTurns=turns.filter(turn=>turn.boards.ten||turn.boards.five).length;let skipped=0,requested=0;
 if(track.export?.distanceMarkers===false||!total)return {turns,markers,skipped,settings,selectedTurns,requested,issues};
 // Distances follow the 3D road centerline, including hills, rather than a
 // straight chord or the shorter overhead projection.
 const path=roadDistanceProfile(track,g),stationAtArc=path.stationAtSurface;
 const trees=track.export?.trees===false?[]:track.trees||[],buildings=track.export?.buildings===false?[]:(track.buildings||[]).map(b=>({...b,...buildingSettings(b)})),walls=[...(track.barriers||[]),...pitWalls].map(w=>({...w,...barrierProperties(w)}));
 const clear=p=>{
  if(closestOnTrack(g,p).distance*s<track.width/2+radius+.15)return false;
  if([pit.path,pit.parkingPath,pit.connector,pit.exitConnector,pit.entryConnection,pit.exitConnection].some(path=>path.slice(1).some((b,i)=>segmentDistance(p,path[i],b,s)<Math.max(path[i].width||pit.settings.width,b.width||pit.settings.width)/2+radius)))return false;
  if(pit.bays.some(b=>segmentDistance(p,b.center,b.center,s)<3.12+radius))return false;
  if(buildings.some(b=>buildingContains(b,p,s,radius)))return false;
  if(trees.some(t=>Math.hypot(p.x-t.x,p.y-t.y)*s<treeRadius(t)+radius))return false;
  if(walls.some(w=>w.points.slice(1).some((b,i)=>segmentDistance(p,w.points[i],b,s)<w.width/2+radius)))return false;
  return !markers.some(m=>Math.hypot(p.x-m.x,p.y-m.y)*s<settings.width+.7);
 };
 const visible=(p,viewer)=>!trees.some(t=>segmentDistance(t,viewer,p,s)<treeRadius(t)+.2)&&!buildings.some(b=>{if(buildingContains(b,viewer,s)||buildingContains(b,p,s))return true;const corners=buildingCorners(b,s);return corners.some((a,i)=>segmentCross(viewer,p,a,corners[(i+1)%corners.length]));});
 // Keep the distance pair on one side with one setback before trying
 // individual fallbacks. A blocked board never moves forward/backward.
 for(const turn of turns){
  const entryArc=path.atStation(turn.entry),desired=[],distances=[...(turn.boards.ten?[10]:[]),...(turn.boards.five?[5]:[])];requested+=distances.length;
  for(const distance of distances){if((!closed&&entryArc<distance)||(closed&&path.length<=distance)){skipped++;issues.push({turn:turn.number,distance,reason:'Not enough road before this turn'});continue;}const target=entryArc-distance,station=stationAtArc(target),p=pointOnTrack(g,station/total),viewer=pointOnTrack(g,stationAtArc(target-15)/total);desired.push({distance,station,p,viewer});}
  const preferred=turn.boards.side==='left'?1:turn.boards.side==='right'?-1:turn.sign>0?1:-1,sides=turn.boards.side==='auto'?[preferred,-preferred]:[preferred],gaps=[...new Set([settings.setback,settings.setback+1,settings.setback+2.5,settings.setback+4.5,settings.setback+7])];
  const candidate=(item,side,gap)=>{const {p,viewer}=item,offset=side*(track.width/2+(track.export?.kerbs===false||!kerbSides(p.kerbs||'inherit').includes(side)?0:p.kerbWidth||.7)+gap),location={...p,x:p.x+Math.sin(p.angle)*offset/s,y:p.y-Math.cos(p.angle)*offset/s};if(!clear(location)||!visible(location,viewer))return null;return {...location,distance:item.distance,station:item.station,turnNumber:turn.number,turnName:turn.name,turnEntry:turn.entry,direction:turn.direction,side,setback:gap,roadPoint:p,roadEdge:{x:p.x+Math.sin(p.angle)*side*track.width/2/s,y:p.y-Math.cos(p.angle)*side*track.width/2/s},viewer,facingAngle:Math.atan2(location.y-viewer.y,location.x-viewer.x)};};
  let pair=null;for(const side of sides){for(const gap of gaps){const choices=desired.map(item=>candidate(item,side,gap));if(choices.length&&choices.every(Boolean)&&(choices.length===1||Math.hypot(choices[0].x-choices[1].x,choices[0].y-choices[1].y)*s>settings.width+.7)){pair=choices;break;}}if(pair)break;}
  if(pair)markers.push(...pair);else for(const item of desired){let choice=null;for(const side of sides){for(const gap of gaps){choice=candidate(item,side,gap);if(choice)break;}if(choice)break;}if(choice)markers.push(choice);else {skipped++;issues.push({turn:turn.number,distance:item.distance,reason:turn.boards.side==='auto'?'No clear, visible trackside position':'Chosen side is obstructed; move scenery or choose Auto side'});}}
 }
 // Retain crossed walls so native panel heights can clear the actual terrain
 // and barrier tops, instead of disappearing behind a safety wall.
 for(const marker of markers){marker.sightWalls=[];for(const wall of walls)for(let i=1;i<wall.points.length;i++){const c=wall.points[i-1],d=wall.points[i],hit=segmentCross(marker.viewer,marker,c,d);if(hit&&hit.t>0&&hit.t<1)marker.sightWalls.push({x:c.x+(d.x-c.x)*hit.u,y:c.y+(d.y-c.y)*hit.u,elevation:(c.elevation||0)+((d.elevation||0)-(c.elevation||0))*hit.u,height:wall.height,rayFraction:hit.t});}
 }
 return {turns,markers,skipped,settings,selectedTurns,requested,issues};
}
export function drawTurnMarkers(ctx,plan,scale,zoom){
 ctx.save();const occupied=[],width=30/zoom,height=38/zoom;ctx.lineWidth=1/zoom;
 for(const marker of plan.markers){
  const p=marker.roadEdge||marker.roadPoint||marker,accent=marker.distance===5?'#dc6637':'#d39f31';
  // Screen-space callouts stay readable without hiding one another at low zoom.
  let card={x:marker.x-width/2,y:marker.y-height/2};for(const [dx,dy] of [[0,0],[0,-height-5/zoom],[0,height+5/zoom],[width+5/zoom,0],[-width-5/zoom,0],[width+5/zoom,-height-5/zoom],[-width-5/zoom,height+5/zoom]]){const trial={x:marker.x-width/2+dx,y:marker.y-height/2+dy};if(!occupied.some(b=>trial.x<b.x+width+3/zoom&&trial.x+width+3/zoom>b.x&&trial.y<b.y+height+3/zoom&&trial.y+height+3/zoom>b.y)){card=trial;break;}}occupied.push(card);
  ctx.strokeStyle=accent;ctx.globalAlpha=.75;ctx.setLineDash([2/zoom,3/zoom]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(marker.x,marker.y);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
  ctx.beginPath();ctx.moveTo(marker.x,marker.y);ctx.lineTo(card.x+width/2,card.y+height/2);ctx.stroke();ctx.fillStyle=accent;ctx.beginPath();ctx.arc(marker.x,marker.y,2.5/zoom,0,Math.PI*2);ctx.fill();
  ctx.shadowColor='#102c2440';ctx.shadowBlur=3/zoom;ctx.shadowOffsetY=1/zoom;ctx.drawImage(boardCard({distance:marker.distance,direction:marker.direction,style:plan.settings?.style||'classic'}),card.x,card.y,width,height);ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 }
 ctx.restore();
}
export function addTurnMarkers(track,plan,terrain,add,quad,materials){
 if(!plan.markers.length)return;
 const settings=plan.settings||boardSettings(track),dark=materials.length;materials.push({name:'Distance board frame',color:BOARD_COLORS.ink,noise:2});const metal=materials.length;materials.push({name:'Distance board supports',color:[145,161,158],noise:3,finish:'steel'});
 const frame=add('SCENERY_TURN_DISTANCE_FRAMES',dark),posts=add('SCENERY_TURN_DISTANCE_POSTS',metal),faces=new Map();
 for(const marker of plan.markers){
  const center=toGamePoint(marker,track),ground=terrain.heightAt(center[0],center[2]),{left,forward}=gameDirection(marker.facingAngle??marker.angle),at=(x,y,z=0)=>[center[0]+left[0]*x+forward[0]*z,y,center[2]+left[2]*x+forward[2]*z],width=settings.width,height=settings.height;
  let bottom=Math.max(ground+.8,(marker.roadPoint?.elevation||0)+.8);const eye=(marker.viewer?.elevation||0)+1.1;for(const wall of marker.sightWalls||[]){const p=toGamePoint(wall,track),top=Math.max(terrain.heightAt(p[0],p[2]),wall.elevation||0)+wall.height,required=eye+(top+.2-eye)/Math.max(.05,wall.rayFraction)-height*.5;bottom=Math.max(bottom,Math.min(ground+7,required));}
  marker.groundElevation=ground;marker.panelBottom=bottom;marker.panelTop=bottom+height;
  const cuboid=(mesh,x,y,z,w,h,d)=>{const a=x-w/2,b=x+w/2,c=z-d/2,e=z+d/2,top=y+h,p=(u,v,t)=>at(u,v,t);quad(mesh,p(a,y,e),p(b,y,e),p(b,top,e),p(a,top,e));quad(mesh,p(b,y,c),p(a,y,c),p(a,top,c),p(b,top,c));quad(mesh,p(b,y,e),p(b,y,c),p(b,top,c),p(b,top,e));quad(mesh,p(a,y,c),p(a,y,e),p(a,top,e),p(a,top,c));quad(mesh,p(a,top,e),p(b,top,e),p(b,top,c),p(a,top,c));quad(mesh,p(a,y,c),p(b,y,c),p(b,y,e),p(a,y,e));};
  cuboid(frame,0,bottom,0,width,height,.075);
  for(const x of [-width*.32,width*.32]){const p=at(x,0,.08),foot=terrain.heightAt(p[0],p[2])-.12;cuboid(posts,x,foot,.08,.075,bottom+height-.12-foot,.075);cuboid(posts,x,foot+.1,.08,.23,.035,.23);}
  for(const y of [bottom+.15,bottom+height-.15])cuboid(posts,0,y,.09,width*.74,.06,.09);
  const id=`${marker.distance}_${marker.direction}`;if(!faces.has(id)){const material=materials.length;materials.push({name:`Distance board ${id}`,color:BOARD_COLORS.paper,noise:0,distanceBoard:{distance:marker.distance,direction:marker.direction,style:settings.style}});faces.set(id,add(`SCENERY_TURN_DISTANCE_BOARDS_${id.toUpperCase()}`,material));}
  const board=faces.get(id),w=width-.055,h=height-.055;
  for(const back of [false,true]){const z=back?.039:-.039,p=[at(-w/2,bottom+.0275,z),at(w/2,bottom+.0275,z),at(w/2,bottom+.0275+h,z),at(-w/2,bottom+.0275+h,z)],uv=back?[[0,1],[1,1],[1,0],[0,0]]:[[1,0],[0,0],[0,1],[1,1]],start=board.vertices.length;quad(board,...(back?p:p.reverse()));for(let i=0;i<4;i++){board.vertices[start+i].uv=uv[i];board.vertices[start+i].tangent=left.map(v=>back?v:-v);}}
 }
}
