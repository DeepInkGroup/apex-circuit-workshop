import {pointOnTrack,closestOnTrack} from './engine.js?v=20261008-grades';
import {trackScale,toGamePoint,gameDirection} from './coordinates.js?v=20261008-grades';
import {buildingContains,buildingSettings} from './scenery.js?v=20261008-grades';

const wrap=x=>((x%1)+1)%1;
const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const segmentDistance=(p,a,b,s)=>{const x=b.x-a.x,y=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/(x*x+y*y||1)));return Math.hypot(p.x-a.x-x*t,p.y-a.y-y*t)*s;};
export function detectTurns(track,g){
 const s=trackScale(track),total=g.length*s,closed=g.closed!==false;if(!total)return [];
 const count=Math.max(32,Math.min(6000,Math.ceil(total/.75))),step=total/(closed?count:count-1),look=Math.max(.75,step),rows=[];
 for(let i=0;i<count;i++){const station=i*step,p=pointOnTrack(g,station/total),a=pointOnTrack(g,(station-look)/total),b=pointOnTrack(g,(station+look)/total),angle=delta(a.angle,b.angle),curvature=angle/(2*look);rows.push({station,angle:curvature*step,sign:Math.abs(curvature)>=.0035?Math.sign(curvature):0,p});}
 const groups=[];for(const row of rows){if(!row.sign)continue;const last=groups.at(-1);if(last&&last.sign===row.sign&&row.station-last.end<=step*1.5){last.end=row.station;last.angle+=row.angle;}else groups.push({start:row.station,end:row.station,sign:row.sign,angle:row.angle});}
 if(closed&&groups.length>1){const first=groups[0],last=groups.at(-1);if(first.start<=step&&last.end>=total-step*1.5&&first.sign===last.sign){first.start=last.start;first.angle+=last.angle;first.end+=total;groups.pop();}}
 const sharp=[];g.cumulative.forEach((station,i)=>{if(i&&g.segments[i]===g.segments[i-1])return;if(!closed&&(i===0||i===g.samples.length-1))return;const before=g.samples[(i+g.samples.length-1)%g.samples.length],p=g.samples[i],after=g.samples[(i+1)%g.samples.length],turn=delta(Math.atan2(p.y-before.y,p.x-before.x),Math.atan2(after.y-p.y,after.x-p.x));if(Math.abs(turn)>.15)sharp.push({station:station*s,sign:Math.sign(turn)});});
 return groups.filter(group=>Math.abs(group.angle)>=12*Math.PI/180).map(group=>{const exact=sharp.find(p=>p.sign===group.sign&&Math.abs(p.station-group.start)<=look*2+step),entry=exact?.station??group.start,apex=pointOnTrack(g,wrap((group.start+group.end)/2/total));return {entry:entry%total,exit:group.end%total,direction:group.sign>0?'right':'left',sign:group.sign,name:apex.cornerName||'',angle:Math.abs(group.angle)*180/Math.PI};}).sort((a,b)=>a.entry-b.entry).map((turn,i)=>({...turn,number:i+1}));
}
export function turnMarkerPlan(track,g,pit,pitWalls=[]){
 const turns=detectTurns(track,g),markers=[],s=trackScale(track),total=g.length*s,closed=g.closed!==false;let skipped=0;
 if(track.export?.distanceMarkers===false)return {turns,markers,skipped};
 // Distances follow the 3D road centerline, including hills, rather than a
 // straight chord or the shorter overhead projection.
 const arc=[0],stations=[0],samples=Math.min(16000,Math.max(1,Math.ceil(total/.5)));let previous=pointOnTrack(g,0);
 for(let i=1;i<=samples;i++){const station=total*i/samples,p=pointOnTrack(g,station/total);arc.push(arc.at(-1)+Math.hypot((p.x-previous.x)*s,(p.y-previous.y)*s,(p.elevation||0)-(previous.elevation||0)));stations.push(station);previous=p;}
 const interpolate=(values,result,value)=>{let lo=0,hi=values.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(values[mid]<=value)lo=mid;else hi=mid-1;}if(lo===values.length-1)return result[lo];const t=(value-values[lo])/(values[lo+1]-values[lo]||1);return result[lo]+(result[lo+1]-result[lo])*t;};
 const clear=p=>{
  if(closestOnTrack(g,p).distance*s<track.width/2+.9)return false;
  if([pit.path,pit.parkingPath,pit.connector,pit.exitConnector,pit.entryConnection,pit.exitConnection].some(path=>path.slice(1).some((b,i)=>segmentDistance(p,path[i],b,s)<Math.max(path[i].width||pit.settings.width,b.width||pit.settings.width)/2+.8)))return false;
  if(pit.bays.some(b=>segmentDistance(p,b.center,b.center,s)<4))return false;
  if((track.buildings||[]).some(b=>buildingContains({...b,...buildingSettings(b)},p,s,.7)))return false;
  if((track.trees||[]).some(t=>Math.hypot(p.x-t.x,p.y-t.y)*s<1))return false;
  if([...(track.barriers||[]),...pitWalls].some(w=>w.points.slice(1).some((b,i)=>segmentDistance(p,w.points[i],b,s)<(w.width||1)/2+.6)))return false;
  return !markers.some(m=>Math.hypot(p.x-m.x,p.y-m.y)*s<1.2);
 };
 for(const turn of turns)for(const distance of [10,5]){
  const entryArc=interpolate(stations,arc,turn.entry);if(!closed&&entryArc<distance){skipped++;continue;}
  const target=closed?((entryArc-distance)%arc.at(-1)+arc.at(-1))%arc.at(-1):entryArc-distance,station=interpolate(arc,stations,target),p=pointOnTrack(g,station/total),preferred=turn.sign>0?1:-1,margin=track.width/2+(track.export?.kerbs===false?0:p.kerbWidth||.7);
  let location=null;for(const side of [preferred,-preferred]){for(const gap of [1.5,2.5,4,6,9]){const offset=side*(margin+gap),candidate={...p,x:p.x+Math.sin(p.angle)*offset/s,y:p.y-Math.cos(p.angle)*offset/s};if(clear(candidate)){location=candidate;break;}}if(location)break;}
  if(location)markers.push({...location,distance,station,turnNumber:turn.number,turnName:turn.name,turnEntry:turn.entry});else skipped++;
 }
 return {turns,markers,skipped};
}
export function drawTurnMarkers(ctx,plan,scale,zoom){
 ctx.save();ctx.font=`bold ${10/zoom}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
 for(const marker of plan.markers){const width=marker.distance===10?34:28,height=18;ctx.fillStyle='#fff7dd';ctx.strokeStyle='#253a35';ctx.lineWidth=1/zoom;ctx.fillRect(marker.x-width/2/zoom,marker.y-height/2/zoom,width/zoom,height/zoom);ctx.strokeRect(marker.x-width/2/zoom,marker.y-height/2/zoom,width/zoom,height/zoom);ctx.fillStyle='#253a35';ctx.fillText(`${marker.distance} m`,marker.x,marker.y);}
 ctx.restore();
}
const GLYPHS={'1':['010','110','010','010','010','010','111'],'0':['111','101','101','101','101','101','111'],'5':['111','100','100','111','001','001','111'],'m':['00000','00000','11010','10101','10101','10101','10101']};
export function addTurnMarkers(track,plan,terrain,add,quad,materials){
 if(!plan.markers.length)return;
 const dark=materials.length;materials.push({name:'Distance board ink',color:[25,37,33],noise:1});
 const boards=add('SCENERY_TURN_DISTANCE_BOARDS',2),ink=add('SCENERY_TURN_DISTANCE_NUMBERS',dark),posts=add('SCENERY_TURN_DISTANCE_POSTS',8);
 for(const marker of plan.markers){
  const center=toGamePoint(marker,track),ground=terrain.heightAt(center[0],center[2]),{left,forward}=gameDirection(marker.angle),at=(x,y,z=0)=>[center[0]+left[0]*x+forward[0]*z,ground+y,center[2]+left[2]*x+forward[2]*z];marker.groundElevation=ground;
  const face=(mesh,x,y,w,h,z=0,back=false)=>{const p=[at(x-w/2,y,z),at(x+w/2,y,z),at(x+w/2,y+h,z),at(x-w/2,y+h,z)];quad(mesh,...(back?p:p.reverse()));};
  face(posts,0,-.08,.06,1.48);face(posts,0,-.08,.06,1.48,.02,true);
  face(boards,0,.8,1.04,.65,-.026);face(boards,0,.8,1.04,.65,.026,true);
  for(const back of [false,true]){const text=String(marker.distance)+'m',columns=[...text].reduce((n,c)=>n+GLYPHS[c][0].length+1,0)-1,cell=Math.min(.065,.89/columns),width=columns*cell;let cursor=-width/2;
   for(const char of text){const glyph=GLYPHS[char];for(let y=0;y<7;y++)for(let x=0;x<glyph[0].length;x++)if(glyph[y][x]==='1'){const position=cursor+(x+.5)*cell;face(ink,back?position:-position,.895+(6-y)*cell,cell*.92,cell*.92,back?.028:-.028,back);}cursor+=(glyph[0].length+1)*cell;}
  }
 }
}
