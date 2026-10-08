export const WEATHER={
  sunny:{label:'Clear daylight',sky:[.75,.85,.89],ground:'#dbe3d0',ambient:1,tint:[1,1,.96],fog:.04,sunPitch:45,sunHeading:25},
  overcast:{label:'Overcast',sky:[.64,.70,.73],ground:'#d0d8d0',ambient:.82,tint:[.89,.95,1],fog:.16,sunPitch:35,sunHeading:0},
  sunset:{label:'Golden hour',sky:[.91,.72,.56],ground:'#e2d8bd',ambient:.88,tint:[1,.87,.71],fog:.12,sunPitch:9,sunHeading:75},
  rain:{label:'Rainy mood',sky:[.40,.49,.56],ground:'#bac9c3',ambient:.7,tint:[.77,.88,1],fog:.30,sunPitch:25,sunHeading:0}
};
export {TREE_TYPES} from './trees.js?v=20261008-structures';
export function simplifyStroke(points,tolerance){
  if(points.length<3)return points;
  const a=points[0],b=points[points.length-1],dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;let index=0,best=0;
  for(let i=1;i<points.length-1;i++){const p=points[i],t=l2?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l2)):0,d=Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);if(d>best){best=d;index=i;}}
  if(best<=tolerance)return [a,b];const left=simplifyStroke(points.slice(0,index+1),tolerance),right=simplifyStroke(points.slice(index),tolerance);return [...left.slice(0,-1),...right];
}
