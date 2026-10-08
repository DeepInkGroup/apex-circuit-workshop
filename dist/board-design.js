// One poster design for canvas cards, WebGL textures and native DDS exports.
export function boardSettings(track){const o=track.export||{},large=o.distanceBoardSize==='large';return {style:o.distanceBoardStyle==='contrast'?'contrast':'classic',size:large?'large':'standard',width:large?1.5:1.2,height:large?1.85:1.5,setback:Math.max(1,Math.min(8,Number(o.distanceBoardSetback)||1.8))};}
export const BOARD_COLORS={paper:[242,242,224],ink:[24,36,35],far:[211,159,49],near:[220,102,55],contrast:[17,29,36],light:[250,249,233]};
const LETTERS={M:['10001','11011','10101','10101','10001','10001','10001'],E:['11111','10000','10000','11110','10000','10000','11111'],T:['11111','00100','00100','00100','00100','00100','00100'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],U:['10001','10001','10001','10001','10001','10001','01110'],N:['10001','11001','11001','10101','10011','10011','10001']};
// Condensed numeral outlines with chamfered curves and consistent strokes.
const DIGITS={
 '1':[[.08,.2],[.42,0],[.72,0],[.72,.82],[.98,.82],[.98,1],[.12,1],[.12,.82],[.44,.82],[.44,.25],[.08,.44]],
 '0':[[.22,0],[.78,0],[1,.18],[1,.82],[.78,1],[.22,1],[0,.82],[0,.18]],
 '5':[[.08,0],[.96,0],[.96,.19],[.3,.19],[.28,.38],[.69,.38],[.91,.5],[1,.69],[1,.81],[.85,.97],[.69,1],[.2,1],[.02,.84],[.2,.67],[.32,.81],[.65,.81],[.76,.72],[.7,.59],[.59,.56],[.03,.56]]
};
const ZERO_HOLE=[[.33,.2],[.67,.2],[.75,.28],[.75,.72],[.67,.8],[.33,.8],[.25,.72],[.25,.28]];
function inside(x,y,poly){let value=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])value=!value;}return value;}
export function boardPixels(board,size){
 const pixels=new Uint8Array(size*size*3),palette=BOARD_COLORS,background=board.style==='contrast'?palette.contrast:palette.paper,ink=board.style==='contrast'?palette.light:palette.ink,accent=board.distance===5?palette.near:palette.far;
 const blend=(x,y,color,alpha=1)=>{const offset=(y*size+x)*3;for(let k=0;k<3;k++)pixels[offset+k]=Math.round(pixels[offset+k]*(1-alpha)+color[k]*alpha);};
 const rect=(x,y,w,h,color)=>{for(let row=Math.max(0,Math.floor(y*size));row<Math.min(size,Math.ceil((y+h)*size));row++)for(let col=Math.max(0,Math.floor(x*size));col<Math.min(size,Math.ceil((x+w)*size));col++)blend(col,row,color);};
 const polygon=(points,color)=>{const minX=Math.max(0,Math.floor(Math.min(...points.map(p=>p[0]))*size)),maxX=Math.min(size,Math.ceil(Math.max(...points.map(p=>p[0]))*size)),minY=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1]))*size)),maxY=Math.min(size,Math.ceil(Math.max(...points.map(p=>p[1]))*size));for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++){let hits=0;for(const dy of [.25,.75])for(const dx of [.25,.75])if(inside((x+dx)/size,(y+dy)/size,points))hits++;if(hits)blend(x,y,color,hits/4);}};
 const text=(value,x,y,width,height,color)=>{const cellX=width/(value.length*6-1),cellY=height/7;[...value].forEach((char,i)=>LETTERS[char]?.forEach((row,j)=>[...row].forEach((bit,k)=>{if(bit==='1')rect(x+(i*6+k)*cellX,y+j*cellY,cellX*.92,cellY*.92,color);})) );};
 rect(0,0,1,1,palette.ink);rect(.025,.02,.95,.96,background);rect(.025,.02,.95,.12,accent);rect(.025,.81,.95,.17,palette.ink);
 // Two bars at 10 m, one at 5 m: readable without relying on accent color.
 const bars=board.distance===10?2:1;for(let i=0;i<bars;i++)rect(.48+(i-(bars-1)/2)*.14,.044,.07,.07,palette.ink);
 const digits=String(board.distance),gap=.045,width=digits.length===1?.51:.72,letterWidth=(width-gap*(digits.length-1))/digits.length,x0=(1-width)/2;
 [...digits].forEach((char,i)=>{const x=x0+i*(letterWidth+gap),map=outline=>outline.map(([u,v])=>[x+u*letterWidth,.2+v*.46]);polygon(map(DIGITS[char]),ink);if(char==='0')polygon(map(ZERO_HOLE),background);});
 text('METRES',.24,.707,.52,.055,ink);text('TURN',.43,.865,.38,.055,palette.light);
 const arrow=[[.13,.882],[.24,.835],[.24,.858],[.35,.858],[.35,.905],[.24,.905],[.24,.93]];
 polygon(board.direction==='right'?arrow.map(([x,y])=>[.48-x,y]):arrow,palette.light);
 return pixels;
}
const cards=new Map();
export function boardCard(board){
 const key=`${board.style}/${board.distance}/${board.direction}`;if(cards.has(key))return cards.get(key);
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),data=ctx.createImageData(256,256),pixels=boardPixels(board,256);for(let i=0;i<256*256;i++){data.data.set(pixels.subarray(i*3,i*3+3),i*4);data.data[i*4+3]=255;}ctx.putImageData(data,0,0);cards.set(key,canvas);return canvas;
}
