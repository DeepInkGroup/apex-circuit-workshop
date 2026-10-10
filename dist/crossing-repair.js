import {buildGeometry,clamp} from './engine.js?v=20261010-performance';
import {roadCrossings} from './crossings.js?v=20261010-performance';
import {structureSettings} from './structure-settings.js?v=20261010-performance';

const geometry=t=>buildGeometry(t.points||[],t.smooth,t.complete!==false,t),yieldFrame=()=>new Promise(resolve=>setTimeout(resolve,0));
const maxGrade=g=>Math.max(0,...(g.structureProfile?.ranges||[]).map(r=>r.actualGrade));
function state(track,changes=[]){const g=geometry(track),crossings=roadCrossings(track,g);return {track,g,crossings,remaining:crossings.filter(c=>!c.safe).length,changes,grade:maxGrade(g)};}
// Work on drafts. Apply nothing unless all crossings pass and the effective
// structural grades stay at or below 12%, with no conflicting covered spans.
export async function repairCrossings(track,onProgress=()=>{}){
 const original=structuredClone(track),initial=state(original);if(!initial.remaining)return {ok:true,track:original,changes:[],crossings:initial.crossings,grade:initial.grade};
 if(initial.crossings.length>32)return {ok:false,reason:'This layout has too many crossings for automatic fitting. Separate some crossing branches first.'};
 let beam=[initial],best=initial,evaluated=0;
 for(let round=0;round<16;round++){
  const next=[];
  for(const current of beam){
   const crossing=current.crossings.find(c=>!c.safe);if(!crossing)continue;
   if(crossing.spanNeeded>120)continue;
   const total=current.g.length*clamp(Number(track.scale)||.2,.02,10),controls=[];current.g.segments.forEach((index,i)=>{if(!i||index!==current.g.segments[i-1])controls.push({index,progress:current.g.cumulative[i]/current.g.length});});
   const distance=(a,b)=>{const d=Math.abs(a-b);return (current.g.closed?Math.min(d,1-d):d)*total;};
   for(const branch of [crossing.first,crossing.second]){
    const existing=current.g.structureProfile?.sectionAt(branch.progress*total),owner=existing?.core?existing.index:controls.filter(c=>structureSettings(current.track.points[c.index].structure).type==='none').sort((a,b)=>distance(a.progress,branch.progress)-distance(b.progress,branch.progress))[0]?.index;if(owner===undefined)continue;
    if(!existing?.core&&(current.g.structureProfile?.ranges.length||0)>=16)continue;
    for(const type of ['bridge','tunnel'])for(const clearance of [6,5])for(const [grade,approach] of [[8,1.15],[12,1]]){
     const draft={...current.track,points:current.track.points.map((p,i)=>i===owner?{...p,structure:structureSettings({...p.structure,type,height:null,length:Math.ceil(crossing.spanNeeded/2)*2,clearance,grade,approach,offset:0,anchorProgress:branch.progress,tunnelStyle:'box'})}:p)},candidate=state(draft,[...current.changes,{index:owner,type,progress:branch.progress}]);
     evaluated++;if(evaluated%4===0){onProgress({remaining:best.remaining,evaluated});await yieldFrame();}
     if(candidate.remaining>=current.remaining||candidate.grade>12||candidate.g.structureProfile?.issues.length)continue;
     // Never undo clearance already achieved at a different crossing.
     if(current.crossings.some((c,i)=>c.safe&&!candidate.crossings[i]?.safe))continue;
     const score=candidate.remaining*1000+candidate.grade*4+(type==='tunnel'?8:0)+(6-clearance)*5;candidate.score=score;next.push(candidate);if(candidate.remaining<best.remaining||candidate.remaining===best.remaining&&candidate.grade<best.grade)best=candidate;
    }
   }
  }
  next.sort((a,b)=>a.score-b.score);if(!next.length)break;
  const complete=next.find(c=>!c.remaining);if(complete)return {ok:true,track:complete.track,changes:[...new Map(complete.changes.map(c=>[c.index,c])).values()],crossings:complete.crossings,grade:complete.grade};
  const signatures=new Set();beam=next.filter(c=>{const key=JSON.stringify(c.track.points.map(p=>p.structure));if(signatures.has(key))return false;signatures.add(key);return true;}).slice(0,3);
 }
 return {ok:false,reason:'There is not enough clear approach length to separate every crossing with smooth ramps at 12% grade or less. Extend the road around the crossing or separate its branches, then try again.'};
}
