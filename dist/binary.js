const encoder=new TextEncoder();
export class BinaryWriter {
  constructor(size=65536){this.buffer=new ArrayBuffer(size);this.view=new DataView(this.buffer);this.offset=0;}
  reserve(n){if(this.offset+n<=this.buffer.byteLength)return;const old=new Uint8Array(this.buffer);this.buffer=new ArrayBuffer(Math.max(old.length*2,this.offset+n));new Uint8Array(this.buffer).set(old);this.view=new DataView(this.buffer);}
  u8(v){this.reserve(1);this.view.setUint8(this.offset,v);this.offset++;return this;}
  u16(v){this.reserve(2);this.view.setUint16(this.offset,v,true);this.offset+=2;return this;}
  u32(v){this.reserve(4);this.view.setUint32(this.offset,v,true);this.offset+=4;return this;}
  f32(v){if(!Number.isFinite(v))throw new Error('Non-finite geometry value');this.reserve(4);this.view.setFloat32(this.offset,v,true);this.offset+=4;return this;}
  floats(a){a.forEach(v=>this.f32(v));return this;}
  bytes(a){const b=typeof a==='string'?encoder.encode(a):a;this.reserve(b.length);new Uint8Array(this.buffer,this.offset,b.length).set(b);this.offset+=b.length;return this;}
  string(s){const b=encoder.encode(s);return this.u32(b.length).bytes(b);}
  finish(){return new Uint8Array(this.buffer.slice(0,this.offset));}
}
const crcTable=Uint32Array.from({length:256},(_,i)=>{for(let n=0;n<8;n++)i=(i&1)?0xedb88320^(i>>>1):i>>>1;return i>>>0;});
export function crc32(bytes){let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
export function zipFiles(files){
  const out=new BinaryWriter(),entries=[];
  for(const [name,value] of Object.entries(files)){
    if(name.startsWith('/')||name.includes('..')||name.includes('\\'))throw new Error('Invalid archive path');
    const path=encoder.encode(name),data=typeof value==='string'?encoder.encode(value):value,crc=crc32(data),offset=out.offset;
    out.u32(0x04034b50).u16(20).u16(0x800).u16(0).u16(0).u16(0x21).u32(crc).u32(data.length).u32(data.length).u16(path.length).u16(0).bytes(path).bytes(data);
    entries.push({path,data,crc,offset});
  }
  const centralOffset=out.offset;
  entries.forEach(({path,data,crc,offset})=>out.u32(0x02014b50).u16(20).u16(20).u16(0x800).u16(0).u16(0).u16(0x21).u32(crc).u32(data.length).u32(data.length).u16(path.length).u16(0).u16(0).u16(0).u16(0).u32(0).u32(offset).bytes(path));
  const centralSize=out.offset-centralOffset;
  out.u32(0x06054b50).u16(0).u16(0).u16(entries.length).u16(entries.length).u32(centralSize).u32(centralOffset).u16(0);
  return out.finish();
}
