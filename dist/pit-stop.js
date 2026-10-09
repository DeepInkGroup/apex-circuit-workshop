import {pitRails} from './pit-ribbon.js?v=20261009-auto-crossing';
export function pitStopApron(plan){
 const path=plan.expanded?plan.parkingPath:plan.path,rails=pitRails(path,plan),quads=[];let station=0;
 for(let i=1;i<path.length;i++){const length=Math.hypot(path[i].x-path[i-1].x,path[i].y-path[i-1].y)*plan.scale,mid=station+length/2;station+=length;if(!plan.expanded&&(mid<plan.workingStart||mid>plan.workingEnd))continue;const a=rails[i-1],b=rails[i],offset=p=>plan.side*((p.width||plan.settings.width)/2),innerA=a.at(offset(path[i-1])),innerB=b.at(offset(path[i])),outerA=a.at(offset(path[i-1])+plan.side*(plan.settings.boxWidth+.45)),outerB=b.at(offset(path[i])+plan.side*(plan.settings.boxWidth+.45));quads.push([innerA,innerB,outerB,outerA]);}
 return quads;
}
function strip(a,b,width,scale){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=dy/len*width/(2*scale),ny=-dx/len*width/(2*scale);return [{...a,x:a.x+nx,y:a.y+ny},{...b,x:b.x+nx,y:b.y+ny},{...b,x:b.x-nx,y:b.y-ny},{...a,x:a.x-nx,y:a.y-ny}];}
export function pitStopPaint(plan){const result=[];for(const bay of plan.bays){const [a,b,c,d]=bay.corners;for(const [p,q] of [[a,d],[b,c],plan.side>0?[a,b]:[d,c]])result.push(strip(p,q,.1,plan.scale));const p=bay.center,at=(forward,left)=>({x:p.x+(Math.cos(p.angle)*forward+Math.sin(p.angle)*left)/plan.scale,y:p.y+(Math.sin(p.angle)*forward-Math.cos(p.angle)*left)/plan.scale,elevation:p.elevation||0});result.push(strip(at(1.75,-plan.settings.boxWidth*.34),at(1.75,plan.settings.boxWidth*.34),.16,plan.scale));}return result;}
