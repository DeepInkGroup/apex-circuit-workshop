import {detectTurns} from './corner-analysis.js?v=20261011-pit-kerbs';
import {cornerSettings,kerbSides} from './corner-settings.js?v=20261011-pit-kerbs';
import {trackScale} from './coordinates.js?v=20261011-pit-kerbs';
import {boundedCache} from './performance.js?v=20261011-pit-kerbs';

const profiles=new WeakMap(),ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t));};
export function cornerKerbProfile(track,g){
 let cache=profiles.get(g);if(!cache){cache=boundedCache(4);profiles.set(g,cache);}
 const key=JSON.stringify([track.scale,track.width,track.export?.autoKerbs,track.points.map(p=>[p.kerbEntry,p.kerbExit,p.kerbWidth,p.kerbs])]),cached=cache.get(key);if(cached)return cached;
 const total=g.length*trackScale(track),closed=g.closed!==false;
 const ranges=track.export?.autoKerbs===false||!total?[]:detectTurns(track,g).map(turn=>{
  const settings=cornerSettings(track.points[turn.controlIndex]),before=Math.min(settings.kerbEntry,total*.08),after=Math.min(settings.kerbExit,total*.1),start=turn.detectedEntry-before,length=Math.min(total,turn.planLength+before+after);
  return {start,length,before,after,sides:kerbSides(settings.kerbs),width:Math.min(2,settings.kerbWidth*1.7)};
 });
 const widthAt=(point,station,side)=>{
  if(!kerbSides(point.kerbs).includes(side))return 0;
  const base=point.kerbWidth||.7;let width=base;
  for(const range of ranges){if(!range.sides.includes(side))continue;const offset=closed?((station-range.start)%total+total)%total:station-range.start;if(offset<0||offset>range.length)continue;
   const taper=Math.min(8,range.length*.2),weight=ease(offset/(taper||1))*ease((range.length-offset)/(taper||1));width=Math.max(width,base+(range.width-base)*weight);
  }
  return width;
 };
 return cache.set(key,{ranges,widthAt});
}
