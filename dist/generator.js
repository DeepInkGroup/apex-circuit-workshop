import {buildGeometry,clamp,pointOnTrack} from './engine.js?v=20261008-corners';
export const GENERATOR_STYLES={flowing:'Flowing',technical:'Technical',fast:'Fast sweepers'};
export function randomSeed(){const bytes=new Uint32Array(1);crypto.getRandomValues(bytes);return bytes[0].toString(36).toUpperCase();}
function seeded(seed){let state=2166136261;for(const c of String(seed))state=Math.imul(state^c.charCodeAt(0),16777619)>>>0;return ()=>{state=(state+0x6D2B79F5)>>>0;let n=state;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};}
function separated(g,width,scale){
  const n=180,points=Array.from({length:n},(_,i)=>pointOnTrack(g,i/n)),gap=width/scale*1.6;
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const steps=Math.min(j-i,n-(j-i));if(steps*g.length/n<gap*2.5)continue;if(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)<gap)return false;}return true;
}
export function generateTrack(settings={}){
  const seed=String(settings.seed||'').trim().toUpperCase().slice(0,32)||randomSeed(),rng=seeded(seed),style=GENERATOR_STYLES[settings.style]?settings.style:'flowing',complexity=clamp(Math.round(Number(settings.complexity)||12),8,24),target=clamp(Number(settings.length)||900,300,5000),width=clamp(Number(settings.width)||12,4,30);
  let points=[],scale=.5;
  for(let attempt=0;attempt<24;attempt++){
    const count=style==='fast'?Math.max(8,Math.round(complexity*.7)):complexity,rotation=rng()*Math.PI*2,phase=rng()*Math.PI*2,aspect=.8+rng()*.15,frequency=style==='technical'?3:2,amplitude=style==='technical'?.23:style==='fast'?.055:.12;
    points=Array.from({length:count},(_,i)=>{const a=i/count*Math.PI*2+rotation,jitter=(rng()-.5)*amplitude*.5,r=1+amplitude*Math.sin(a*frequency+phase)+jitter;return {x:500+335*r*Math.cos(a),y:370+225*aspect*r*Math.sin(a),elevation:0,bank:0,rounding:1};});
    const g=buildGeometry(points,true,true);scale=target/g.length;
    if(separated(g,width,scale))break;
    if(attempt===23){points=Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return {x:500+335*Math.cos(a),y:370+215*Math.sin(a),elevation:0,bank:0,rounding:1};});scale=target/buildGeometry(points,true,true).length;}
  }
  return {points,scale,start:0,name:`${GENERATOR_STYLES[style]} Circuit ${seed.slice(0,6)}`,generator:{seed,style,complexity,length:target}};
}
