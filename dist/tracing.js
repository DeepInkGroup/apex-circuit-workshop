export function parseCoordinates(text){
  const match=String(text).trim().match(/(?:@|^|[?&]q=)\s*(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)/);
  if(!match)throw new Error('Enter latitude, longitude — for example 50.586079, 8.812544.');
  const lat=Number(match[1]),lon=Number(match[2]);
  if(Math.abs(lat)>85||Math.abs(lon)>180)throw new Error('Latitude must be within ±85° and longitude within ±180°.');
  return {lat,lon};
}
export function tilePlan(lat,lon,zoom){
  const n=2**zoom,pixelSize=256*n,sin=Math.sin(lat*Math.PI/180),cx=(lon+180)/360*pixelSize,cy=(.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*pixelSize;
  const left=cx-500,top=cy-370,tiles=[];
  for(let y=Math.floor(top/256);y<=Math.floor((top+740)/256);y++)for(let x=Math.floor(left/256);x<=Math.floor((left+1000)/256);x++){
    if(y<0||y>=n)continue;
    tiles.push({url:`https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${((x%n)+n)%n}`,x:x*256-left,y:y*256-top});
  }
  return {tiles,scale:156543.03392804097*Math.cos(lat*Math.PI/180)/2**zoom};
}
function loadImage(src){return new Promise((resolve,reject)=>{const image=new Image();image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=()=>reject(new Error('Reference imagery could not be loaded. Try another zoom or upload an image.'));image.src=src;});}
function assetDb(){return new Promise((resolve,reject)=>{const request=indexedDB.open('apex-reference-images',1);request.onupgradeneeded=()=>request.result.createObjectStore('images');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
export async function saveImage(key,data){const db=await assetDb();try{await new Promise((resolve,reject)=>{const tx=db.transaction('images','readwrite');tx.objectStore('images').put(data,key);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}finally{db.close();}}
export async function readImage(key){const db=await assetDb();try{return await new Promise((resolve,reject)=>{const request=db.transaction('images').objectStore('images').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}finally{db.close();}}
export class ReferenceLayer {
  constructor(onChange,onError){this.onChange=onChange;this.onError=onError;this.cache=new Map();this.pending=new Set();this.image=null;this.currentKey='';}
  key(desc){return desc?JSON.stringify(desc):'';}
  async ensure(desc){
    const key=this.key(desc);this.currentKey=key;
    if(!desc){this.image=null;return;}
    if(this.cache.has(key)){this.image=this.cache.get(key);return;}
    this.image=null;if(this.pending.has(key))return;this.pending.add(key);
    try{const image=desc.type==='map'?await this.map(desc):await loadImage(await readImage(desc.key)||'');this.cache.set(key,image);if(this.cache.size>8)this.cache.delete(this.cache.keys().next().value);if(this.currentKey===key){this.image=image;this.onChange();}}
    catch(error){if(this.currentKey===key)this.onError(error.message);}finally{this.pending.delete(key);}
  }
  async map(desc){
    const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=740;const ctx=canvas.getContext('2d');ctx.fillStyle='#27332b';ctx.fillRect(0,0,1000,740);
    const {tiles}=tilePlan(desc.lat,desc.lon,desc.zoom),results=await Promise.allSettled(tiles.map(async tile=>{const image=await loadImage(tile.url);ctx.drawImage(image,tile.x,tile.y,256,256);}));
    if(results.some(r=>r.status==='rejected'))throw new Error('Satellite tiles are unavailable here. Try a lower zoom or upload a reference image.');return canvas;
  }
  async addFile(file){
    if(file.size>20000000)throw new Error('Choose an image smaller than 20 MB.');
    if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw new Error('Choose a PNG, JPG, or WebP image.');
    const objectUrl=URL.createObjectURL(file);let image;try{image=await loadImage(objectUrl);}finally{URL.revokeObjectURL(objectUrl);}
    const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=740;const ctx=canvas.getContext('2d');ctx.fillStyle='#242d29';ctx.fillRect(0,0,1000,740);const fit=Math.min(1000/image.width,740/image.height);ctx.drawImage(image,(1000-image.width*fit)/2,(740-image.height*fit)/2,image.width*fit,image.height*fit);
    const data=canvas.toDataURL('image/jpeg',.9),key=crypto.randomUUID(),desc={type:'image',key,name:file.name.slice(0,100)};
    this.cache.set(this.key(desc),canvas);
    try{await saveImage(key,data);}catch{this.onError('Image storage is unavailable. Keep this tab open to trace the image.');}
    return desc;
  }
}
