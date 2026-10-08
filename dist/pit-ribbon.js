// One variable-width ribbon for the editor, native mesh and minimap.
export function pitRibbons(plan){
  const routes=[plan.path,plan.parkingPath,plan.connector,plan.exitConnector,plan.entryConnection,plan.exitConnection],s=plan.scale,result=[];
  routes.forEach((path,index)=>{
    if(path.length<2)return;
    const rails=path.map((p,i)=>{
      const a=path[Math.max(0,i-1)],b=path[Math.min(path.length-1,i+1)],angle=(i===0||i===path.length-1)&&Number.isFinite(p.angle)?p.angle:Math.atan2(b.y-a.y,b.x-a.x),half=(p.width||plan.settings.width)/2;
      const at=offset=>({x:p.x+Math.sin(angle)*offset/s,y:p.y-Math.cos(angle)*offset/s,elevation:(p.elevation||0)+offset*Math.tan((p.bank||0)*Math.PI/180)});
      return {left:at(half),right:at(-half),innerLeft:at(half-.12),innerRight:at(-half+.12)};
    });
    for(let i=0;i<rails.length-1;i++){
      const a=rails[i],b=rails[i+1],t=(i+.5)/(rails.length-1);
      result.push({corners:[a.left,b.left,b.right,a.right],paint:[[a.left,b.left,b.innerLeft,a.innerLeft],[a.innerRight,b.innerRight,b.right,a.right]],merge:index===4&&t<.3||index===5&&t>.7});
    }
  });
  return result;
}
