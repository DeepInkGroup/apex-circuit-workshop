export const ASPHALT={
  fresh:{label:'Fresh asphalt',color:[48,52,57],noise:7},
  weathered:{label:'Weathered asphalt',color:[77,80,82],noise:14},
  dark:{label:'Dark racing asphalt',color:[34,38,43],noise:5}
};
export function asphaltPattern(context,style='fresh'){
  const spec=ASPHALT[style]||ASPHALT.fresh,canvas=document.createElement('canvas');canvas.width=canvas.height=128;
  const c=canvas.getContext('2d'),pixels=c.createImageData(128,128);
  let seed=39127;for(let i=0;i<pixels.data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;const noise=((seed>>>16)%31-15)*spec.noise/15;for(let j=0;j<3;j++)pixels.data[i+j]=spec.color[j]+noise;pixels.data[i+3]=255;}
  c.putImageData(pixels,0,0);
  if(style==='weathered'){c.strokeStyle='#272b2f55';c.lineWidth=.6;for(let i=0;i<6;i++){c.beginPath();c.moveTo(i*23,0);c.lineTo(i*23+8,38);c.lineTo(i*23-4,76);c.lineTo(i*23+6,128);c.stroke();}}
  return context.createPattern(canvas,'repeat');
}
