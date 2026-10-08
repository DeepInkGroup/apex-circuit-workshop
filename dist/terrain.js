// A shared, paved-edge-constrained heightfield for preview and native collision.
// Cut grass out of the actual pavement triangles: banking cannot expose grass
// through asphalt, and cut vertices meet the same road/kerb/pit edge elevations.
const EPS=1e-7,KEY=1e6;
const cross=(a,b,c)=>(b[0]-a[0])*(c[2]-a[2])-(b[2]-a[2])*(c[0]-a[0]);
const key=p=>`${Math.round(p[0]*KEY)},${Math.round(p[2]*KEY)}`;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const area=poly=>Math.abs(poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p[0]*q[2]-p[2]*q[0];},0));
function indexGrid(size){
 const cells=new Map(),cell=(x,z)=>`${x},${z}`;
 return {add(item){for(let x=Math.floor(item.minX/size);x<=Math.floor(item.maxX/size);x++)for(let z=Math.floor(item.minZ/size);z<=Math.floor(item.maxZ/size);z++){const k=cell(x,z);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(item);}},query(minX,minZ,maxX,maxZ){const out=new Set();for(let x=Math.floor(minX/size);x<=Math.floor(maxX/size);x++)for(let z=Math.floor(minZ/size);z<=Math.floor(maxZ/size);z++)for(const item of cells.get(cell(x,z))||[])if(item.minX<=maxX&&item.maxX>=minX&&item.minZ<=maxZ&&item.maxZ>=minZ)out.add(item);return [...out];}};
}
const bounds=points=>({minX:Math.min(...points.map(p=>p[0])),maxX:Math.max(...points.map(p=>p[0])),minZ:Math.min(...points.map(p=>p[2])),maxZ:Math.max(...points.map(p=>p[2]))});
function split(poly,a,b){
 const inside=[],outside=[];let prev=poly.at(-1),d0=cross(a,b,prev);
 for(const p of poly){const d=cross(a,b,p);if((d>EPS&&d0<-EPS)||(d<-EPS&&d0>EPS)){const t=d0/(d0-d),v=prev.map((n,i)=>n+(p[i]-n)*t);inside.push(v);outside.push(v);}if(d>=-EPS)inside.push(p);if(d<=EPS)outside.push(p);prev=p;d0=d;}
 return [inside,outside];
}
function subtract(poly,triangle){
 let rest=poly;const pieces=[];
 for(let i=0;i<3&&rest.length>=3;i++){const [inside,outside]=split(rest,triangle.p[i],triangle.p[(i+1)%3]);if(outside.length>=3&&area(outside)>1e-10)pieces.push(outside);rest=inside;}
 return pieces;
}
function pavementHeight(t,x,z){
 const [a,b,c]=t.p,den=cross(a,b,c),u=cross(b,c,[x,0,z])/den,v=cross(c,a,[x,0,z])/den,w=1-u-v;
 return Math.min(u,v,w)>=-EPS?u*a[1]+v*b[1]+w*c[1]:null;
}
export function createTerrain(pavement,base,groundRule=null){
 const triangles=indexGrid(8),edges=new Map(),pads=[];let low=Infinity,high=-Infinity,surface=null;
 for(const mesh of pavement)for(let i=0;i<mesh.indices.length;i+=3){
  let p=mesh.indices.slice(i,i+3).map(j=>mesh.vertices[j].pos);if(Math.abs(cross(...p))<EPS)continue;if(cross(...p)<0)p=[p[0],p[2],p[1]];
  triangles.add({p,...bounds(p)});
  for(const v of p){low=Math.min(low,v[1]);high=Math.max(high,v[1]);}
  for(let j=0;j<3;j++){const a=p[j],b=p[(j+1)%3],k=[key(a),key(b)].sort().join('/'),edge=edges.get(k);if(edge)edge.count++;else edges.set(k,{a,b,count:1,...bounds([a,b])});}
 }
 const segments=indexGrid(16),radius=Math.max(45,Math.min(250,(high-low)*2.5+35));
 for(const e of edges.values())if(e.count===1)segments.add(e);
 const pavementAt=(x,z)=>{let h=Infinity;for(const t of triangles.query(x-EPS,z-EPS,x+EPS,z+EPS)){const y=pavementHeight(t,x,z);if(y!==null)h=Math.min(h,y);}return h;};
 function field(x,z){
  const paved=pavementAt(x,z);if(Number.isFinite(paved))return groundRule?groundRule(x,z,paved-.015,0,true):paved-.015;
  let nearest=Infinity,sum=0,weight=0;
  for(const e of segments.query(x-radius,z-radius,x+radius,z+radius)){const {a,b}=e,dx=b[0]-a[0],dz=b[2]-a[2],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[2])*dz)/(dx*dx+dz*dz||1))),d=Math.hypot(x-a[0]-t*dx,z-a[2]-t*dz);if(d>=radius)continue;const w=(1-smooth(d/radius))/(d+.02)**4;nearest=Math.min(nearest,d);sum+=(a[1]+t*(b[1]-a[1])-.015)*w;weight+=w;}
  const height=weight?base+(sum/weight-base)*(1-smooth(nearest/radius)):base;return groundRule?groundRule(x,z,height,nearest):height;
 }
 function heightAt(x,z){
  if(surface){let height=Infinity;for(const t of surface.query(x-EPS,z-EPS,x+EPS,z+EPS)){const y=pavementHeight(t,x,z);if(y!==null)height=Math.min(height,y);}if(Number.isFinite(height))return height;}
  let h=field(x,z);if(Number.isFinite(pavementAt(x,z)))return h;
  for(const pad of pads){const dx=x-pad.x,dz=z-pad.z,u=dx*pad.c+dz*pad.s,v=-dx*pad.s+dz*pad.c,d=Math.hypot(Math.max(0,Math.abs(u)-pad.w),Math.max(0,Math.abs(v)-pad.d));if(d<3)h+=(pad.height-h)*(1-smooth(d/3));}
  return h;
 }
 function addPad(center,width,depth,rotation){
  const c=Math.cos(rotation),s=Math.sin(rotation),points=[];for(const u of [-width/2,0,width/2])for(const v of [-depth/2,0,depth/2])points.push([center[0]+u*c-v*s,0,center[2]+u*s+v*c]);
  const height=Math.max(...points.map(p=>heightAt(p[0],p[2])))+.02;pads.push({x:center[0],z:center[2],c,s,w:width/2,d:depth/2,height,corners:[points[0],points[2],points[6],points[8]]});return height+.015;
 }
 function build(area,add){
  const width=area.xmax-area.xmin,depth=area.zmax-area.zmin,step=Math.max(2,Math.sqrt(width*depth/24000)),nx=Math.ceil(width/step),nz=Math.ceil(depth/step),sx=width/nx,sz=depth/nz,polygons=[],lines=new Map(),cache=new Map();
  const vertex=p=>{const k=key(p);if(!cache.has(k))cache.set(k,{pos:[p[0],heightAt(p[0],p[2]),p[2]],normal:[0,0,0]});return cache.get(k);};
  // Register split points on common lines before triangulation. Neighboring
  // clipped cells share every edge vertex, avoiding cracks and T junctions.
  const line=(a,b)=>{let dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz);if(len<EPS)return null;dx/=len;dz/=len;if(dx<-EPS||(Math.abs(dx)<EPS&&dz<0)){dx=-dx;dz=-dz;}const k=`${Math.round(dx*KEY)},${Math.round(dz*KEY)},${Math.round((a[0]*dz-a[2]*dx)*KEY)}`;if(!lines.has(k))lines.set(k,{dx,dz,points:new Map()});return lines.get(k);};
  for(let ix=0;ix<nx;ix++)for(let iz=0;iz<nz;iz++){
   const x=area.xmin+ix*sx,z=area.zmin+iz*sz;let pieces=[[[x,0,z],[x+sx,0,z],[x+sx,0,z+sz],[x,0,z+sz]]];
   for(const t of triangles.query(x,z,x+sx,z+sz)){pieces=pieces.flatMap(p=>subtract(p,t));if(!pieces.length)break;}
   for(const pad of pads){const b=bounds(pad.corners);if(b.maxX<x||b.minX>x+sx||b.maxZ<z||b.minZ>z+sz)continue;const [a,b1,c,d]=pad.corners;for(const [u,v] of [[a,b1],[b1,d],[d,c],[c,a]])pieces=pieces.flatMap(p=>split(p,u,v).filter(part=>part.length>=3&&area(part)>1e-10));}
   for(const p of pieces){const clean=p.filter((v,i)=>key(v)!==key(p[(i+p.length-1)%p.length]));if(clean.length<3)continue;polygons.push(clean);for(let i=0;i<clean.length;i++){const a=clean[i],b=clean[(i+1)%clean.length],l=line(a,b);if(l)for(const v of [a,b])l.points.set(key(v),{p:v,t:v[0]*l.dx+v[2]*l.dz});}}
  }
  for(const l of lines.values())l.sorted=[...l.points.values()].sort((a,b)=>a.t-b.t);
  let mesh=null,indices=null,part=0;const faces=[];
  const emit=(a,b,c)=>{let v=[vertex(a),vertex(b),vertex(c)],p=v.map(n=>n.pos),dx=p[1][0]-p[0][0],dy=p[1][1]-p[0][1],dz=p[1][2]-p[0][2],ex=p[2][0]-p[0][0],ey=p[2][1]-p[0][1],ez=p[2][2]-p[0][2],n=[dy*ez-dz*ey,dz*ex-dx*ez,dx*ey-dy*ex];if(Math.hypot(...n)<1e-10)return;if(n[1]<0){v=[v[0],v[2],v[1]];n=n.map(x=>-x);}for(const point of v)for(let i=0;i<3;i++)point.normal[i]+=n[i];faces.push(v);};
  for(const poly of polygons){const rim=[];for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],l=line(a,b);if(!l)continue;rim.push(a);const ta=a[0]*l.dx+a[2]*l.dz,tb=b[0]*l.dx+b[2]*l.dz,lo=Math.min(ta,tb)+EPS,hi=Math.max(ta,tb)-EPS;let left=0,right=l.sorted.length;while(left<right){const mid=(left+right)>>1;if(l.sorted[mid].t<lo)left=mid+1;else right=mid;}const interior=[];while(left<l.sorted.length&&l.sorted[left].t<hi)interior.push(l.sorted[left++].p);rim.push(...(ta<tb?interior:interior.reverse()));}if(rim.length<3)continue;const center=[poly.reduce((n,p)=>n+p[0],0)/poly.length,0,poly.reduce((n,p)=>n+p[2],0)/poly.length];for(let i=0;i<rim.length;i++)emit(center,rim[i],rim[(i+1)%rim.length]);}
  for(const v of cache.values()){const length=Math.hypot(...v.normal)||1;v.normal=v.normal.map(n=>n/length);}
  surface=indexGrid(Math.max(8,step*2));
  for(const face of faces){if(!mesh||mesh.vertices.length>60000){mesh=add('1GRASS_TERRAIN'+(part?`_${part}`:''),1);part++;indices=new Map();}for(const v of face){if(!indices.has(v)){indices.set(v,mesh.vertices.length);mesh.vertices.push({pos:v.pos,normal:v.normal,uv:[v.pos[0]/18,v.pos[2]/18],tangent:[1,0,0]});}mesh.indices.push(indices.get(v));}let p=face.map(v=>v.pos);if(cross(...p)<0)p=[p[0],p[2],p[1]];surface.add({p,...bounds(p)});}
 }
 return {heightAt,addPad,build,isPaved:(x,z)=>Number.isFinite(pavementAt(x,z))};
}
