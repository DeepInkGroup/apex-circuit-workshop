let worker=null,sequence=0;
const jobs=new Map();

export async function buildPackage(track,images,format,onProgress=()=>{}){
  if(typeof Worker==='undefined'){
    const {exportZip,exportTrackFolderZip,exportServerZip}=await import('./ac-export.js?v=20261011-pit-kerbs');
    const build={cm:exportZip,track:exportTrackFolderZip,server:exportServerZip}[format];
    if(!build)throw new Error('Unknown package format.');
    onProgress('Building track geometry and ZIP…');
    const {slug,bytes}=build(track,images);return {slug,bytes};
  }
  if(!worker){
    worker=new Worker(new URL('./export-worker.js?v=20261011-pit-kerbs',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{
      const job=jobs.get(data.id);if(!job)return;
      if(data.status){job.progress(data.status);return;}
      jobs.delete(data.id);
      if(data.error)job.reject(new Error(data.error));else job.resolve({slug:data.slug,bytes:data.bytes});
    };
    const failed=()=>{
      worker?.terminate();worker=null;
      for(const job of jobs.values())job.reject(new Error('The export worker stopped. Reload the site and try again.'));
      jobs.clear();
    };
    worker.onerror=failed;worker.onmessageerror=failed;
  }
  return new Promise((resolve,reject)=>{
    const id=++sequence;jobs.set(id,{resolve,reject,progress:onProgress});
    try{worker.postMessage({id,track,images,format});}
    catch(error){jobs.delete(id);reject(error);}
  });
}
