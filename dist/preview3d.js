import {createScene} from './ac-export.js';
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
    this.canvas=canvas;this.gl=canvas.getContext('webgl',{antialias:true,alpha:false});this.buffers=[];this.yaw=.7;this.pitch=.8;this.zoom=1;this.drag=null;
    if(!this.gl)return;
    const gl=this.gl,program=gl.createProgram();
    const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
    gl.attachShader(program,shader(gl.VERTEX_SHADER,'attribute vec3 aPos; attribute vec3 aNormal; uniform mat4 uMatrix; varying float vLight; void main(){gl_Position=uMatrix*vec4(aPos,1.0);vLight=.52+.48*max(dot(normalize(aNormal),normalize(vec3(.3,1.0,.4))),0.0);}'));
    gl.attachShader(program,shader(gl.FRAGMENT_SHADER,'precision mediump float; uniform vec3 uColor; varying float vLight; void main(){gl_FragColor=vec4(uColor*vLight,1.0);}'));
    gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));this.program=program;this.pos=gl.getAttribLocation(program,'aPos');this.normal=gl.getAttribLocation(program,'aNormal');this.matrix=gl.getUniformLocation(program,'uMatrix');this.color=gl.getUniformLocation(program,'uColor');
    canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);this.drag={x:e.clientX,y:e.clientY};});
    canvas.addEventListener('pointermove',e=>{if(!this.drag)return;this.yaw+=(e.clientX-this.drag.x)*.008;this.pitch=Math.max(.15,Math.min(1.45,this.pitch+(e.clientY-this.drag.y)*.006));this.drag={x:e.clientX,y:e.clientY};this.draw();});
    ['pointerup','pointercancel'].forEach(name=>canvas.addEventListener(name,()=>this.drag=null));
    canvas.addEventListener('wheel',e=>{e.preventDefault();this.zoom=Math.max(.3,Math.min(3,this.zoom*(e.deltaY>0?1.1:.9)));this.draw();},{passive:false});
    new ResizeObserver(()=>this.draw()).observe(canvas);
  }
  load(track){
    if(!this.gl)return false;
    const scene=createScene(track),gl=this.gl;
    this.buffers.forEach(b=>{gl.deleteBuffer(b.vertices);gl.deleteBuffer(b.indices);});this.buffers=[];
    const all=scene.frames.map(f=>f.pos),min=[0,1,2].map(i=>Math.min(...all.map(p=>p[i]))),max=[0,1,2].map(i=>Math.max(...all.map(p=>p[i])));this.target=min.map((n,i)=>(n+max[i])/2);this.radius=Math.max(20,Math.hypot(...max.map((n,i)=>n-min[i]))*.72);
    scene.meshes.forEach(m=>{const vertices=gl.createBuffer(),indices=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertices);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(m.vertices.flatMap(v=>[...v.pos,...v.normal])),gl.STATIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(m.indices),gl.STATIC_DRAW);this.buffers.push({vertices,indices,count:m.indices.length,color:scene.materials[m.material].color.map(c=>c/255)});});this.draw();return true;
  }
  draw(){
    if(!this.gl||!this.target||this.canvas.hidden)return;
    const gl=this.gl,r=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(!r.width||!r.height)return;
    this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(.79,.83,.77,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.useProgram(this.program);
    const distance=this.radius*this.zoom,eye=[this.target[0]+Math.cos(this.yaw)*Math.cos(this.pitch)*distance,this.target[1]+Math.sin(this.pitch)*distance,this.target[2]+Math.sin(this.yaw)*Math.cos(this.pitch)*distance];gl.uniformMatrix4fv(this.matrix,false,new Float32Array(matrix(eye,this.target,r.width/r.height)));
    this.buffers.forEach(b=>{gl.bindBuffer(gl.ARRAY_BUFFER,b.vertices);gl.enableVertexAttribArray(this.pos);gl.vertexAttribPointer(this.pos,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(this.normal);gl.vertexAttribPointer(this.normal,3,gl.FLOAT,false,24,12);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,b.indices);gl.uniform3fv(this.color,b.color);gl.drawElements(gl.TRIANGLES,b.count,gl.UNSIGNED_SHORT,0);});
  }
}
