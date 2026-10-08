import {pointOnTrack,clamp} from './engine.js?v=20261008-corners';
import {trackScale} from './coordinates.js?v=20261008-corners';
import {cornerSettings,turnBoardSettings} from './corner-settings.js?v=20261008-corners';

const delta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const wrap=(value,total)=>((value%total)+total)%total;
const profiles=new WeakMap();
function interpolate(values,result,value){let lo=0,hi=values.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(values[mid]<=value)lo=mid;else hi=mid-1;}if(lo===values.length-1)return result[lo];const t=(value-values[lo])/(values[lo+1]-values[lo]||1);return result[lo]+(result[lo+1]-result[lo])*t;}
export function roadDistanceProfile(track,g){
  const scale=trackScale(track),cached=profiles.get(g);if(cached?.scale===scale)return cached;
  const total=g.length*scale,closed=g.closed!==false,stations=[0],surface=[0],count=Math.min(20000,Math.max(1,Math.ceil(total/.5)));let previous=pointOnTrack(g,0);
  for(let i=1;i<=count&&total;i++){const station=total*i/count,p=pointOnTrack(g,station/total);stations.push(station);surface.push(surface.at(-1)+Math.hypot((p.x-previous.x)*scale,(p.y-previous.y)*scale,(p.elevation||0)-(previous.elevation||0)));previous=p;}
  const length=surface.at(-1),normalize=value=>closed&&total?wrap(value,total):clamp(value,0,total);
  const atStation=value=>interpolate(stations,surface,normalize(value));
  const stationAtSurface=value=>interpolate(surface,stations,closed&&length?wrap(value,length):clamp(value,0,length));
  const result={scale,total,length,stations,surface,normalize,atStation,stationAtSurface,advance:(station,meters)=>stationAtSurface(atStation(station)+meters)};profiles.set(g,result);return result;
}

// Curvature hysteresis rejects small tangent noise without splitting a broad
// bend at every handle. Opposite signs remain separate for chicanes/S-bends.
export function detectTurns(track,g){
  const s=trackScale(track),total=g.length*s,closed=g.closed!==false;if(!total||!track.points?.length)return [];
  const count=Math.max(32,Math.min(8000,Math.ceil(total/.5))),step=total/(closed?count:count-1),look=Math.max(step,clamp((track.width||12)*.08,.45,1.25));
  const normalize=value=>closed?wrap(value,total):clamp(value,0,total),point=station=>pointOnTrack(g,normalize(station)/total);
  const heading=station=>{const a=point(station-look/2),b=point(station+look/2);return Math.atan2(b.y-a.y,b.x-a.x);};
  const high=1/Math.max(80,(track.width||12)*12),low=high*.45,rows=[];
  for(let i=0;i<count;i++){const station=i*step,a=closed?station-look:Math.max(0,station-look),b=closed?station+look:Math.min(total,station+look);rows.push({station,curvature:delta(heading(a),heading(b))/(b-a||1)});}
  const filtered=rows.map((row,i)=>{const neighbors=[rows[closed?(i+count-1)%count:Math.max(0,i-1)].curvature,row.curvature,rows[closed?(i+1)%count:Math.min(count-1,i+1)].curvature].sort((a,b)=>a-b);return {...row,curvature:neighbors[1]};});
  const groups=[],joinGap=Math.max(step*1.5,Math.min(2,(track.width||12)*.12));let active=null;
  for(const row of filtered){const sign=Math.abs(row.curvature)>=low?Math.sign(row.curvature):0;
    if(!sign){if(active&&row.station-active.end>joinGap)active=null;continue;}
    if(!active||active.sign!==sign||row.station-active.end>joinGap){active={start:row.station,end:row.station,sign,rows:[]};groups.push(active);}
    active.end=row.station;active.rows.push(row);
  }
  if(closed&&groups.length>1){const first=groups[0],last=groups.at(-1);if(first.sign===last.sign&&first.start+total-last.end<=joinGap){last.end=first.end+total;last.rows.push(...first.rows.map(row=>({...row,station:row.station+total})));groups.shift();}}
  const anchors=[];g.segments.forEach((segment,i)=>{if(!i||segment!==g.segments[i-1])anchors.push({index:segment,station:g.cumulative[i]*s});});if(!closed)anchors.push({index:track.points.length-1,station:total});
  const sharp=[];g.samples.forEach((p,i)=>{if(!closed&&(i===0||i===g.samples.length-1))return;const before=g.samples[(i+g.samples.length-1)%g.samples.length],after=g.samples[(i+1)%g.samples.length],angle=delta(Math.atan2(p.y-before.y,p.x-before.x),Math.atan2(after.y-p.y,after.x-p.x));if(Math.abs(angle)>.15)sharp.push({station:g.cumulative[i]*s,angle});});
  const path=roadDistanceProfile(track,g),turns=[];
  for(const group of groups){
    const peak=Math.max(...group.rows.map(row=>Math.abs(row.curvature))),angle=Math.abs(group.rows.reduce((sum,row)=>sum+row.curvature*step,0))*180/Math.PI;
    if(peak<high||angle<12)continue;
    const top=group.rows.filter(row=>Math.abs(row.curvature)>=peak*.85),weight=top.reduce((sum,row)=>sum+Math.abs(row.curvature),0),apexStation=top.reduce((sum,row)=>sum+row.station*Math.abs(row.curvature),0)/weight;
    const stationDistance=(a,b)=>closed?Math.abs(delta(a/total*Math.PI*2,b/total*Math.PI*2))*total/(Math.PI*2):Math.abs(a-b);
    const candidates=anchors.filter(anchor=>{const n=track.points.length,i=anchor.index;if(!closed&&(i===0||i===n-1))return false;const before=track.points[(i+n-1)%n],p=track.points[i],after=track.points[(i+1)%n],deflection=delta(Math.atan2(p.y-before.y,p.x-before.x),Math.atan2(after.y-p.y,after.x-p.x));return Math.sign(deflection)===group.sign&&Math.abs(deflection)>.05;});
    const owner=(candidates.length?candidates:anchors).reduce((best,anchor)=>stationDistance(anchor.station,apexStation)<stationDistance(best.station,apexStation)?anchor:best);
    const exact=sharp.filter(row=>Math.sign(row.angle)===group.sign&&stationDistance(row.station,group.start)<=look*2+step).sort((a,b)=>Math.abs(b.angle)-Math.abs(a.angle))[0];
    const entry=normalize(exact?.station??group.start),exit=normalize(group.end+step/2),apex=normalize(apexStation),p=point(apex);
    const span=closed?wrap(exit-entry,total):Math.max(0,exit-entry),entryArc=path.atStation(entry),exitArc=path.atStation(exit),length=closed?wrap(exitArc-entryArc,path.length):Math.max(0,exitArc-entryArc);
    turns.push({entry,exit,apex,detectedEntry:entry,direction:group.sign>0?'right':'left',sign:group.sign,angle,radius:1/peak,length,planLength:span,progress:apex/total,x:p.x,y:p.y,controlIndex:owner.index,controlStation:owner.station,name:cornerSettings(track.points[owner.index]).cornerName,entryMethod:exact?'sharp vertex':'sustained curvature'});
  }
  // Overrides live on their road handle, with a separate slot for each
  // direction/occurrence. Two turns near one handle remain independently editable.
  const slots=new Map();for(const turn of turns){const key=turn.controlIndex+'/'+turn.direction;if(!slots.has(key))slots.set(key,[]);slots.get(key).push(turn);}
  for(const list of slots.values()){list.sort((a,b)=>{const relative=turn=>closed?delta(turn.controlStation/total*Math.PI*2,turn.apex/total*Math.PI*2):turn.apex-turn.controlStation;return relative(a)-relative(b);});list.forEach((turn,i)=>{turn.boardKey=turn.direction+'_'+i;turn.boards=turnBoardSettings(track.points[turn.controlIndex]?.turnBoards?.[turn.boardKey]);turn.entry=path.advance(turn.detectedEntry,turn.boards.entryOffset);turn.entryAdjustmentMeters=turn.boards.entryOffset;});}
  const start=closed?normalize((Number(track.start)||0)*total):0,startArc=path.atStation(start);return turns.sort((a,b)=>wrap(a.detectedEntry-start,total)-wrap(b.detectedEntry-start,total)).map((turn,i)=>({...turn,number:i+1,entryDistanceMeters:closed?wrap(path.atStation(turn.entry)-startArc,path.length):path.atStation(turn.entry)}));
}
