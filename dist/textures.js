import {BinaryWriter,crc32} from './binary.js';
const clamp=n=>Math.max(0,Math.min(255,Math.round(n)));
const rgb565=c=>(Math.round(c[0]*31/255)<<11)|(Math.round(c[1]*63/255)<<5)|Math.round(c[2]*31/255);
const unpack=n=>[(n>>>11)*255/31,((n>>>5)&63)*255/63,(n&31)*255/31];
function compressLevel(writer,pixels,size){
  for(let by=0;by<size;by+=4)for(let bx=0;bx<size;bx+=4){
    const block=[];for(let y=0;y<4;y++)for(let x=0;x<4;x++){const i=(Math.min(size-1,by+y)*size+Math.min(size-1,bx+x))*3;block.push([pixels[i],pixels[i+1],pixels[i+2]]);}
    const low=[255,255,255],high=[0,0,0];for(const c of block)for(let k=0;k<3;k++){low[k]=Math.min(low[k],c[k]);high[k]=Math.max(high[k],c[k]);}
    let c0=rgb565(high),c1=rgb565(low);if(c0<=c1){if(c0<65535)c0=c1+1;else c1=c0-1;}
    const a=unpack(c0),b=unpack(c1),colors=[a,b,a.map((v,k)=>(2*v+b[k])/3),a.map((v,k)=>(v+2*b[k])/3)];let bits=0;
    block.forEach((c,i)=>{let best=0,error=Infinity;colors.forEach((candidate,j)=>{const e=c.reduce((n,v,k)=>n+(v-candidate[k])**2,0);if(e<error){error=e;best=j;}});bits|=best<<(i*2);});writer.u16(c0).u16(c1).u32(bits>>>0);
  }
}
function surfacePixels(material,size){
  const pixels=new Uint8Array(size*size*3),noise=material.noise??5;let state=0x51a77;
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){state=(Math.imul(state,1664525)+1013904223)>>>0;const grain=((state>>>16)/65535-.5)*noise*2,large=(Math.sin(x*.095)*Math.cos(y*.073)+Math.sin((x+y)*.041))*noise*.15;let detail=grain+large;
    if(material.name==='Grass')detail+=Math.sin(x*.7+y*.3)*4;
    if(material.name==='Asphalt'&&noise>=12&&((x+Math.round(5*Math.sin(y*.05)))%91+91)%91<1)detail-=12;
    for(let k=0;k<3;k++)pixels[(y*size+x)*3+k]=clamp(material.color[k]+detail);
  }return pixels;
}
export function createTexture(material,size=256){
  const levels=Math.floor(Math.log2(size))+1,w=new BinaryWriter();
  // Legacy DXT1 header with a complete mip chain: no DX10 extension required.
  w.bytes('DDS ').u32(124).u32(0xA1007).u32(size).u32(size).u32(Math.ceil(size/4)**2*8).u32(0).u32(levels);for(let i=0;i<11;i++)w.u32(0);
  w.u32(32).u32(4).bytes('DXT1').u32(0).u32(0).u32(0).u32(0).u32(0).u32(0x401008);for(let i=0;i<4;i++)w.u32(0);
  let pixels=surfacePixels(material,size),dimension=size;
  while(true){compressLevel(w,pixels,dimension);if(dimension===1)break;const next=dimension/2,reduced=new Uint8Array(next*next*3);for(let y=0;y<next;y++)for(let x=0;x<next;x++)for(let k=0;k<3;k++)reduced[(y*next+x)*3+k]=Math.round((pixels[((y*2)*dimension+x*2)*3+k]+pixels[((y*2)*dimension+x*2+1)*3+k]+pixels[((y*2+1)*dimension+x*2)*3+k]+pixels[((y*2+1)*dimension+x*2+1)*3+k])/4);pixels=reduced;dimension=next;}
  const bytes=w.finish(),name=`apex_${material.name.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_${crc32(bytes).toString(16)}.dds`;return {name,bytes};
}
export function materialProperties(material){
  const pavement=['Asphalt','Pit asphalt'].includes(material.name),paint=['White','Kerb red','Pit bay paint'].includes(material.name);
  return {ksAmbient:.25,ksDiffuse:paint?.5:.6,ksSpecular:pavement?.025:.01,ksSpecularEXP:pavement?18:6,ksEmissive:[0,0,0],ksAlphaRef:0};
}
