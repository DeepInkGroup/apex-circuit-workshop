import test from 'node:test';
import assert from 'node:assert/strict';
import {buildGeometry,pointOnTrack,closestOnTrack,LapTracker,stepVehicle,METERS_PER_UNIT} from '../dist/engine.js';
const square=[{x:100,y:100},{x:900,y:100},{x:900,y:600},{x:100,y:600}];
test('closed geometry has consistent length, units, and a wrapping start line',()=>{
  const g=buildGeometry(square,false);
  assert.ok(Math.abs(g.length-2600)<1e-8);
  assert.equal(g.length*METERS_PER_UNIT,520);
  assert.deepEqual(pointOnTrack(g,0),pointOnTrack(g,1));
  const q=closestOnTrack(g,{x:500,y:110});
  assert.equal(q.distance,10);
  assert.ok(Math.abs(q.progress-400/2600)<1e-8);
});
test('spline samples remain finite even with coincident control points',()=>{
  const g=buildGeometry([square[0],square[0],square[1],square[2]],true);
  assert.ok(g.samples.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  assert.ok(Number.isFinite(pointOnTrack(g,.5).angle));
  assert.equal(closestOnTrack(buildGeometry([],true),{x:0,y:0}).distance,Infinity);
});
function runLap(tracker,offroad=false){let result=null;for(let i=2;i<=101;i++)result=tracker.update((i/100)%1,!offroad,1/60)||result;return result;}
test('full forward lap crosses all gates and resets for the next lap',()=>{
  const tracker=new LapTracker();
  assert.deepEqual(runLap(tracker),{valid:true,reason:''});
  assert.equal(tracker.checkpoint,1);
  assert.deepEqual(runLap(tracker),{valid:true,reason:''});
});
test('crossing the start line backwards cannot finish a lap',()=>{
  const tracker=new LapTracker();
  assert.equal(tracker.update(.99,true,1/60),null);
  assert.equal(tracker.checkpoint,1);
});
test('offroad laps and shortcuts cannot set a valid record',()=>{
  assert.deepEqual(runLap(new LapTracker(),true),{valid:false,reason:'Off track'});
  const tracker=new LapTracker();tracker.update(.4,true,1/60);
  assert.equal(tracker.invalidReason,'Missed checkpoint');
  assert.equal(tracker.checkpoint,4);
});
const v={max:240,accel:84,brake:165,steer:2.5,grip:.86};
const initial=()=>({x:500,y:350,angle:0,speed:0,vx:0,vy:0});
test('road speed stays bounded and offroad friction slows the vehicle',()=>{
  const road=initial(),grass=initial();
  for(let i=0;i<60;i++){stepVehicle(road,v,{throttle:true,steer:0},true,1/60);stepVehicle(grass,v,{throttle:true,steer:0},false,1/60);}
  assert.ok(road.speed>grass.speed*1.5);
  assert.ok(road.speed<=v.max);
  assert.ok(Object.values(road).every(Number.isFinite));
});
test('fixed-step braking, reversing and simultaneous pedals stay stable',()=>{
  const car=initial();
  for(let i=0;i<120;i++)stepVehicle(car,v,{brake:true,steer:1},true,1/60);
  assert.ok(car.speed<0);assert.ok(car.speed>=-v.max*.25);
  const stopped=initial();stepVehicle(stopped,v,{throttle:true,brake:true,steer:0},true,1/60);
  assert.equal(stopped.speed,0);
});
