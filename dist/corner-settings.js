import {clamp} from './engine.js?v=20261008-boards';
export const KERB_MODES={inherit:'Use circuit setting',both:'Both sides',left:'Left side',right:'Right side',off:'No kerbs'};
export function cornerSettings(point={}){return {rounding:clamp(Number.isFinite(point.rounding)?point.rounding:1,0,1),entryStrength:clamp(Number.isFinite(point.entryStrength)?point.entryStrength:1,0,1.6),exitStrength:clamp(Number.isFinite(point.exitStrength)?point.exitStrength:1,0,1.6),cornerName:String(point.cornerName||'').slice(0,40),kerbs:KERB_MODES[point.kerbs]?point.kerbs:'inherit',kerbWidth:clamp(Number(point.kerbWidth)||.7,.25,2)};}
export function kerbSides(mode){return mode==='off'?[]:mode==='left'?[1]:mode==='right'?[-1]:[-1,1];}
