export function trackSlug(name='Circuit'){return ('apex_'+String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')).slice(0,32).replace(/_+$/,'')||'apex_circuit';}
export const validTrackId=id=>typeof id==='string'&&/^[a-z][a-z0-9_]{0,31}$/.test(id);
export const circuitName=name=>typeof name==='string'?name.trim().slice(0,60)||'Untitled Circuit':'Untitled Circuit';
const namedId=(name,suffix)=>trackSlug(name).slice(0,23).replace(/_+$/,'')+'_'+suffix;
function identitySuffix(id){let hash=2166136261;for(const character of id)hash=Math.imul(hash^character.charCodeAt(0),16777619);return (hash>>>0).toString(16).padStart(8,'0');}
export function trackFolder(track,previousName){
  const name=circuitName(track.name),options=track.export||{},id=options.trackId;
  if(!validTrackId(id))return trackSlug(name);
  const generated=/^apex_.+_([a-f0-9]{8})$/.exec(id),knownName=options.trackIdName??previousName;
  const renamed=knownName!==undefined&&circuitName(knownName)!==name;
  const legacyRename=knownName===undefined&&options.trackIdMode!=='manual'&&generated&&id!==namedId(name,generated[1]);
  return renamed||legacyRename?namedId(name,generated?.[1]||identitySuffix(id)):id;
}
export function synchronizeIdentity(track,previousName){
  const id=trackFolder(track,previousName);track.name=circuitName(track.name);
  track.export={...track.export,trackId:id,trackIdName:track.name,trackIdMode:track.export?.trackIdMode==='manual'?'manual':'auto'};
  return track;
}
export function newTrackId(name){const bytes=new Uint8Array(4);crypto.getRandomValues(bytes);return namedId(name,Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join(''));}
export function serverConfig(track){return `[SERVER]\nTRACK=${trackFolder(track)}\nCONFIG_TRACK=\nMAX_CLIENTS=${Math.max(1,Math.min(16,Math.round(Number(track.export?.pitboxes)||8)))}\n`;}
