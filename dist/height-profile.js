// Shape-preserving cubic grades: continuous tangents at authored stations,
// no overshoot at crests/valleys, and one shared tangent across a closed seam.
export function heightProfile(stations,values,length,closed=false){
 const nodes=[];stations.forEach((x,i)=>{const y=Number(values[i])||0;if(nodes.length&&x-nodes.at(-1).x<1e-7)nodes.at(-1).y=y;else nodes.push({x,y});});
 if(closed&&nodes.length>1&&nodes.at(-1).x>=length-1e-7)nodes.pop();
 const n=nodes.length,h=[],d=[];for(let i=0;i<(closed?n:n-1);i++){const j=(i+1)%n;h[i]=Math.max(1e-7,(j?nodes[j].x:length)-nodes[i].x);d[i]=(nodes[j].y-nodes[i].y)/h[i];}
 const tangent=(a,b,ha,hb)=>a*b<=0?0:(3*(ha+hb))/((2*hb+ha)/a+(hb+2*ha)/b);
 const endpoint=(a,b,ha,hb)=>{let m=((2*ha+hb)*a-ha*b)/(ha+hb);if(m*a<=0)m=0;else if(a*b<0&&Math.abs(m)>3*Math.abs(a))m=3*a;return m;};
 for(let i=0;i<n;i++)nodes[i].m=n<2?0:closed?tangent(d[(i+n-1)%n],d[i],h[(i+n-1)%n],h[i]):n===2?d[0]:i===0?endpoint(d[0],d[1],h[0],h[1]):i===n-1?endpoint(d[n-2],d[n-3],h[n-2],h[n-3]):tangent(d[i-1],d[i],h[i-1],h[i]);
 return {nodes,length,closed};
}
export function profileAt(profile,station){
 const {nodes,length,closed}=profile,n=nodes.length;if(n<2)return {value:nodes[0]?.y||0,grade:0};
 const x=closed?((station%length)+length)%length:Math.max(nodes[0].x,Math.min(length,station));let lo=0,hi=n-1;
 while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(nodes[mid].x<=x)lo=mid;else hi=mid-1;}if(!closed&&lo===n-1)lo--;
 const a=nodes[lo],b=nodes[(lo+1)%n],span=Math.max(1e-7,(lo===n-1?length:b.x)-a.x),t=Math.max(0,Math.min(1,(x-a.x)/span)),t2=t*t,t3=t2*t;
 return {value:(2*t3-3*t2+1)*a.y+(t3-2*t2+t)*span*a.m+(-2*t3+3*t2)*b.y+(t3-t2)*span*b.m,grade:((6*t2-6*t)*a.y+(-6*t2+6*t)*b.y)/span+(3*t2-4*t+1)*a.m+(3*t2-2*t)*b.m};
}
