import {buildGeometry,pointOnTrack,clamp} from './engine.js?v=20261010-smooth-grid';
import {buildRoadLayout} from './road-layout.js?v=20261010-smooth-grid';
import {trackScale} from './coordinates.js?v=20261010-smooth-grid';

const wrap=p=>((p%1)+1)%1;
export function timingSettings(track){const split1=clamp(Number(track.timing?.split1)||1/3,.1,.8),split2=clamp(Number(track.timing?.split2)||2/3,split1+.1,.9);return {mode:track.timing?.mode==='manual'?'manual':'auto',split1,split2};}
// Work in lap progress measured FROM start/finish, as in fast_lane.ai.
// Prefer a straight cross-section over a hairpin apex or a nearby parallel road.
export function buildTimingPlan(track,g=buildGeometry(track.points||[],track.smooth,track.complete!==false,track),road=buildRoadLayout(track,g)){
 const s=trackScale(track),length=g.length*s,start=track.start||0,settings=timingSettings(track);
 if(!length)return {gates:[],splits:[1/3,2/3],sectorLengths:[0,0,0]};
 function choose(target,min,max){let best=target,score=Infinity;for(let i=0;i<=64;i++){const t=clamp(target+(i/64-.5)*.16,min,max),p=pointOnTrack(g,start+t),ahead=pointOnTrack(g,start+t+Math.min(.01,5/length)),behind=pointOnTrack(g,start+t-Math.min(.01,5/length));const bend=1-Math.cos(ahead.angle-behind.angle);let nearby=0;
  for(const q of road.center){const relative=wrap(q.station/length-start),delta=Math.min(Math.abs(relative-t),1-Math.abs(relative-t));if(delta*length>Math.max(15,track.width*2)&&Math.hypot(q.x-p.x,q.y-p.y)*s<track.width*1.5)nearby++;}
  const cost=bend*30+Math.abs(t-target)*3+nearby;if(cost<score){score=cost;best=t;}
 }return best;}
 const a=settings.mode==='auto'?choose(1/3,.2,.45):settings.split1,b=settings.mode==='auto'?choose(2/3,.55,.8):settings.split2;
 const gates=[0,a,b].map((progress,id)=>{
  const p=pointOnTrack(g,start+progress),station=wrap(start+progress)*length,n=road.center.length;let i=0;while(i<n-1&&road.center[i+1].station<=station)i++;
  const j=(i+1)%n,span=(j===0?length:road.center[j].station)-road.center[i].station,t=span?clamp((station-road.center[i].station)/span,0,1):0;
  const rail=points=>Object.fromEntries(['x','y','elevation'].map(k=>[k,(points[i][k]||0)+((points[j][k]||0)-(points[i][k]||0))*t]));
  const left=rail(road.left),right=rail(road.right),dx=left.x-right.x,dy=left.y-right.y,l=Math.hypot(dx,dy)||1,pad=1.5/s;
  // Extend beyond the ACTUAL joined road boundaries. A normal width/2 gate
  // could leave part of a mitered corner outside the detection segment.
  left.x+=dx/l*pad;left.y+=dy/l*pad;right.x-=dx/l*pad;right.y-=dy/l*pad;
  // Stock gates follow each side's height rather than flattening a banked pair.
  left.elevation+=1.2;right.elevation+=1.2;
  return {id,label:id?'S'+id:'START / FINISH',progress,point:p,left,right};
 });
 return {gates,splits:[a,b],sectorLengths:[a*length,(b-a)*length,(1-b)*length]};
}
export function sectionsIni(plan){const cuts=[0,...plan.splits,1];return cuts.slice(0,3).map((v,i)=>`[SECTION_${i}]\nIN=${v.toFixed(6)}\nOUT=${cuts[i+1].toFixed(6)}\nTEXT=Sector ${i+1}\n`).join('\n');}
