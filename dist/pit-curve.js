const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function polynomial(a,b,v0,v1,k0=0,k1=0){const d=b-a;return [a,v0,k0/2,10*d-6*v0-4*v1-1.5*k0+.5*k1,-15*d+8*v0+7*v1+1.5*k0-k1,6*d-3*v0-3*v1-.5*k0+.5*k1];}
const value=(c,t)=>{let result=0;for(let i=c.length-1;i>=0;i--)result=result*t+c[i];return result;};
const derivative=(c,t)=>{let result=0;for(let i=c.length-1;i>0;i--)result=result*t+c[i]*i;return result;};
export function pitCurveStats(path,scale){
 let length=0,minRadius=Infinity,reversals=0,bend=0;
 if(path.length<2)return {length,minRadius,reversals,bend};
 const chord=Math.atan2(path.at(-1).y-path[0].y,path.at(-1).x-path[0].x);
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],step=Math.hypot(b.x-a.x,b.y-a.y)*scale;
  const turn=Math.abs(Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle)));
  length+=step;bend+=turn;if(step>.001&&turn>1e-6)minRadius=Math.min(minRadius,step/turn);
  if(Math.cos(b.angle-chord)<-.35)reversals++;
 }
 return {length,minRadius,reversals,bend};
}
function curve(a,b,firstAngle,lastAngle,scale,width,reach){
 const span=Math.hypot(b.x-a.x,b.y-a.y),speed=Math.min(span*reach,100/scale),steps=clamp(Math.ceil((span+speed)*scale/.5),16,1200),k0=clamp(a.curvature||0,-scale/8,scale/8),k1=clamp(b.curvature||0,-scale/8,scale/8),x=polynomial(a.x,b.x,Math.cos(firstAngle)*speed,Math.cos(lastAngle)*speed,-Math.sin(firstAngle)*k0*speed*speed,-Math.sin(lastAngle)*k1*speed*speed),y=polynomial(a.y,b.y,Math.sin(firstAngle)*speed,Math.sin(lastAngle)*speed,Math.cos(firstAngle)*k0*speed*speed,Math.cos(lastAngle)*k1*speed*speed),height=polynomial(a.elevation||0,b.elevation||0,(a.grade||0)*speed,(b.grade||0)*speed,(a.gradeCurvature||0)*speed*speed,(b.gradeCurvature||0)*speed*speed),bank=polynomial(a.bank||0,b.bank||0,(a.bankGrade||0)*speed,(b.bankGrade||0)*speed),ease=t=>t*t*t*(10+t*(-15+6*t));
 return Array.from({length:steps+1},(_,i)=>{const t=i/steps,dx=derivative(x,t),dy=derivative(y,t),travel=Math.hypot(dx,dy)||1;return {...(i===0?a:i===steps?b:{}),x:i===0?a.x:i===steps?b.x:value(x,t),y:i===0?a.y:i===steps?b.y:value(y,t),elevation:i===0?a.elevation||0:i===steps?b.elevation||0:value(height,t),grade:derivative(height,t)/travel,bank:value(bank,t),bankGrade:derivative(bank,t)/travel,width:(a.width||width)+((b.width||width)-(a.width||width))*ease(t),angle:i===0?firstAngle:i===steps?lastAngle:Math.atan2(dy,dx)};});
}
export function pitConnection(a,b,firstAngle,lastAngle,scale,width){
 const target=Math.max(12,width*2.5),score=stats=>stats.reversals*100000+Math.max(0,target-stats.minRadius)*50+stats.bend*3+stats.length*.015;
 let best=curve(a,b,firstAngle,lastAngle,scale,width,1.05),stats=pitCurveStats(best,scale),bestScore=score(stats);
 if(stats.minRadius<target||stats.reversals)for(const reach of [.8,1.3]){const path=curve(a,b,firstAngle,lastAngle,scale,width,reach),candidate=score(pitCurveStats(path,scale));if(candidate<bestScore){best=path;bestScore=candidate;}}
 return best;
}
export function pitFillet(p,b,q,t){const handle=.3,cp=[p,{x:p.x+(b.x-p.x)*handle,y:p.y+(b.y-p.y)*handle},{x:p.x+(b.x-p.x)*handle*2,y:p.y+(b.y-p.y)*handle*2},{x:q.x+(b.x-q.x)*handle*2,y:q.y+(b.y-q.y)*handle*2},{x:q.x+(b.x-q.x)*handle,y:q.y+(b.y-q.y)*handle},q],weights=[1,5,10,10,5,1].map((c,i)=>c*t**i*(1-t)**(5-i));return {x:cp.reduce((sum,p,i)=>sum+p.x*weights[i],0),y:cp.reduce((sum,p,i)=>sum+p.y*weights[i],0)};}
