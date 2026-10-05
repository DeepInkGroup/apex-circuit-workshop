// Canvas/map pixels and game X/Z use the same orientation: X right, Z down.
// Keep every exported object and the preview on this one conversion.
export const trackScale=t=>Math.max(.02,Math.min(10,Number(t.scale)||.2));
export function toGamePoint(p,t){const s=trackScale(t);return [(p.x-500)*s,Number(p.elevation)||0,(p.y-370)*s];}
export function toEditorPoint(p,t){const s=trackScale(t);return {x:p[0]/s+500,y:p[2]/s+370,elevation:p[1]};}
