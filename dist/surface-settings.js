import {clamp} from './engine.js?v=20261010-smooth-grid';

export const SURFACE_FIELDS={
 roadGrip:{label:'Road grip',min:.8,max:1.2,step:.01,value:1},
 kerbGrip:{label:'Flat kerb grip',min:.6,max:1.2,step:.01,value:.96},
 pitGrip:{label:'Pit lane grip',min:.7,max:1.1,step:.01,value:.95},
 grassGrip:{label:'Grass grip',min:.3,max:.9,step:.01,value:.65},
 grassDrag:{label:'Grass drag',min:0,max:.05,step:.005,value:.02},
 grassDirt:{label:'Grass dirt pickup',min:0,max:1,step:.05,value:.5}
};
export const SURFACE_PRESETS={
 club:{label:'Club circuit',description:'Balanced asphalt with slightly less grip on paint and pit pavement.',values:{roadGrip:1,kerbGrip:.96,pitGrip:.95,grassGrip:.65,grassDrag:.02,grassDirt:.5}},
 high:{label:'High grip',description:'More asphalt traction with a mild difference at the kerbs.',values:{roadGrip:1.08,kerbGrip:1,pitGrip:.98,grassGrip:.7,grassDrag:.01,grassDirt:.4}},
 low:{label:'Low grip practice',description:'Reduced surface friction for practicing gentle steering and throttle.',values:{roadGrip:.88,kerbGrip:.8,pitGrip:.85,grassGrip:.45,grassDrag:.03,grassDirt:.8}}
};
export function surfaceSettings(options={}){options||={};return Object.fromEntries(Object.entries(SURFACE_FIELDS).map(([key,field])=>[key,clamp(Number.isFinite(Number(options[key]))&&options[key]!=null?Number(options[key]):field.value,field.min,field.max)]));}
export function surfaceRecord(key,valid,pit,options={}){
 const settings=surfaceSettings(options),grip={ROAD:settings.roadGrip,KERB:settings.kerbGrip,PIT:settings.pitGrip,GRASS:settings.grassGrip}[key]??1;
 // Flat kerbs have no sinusoidal displacement or additional wheel vibration.
 return `KEY=${key}\nFRICTION=${grip}\nDAMPING=${key==='GRASS'?settings.grassDrag:0}\nWAV=\nWAV_PITCH=0\nFF_EFFECT=NULL\nDIRT_ADDITIVE=${key==='GRASS'?settings.grassDirt:valid?0:1}\nIS_VALID_TRACK=${valid?1:0}\nBLACK_FLAG_TIME=0\nSIN_HEIGHT=0\nSIN_LENGTH=0\nIS_PITLANE=${pit?1:0}\nVIBRATION_GAIN=0\nVIBRATION_LENGTH=0\n`;
}
