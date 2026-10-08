import {buildGeometry,pointOnTrack,clamp} from './engine.js?v=20261008-terrain';
import {buildPitPlan} from './pit-plan.js?v=20261008-terrain';
import {WEATHER} from './environment.js?v=20261008-terrain';
import {buildTimingPlan} from './timing.js?v=20261008-terrain';
import {surfaceSettings} from './surface-settings.js?v=20261008-terrain';
import {GRASS,buildingSettings} from './scenery.js?v=20261008-terrain';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const pathLength=(points,s)=>points.slice(1).reduce((n,p,i)=>n+distance(p,points[i])*s,0);
function runs(rows,kind,closed){
  const groups=[];for(const row of rows){if(row.kind!==kind)continue;const last=groups[groups.length-1];if(last&&last.endIndex===row.index-1&&last.sign===row.sign){last.endIndex=row.index;last.length+=row.segment;last.angle+=row.angle;last.radius=Math.min(last.radius,row.radius);}else groups.push({startIndex:row.index,endIndex:row.index,sign:row.sign,length:row.segment,angle:row.angle,radius:row.radius});}
  if(closed&&groups.length>1){const a=groups[0],b=groups[groups.length-1];if(a.startIndex===0&&b.endIndex===rows.length-1&&a.sign===b.sign){a.startIndex=b.startIndex;a.length+=b.length;a.angle+=b.angle;a.radius=Math.min(a.radius,b.radius);a.wraps=true;groups.pop();}}
  return groups;
}
export function analyzeTrack(track){
  const closed=track.complete!==false,s=clamp(Number(track.scale)||.2,.02,10),g=buildGeometry(track.points||[],track.smooth,closed),planLength=g.length*s;
  const count=clamp(Math.ceil(planLength/2.5),32,500),step=planLength/(closed?count:count-1),look=clamp(6/(planLength||1),.002,.1),rows=[];
  let surfaceLength=0,gain=0,loss=0,maxGrade=0,minRadius=Infinity;
  for(let i=0;planLength>0&&i<count;i++){
    const progress=i/(closed?count:count-1),p=pointOnTrack(g,progress),a=pointOnTrack(g,progress-look),b=pointOnTrack(g,progress+look);
    const ab=distance(a,p)*s,bc=distance(p,b)*s,ac=distance(a,b)*s,cross=((p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x))*s*s;
    const radius=Math.abs(cross)>1e-8?ab*bc*ac/(2*Math.abs(cross)):Infinity;
    const sign=Math.sign(cross),segment=(!closed&&i===count-1)?0:step,kind=radius<Math.max(25,track.width*5)?'corner':radius>=Math.max(80,track.width*8)?'straight':'sweep';
    const next=pointOnTrack(g,progress+(closed?1/count:1/(count-1))),horizontal=distance(p,next)*s,dz=(next.elevation||0)-(p.elevation||0),grade=horizontal>.001?dz/horizontal*100:0;
    surfaceLength+=Math.hypot(segment,dz);gain+=Math.max(0,dz);loss+=Math.max(0,-dz);maxGrade=Math.max(maxGrade,Math.abs(grade));if(ab>.001&&bc>.001)minRadius=Math.min(minRadius,radius);
    rows.push({index:i,progress,distance:progress*planLength,x:p.x,y:p.y,elevation:p.elevation||0,bank:p.bank||0,radius:Number.isFinite(radius)?radius:null,grade,kind,sign:kind==='corner'?sign:0,segment,angle:Number.isFinite(radius)&&radius>.001?segment/radius*180/Math.PI:0});
  }
  // Convert null radii to infinity for grouping, while keeping the report valid JSON.
  const groupedRows=rows.map(r=>({...r,radius:r.radius??Infinity}));
  const corners=runs(groupedRows,'corner',closed).filter(c=>c.length>=Math.max(4,step*2)&&c.angle>=15).map((c,i)=>{const progress=((c.startIndex+(c.length/step)/2)/(closed?count:count-1))%1,p=pointOnTrack(g,progress);return {number:i+1,name:p.cornerName||'',direction:c.sign>0?'right':'left',length:c.length,angle:c.angle,radius:Number.isFinite(c.radius)?c.radius:null,progress,x:p.x,y:p.y};});
  const straights=runs(groupedRows,'straight',closed),longestStraight=Math.max(0,...straights.map(r=>r.length));
  let area=0;for(let i=0;closed&&i<g.samples.length;i++){const a=g.samples[i],b=g.samples[(i+1)%g.samples.length];area+=a.x*b.y-b.x*a.y;}
  const elevations=rows.map(r=>r.elevation),banks=rows.map(r=>Math.abs(r.bank)),walls=track.barriers||[],pitboxes=clamp(Math.round(Number(track.export?.pitboxes)||8),1,16);
  const pit=buildPitPlan(track),pitLength=pathLength(pit.aiPath,s),pitCapacity=planLength>0?pit.count:0;
  const minElevation=elevations.length?Math.min(...elevations):0,maxElevation=elevations.length?Math.max(...elevations):0;
  const xs=(track.points||[]).map(p=>p.x),ys=(track.points||[]).map(p=>p.y);
  return {schema:'apex-analysis-v1',name:track.name,closed,scale:{metersPerPixel:s,source:track.scaleSource||(track.background?.type==='map'?'map':'manual'),calibration:track.scaleVerification||null},metrics:{lengthMeters:planLength,surfaceLengthMeters:surfaceLength,widthMeters:track.width,pavedAreaSquareMeters:planLength*track.width,direction:closed&&Math.abs(area)>1?area>0?'Clockwise':'Counterclockwise':'Open / undetermined',corners:corners.length,leftCorners:corners.filter(c=>c.direction==='left').length,rightCorners:corners.filter(c=>c.direction==='right').length,minRadiusMeters:Number.isFinite(minRadius)?minRadius:null,longestStraightMeters:longestStraight,elevationMinMeters:minElevation,elevationMaxMeters:maxElevation,elevationRangeMeters:maxElevation-minElevation,climbMeters:gain,descentMeters:loss,maxGradePercent:maxGrade,maxBankDegrees:Math.max(0,...banks),barrierPaths:walls.length,barrierLengthMeters:walls.reduce((n,b)=>n+pathLength(b.points,s),0),pitLaneMeters:pitLength,pitBoxes:pitboxes,pitCapacity,parkingApronExpanded:pit.expanded,pitConnected:pit.connected,pitConnectionMeters:pit.connectionLength,trees:(track.trees||[]).length,buildings:(track.buildings||[]).length,buildingFootprintSquareMeters:(track.buildings||[]).reduce((sum,b)=>{const v=buildingSettings(b);return sum+v.width*v.depth;},0),grassFinish:(GRASS[track.grass]||GRASS.mown).label,previewWeather:(WEATHER[track.weather]||WEATHER.sunny).label,footprintWidthMeters:xs.length?(Math.max(...xs)-Math.min(...xs))*s:0,footprintHeightMeters:ys.length?(Math.max(...ys)-Math.min(...ys))*s:0},surfaces:surfaceSettings(track.export),timing:buildTimingPlan(track,g),corners,samples:rows,method:{sampling:'Centerline resampled every approximately 2.5 m, capped at 500 samples.',corners:'Grouped bends with radius below max(25 m, 5 × road width), at least 15° of turning, and at least two samples. Counts are geometric estimates.',straights:'Continuous sections with radius at least max(80 m, 8 × road width).',area:'Centerline length × width; overlaps, pit lane and kerbs excluded.',elevation:'Hand-authored point heights. No terrain data is fetched.',pitCapacity:'Automatic service lanes are fitted outside the racing surface and connected at both ends. Custom short routes receive a parking apron. Bay spacing is at least 6 m; inspect placement in 3D.',limits:'Geometry estimates do not predict lap times or certify Assetto Corsa compatibility.'}};
}
