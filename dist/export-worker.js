import {exportZip,exportTrackFolderZip,exportServerZip} from './ac-export.js?v=20261011-zip-import';

const exporters={cm:exportZip,track:exportTrackFolderZip,server:exportServerZip};
self.onmessage=({data:{id,track,images,format}})=>{
  try{
    const build=exporters[format];if(!build)throw new Error('Unknown package format.');
    self.postMessage({id,status:'Building track geometry and ZIP…'});
    const {slug,bytes}=build(track,images);
    // Transfer ownership instead of cloning a large ZIP back to the editor.
    self.postMessage({id,slug,bytes},[bytes.buffer]);
  }catch(error){self.postMessage({id,error:error.message||'Could not build this track.'});}
};
