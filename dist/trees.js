import {closestOnTrack,pointOnTrack} from './engine.js?v=20261006-surfaces';
import {buildingContains} from './scenery.js?v=20261006-surfaces';

export const TREE_SPECIES={
  broadleaf:{label:'Oak · broad canopy',radius:.37,height:8,colors:['#487447','#6b9456','#88ac64']},
  pine:{label:'Pine · layered evergreen',radius:.27,height:11,colors:['#386e5c','#4b8268','#679e7b']},
  birch:{label:'Birch · white bark',radius:.28,height:10,colors:['#648b48','#8aaa59','#b3c57a']},
  cypress:{label:'Cypress · tall & narrow',radius:.16,height:12,colors:['#2e5c43','#48744c','#638659']},
  palm:{label:'Palm · spreading fronds',radius:.42,height:10,colors:['#477746','#6d9750','#9ab264']},
  blossom:{label:'Cherry blossom · pink crown',radius:.36,height:7,colors:['#ba7188','#db9cac','#efbcc7']}
};
export const TREE_TYPES=Object.fromEntries(Object.entries(TREE_SPECIES).map(([key,v])=>[key,v.label]));
export function treeSettings(tree={}){const type=TREE_SPECIES[tree.type]?tree.type:'broadleaf';return {type,height:Math.max(3,Math.min(18,Number(tree.height)||TREE_SPECIES[type].height))};}
export function treeRadius(tree){const t=treeSettings(tree);return t.height*TREE_SPECIES[t.type].radius;}
export function drawTree(ctx,source,scale=.2,selected=false,zoom=1){
  const tree={...source,...treeSettings(source)},r=treeRadius(tree)/scale,colors=TREE_SPECIES[tree.type].colors;
  ctx.save();ctx.translate(tree.x,tree.y);ctx.fillStyle='#304e3138';ctx.beginPath();ctx.ellipse(r*.45,r*.3,r*1.12,r*.75,.25,0,Math.PI*2);ctx.fill();
  if(tree.type==='palm'){
    for(let i=0;i<8;i++){ctx.save();ctx.rotate(i*Math.PI/4);ctx.fillStyle=colors[i%3];ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-r*.3,-r*.5,0,-r);ctx.quadraticCurveTo(r*.25,-r*.6,0,0);ctx.fill();ctx.strokeStyle='#b7c77a';ctx.lineWidth=.6/zoom;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-r*.85);ctx.stroke();ctx.restore();}
    ctx.fillStyle='#9c7a4d';ctx.beginPath();ctx.arc(0,0,r*.09,0,Math.PI*2);ctx.fill();
  }else if(tree.type==='pine'||tree.type==='cypress'){
    for(let i=0;i<3;i++){const size=r*(1-i*.22);ctx.fillStyle=colors[i];ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.85,size*.65);ctx.lineTo(-size*.85,size*.65);ctx.closePath();ctx.fill();}
  }else{
    for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.fillStyle=colors[i%3];ctx.beginPath();ctx.arc(Math.cos(a)*r*.3,Math.sin(a)*r*.3,r*.65,0,Math.PI*2);ctx.fill();}
    if(tree.type==='birch'){ctx.strokeStyle='#eee7cd';ctx.lineWidth=1.5/zoom;ctx.beginPath();ctx.moveTo(-r*.25,r*.2);ctx.lineTo(r*.25,-r*.25);ctx.stroke();}
    if(tree.type==='blossom'){ctx.fillStyle='#ffe1e7';for(let i=0;i<8;i++){const a=i*2.4;ctx.beginPath();ctx.arc(Math.cos(a)*r*.6,Math.sin(a)*r*.6,r*.065,0,Math.PI*2);ctx.fill();}}
  }
  if(selected){ctx.beginPath();ctx.arc(0,0,r+4/zoom,0,Math.PI*2);ctx.strokeStyle='#ef9d5e';ctx.lineWidth=2/zoom;ctx.stroke();}ctx.restore();
}
function pathNear(points,p,distance){return points.slice(1).some((b,i)=>{const a=points[i],dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t)<distance;});}
export function treeClear(p,track,geometry,pit,existing=track.trees||[]){
  const scale=track.scale||.2,r=treeRadius(p),padding=(r+1)/scale;
  if(p.x<padding||p.x>1000-padding||p.y<padding||p.y>740-padding)return false;
  if(geometry.length&&closestOnTrack(geometry,p).distance*scale<track.width/2+r+1)return false;
  if((track.buildings||[]).some(b=>buildingContains(b,p,scale,r+1)))return false;
  if((track.barriers||[]).some(b=>pathNear(b.points,p,(b.width/2+r+1)/scale)))return false;
  if([...pit.path,...pit.parkingPath].length&&[pit.path,pit.parkingPath,pit.connector,pit.exitConnector,pit.entryConnection,pit.exitConnection].some(path=>pathNear(path,p,(pit.settings.width/2+r+1)/scale)))return false;
  if(pit.stalls.some(v=>Math.hypot(v.x-p.x,v.y-p.y)*scale<r+4))return false;
  return !existing.some(v=>Math.hypot(v.x-p.x,v.y-p.y)*scale<(treeRadius(v)+r)*.85+1);
}
export function randomTrees(track,geometry,pit,brush,settings={}){
  const count=Math.min(300-(track.trees||[]).length,Math.max(1,Math.min(200,Math.round(Number(settings.count)||40)))),added=[],types=Object.keys(TREE_SPECIES),scale=track.scale||.2;
  const centers=Array.from({length:5},()=>({x:50+Math.random()*900,y:50+Math.random()*640}));
  for(let i=0;i<count*100&&added.length<count;i++){
    const type=settings.mix===false?treeSettings(brush).type:types[Math.floor(Math.random()*types.length)],height=(settings.mix===false?brush.height:TREE_SPECIES[type].height)*(.8+Math.random()*.4);
    let p={x:Math.random()*1000,y:Math.random()*740};
    if(settings.distribution==='edge'){const road=pointOnTrack(geometry,Math.random()),offset=(Math.random()<.5?-1:1)*(track.width/2+treeRadius({type,height})+4+Math.random()*18)/scale;p={x:road.x+Math.sin(road.angle)*offset,y:road.y-Math.cos(road.angle)*offset};}
    if(settings.distribution==='groves'){const center=centers[Math.floor(Math.random()*centers.length)],a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*22/scale;p={x:center.x+Math.cos(a)*r,y:center.y+Math.sin(a)*r};}
    const tree={...p,...treeSettings({type,height:Math.round(height*2)/2})};if(treeClear(tree,track,geometry,pit,[...(track.trees||[]),...added]))added.push(tree);
  }
  return added;
}
