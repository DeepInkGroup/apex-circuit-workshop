const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function structureSettings(value={}){return {type:['bridge','tunnel'].includes(value?.type)?value.type:'none',length:clamp(Number(value?.length)||30,12,120),clearance:clamp(Number(value?.clearance)||6,4.5,12),grade:clamp(Number(value?.grade)||8,4,15)};}
