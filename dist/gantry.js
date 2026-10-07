import {toGamePoint,trackScale} from './coordinates.js?v=20261007-return';
import {clamp} from './engine.js?v=20261007-return';

export function gantryPlan(track,timing,pit,ground=0){
 if(track.complete===false||track.export?.gantry===false||!timing.gates.length)return null;
 const gate=timing.gates[0],scale=trackScale(track),origin=toGamePoint(gate.point,track),a=toGamePoint(gate.left,track),b=toGamePoint(gate.right,track),span=Math.hypot(a[0]-b[0],a[2]-b[2]),left=[(a[0]-b[0])/span,0,(a[2]-b[2])/span],forward=[-left[2],0,left[0]];
 if(!Number.isFinite(span)||span<.001)return null;
 const project=p=>{const v=toGamePoint(p,track),dx=v[0]-origin[0],dz=v[2]-origin[2];return {along:dx*forward[0]+dz*forward[2],lateral:dx*left[0]+dz*left[2],height:v[1]};};
 let min=project(gate.right).lateral-2,max=project(gate.left).lateral+2,high=Math.max(a[1],b[1])-1.2;
 // A neighboring pit lane must pass under the beam, not through a support.
 const routes=[pit.path,pit.parkingPath,pit.connector,pit.exitConnector,pit.entryConnection,pit.exitConnection],half=pit.settings.width/2;
 for(const path of routes)for(let i=1;i<path.length;i++){const p=project(path[i-1]),q=project(path[i]);if(p.along*q.along>0&&Math.min(Math.abs(p.along),Math.abs(q.along))>1)continue;const t=clamp(-p.along/(q.along-p.along||1),0,1),l=p.lateral+(q.lateral-p.lateral)*t;min=Math.min(min,l-half-2);max=Math.max(max,l+half+2);high=Math.max(high,p.height,q.height);}
 for(const bay of pit.bays)for(const p of bay.corners){const q=project(p);if(Math.abs(q.along)<3){min=Math.min(min,q.lateral-2);max=Math.max(max,q.lateral+2);high=Math.max(high,q.height);}}
 const clearance=clamp(Number(track.export?.gantryClearance)||6,4.5,8),beamBottom=high+clearance;
 const point=(along,lateral,height)=>[origin[0]+forward[0]*along+left[0]*lateral,height,origin[2]+forward[2]*along+left[2]*lateral];
 const editor=v=>({x:v[0]/scale+500,y:v[2]/scale+370,elevation:v[1]});
 return {min,max,span:max-min,beamBottom,beamTop:beamBottom+1.5,ground,point,left,forward,supports:[editor(point(0,min,ground)),editor(point(0,max,ground))]};
}
const LETTERS={S:['11111','10000','10000','11111','00001','00001','11111'],T:['11111','00100','00100','00100','00100','00100','00100'],A:['01110','10001','10001','11111','10001','10001','10001'],R:['11110','10001','10001','11110','10100','10010','10001'],F:['11111','10000','10000','11110','10000','10000','10000'],I:['11111','00100','00100','00100','00100','00100','11111'],N:['10001','11001','11001','10101','10011','10011','10001'],H:['10001','10001','10001','11111','10001','10001','10001'],'/':['00001','00010','00010','00100','01000','01000','10000']};
export function addGantry(plan,add,quad,signMaterial){if(!plan)return;const body=add('1WALL_START_FINISH_GANTRY',4),sign=add('GANTRY_SIGN_BACKGROUND',signMaterial),paint=add('GANTRY_START_FINISH_LETTERS',2),red=add('GANTRY_CHECKERS_RED',3);
 const cuboid=(mesh,along,left,bottom,depth,width,height)=>{const p=(f,l,h)=>plan.point(along+f,left+l,bottom+h),d=depth/2,w=width/2,face=(...v)=>quad(mesh,...v.reverse());face(p(-d,-w,0),p(-d,w,0),p(-d,w,height),p(-d,-w,height));face(p(d,w,0),p(d,-w,0),p(d,-w,height),p(d,w,height));face(p(d,-w,0),p(-d,-w,0),p(-d,-w,height),p(d,-w,height));face(p(-d,w,0),p(d,w,0),p(d,w,height),p(-d,w,height));face(p(-d,-w,height),p(-d,w,height),p(d,w,height),p(d,-w,height));face(p(d,-w,0),p(d,w,0),p(-d,w,0),p(-d,-w,0));};
 for(const side of [plan.min,plan.max]){cuboid(body,0,side,plan.ground,.55,.55,plan.beamTop-plan.ground);cuboid(body,0,side,plan.ground,.9,.9,.18);}
 cuboid(body,0,(plan.min+plan.max)/2,plan.beamBottom,.7,plan.span+.55,1.5);
 const face=(mesh,along,left,bottom,width,height,back)=>{const p=(l,h)=>plan.point(along,left+l,bottom+h),corners=[p(-width/2,0),p(width/2,0),p(width/2,height),p(-width/2,height)];quad(mesh,...(back?corners:corners.reverse()));};
 for(const back of [false,true]){const along=back?.352:-.352;face(sign,along,(plan.min+plan.max)/2,plan.beamBottom+.08,plan.span-.2,1.34,back);const text='START / FINISH',cell=Math.min(.15,(plan.span-1.7)/(text.length*6)),center=(plan.min+plan.max)/2,total=(text.length*6-1)*cell,bottom=plan.beamBottom+(1.5-7*cell)/2;
  for(let i=0;i<text.length;i++){const glyph=LETTERS[text[i]];if(!glyph)continue;for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(glyph[y][x]==='1'){const local=-total/2+(i*6+x+.5)*cell;face(paint,back?.356:-.356,center+(back?local:-local),bottom+(6-y)*cell,cell*.93,cell*.93,back);}}
  for(const side of [plan.min+.4,plan.max-.4])for(let row=0;row<4;row++)for(let col=0;col<2;col++)face((row+col)%2?red:paint,back?.356:-.356,side+(col-.5)*.19,plan.beamBottom+.25+row*.24,.19,.24,back);
 }
}
export function drawGantry(ctx,plan,zoom){if(!plan)return;const [a,b]=plan.supports;ctx.save();ctx.strokeStyle='#344753';ctx.lineWidth=3/zoom;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.fillStyle='#f4f1e6';for(const p of [a,b]){ctx.fillRect(p.x-4/zoom,p.y-4/zoom,8/zoom,8/zoom);ctx.strokeRect(p.x-4/zoom,p.y-4/zoom,8/zoom,8/zoom);}ctx.restore();}
