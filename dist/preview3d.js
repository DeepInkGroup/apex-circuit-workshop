import {createScene} from './ac-export.js?v=20261008-identity';
import {surfacePixels} from './textures.js?v=20261008-identity';
const normalize=v=>{const l=Math.hypot(...v)||1;return v.map(n=>n/l);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
function matrix(eye,target,aspect){
  const z=normalize(eye.map((n,i)=>n-target[i])),x=normalize(cross([0,1,0],z)),y=cross(z,x);
  const view=[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];
  const f=1/Math.tan(Math.PI/8),near=.1,far=200000,p=[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0],out=[];
  for(let c=0;c<4;c++)for(let r=0;r<4;r++){let n=0;for(let k=0;k<4;k++)n+=p[k*4+r]*view[c*4+k];out.push(n);}return out;
}
export class TrackPreview {
  constructor(canvas){
    this.canvas=canvas;this.gl=canvas.getContext('webgl',{antialias:true,alpha:false});this.buffers=[];this.textures=[];this.yaw=Math.PI/2;this.pitch=.8;this.zoom=1;this.drag=null;
    if(!this.gl)return;
    const gl=this.gl,program=gl.createProgram();
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec3 aPos; attribute vec3 aNormal; attribute vec2 aUv; varying vec2 vUv; uniform mat4 uMatrix; varying float vLight; varying vec3 vPos; varying float vDepth; void main(){gl_Position=uMatrix*vec4(aPos,1.0);vDepth=gl_Position.w;vPos=aPos;vUv=aUv;vLight=.52+.48*max(dot(normalize(aNormal),normalize(vec3(.3,1.0,.4))),0.0);}'));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float; uniform sampler2D uTexture; varying vec2 vUv; uniform vec3 uTint; uniform float uAmbient; uniform vec3 uFogColor; uniform float uFogAmount; uniform float uFogDistance; uniform float uWet; varying float vLight; varying vec3 vPos; varying float vDepth; void main(){vec3 color=texture2D(uTexture,vUv).rgb*vLight*uAmbient*uTint;float shine=pow(max(0.0,sin(vPos.x*.15+vPos.z*.09)),12.0)*uWet;color=mix(color,uFogColor,shine*.12);float fog=clamp((vDepth-uFogDistance*.3)/uFogDistance,0.0,1.0)*uFogAmount;gl_FragColor=vec4(mix(color,uFogColor,fog),1.0);}'));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));this.program=program;this.pos=gl.getAttribLocation(program,'aPos');this.normal=gl.getAttribLocation(program,'aNormal');this.matrix=gl.getUniformLocation(program,'uMatrix');this.uv=gl.getAttribLocation(program,'aUv');this.sampler=gl.getUniformLocation(program,'uTexture');
    this.environment={};for(const name of ['uTint','uAmbient','uFogColor','uFogAmount','uFogDistance','uWet'])this.environment[name]=gl.getUniformLocation(program,name);
    canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);this.drag={x:e.clientX,y:e.clientY};});
    canvas.addEventListener('pointermove',e=>{if(!this.drag)return;this.yaw+=(e.clientX-this.drag.x)*.008;this.pitch=Math.max(.15,Math.min(1.45,this.pitch+(e.clientY-this.drag.y)*.006));this.drag={x:e.clientX,y:e.clientY};this.draw();});
    ['pointerup','pointercancel'].forEach(name=>canvas.addEventListener(name,()=>this.drag=null));
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.3,Math.min(3,this.zoom*(e.deltaY>0?1.1:.9)));this.draw();},{passive:false});
    new ResizeObserver(()=>this.draw()).observe(canvas);
  }
  load(track){
    if(!this.gl)return false;
    const scene=createScene(track),gl=this.gl;
    this.buffers.forEach(b=>{gl.deleteBuffer(b.vertices);gl.deleteBuffer(b.indices);});this.buffers=[];this.textures.forEach(t=>gl.deleteTexture(t));this.textures=scene.materials.map(m=>{const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,256,256,0,gl.RGB,gl.UNSIGNED_BYTE,surfacePixels(m,256));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.generateMipmap(gl.TEXTURE_2D);return texture;});
    this.weather=scene.weather;this.rain=track.weather==='rain';
    const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],include=p=>{for(let i=0;i<3;i++){min[i]=Math.min(min[i],p[i]);max[i]=Math.max(max[i],p[i]);}};
    scene.frames.forEach(f=>include(f.pos));for(const m of scene.meshes)if(/^(1ROAD|1PIT|1WALL_BUILDING|1WALL_START_FINISH|SCENERY_TREE|SCENERY_TURN_DISTANCE)/.test(m.name))for(const v of m.vertices)include(v.pos);
    this.target=min.map((n,i)=>(n+max[i])/2);this.radius=Math.max(20,Math.hypot(...max.map((n,i)=>n-min[i]))*.72);
    scene.meshes.forEach(m=>{const vertices=gl.createBuffer(),indices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(m.vertices.flatMap(v=>[...v.pos,...v.normal,...v.uv])),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(m.indices),gl.STATIC_DRAW);this.buffers.push({vertices,indices,count:m.indices.length,texture:this.textures[m.material],wet:[0,5].includes(m.material)});});this.draw();return true;
  }
  setView(top=false){this.yaw=Math.PI/2;this.pitch=top?Math.PI/2-.01:.8;this.zoom=1;this.draw();}
  draw(){
    if(!this.gl||!this.target||this.canvas.hidden)return;
    const gl=this.gl,r=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(!r.width||!r.height)return;
    this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(...this.weather.sky,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(this.program);
    gl.uniform3fv(this.environment.uTint,this.weather.tint);gl.uniform1f(this.environment.uAmbient,this.weather.ambient);gl.uniform3fv(this.environment.uFogColor,this.weather.sky);gl.uniform1f(this.environment.uFogAmount,this.weather.fog);gl.uniform1f(this.environment.uFogDistance,this.radius*this.zoom);
    const distance=this.radius*this.zoom,eye=[this.target[0]+Math.cos(this.yaw)*Math.cos(this.pitch)*distance,this.target[1]+Math.sin(this.pitch)*distance,this.target[2]+Math.sin(this.yaw)*Math.cos(this.pitch)*distance];gl.uniformMatrix4fv(this.matrix,false,new Float32Array(matrix(eye,this.target,r.width/r.height)));
    this.buffers.forEach(b=>{gl.bindBuffer(gl.ARRAY_BUFFER,b.vertices);gl.enableVertexAttribArray(this.pos);gl.vertexAttribPointer(this.pos,3,gl.FLOAT,false,32,0);gl.enableVertexAttribArray(this.normal);gl.vertexAttribPointer(this.normal,3,gl.FLOAT,false,32,12);gl.enableVertexAttribArray(this.uv);gl.vertexAttribPointer(this.uv,2,gl.FLOAT,false,32,24);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b.indices);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,b.texture);gl.uniform1i(this.sampler,0);gl.uniform1f(this.environment.uWet,b.wet&&this.rain?1:0);gl.drawElements(gl.TRIANGLES,b.count,gl.UNSIGNED_SHORT,0);});
  }
}
