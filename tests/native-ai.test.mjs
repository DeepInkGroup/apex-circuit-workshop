import test from 'node:test';
import assert from 'node:assert/strict';
import {pavementSampler} from '../dist/pavement-sampler.js';
import {pavementAi,AI_RAYCAST_CLEARANCE,validateNativeScene} from '../dist/native-ai.js';
import {writeAi} from '../dist/ac-export.js';

const quad=[{x:450,y:320,elevation:4},{x:550,y:320,elevation:6},{x:550,y:420,elevation:6},{x:450,y:420,elevation:4}];
const frames=[-25,0,25].map(x=>({pos:[x,5,x*.5],forward:[1,0,0],left:[0,0,-1],bank:0}));
test('AI is projected above collision triangles with real normals and 3D tangents',()=>{
 const surface=pavementSampler([quad],1),ai=pavementAi(frames,surface,1,'Fast lane',false);
 for(const f of ai){const floor=4+(f.pos[0]+50)*.02;assert.ok(Math.abs(f.pos[1]-floor-AI_RAYCAST_CLEARANCE)<1e-5);assert.ok(f.normal[1]>.99);assert.ok(f.normal[0]<0);assert.ok(f.forward[1]>0);assert.ok(Math.abs(Math.hypot(...f.forward)-1)<1e-6);}
 assert.ok(writeAi(ai,12,false).length>0);
});
test('AI refuses unsupported points and removes float32 duplicate seams',()=>{
 const surface=pavementSampler([quad],1);
 assert.throws(()=>pavementAi([{...frames[0],pos:[500,5,500]},...frames],surface,1,'Fast lane'),/no collision pavement/);
 const ai=pavementAi([frames[0],frames[0],...frames.slice(1),frames[0]],surface,1,'Fast lane');assert.equal(ai.length,3);
 assert.throws(()=>writeAi([frames[0],frames[0],frames[1]],12),/duplicate consecutive/);
 assert.throws(()=>writeAi(frames,0),/positive width/);
 const narrow=pavementSampler([[{x:475,y:369.8,elevation:5},{x:525,y:369.8,elevation:5},{x:525,y:370.2,elevation:5},{x:475,y:370.2,elevation:5}]],1);
 const centerFrames=[-20,0,20].map(x=>({...frames[0],pos:[x,5,0]}));assert.throws(()=>pavementAi(centerFrames,narrow,1,'Fast lane',false),/unsupported normal probe/);
});
test('native surface names match one key and mesh indices cannot be malformed',()=>{
 const vertex=pos=>({pos,normal:[0,1,0],uv:[0,0],tangent:[1,0,0]}),mesh={name:'1ROAD_SERVICE_MERGE',vertices:[[0,0,0],[0,0,1],[1,0,0]].map(vertex),indices:[0,1,2]},scene={meshes:[mesh],dummies:[],pitCount:0};
 assert.equal(validateNativeScene(scene),true);
 assert.throws(()=>validateNativeScene({...scene,meshes:[{...mesh,name:'1ROAD_PIT_MERGE'}]}),/exactly one surface/);
 assert.throws(()=>validateNativeScene({...scene,meshes:[{...mesh,name:'1WALL_PIT_OUTER'}]}),/exactly one surface/);
 assert.throws(()=>validateNativeScene({...scene,meshes:[{...mesh,indices:[0,1,3]}]}),/Invalid native mesh indices/);
});
