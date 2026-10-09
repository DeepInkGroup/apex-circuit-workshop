export const AI_RAYCAST_CLEARANCE=.15;
export const AI_STATION_INSET=.04;
const distance=(a,b)=>Math.hypot(...a.map((n,i)=>n-b[i])),unit=v=>{const length=Math.hypot(...v)||1;return v.map(n=>n/length);};
// AC recalculates spline normals by raycasting down to collision pavement.
// Analytical centerline heights can sit below the triangulated road on ramps.
export function pavementAi(frames,pavement,scale,label,closed=true){
 const source=frames.filter((f,i)=>!i||distance(f.pos.map(Math.fround),frames[i-1].pos.map(Math.fround))>=.001),result=[];if(closed&&source.length>1&&distance(source[0].pos,source.at(-1).pos)<.001)source.pop();
 for(let i=0;i<source.length;i++){
  const f=source[i],next=source[closed?(i+1)%source.length:i===source.length-1?i-1:i+1]||f,length=Math.hypot(next.pos[0]-f.pos[0],next.pos[2]-f.pos[2]),ratio=length?Math.min(.2,AI_STATION_INSET/length):0,pos=f.pos.map((n,j)=>n+(next.pos[j]-n)*ratio),p={x:pos[0]/scale+500,y:pos[2]/scale+370,elevation:pos[1]},hit=pavement.nearest(p);
  if(!hit)throw new Error(`${label} point ${i+1} has no collision pavement beneath it. Widen or smooth the nearby corner before exporting.`);
  const projected={...f,pos:[pos[0],hit.height+AI_RAYCAST_CLEARANCE,pos[2]].map(Math.fround),normal:hit.normal};
  if(result.length&&distance(projected.pos,result.at(-1).pos)<.001)continue;result.push(projected);
 }
 if(closed&&result.length>1&&distance(result[0].pos,result.at(-1).pos)<.001)result.pop();
 if(result.length<3)throw new Error(`${label} needs at least three distinct pavement points.`);
 for(let i=0;i<result.length;i++){const a=result[closed?(i+result.length-1)%result.length:Math.max(0,i-1)],b=result[closed?(i+1)%result.length:Math.min(result.length-1,i+1)],f=result[i];f.forward=unit(b.pos.map((n,j)=>n-a.pos[j]));const horizontal=Math.hypot(f.forward[0],f.forward[2])||1;f.left=[f.forward[2]/horizontal,0,-f.forward[0]/horizontal];
  // AC probes 0.6 m to either side using the previous-to-current direction.
  const previous=i===0&&!closed?b:a,dx=f.pos[0]-previous.pos[0],dz=f.pos[2]-previous.pos[2],length=Math.hypot(dx,dz)||1;
  for(const side of [-1,0,1]){const probe={x:(f.pos[0]-side*dz/length*.6)/scale+500,y:(f.pos[2]+side*dx/length*.6)/scale+370,elevation:f.pos[1]-AI_RAYCAST_CLEARANCE};if(!pavement.nearest(probe))throw new Error(`${label} point ${i+1} has an unsupported normal probe. Widen or smooth the nearby corner before exporting.`);}
 }
 return result;
}

export function validateNativeScene(scene){
 const keys=['ROAD','GRASS','KERB','PIT','WALL'],names=new Set();
 for(const mesh of scene.meshes){
  if(names.has(mesh.name))throw new Error(`Duplicate native mesh name: ${mesh.name}`);names.add(mesh.name);
  if(/^\d/.test(mesh.name)){const matches=keys.filter(key=>mesh.name.includes(key));if(matches.length!==1)throw new Error(`Native surface ${mesh.name} must match exactly one surface key.`);}
  if(mesh.vertices.length>65535||mesh.indices.length%3||mesh.indices.some(index=>!Number.isInteger(index)||index<0||index>=mesh.vertices.length))throw new Error(`Invalid native mesh indices: ${mesh.name}`);
  if(mesh.vertices.some(v=>[...v.pos,...v.normal,...v.uv,...v.tangent].some(n=>!Number.isFinite(n))))throw new Error(`Invalid native vertex: ${mesh.name}`);
 }
 for(const d of scene.dummies){if(names.has(d.name)||[...d.pos,...d.forward].some(n=>!Number.isFinite(n)))throw new Error(`Invalid native spawn/timing node: ${d.name}`);names.add(d.name);}
 for(let i=0;i<scene.pitCount;i++)for(const prefix of ['AC_START_','AC_PIT_'])if(!names.has(prefix+i))throw new Error(`Missing native spawn: ${prefix+i}`);
 return true;
}
