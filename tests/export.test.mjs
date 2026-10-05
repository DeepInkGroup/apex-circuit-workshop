import test from 'node:test';
import assert from 'node:assert/strict';
import {createScene,writeKn5,writeAi,exportZip,validateExport,trackSlug} from '../dist/ac-export.js';
import {crc32} from '../dist/binary.js';
import {parseCoordinates,tilePlan} from '../dist/tracing.js';
import {readFileSync} from 'node:fs';
const track={name:'Test Circuit',points:[{x:200,y:180},{x:800,y:180},{x:800,y:550},{x:200,y:550}],scale:.5,width:12,smooth:true,start:.15,export:{pitboxes:8}};

// Independent decoder: a malformed count, material property, or node tail makes these reads fail.
class Reader{
  constructor(bytes){this.bytes=bytes;this.view=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);this.offset=0;}
  u8(){return this.view.getUint8(this.offset++);}
  u16(){const n=this.view.getUint16(this.offset,true);this.offset+=2;return n;}
  u32(){const n=this.view.getUint32(this.offset,true);this.offset+=4;return n;}
  float(){const n=this.view.getFloat32(this.offset,true);this.offset+=4;assert.ok(Number.isFinite(n));return n;}
  floats(count){return Array.from({length:count},()=>this.float());}
  string(){const count=this.u32();assert.ok(count<1000);const text=new TextDecoder().decode(this.bytes.slice(this.offset,this.offset+count));this.offset+=count;return text;}
}
function decodeKn5(bytes){
  const r=new Reader(bytes);assert.equal(new TextDecoder().decode(bytes.slice(0,6)),'sc6969');r.offset=6;assert.equal(r.u32(),6);r.u32();
  const textures=[];for(let n=r.u32();n;n--){assert.equal(r.u32(),1);const name=r.string(),size=r.u32(),blob=bytes.slice(r.offset,r.offset+size);assert.equal(new TextDecoder().decode(blob.slice(0,4)),'DDS ');const dds=new DataView(blob.buffer,blob.byteOffset,blob.length);assert.equal(dds.getUint32(4,true),124);assert.equal(dds.getUint32(12,true),256);assert.equal(dds.getUint32(16,true),256);assert.equal(dds.getUint32(28,true),9);assert.equal(dds.getUint32(80,true),0x41);assert.equal(dds.getUint32(84,true),0);assert.equal(dds.getUint32(88,true),32);let payload=0;for(let side=256;side>=1;side/=2)payload+=side*side*4;assert.equal(size,128+payload);textures.push(name);r.offset+=size;}
  const materials=[];for(let n=r.u32();n;n--){const name=r.string();assert.equal(r.string(),'ksPerPixel');r.u8();r.u8();r.u32();for(let p=r.u32();p;p--){r.string();r.floats(10);}for(let p=r.u32();p;p--){r.string();r.u32();assert.ok(textures.includes(r.string()));}materials.push(name);}
  const nodes=[];
  function node(){const type=r.u32(),name=r.string(),children=r.u32();assert.equal(r.u8(),1);const result={type,name};
    if(type===1)result.matrix=r.floats(16);
    else{assert.equal(type,2);r.u8();r.u8();r.u8();const count=r.u32();assert.ok(count>0&&count<=65535);for(let i=0;i<count;i++)r.floats(11);const indices=r.u32();assert.equal(indices%3,0);for(let i=0;i<indices;i++)assert.ok(r.u16()<count);assert.ok(r.u32()<materials.length);r.u32();r.floats(6);r.u8();result.vertices=count;}
    nodes.push(result);for(let i=0;i<children;i++)node();
  }
  node();assert.equal(r.offset,bytes.length);return nodes;
}
test('native KN5 is fully decodable and has all physical meshes, spawns, and timing gates',()=>{
  const scene=createScene(track),nodes=decodeKn5(writeKn5(scene)),names=new Set(nodes.map(n=>n.name));
  for(const name of ['1ROAD_SURFACE','1GRASS_TERRAIN','1PIT_LANE','1WALL_BOUNDARY','AC_START_0','AC_PIT_0','AC_HOTLAP_START_0','AC_TIME_0_L','AC_TIME_0_R','AC_TIME_1_L','AC_TIME_2_R'])assert.ok(names.has(name),name);
  for(let i=0;i<8;i++){assert.ok(names.has(`AC_PIT_${i}`));assert.ok(names.has(`AC_START_${i}`));}
  const pitNodes=nodes.filter(n=>n.name.startsWith('AC_PIT_'));assert.equal(new Set(pitNodes.map(n=>n.matrix.slice(12,15).join(','))).size,8);
  const road=scene.meshes.find(m=>m.name==='1ROAD_SURFACE');assert.ok(road.vertices.every(v=>v.normal[1]>.95));
});
test('elevation, banking, and scene scale reach the exported geometry',()=>{
  const elevated={...track,points:track.points.map(p=>({...p,elevation:7,bank:5}))};
  const scene=createScene(elevated),road=scene.meshes.find(m=>m.name==='1ROAD_SURFACE');
  assert.ok(road.vertices.some(v=>v.pos[1]>7));assert.ok(road.vertices.some(v=>v.pos[1]<7));
  assert.ok(scene.dummies.find(d=>d.name==='AC_START_0').pos[1]>7);
});
test('AI version 7 carries matching point and extra counts and no trailing data',()=>{
  const scene=createScene(track),bytes=writeAi(scene.frames,12),r=new Reader(bytes);assert.equal(r.u32(),7);const count=r.u32();r.u32();r.u32();let previous=-1;
  for(let i=0;i<count;i++){r.floats(3);const distance=r.float();assert.ok(distance>=previous);previous=distance;assert.equal(r.u32(),i);}
  assert.equal(r.u32(),count);for(let i=0;i<count;i++){const extra=r.floats(18);assert.ok(extra[0]>=25);assert.equal(extra[5]+extra[6],12);assert.equal(extra[10],1);}
  assert.equal(r.u32(),0);assert.equal(r.offset,bytes.length);
});
test('ZIP entries use CM content/tracks structure and CRCs match their payloads',()=>{
  const {bytes,slug}=exportZip(track),r=new Reader(bytes),paths=[];
  while(r.view.getUint32(r.offset,true)===0x04034b50){r.u32();r.u16();r.u16();assert.equal(r.u16(),0);r.u16();r.u16();const crc=r.u32(),size=r.u32();assert.equal(r.u32(),size);const pathLength=r.u16(),extra=r.u16();const path=new TextDecoder().decode(bytes.slice(r.offset,r.offset+pathLength));r.offset+=pathLength+extra;assert.equal(crc32(bytes.slice(r.offset,r.offset+size)),crc);r.offset+=size;paths.push(path);}
  assert.ok(paths.includes(`content/tracks/${slug}/${slug}.kn5`));assert.ok(paths.includes(`content/tracks/${slug}/ui/ui_track.json`));assert.ok(paths.includes('INSTALL.txt'));assert.equal(r.u32(),0x02014b50);
});
test('invalid crossings are rejected and short pit routes receive fitted bays',()=>{
  const crossed={...track,smooth:false,points:[{x:100,y:100},{x:900,y:600},{x:100,y:600},{x:900,y:100}]};assert.ok(validateExport(crossed).errors.some(e=>e.includes('crosses')));
  assert.equal(validateExport({...track,pit:[{x:100,y:100},{x:110,y:100}]}).errors.length,0);
  assert.equal(validateExport(track).errors.length,0);
});
test('custom two-point pit path is resampled and creates distinct pit boxes',()=>{
  const scene=createScene({...track,pit:[{x:100,y:100},{x:500,y:100}]});assert.ok(scene.pitFrames.length>100);assert.equal(new Set(scene.dummies.filter(d=>d.name.startsWith('AC_PIT_')).map(d=>d.pos.join(','))).size,8);
});
test('all starter circuits export with upward physical road triangles',()=>{
  const source=readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');let count=0;
  for(const match of source.matchAll(/(club|technical|speedway): \{ name:'([^']+)', points:(\[\[.*?\]\])/g)){
    const t={name:match[2],points:JSON.parse(match[3]).map(([x,y])=>({x,y})),scale:.2,width:12,smooth:true,start:0};assert.equal(validateExport(t).errors.length,0);
    const scene=createScene(t);decodeKn5(writeKn5(scene));
    scene.meshes.filter(m=>/^1(ROAD|PIT|KERB|GRASS)/.test(m.name)).forEach(m=>{
      assert.ok(m.vertices.every(v=>v.normal[1]>=0));
      for(let i=0;i<m.indices.length;i+=3){const a=m.vertices[m.indices[i]].pos,b=m.vertices[m.indices[i+1]].pos,c=m.vertices[m.indices[i+2]].pos;assert.ok((b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2])>=-1e-8);}
    });count++;
  }assert.equal(count,3);
});
test('coordinates, tile layout, and safe folder names are deterministic',()=>{
  assert.deepEqual(parseCoordinates('50.586079, 8.812544'),{lat:50.586079,lon:8.812544});assert.deepEqual(parseCoordinates('https://maps.google.com/@50.1,8.2,18z'),{lat:50.1,lon:8.2});assert.throws(()=>parseCoordinates('91, 2'));
  const plan=tilePlan(50,8,18);assert.ok(plan.tiles.length>=12);assert.ok(plan.scale>.3&&plan.scale<.5);
  assert.ok(/^[a-z0-9_]{1,32}$/.test(trackSlug('../../ Circuit é — '.repeat(5))));assert.ok(trackSlug('🏎').length<=32);
});
