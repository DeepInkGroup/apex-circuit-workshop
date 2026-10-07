export function trackSlug(name='Circuit'){return ('apex_'+String(name).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'')).slice(0,32).replace(/_+$/,'')||'apex_circuit';}
export const validTrackId=id=>typeof id==='string'&&/^[a-z][a-z0-9_]{0,31}$/.test(id);
export function trackFolder(track){return validTrackId(track.export?.trackId)?track.export.trackId:trackSlug(track.name);}
export function newTrackId(name){const bytes=new Uint8Array(4);crypto.getRandomValues(bytes);return trackSlug(name).slice(0,23).replace(/_+$/,'')+'_'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}
export function serverConfig(track){return `[SERVER]\nTRACK=${trackFolder(track)}\nCONFIG_TRACK=\nMAX_CLIENTS=${Math.max(1,Math.min(16,Math.round(Number(track.export?.pitboxes)||8)))}\n`;}
