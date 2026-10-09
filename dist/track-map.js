import {buildGeometry} from './engine.js?v=20261009-flush-joins';
import {buildPitPlan} from './pit-plan.js?v=20261009-flush-joins';
import {trackScale,toGamePoint} from './coordinates.js?v=20261009-flush-joins';
import {buildRoadLayout} from './road-layout.js?v=20261009-flush-joins';

// Content Manager's map projection: pixel = (native position + offset) / scale.
// WIDTH/HEIGHT are pixels; SCALE_FACTOR is meters per pixel. No Z reflection.
export function createTrackMap(track,geometry=buildGeometry(track.points||[],track.smooth,track.complete!==false,track),pit=buildPitPlan(track),road=buildRoadLayout(track,geometry,pit)){
  const s=trackScale(track),half=track.width/2,points=[...road.left,...road.right,...pit.path,...pit.parkingPath,...pit.connector,...pit.exitConnector,...pit.entryConnection,...pit.exitConnection,...pit.bays.flatMap(b=>b.corners),...pit.apron.flat()].map(p=>toGamePoint(p,track));
  const pad=Math.max(half,pit.settings.width/2)+3,minX=Math.min(-500*s,...points.map(p=>p[0]-pad)),maxX=Math.max(500*s,...points.map(p=>p[0]+pad)),minZ=Math.min(-370*s,...points.map(p=>p[2]-pad)),maxZ=Math.max(370*s,...points.map(p=>p[2]+pad)),scaleFactor=Math.max(s,(maxX-minX)/2048,(maxZ-minZ)/2048),width=Math.ceil((maxX-minX)/scaleFactor),height=Math.ceil((maxZ-minZ)/scaleFactor);
  return {width,height,scaleFactor,xOffset:-minX,zOffset:-minZ};
}
export function worldToMap(p,map){return {x:(p[0]+map.xOffset)/map.scaleFactor,y:(p[2]+map.zOffset)/map.scaleFactor};}
export function mapIni(map){return `[PARAMETERS]\nWIDTH=${map.width}\nHEIGHT=${map.height}\nX_OFFSET=${map.xOffset}\nZ_OFFSET=${map.zOffset}\nSCALE_FACTOR=${map.scaleFactor}\nDRAWING_SIZE=10\nMARGIN=0\n`;}
