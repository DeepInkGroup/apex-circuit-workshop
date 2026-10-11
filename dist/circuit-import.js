import {crc32} from './binary.js?v=20261011-zip-import';

const SOURCE_LIMIT=4*1024*1024,DIRECTORY_LIMIT=16*1024*1024;
const decoder=new TextDecoder('utf-8',{fatal:true});
const invalid=()=>new Error('This ZIP is damaged or uses an unsupported archive format.');
async function bytes(file,start,length){
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(length)||start<0||length<0||start+length>file.size)throw invalid();
  const data=new Uint8Array(await file.slice(start,start+length).arrayBuffer());
  if(data.length!==length)throw invalid();
  return data;
}
function json(data){
  try{return JSON.parse(decoder.decode(data));}
  catch{throw new Error('The circuit data is damaged. Choose a fresh APEX export.');}
}
async function source(file,entry,directoryOffset){
  if(entry.size>SOURCE_LIMIT||entry.packed>SOURCE_LIMIT)throw new Error('The editable circuit data exceeds the 4 MB import limit.');
  if(entry.flags&0x41)throw new Error('Encrypted ZIPs cannot be imported. Export or repackage without a password.');
  if(![0,8].includes(entry.method))throw new Error('Use a ZIP with standard Store or Deflate compression.');
  const header=await bytes(file,entry.offset,30),view=new DataView(header.buffer);
  if(view.getUint32(0,true)!==0x04034b50||view.getUint16(6,true)!==entry.flags||view.getUint16(8,true)!==entry.method)throw invalid();
  const nameLength=view.getUint16(26,true),extraLength=view.getUint16(28,true),start=entry.offset+30+nameLength+extraLength;
  if(start+entry.packed>directoryOffset)throw invalid();
  if(decoder.decode(await bytes(file,entry.offset+30,nameLength))!==entry.path)throw invalid();
  const packed=await bytes(file,start,entry.packed);
  let data=packed;
  if(entry.method===8){
    let stream;
    try{stream=new DecompressionStream('deflate-raw');}
    catch{throw new Error('This browser cannot read compressed ZIPs. Use an up-to-date browser or the original APEX ZIP.');}
    const reader=new Blob([packed]).stream().pipeThrough(stream).getReader(),chunks=[];
    let size=0;
    try{
      for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>entry.size||size>SOURCE_LIMIT){await reader.cancel();throw invalid();}chunks.push(value);}
    }catch{throw new Error('The compressed circuit data is damaged or too large.');}
    finally{reader.releaseLock();}
    data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.length;}
  }
  if(data.length!==entry.size||crc32(data)!==entry.crc)throw new Error('The circuit checksum does not match. Download or export this ZIP again.');
  return json(data);
}

// Read the directory and selected editor source only; never load the KN5,
// textures or other archive contents into memory to reopen a circuit.
export async function circuitSources(file){
  const signature=await bytes(file,0,Math.min(4,file.size));
  const isZip=/\.zip$/i.test(file.name)||signature.length===4&&signature[0]===0x50&&signature[1]===0x4b;
  if(!isZip){
    if(!/\.json$/i.test(file.name))throw new Error('Choose an APEX track ZIP or an editor JSON file.');
    if(file.size>SOURCE_LIMIT)throw new Error('Choose an editor JSON file smaller than 4 MB.');
    return [{label:file.name,load:async()=>json(await bytes(file,0,file.size))}];
  }
  const tailStart=Math.max(0,file.size-65557),tail=await bytes(file,tailStart,file.size-tailStart),end=new DataView(tail.buffer);
  let eocd=-1;
  for(let i=tail.length-22;i>=0;i--)if(end.getUint32(i,true)===0x06054b50&&i+22+end.getUint16(i+20,true)===tail.length){eocd=i;break;}
  if(eocd<0)throw invalid();
  const count=end.getUint16(eocd+10,true),size=end.getUint32(eocd+12,true),offset=end.getUint32(eocd+16,true);
  if(end.getUint16(eocd+4,true)||end.getUint16(eocd+6,true)||end.getUint16(eocd+8,true)!==count)throw new Error('Choose a single ZIP file, not a split archive.');
  if(count===0xffff||size===0xffffffff||offset===0xffffffff)throw new Error('ZIP64 archives are not supported. Choose the original APEX export.');
  if(count>10000||size>DIRECTORY_LIMIT)throw new Error('This ZIP contains too many files. Choose a single APEX track package.');
  if(offset+size!==tailStart+eocd)throw invalid();
  const directory=await bytes(file,offset,size),view=new DataView(directory.buffer),sources=[];
  let cursor=0;
  for(let i=0;i<count;i++){
    if(cursor+46>size||view.getUint32(cursor,true)!==0x02014b50)throw invalid();
    const nameLength=view.getUint16(cursor+28,true),extraLength=view.getUint16(cursor+30,true),commentLength=view.getUint16(cursor+32,true),next=cursor+46+nameLength+extraLength+commentLength;
    if(next>size||view.getUint16(cursor+34,true))throw invalid();
    const path=decoder.decode(directory.subarray(cursor+46,cursor+46+nameLength));
    if(/(^|\/)apex_source\.json$/i.test(path)&&!path.startsWith('/')&&!path.includes('\\')&&!path.split('/').some(part=>part==='..'||part==='.'||part==='')){
      const entry={path,flags:view.getUint16(cursor+8,true),method:view.getUint16(cursor+10,true),crc:view.getUint32(cursor+16,true),packed:view.getUint32(cursor+20,true),size:view.getUint32(cursor+24,true),offset:view.getUint32(cursor+42,true)};
      sources.push({label:path.replace(/\/apex_source\.json$/i,''),load:()=>source(file,entry,offset)});
      if(sources.length>100)throw new Error('Choose a ZIP containing fewer than 100 APEX circuits.');
    }
    cursor=next;
  }
  if(cursor!==size)throw invalid();
  if(!sources.length)throw new Error('No editable APEX circuit found. Import a ZIP exported by this site that includes apex_source.json.');
  return sources;
}

export function mountCircuitImport({validate,open}){
  const get=id=>document.getElementById(id),fileInput=get('import-file'),button=get('import-btn'),zone=get('import-dropzone'),status=get('import-status'),choices=get('import-choices'),select=get('import-track-choice');
  let busy=false,sources=[];
  const state=(message,error=false)=>{status.textContent=message;status.classList.toggle('import-error',error);};
  const lock=value=>{busy=value;button.disabled=value;get('import-open').disabled=value;select.disabled=value;fileInput.disabled=value;zone.setAttribute('aria-busy',String(value));};
  async function load(candidate){
    lock(true);state('Loading editable circuit…');
    try{
      const imported=validate(await candidate.load());
      if(!get('library-dialog').open)return;
      if(!imported||!imported.points.length)throw new Error('The file does not contain a valid editable circuit.');
      choices.hidden=true;state(`Ready: ${imported.name}.`);
      get('library-dialog').close();open(imported);
    }catch(error){state(error.message||'Could not load the circuit. Choose a fresh APEX export.',true);}
    finally{lock(false);fileInput.value='';}
  }
  async function importFile(file){
    if(!file||busy)return;
    lock(true);choices.hidden=true;state('Reading your track package…');
    try{
      sources=await circuitSources(file);
      if(!get('library-dialog').open)return;
      if(sources.length===1){await load(sources[0]);return;}
      select.replaceChildren(...sources.map((item,index)=>{const option=document.createElement('option');option.value=index;option.textContent=item.label;return option;}));
      choices.hidden=false;state(`${sources.length} circuits found. Choose which one to open.`);
    }catch(error){state(error.message||'Could not read this file. Choose an APEX ZIP or JSON.',true);}
    finally{lock(false);fileInput.value='';}
  }
  button.onclick=()=>fileInput.click();fileInput.onchange=()=>importFile(fileInput.files[0]);
  get('import-open').onclick=()=>{if(!busy&&sources[select.selectedIndex])load(sources[select.selectedIndex]);};
  zone.addEventListener('dragover',event=>{event.preventDefault();if(!busy)zone.classList.add('drag-over');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('drag-over'));
  zone.addEventListener('drop',event=>{event.preventDefault();zone.classList.remove('drag-over');if(event.dataTransfer.files.length!==1){state('Drop one track ZIP or JSON file at a time.',true);return;}importFile(event.dataTransfer.files[0]);});
}
