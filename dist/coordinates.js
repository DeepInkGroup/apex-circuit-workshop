// KN5 car-local +Z is forward and +X is LEFT (confirmed by stock WHEEL_LF/RF).
// Canvas +Y points down. Keeping native +Z down preserves driving turn handedness.
// Do not invert Z to match a minimap image: its projection is a separate operation.
export const trackScale=t=>Math.max(.02,Math.min(10,Number(t.scale)||.2));
export function toGamePoint(p,t){const s=trackScale(t);return [(p.x-500)*s,Number(p.elevation)||0,(p.y-370)*s];}
export function toEditorPoint(p,t){const s=trackScale(t);return {x:p[0]/s+500,y:p[2]/s+370,elevation:p[1]};}
export function gameDirection(angle=0){const forward=[Math.cos(angle),0,Math.sin(angle)],left=[forward[2],0,-forward[0]];return {forward,left};}
