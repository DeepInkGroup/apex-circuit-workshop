import {profileAt} from './height-profile.js?v=20261009-auto-crossing';
import {structureSettings} from './structure-settings.js?v=20261009-auto-crossing';
// Seventh-order easing has zero grade, curvature and curvature change at
// both ramp ends. Reserve extra approach length rather than compressing it.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),smooth=t=>t**4*(35+t*(-84+t*(70-20*t))),PEAK=2.1875;
export function createStructureProfile(g,controls,points,options){
 const scale=clamp(Number(options.scale)||.2,.02,10),width=Number(options.width)||12,total=g.length*scale,closed=g.closed,ranges=[],issues=[];
 const normalize=m=>closed?((m%total)+total)%total:clamp(m,0,total),distance=(a,b)=>closed?Math.min(Math.abs(a-b),total-Math.abs(a-b)):Math.abs(a-b);
 const original=m=>profileAt(g.elevationProfile,normalize(m)/scale).value;
 for(const control of controls){const settings=structureSettings(control.point.structure);if(settings.type==='none'||!total)continue;if(ranges.length>=16){issues.push('Use at most 16 bridge/tunnel spans per circuit.');break;}
  const center=normalize((Number.isFinite(settings.anchorProgress)?settings.anchorProgress*total:control.station*scale)+settings.offset),span=Math.min(settings.length,total*.35),half=span/2,core=g.samples.filter((p,i)=>distance(g.cumulative[i]*scale,center)<=half);let low=original(center),high=low;for(const p of core){low=Math.min(low,p.elevation||0);high=Math.max(high,p.elevation||0);}
  // Account for the height of another road passing beneath/above the span.
  for(const p of core.filter((p,i)=>i%4===0))for(const q of g.samples)if(Math.hypot(p.x-q.x,p.y-q.y)*scale<width+2){const h=(q.elevation||0)+(settings.type==='bridge'?1:-1)*width/2*Math.abs(Math.tan((q.bank||0)*Math.PI/180));low=Math.min(low,h);high=Math.max(high,h);}
  const roofRise=settings.type==='tunnel'&&settings.tunnelStyle==='arch'?Math.min(1.6,(width/2+1.8)*.18):0,level=settings.type==='bridge'?high+settings.clearance+.6:low-settings.clearance-roofRise-1.8;
  const rise=Math.max(Math.abs(level-low),Math.abs(level-high)),desired=PEAK*rise/(settings.grade/100)*settings.approach,available=closed?total/2-half-1:Math.min(center-half,total-center-half),ramp=Math.max(.5,Math.min(desired,available)),estimatedGrade=PEAK*rise/ramp*100;
  if(!closed&&(center-half<0||center+half>total))issues.push(`Handle ${control.index+1}: move the ${settings.type} away from the road endpoint.`);
  ranges.push({index:control.index,type:settings.type,center,span,ramp,desiredRamp:desired,limited:ramp+1<desired,level,clearance:settings.clearance,roofRise,bridgeStyle:settings.bridgeStyle,tunnelStyle:settings.tunnelStyle,targetGrade:settings.grade,estimatedGrade,ground:original(center)});
 }
 for(let i=0;i<ranges.length;i++)for(let j=i+1;j<ranges.length;j++)if(distance(ranges[i].center,ranges[j].center)<(ranges[i].span+ranges[j].span)/2+2)issues.push(`Structures at handles ${ranges[i].index+1} and ${ranges[j].index+1} overlap. Separate their covered spans.`);
 const ordered=[...ranges].sort((a,b)=>a.center-b.center),links=[];
 for(let i=0;i<(closed&&ordered.length>1?ordered.length:ordered.length-1);i++){const a=ordered[i],b=ordered[(i+1)%ordered.length],start=a.center+a.span/2,end=b.center-b.span/2+(i===ordered.length-1?total:0),length=end-start;if(length>2&&length<a.ramp+b.ramp){links.push({from:a.index,to:b.index,start,end,length,a:a.level,b:b.level});a.linkedAfter=true;b.linkedBefore=true;}}
 const linked=m=>{const value=normalize(m);for(const link of links){const station=value<link.start?value+total:value;if(station>=link.start&&station<=link.end)return {link,t:(station-link.start)/link.length};}return null;};
 const influence=(range,m)=>{const d=distance(normalize(m),range.center);return d<=range.span/2?1:d>=range.span/2+range.ramp?0:smooth(1-(d-range.span/2)/range.ramp);};
 function height(m){const connection=linked(m);if(connection)return connection.link.a+(connection.link.b-connection.link.a)*smooth(connection.t);const base=original(m);let value=base,den=1;for(const range of ranges){const w=influence(range,m);if(w>=1-1e-9)return range.level;const odds=w/(1-w);value+=range.level*odds;den+=odds;}return value/den;}
 function bank(m){if(linked(m))return 0;return profileAt(g.bankProfile,normalize(m)/scale).value*ranges.reduce((factor,range)=>factor*(1-influence(range,m)),1);}
 const derivative=(fn,u)=>{const m=u*scale,h=.05,a=closed?m-h:Math.max(0,m-h),b=closed?m+h:Math.min(total,m+h);return {value:fn(m),grade:(fn(b)-fn(a))/(b-a||1)*scale};};
 const sectionAt=m=>{let best=null;for(const range of ranges){const weight=influence(range,m);if(weight>0&&(!best||weight>best.weight))best={...range,weight,core:distance(normalize(m),range.center)<=range.span/2};}return best;};
 // Report the effective profile, including authored slopes and neighboring
 // ramp influence, instead of promising the requested grade was achieved.
 for(const range of ranges){const extent=range.span/2+range.ramp,count=Math.min(1600,Math.max(160,Math.ceil(extent*2)));let peak=0;for(let i=0;i<=count;i++){const m=range.center-extent+extent*2*i/count;peak=Math.max(peak,Math.abs(derivative(height,m/scale).grade)/scale*100);}for(const link of links.filter(link=>link.from===range.index||link.to===range.index))peak=Math.max(peak,PEAK*Math.abs(link.b-link.a)/link.length*100);range.actualGrade=peak;if(peak>18)issues.push(`Handle ${range.index+1}: the blended ${range.type} approaches exceed 18% grade. Spread out the spans or adjust nearby authored elevations.`);}
 return {ranges,issues,links,total,scale,original,sectionAt,elevationAt:u=>derivative(height,u),bankAt:u=>derivative(bank,u)};
}
