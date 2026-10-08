import {BinaryWriter,crc32} from './binary.js?v=20261008-grades';
import {grassPixels} from './scenery.js?v=20261008-grades';
const clamp=n=>Math.max(0,Math.min(255,Math.round(n)));
export function surfacePixels(material,size){
  if(material.name==='Grass')return grassPixels(material.grass||'mown',size);
  const pixels=new Uint8Array(size*size*3),noise=material.noise??5;let state=0x51a77;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){state=(Math.imul(state,1664525)+1013904223)>>>0;const grain=((state>>>16)/65535-.5)*noise*2,large=(Math.sin(x*.095)*Math.cos(y*.073)+Math.sin((x+y)*.041))*noise*.15;let detail=grain+large;
    if(material.name==='Asphalt'&&noise>=12&&((x+Math.round(5*Math.sin(y*.05)))%91+91)%91<1)detail-=12;
    if(material.finish==='brick'){const row=Math.floor(y/16),seam=y%16<2||(x+(row%2)*32)%64<2;if(seam)detail+=35;}
    if(material.finish==='steel'&&x%32<2)detail-=18;
    for(let k=0;k<3;k++)pixels[(y*size+x)*3+k]=clamp(material.color[k]+detail);
  }return pixels;
}
export function createTexture(material,size=256){
  if(size<1||size>1024||!Number.isInteger(Math.log2(size)))throw new Error('Texture size must be a power of two between 1 and 1024.');
  const levels=Math.floor(Math.log2(size))+1,w=new BinaryWriter();
  // Legacy A8R8G8B8 DDS: raw BGRA pixels avoid the custom BC1 compressor.
  // Explicit pitch, channel masks, opaque alpha and a complete mip chain.
  w.bytes('DDS ').u32(124).u32(0x2100F).u32(size).u32(size).u32(size*4).u32(0).u32(levels);for(let i=0;i<11;i++)w.u32(0);
  w.u32(32).u32(0x41).u32(0).u32(32).u32(0x00ff0000).u32(0x0000ff00).u32(0x000000ff).u32(0xff000000).u32(levels>1?0x401008:0x1000);for(let i=0;i<4;i++)w.u32(0);
  let pixels=surfacePixels(material,size),dimension=size;
  while(true){const bgra=new Uint8Array(dimension*dimension*4);for(let i=0;i<dimension*dimension;i++){bgra[i*4]=pixels[i*3+2];bgra[i*4+1]=pixels[i*3+1];bgra[i*4+2]=pixels[i*3];bgra[i*4+3]=255;}w.bytes(bgra);if(dimension===1)break;const next=dimension/2,reduced=new Uint8Array(next*next*3);for(let y=0;y<next;y++)for(let x=0;x<next;x++)for(let k=0;k<3;k++)reduced[(y*next+x)*3+k]=Math.round((pixels[((y*2)*dimension+x*2)*3+k]+pixels[((y*2)*dimension+x*2+1)*3+k]+pixels[((y*2+1)*dimension+x*2)*3+k]+pixels[((y*2+1)*dimension+x*2+1)*3+k])/4);pixels=reduced;dimension=next;}
  const bytes=w.finish(),name=`apex8_${material.name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_${crc32(bytes).toString(16)}.dds`;return {name,bytes};
}
export function materialProperties(material){
  const grass=material.name==='Grass',pavement=['Asphalt','Pit asphalt'].includes(material.name),paint=['White','Kerb red','Pit bay paint'].includes(material.name);
  return {ksAmbient:grass?.3:.25,ksDiffuse:grass?.32:paint?.3:.35,ksSpecular:grass?0:pavement?.015:.005,ksSpecularEXP:pavement?18:8,ksEmissive:[0,0,0],ksAlphaRef:0};
}
