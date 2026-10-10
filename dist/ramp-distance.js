// Spend less vertical grade in tight corners, where the inside edge is shorter.
// A C2 integrated metric eases rate changes instead of introducing new crests.
export function rampDistance(g,scale,width){
 const total=g.length*scale,closed=g.closed,count=Math.min(5000,Math.max(64,Math.ceil(total/2))),step=total/count,look=Math.max(6,width*.75),half=width/2+1;
 const normalize=m=>closed?((m%total)+total)%total:Math.max(0,Math.min(total,m));
 function point(m){const distance=normalize(m)/scale;let lo=0,hi=g.cumulative.length-1;while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(g.cumulative[mid]<=distance)lo=mid;else hi=mid-1;}if(!closed&&lo===g.samples.length-1)lo--;const a=g.samples[Math.max(0,lo)],b=g.samples[(lo+1)%g.samples.length],length=Math.hypot(b.x-a.x,b.y-a.y)||1,t=(distance-(g.cumulative[lo]||0))/length;return {x:(a.x+(b.x-a.x)*t)*scale,y:(a.y+(b.y-a.y)*t)*scale};}
 const rates=Array.from({length:count+1},(_,i)=>{const p=point(i*step),a=point(i*step-look),b=point(i*step+look),ab=Math.hypot(a.x-p.x,a.y-p.y),bc=Math.hypot(p.x-b.x,p.y-b.y),ac=Math.hypot(a.x-b.x,a.y-b.y),cross=Math.abs((p.x-a.x)*(b.y-p.y)-(p.y-a.y)*(b.x-p.x)),radius=cross>1e-8?ab*bc*ac/(2*cross):Infinity;return Math.max(.08,Math.min(1,1-half/Math.max(.01,radius)));});
 if(closed)rates[count]=rates[0];
 // Lower neighboring rates as well, so the transition settles before the turn.
 const eased=rates.map((value,i)=>Math.min(value,...[-2,-1,1,2].map(j=>rates[closed?((i+j)%count+count)%count:Math.max(0,Math.min(count,i+j))])));if(closed)eased[count]=eased[0];
 const cumulative=[0];for(let i=1;i<=count;i++)cumulative.push(cumulative.at(-1)+step*(eased[i-1]+eased[i])/2);
 const length=cumulative.at(-1);
 function at(m){const cycle=closed?Math.floor(m/total):0,x=closed?m-cycle*total:normalize(m),i=Math.min(count-1,Math.floor(x/step)),t=(x-i*step)/step,a=eased[i],b=eased[i+1];return cycle*length+cumulative[i]+step*(a*t+(b-a)*(t**3-t**4/2));}
 function station(value){if(!closed&&value<0)return value/eased[0];if(!closed&&value>length)return total+(value-length)/eased[count];const cycle=closed?Math.floor(value/length):0,target=closed?value-cycle*length:Math.max(0,Math.min(length,value));let lo=0,hi=total;for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(at(mid)<target)lo=mid;else hi=mid;}return cycle*total+(lo+hi)/2;}
 return {at,station,length,total};
}
