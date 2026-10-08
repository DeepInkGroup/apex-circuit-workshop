import {profileAt} from './height-profile.js?v=20261008-structures';
import {structureSettings} from './structure-settings.js?v=20261008-structures';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),smooth=t=>t*t*t*(10+t*(-15+6*t));
export function createStructureProfile(g,controls,points,options){
 const scale=clamp(Number(options.scale)||.2,.02,10),width=Number(options.width)||12,total=g.length*scale,closed=g.closed,ranges=[],issues=[];
 const normalize=m=>closed?((m%total)+total)%total:clamp(m,0,total),distance=(a,b)=>closed?Math.min(Math.abs(a-b),total-Math.abs(a-b)):Math.abs(a-b);
 const original=m=>profileAt(g.elevationProfile,normalize(m)/scale).value;
 for(const control of controls){const settings=structureSettings(control.point.structure);if(settings.type==='none'||!total)continue;if(ranges.length>=16){issues.push('Use at most 16 bridge/tunnel spans per circuit.');break;}
  const center=control.station*scale,span=Math.min(settings.length,total*.35),half=span/2,core=g.samples.filter((p,i)=>distance(g.cumulative[i]*scale,center)<=half);let low=original(center),high=low;for(const p of core){low=Math.min(low,p.elevation||0);high=Math.max(high,p.elevation||0);}
  // Account for the height of another road passing beneath/above the span.
  for(const p of core.filter((p,i)=>i%4===0))for(const q of g.samples)if(Math.hypot(p.x-q.x,p.y-q.y)*scale<width+2){const h=(q.elevation||0)+(settings.type==='bridge'?1:-1)*width/2*Math.abs(Math.tan((q.bank||0)*Math.PI/180));low=Math.min(low,h);high=Math.max(high,h);}
  const level=settings.type==='bridge'?high+settings.clearance+.6:low-settings.clearance-1.4;
  const rise=Math.max(Math.abs(level-low),Math.abs(level-high)),desired=1.875*rise/(settings.grade/100),available=closed?total/2-half-1:Math.min(center-half,total-center-half),ramp=Math.max(.5,Math.min(desired,available)),estimatedGrade=1.875*rise/ramp*100;
  if(!closed&&(center-half<0||center+half>total))issues.push(`Handle ${control.index+1}: move the ${settings.type} away from the road endpoint.`);
  if(estimatedGrade>18)issues.push(`Handle ${control.index+1}: the ${settings.type} needs longer approaches. Extend the circuit or reduce clearance/span.`);
  ranges.push({index:control.index,type:settings.type,center,span,ramp,level,clearance:settings.clearance,targetGrade:settings.grade,estimatedGrade,ground:original(center)});
 }
 for(let i=0;i<ranges.length;i++)for(let j=i+1;j<ranges.length;j++)if(distance(ranges[i].center,ranges[j].center)<(ranges[i].span+ranges[j].span)/2+2)issues.push(`Structures at handles ${ranges[i].index+1} and ${ranges[j].index+1} overlap. Separate their covered spans.`);
 const influence=(range,m)=>{const d=distance(normalize(m),range.center);return d<=range.span/2?1:d>=range.span/2+range.ramp?0:smooth(1-(d-range.span/2)/range.ramp);};
 function height(m){const base=original(m);let value=base,den=1;for(const range of ranges){const w=influence(range,m);if(w>=1-1e-9)return range.level;const odds=w/(1-w);value+=range.level*odds;den+=odds;}return value/den;}
 function bank(m){return profileAt(g.bankProfile,normalize(m)/scale).value*ranges.reduce((factor,range)=>factor*(1-influence(range,m)),1);}
 const derivative=(fn,u)=>{const m=u*scale,h=.05,a=closed?m-h:Math.max(0,m-h),b=closed?m+h:Math.min(total,m+h);return {value:fn(m),grade:(fn(b)-fn(a))/(b-a||1)*scale};};
 const sectionAt=m=>{let best=null;for(const range of ranges){const weight=influence(range,m);if(weight>0&&(!best||weight>best.weight))best={...range,weight,core:distance(normalize(m),range.center)<=range.span/2};}return best;};
 return {ranges,issues,total,scale,original,sectionAt,elevationAt:u=>derivative(height,u),bankAt:u=>derivative(bank,u)};
}
