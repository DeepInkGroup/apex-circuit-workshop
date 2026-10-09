// Sample the actual triangle planes, including banked edges and stacked roads.
const cross=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
const clamp=(t,a,b)=>Math.max(a,Math.min(b,t));
export function pavementSampler(quads,scale){
 const size=8/scale,cells=new Map(),key=(x,y)=>x+','+y;
 for(const q of quads)for(const indices of [[0,1,2],[0,2,3]]){const p=indices.map(i=>q[i]),den=cross(...p);if(Math.abs(den)<1e-9)continue;const tri={p,den};for(let x=Math.floor(Math.min(...p.map(v=>v.x))/size);x<=Math.floor(Math.max(...p.map(v=>v.x))/size);x++)for(let y=Math.floor(Math.min(...p.map(v=>v.y))/size);y<=Math.floor(Math.max(...p.map(v=>v.y))/size);y++){const k=key(x,y);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(tri);}}
 function nearest(point,radius=0){const candidates=new Set(),r=radius/scale;for(let x=Math.floor((point.x-r)/size);x<=Math.floor((point.x+r)/size);x++)for(let y=Math.floor((point.y-r)/size);y<=Math.floor((point.y+r)/size);y++)for(const t of cells.get(key(x,y))||[])candidates.add(t);let best=null;
  for(const {p,den} of candidates){const [a,b,c]=p,u=cross(b,c,point)/den,v=cross(c,a,point)/den,w=1-u-v,height=u*(a.elevation||0)+v*(b.elevation||0)+w*(c.elevation||0);let distance=0;if(Math.min(u,v,w)<-1e-7){distance=Infinity;for(let i=0;i<3;i++){const a=p[i],b=p[(i+1)%3],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);distance=Math.min(distance,Math.hypot(point.x-a.x-dx*t,point.y-a.y-dy*t)*scale);}}const delta=Math.abs(height-(point.elevation||0));if(distance>radius+1e-6||delta>=4.5)continue;const score=distance*distance+delta*delta*.15;if(!best||score<best.score)best={height,distance,score};}
  return best;
 }
 return {nearest};
}
export function pitHeightField(road,reach=6){return point=>{const h=road.nearest(point,reach);if(!h)return point.elevation||0;const t=Math.max(0,Math.min(1,h.distance/reach)),weight=1-t*t*t*(10+t*(-15+6*t));return (point.elevation||0)+(h.height-(point.elevation||0))*weight;};}
