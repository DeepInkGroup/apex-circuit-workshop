import {DEFAULT_EXPORT,exportZip,validateExport,trackSlug} from './ac-export.js';
import {parseCoordinates,tilePlan} from './tracing.js';
import {buildGeometry} from './engine.js';

const $=s=>document.querySelector(s);
function dialog(id,content){const d=document.createElement('dialog');d.id=id;d.className='tracer-dialog';d.innerHTML=content;document.body.append(d);d.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>d.close());d.addEventListener('click',e=>{if(e.target!==d)return;const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();});return d;}
function header(eyebrow,title){return `<div class="dialog-top"><p class="eyebrow">${eyebrow}</p><button class="icon-button" data-close aria-label="Close">×</button></div><h2>${title}</h2>`;}
function png(canvas){return new Promise((resolve,reject)=>canvas.toBlob(async b=>b?resolve(new Uint8Array(await b.arrayBuffer())):reject(new Error('Preview image creation failed.')),'image/png'));}
export async function exportImages(track){
  const geometry=buildGeometry(track.points,track.smooth),s=track.scale||.2;
  const draw=(canvas,background,color,flip=false)=>{const ctx=canvas.getContext('2d');if(background){ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);}ctx.save();ctx.scale(canvas.width/1000,canvas.height/740);ctx.beginPath();geometry.samples.forEach((p,i)=>i?ctx.lineTo(p.x,flip?740-p.y:p.y):ctx.moveTo(p.x,flip?740-p.y:p.y));ctx.closePath();ctx.lineWidth=track.width/s;ctx.strokeStyle=color;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();ctx.restore();};
  const preview=document.createElement('canvas');preview.width=1000;preview.height=740;draw(preview,'#b7c2a0','#434e49');
  const ctx=preview.getContext('2d');ctx.fillStyle='#f7f5ec';ctx.fillRect(20,625,960,95);ctx.fillStyle='#29392e';ctx.font='bold 30px sans-serif';ctx.fillText(track.name.slice(0,40),42,669);ctx.font='16px sans-serif';ctx.fillStyle='#71826a';ctx.fillText(`${Math.round(geometry.length*s)} m · ${track.width} m wide · APEX / TRACER`,42,699);
  const outline=document.createElement('canvas');outline.width=1000;outline.height=740;draw(outline,null,'#ffffff');
  const map=document.createElement('canvas');map.width=1000;map.height=740;draw(map,null,'#ffffff',true);
  return {'ui/preview.png':await png(preview),'ui/outline.png':await png(outline),'map.png':await png(map)};
}

export function mountTracer(api){
  document.body.classList.add('tracer-app');
  $('.intro .eyebrow').innerHTML='<span class="orange-dash"></span> REAL PLACES. YOUR RACING LINE.';
  $('h1').innerHTML='Trace it. Build it. Race it<span>.</span>';
  $('.intro-copy').textContent='Trace a circuit over a map. Build the geometry. Take it into Assetto Corsa.';
  $('.version').textContent='V.2.0';$('.intro-aside').innerHTML='<button class="locate-button" id="locate-circuit">↗ Locate your circuit</button><span class="version">V.2.0 / KN5</span>';
  $('.brand-caption').textContent='TRACK TRACER';$('#studio-link').textContent='Trace studio';$('#build-mode').innerHTML='✎ Trace';
  $('#help-dialog h2').textContent='Trace. Preview. Export.';
  $('#help-dialog .help-steps').innerHTML='<div><b>01</b><h3>Find your circuit</h3><p>Load satellite imagery with coordinates or upload a PNG, JPG, or WebP. Map scale is calculated automatically. For an image, use Calibrate and click two points with a known real distance.</p></div><div><b>02</b><h3>Trace the centerline</h3><p>Click out the road in order, then select Move to finish. Drag points, set width, and edit elevation or banking in the point inspector. Draw a pit lane or use the automatic one. Inspect everything in 3D.</p></div><div><b>03</b><h3>Export & install</h3><p>Choose pit boxes and mod details. Export to Assetto Corsa downloads a ZIP with native KN5 geometry. Drop it into Content Manager to install, or extract content/ into your game folder. Start with Practice.</p></div>';
  $('#help-dialog .help-note').textContent='Browser Drive is an arcade layout preview. The exported track needs an in-game compatibility check. Manual elevations are supported; terrain elevation is not fetched. Reference imagery stays out of the mod.';
  $('.below-studio .tip strong').textContent='A real circuit starts with a good reference.';
  $('.below-studio .workflow').innerHTML='<span><b>01</b> Trace</span><i>→</i><span><b>02</b> Inspect</span><i>→</i><span><b>03</b> Export</span>';
  const actions=$('.studio-actions'),exportButton=document.createElement('button');exportButton.id='ac-export-btn';exportButton.className='export-main';exportButton.innerHTML='<span>↓</span> Export to Assetto Corsa';actions.append(exportButton);
  const three=document.createElement('button');three.id='preview-mode';three.innerHTML='◇ 3D';$('#drive-mode').before(three);
  const preview=document.createElement('canvas');preview.id='preview-canvas';preview.hidden=true;preview.setAttribute('aria-label','3D track preview. Drag to orbit, mouse wheel to zoom.');$('#track-canvas').after(preview);
  const attribution=document.createElement('a');attribution.id='map-attribution';attribution.href='https://www.esri.com/en-us/arcgis/products/arcgis-basemaps/overview';attribution.target='_blank';attribution.rel='noopener';attribution.textContent='Imagery © Esri & contributors';attribution.hidden=true;$('#canvas-wrap').append(attribution);
  const tool=document.createElement('button');tool.className='tool';tool.dataset.tool='measure';tool.title='Calibrate scale';tool.setAttribute('aria-label','Calibrate scale');tool.innerHTML='<span class="tracer-tool-icon">↔</span>';$('#editor-tools').append(tool);
  const pitTool=document.createElement('button');pitTool.className='tool';pitTool.dataset.tool='pit';pitTool.title='Draw pit lane';pitTool.setAttribute('aria-label','Draw pit lane');pitTool.innerHTML='<span class="tracer-tool-icon">PIT</span>';$('#editor-tools').append(pitTool);
  const panel=document.createElement('div');panel.className='tracer-panel';panel.innerHTML=`
    <div class="panel-section reference-section"><div class="section-heading"><span class="section-num">01</span><h2>Reference & scale</h2><span class="panel-tag">TRACE</span></div>
      <div class="reference-buttons"><button id="open-map" class="map-button">◎ Satellite map</button><button id="image-upload-btn">↥ Upload image</button></div>
      <input id="reference-file" type="file" accept="image/png,image/jpeg,image/webp" hidden>
      <div id="reference-summary" class="reference-summary">Start with a satellite location or your own reference image.</div>
      <div class="field-row"><label>Scale <span class="field-unit">m / px</span><input id="track-scale" type="number" min=".02" max="10" step=".01" value=".2"></label><button id="calibrate-btn" class="outline-button">↔ Calibrate</button></div>
      <label class="compact-range">Image opacity<input type="range" id="reference-opacity" min="0" max="1" step=".05" value=".75"></label>
      <label class="toggle-row"><span>Trace through road overlay</span><input type="checkbox" id="trace-overlay" checked><span class="toggle"></span></label>
      <div class="reference-footer"><button id="clear-reference">Remove reference</button><span id="scale-source">Manual scale</span></div>
    </div>
    <div class="panel-section point-section"><div class="section-heading"><span class="section-num">↳</span><h2 id="point-heading">Point inspector</h2></div>
      <p id="point-empty">Select a road point to edit its height and banking.</p><div id="point-controls" hidden><div class="field-row"><label>Elevation <span class="field-unit">m</span><input id="point-height" type="number" min="-100" max="500" step=".1" value="0"></label><label>Banking <span class="field-unit">°</span><input id="point-bank" type="number" min="-15" max="15" step=".5" value="0"></label></div><p class="field-hint">Heights and banking carry into the exported 3D road.</p></div>
    </div>
    <details class="panel-section export-settings" open><summary><span class="section-num">04</span> Assetto Corsa setup <span class="panel-tag">MOD</span></summary><div class="details-body">
      <div class="field-row"><label>Creator<input id="export-author" maxlength="60" value="APEX creator"></label><label>Pit boxes<input id="export-pits" type="number" min="1" max="16" value="8"></label></div>
      <div class="field-row"><label>Country<input id="export-country" maxlength="60" value="Unknown"></label><label>City / circuit<input id="export-city" maxlength="60"></label></div>
      <label class="toggle-row"><span>Generate kerbs</span><input type="checkbox" id="export-kerbs" checked><span class="toggle"></span></label>
      <label class="toggle-row"><span>Boundary barriers</span><input type="checkbox" id="export-barriers" checked><span class="toggle"></span></label>
      <label class="toggle-row"><span>Centerline AI & pit AI</span><input type="checkbox" id="export-ai" checked><span class="toggle"></span></label>
      <div class="pit-tools"><button id="draw-pit" class="outline-button">✎ Draw pit lane</button><button id="clear-pit">Use automatic pit</button></div>
      <p class="field-hint">Draw an open pit path with at least 2 points. Keep space for pit boxes, then inspect it in 3D.</p>
    </div></details>`;
  const settings=$('.settings-panel');settings.prepend(panel);settings.append(panel.querySelector('.export-settings'));
  const locate=dialog('map-dialog',`${header('01 / FIND YOUR CIRCUIT','Bring your circuit into view.')}<p class="dialog-description">Enter coordinates or paste a Google Maps URL containing coordinates. Satellite tiles load directly from Esri.</p><label class="big-field">Latitude, longitude<input id="map-coordinates" placeholder="50.586079, 8.812544" value="50.586079, 8.812544"></label><div class="field-row"><label>Imagery zoom<select id="map-zoom"><option value="14">14 — region</option><option value="15">15 — long circuit</option><option value="16">16 — full-size circuit</option><option value="17">17 — wider area</option><option value="18" selected>18 — circuit</option><option value="19">19 — close detail</option><option value="20">20 — small kart circuit</option></select></label><label class="inline-check"><input type="checkbox" id="map-new-trace" checked> Start a fresh trace</label></div><p class="field-hint">Real-world scale is calculated from latitude and zoom. Satellite availability varies by location.</p><p class="form-error" id="map-error" role="status"></p><div class="dialog-actions"><button data-close class="subtle-button">Cancel</button><button id="load-map" class="primary-button">Load satellite & trace ↗</button></div>`);
  const calibrate=dialog('calibrate-dialog',`${header('02 / SET REAL-WORLD SCALE','Two points. One real distance.')}<p class="dialog-description">The line you measured is <strong id="measured-pixels"></strong> reference pixels. Enter its real distance to scale the whole track.</p><label class="big-field">Known distance in meters<input type="number" id="known-distance" min="1" max="10000" value="100"></label><p id="calibrate-error" class="form-error" role="status"></p><div class="dialog-actions"><button data-close class="subtle-button">Cancel</button><button id="apply-scale" class="primary-button">Apply scale ↗</button></div>`);
  const exporter=dialog('export-dialog',`${header('04 / FROM TRACE TO TRACK','Your track. In Assetto Corsa.')}<div class="export-card"><div><span class="panel-tag">NATIVE KN5</span><h3 id="export-track-title"></h3><p id="export-track-details"></p></div><span class="export-zip-icon">ZIP<br><small>↓</small></span></div><div id="export-report"></div><div class="export-file-list"><span>✓ Road mesh + embedded textures</span><span>✓ Start grid + pit spawns + timing gates</span><span>✓ Surfaces + track metadata + previews</span><span id="ai-included">✓ Centerline AI + pit lane</span></div><p class="install-instruction"><b>Install with Content Manager</b><br>Drop the downloaded ZIP into Content Manager. Install the track, then start with a single-car Practice session. You can also extract <code>content/</code> into your Assetto Corsa installation.</p><p class="field-hint">Generated mod prototype. Binary and geometry checks are automated; compatibility and AI behavior still need an in-game check. Manual elevation is supported; real terrain elevation is not fetched.</p><div class="dialog-actions"><button id="export-inspect" class="subtle-button">Inspect in 3D</button><button id="download-ac" class="primary-button">↓ Download track ZIP</button></div><p id="export-error" class="form-error" role="status"></p>`);
  function stopForDialog(){api.stopDrive();}
  const openMap=()=>{stopForDialog();$('#map-error').textContent='';locate.showModal();};$('#open-map').onclick=openMap;$('#locate-circuit').onclick=openMap;
  $('#load-map').onclick=async()=>{
    const button=$('#load-map');$('#map-error').textContent='';
    try{const {lat,lon}=parseCoordinates($('#map-coordinates').value),zoom=Number($('#map-zoom').value),desc={type:'map',lat,lon,zoom};button.disabled=true;button.textContent='Loading satellite…';const image=await api.reference.map(desc);api.reference.cache.set(api.reference.key(desc),image);locate.close();api.setReference(desc,tilePlan(lat,lon,zoom).scale,$('#map-new-trace').checked);api.toast('Satellite loaded. Click out the circuit centerline.');}
    catch(error){$('#map-error').textContent=error.message;}finally{button.disabled=false;button.textContent='Load satellite & trace ↗';}
  };
  $('#image-upload-btn').onclick=()=>$('#reference-file').click();$('#reference-file').onchange=async()=>{const file=$('#reference-file').files[0];if(!file)return;try{stopForDialog();const desc=await api.reference.addFile(file);api.setReference(desc,api.getTrack().scale||.2,false);api.toast('Image loaded. Calibrate the scale, then trace the road.');}catch(error){api.toast(error.message);}finally{$('#reference-file').value='';}};
  $('#clear-reference').onclick=()=>api.updateTrack(t=>t.background=null);
  $('#track-scale').onchange=()=>{const n=Number($('#track-scale').value);if(n<.02||n>10||!Number.isFinite(n)){api.toast('Scale must be between 0.02 and 10 meters per pixel.');refresh();return;}api.updateTrack(t=>t.scale=n);};
  $('#reference-opacity').oninput=()=>api.setOpacity(Number($('#reference-opacity').value));$('#trace-overlay').onchange=()=>api.setTraceOverlay($('#trace-overlay').checked);
  $('#calibrate-btn').onclick=()=>{stopForDialog();api.setTool('measure');api.toast('Click two points whose real-world distance you know.');};
  $('#point-height').onchange=()=>editPoint('elevation',-100,500);$('#point-bank').onchange=()=>editPoint('bank',-15,15);
  function editPoint(property,min,max){const i=api.getSelected(),n=Number($(property==='elevation'?'#point-height':'#point-bank').value);if(i<0)return;if(!Number.isFinite(n)||n<min||n>max){api.toast(`Enter a value between ${min} and ${max}.`);refresh();return;}api.updateTrack(t=>t.points[i][property]=n);}
  const exportFields={author:'author',country:'country',city:'city',pits:'pitboxes',kerbs:'kerbs',barriers:'barriers',ai:'ai'};
  Object.entries(exportFields).forEach(([id,key])=>$('#export-'+id).onchange=()=>api.updateTrack(t=>{t.export={...DEFAULT_EXPORT,...t.export};const input=$('#export-'+id);t.export[key]=input.type==='checkbox'?input.checked:input.type==='number'?Math.max(1,Math.min(16,Number(input.value)||8)):input.value.slice(0,60);}));
  $('#draw-pit').onclick=()=>{stopForDialog();api.setTool('pit');api.toast('Click to draw an open pit lane. Select Move when finished.');};$('#clear-pit').onclick=()=>{api.updateTrack(t=>t.pit=[]);api.toast('Automatic pit lane restored.');};
  $('#preview-mode').onclick=()=>api.preview();
  function openExport(){
    stopForDialog();const track=api.getTrack(),report=validateExport(track);$('#export-track-title').textContent=track.name;$('#export-track-details').textContent=`${Math.round(report.length)} m · ${track.width} m wide · ${track.export?.pitboxes||8} pit boxes`;
    const reportEl=$('#export-report');reportEl.replaceChildren();[...report.errors.map(text=>({text,error:true})),...report.warnings.map(text=>({text,error:false}))].forEach(item=>{const p=document.createElement('p');p.className=item.error?'export-issue error':'export-issue';p.textContent=(item.error?'× ':'↳ ')+item.text;reportEl.append(p);});
    $('#download-ac').disabled=!!report.errors.length;$('#ai-included').hidden=track.export?.ai===false;$('#export-error').textContent='';exporter.showModal();
  }
  $('#ac-export-btn').onclick=openExport;$('#export-inspect').onclick=()=>{exporter.close();api.preview();};
  $('#download-ac').onclick=async()=>{
    const button=$('#download-ac');button.disabled=true;button.textContent='Building your track…';$('#export-error').textContent='';
    try{await new Promise(requestAnimationFrame);const track=api.getTrack(),result=exportZip(track,await exportImages(track)),url=URL.createObjectURL(new Blob([result.bytes],{type:'application/zip'})),a=document.createElement('a');a.href=url;a.download=`${result.slug}_assetto_corsa.zip`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);api.toast('Track ZIP downloaded. Drop it into Content Manager.');}
    catch(error){$('#export-error').textContent=error.message;}finally{button.disabled=false;button.textContent='↓ Download track ZIP';}
  };
  let measureDistance=0;
  $('#apply-scale').onclick=()=>{const known=Number($('#known-distance').value),scale=known/measureDistance;if(!Number.isFinite(scale)||scale<.02||scale>10){$('#calibrate-error').textContent='This distance produces a scale outside 0.02–10 m/px. Check your measurement.';return;}api.updateTrack(t=>t.scale=scale);calibrate.close();api.setTool('move');api.toast(`Scale calibrated: ${scale.toFixed(3)} meters per pixel.`);};
  function refresh(){
    const t=api.getTrack(),selected=api.getSelected(),options={...DEFAULT_EXPORT,...t.export};$('#track-scale').value=Number((t.scale||.2).toFixed(4));$('#reference-summary').textContent=t.background?.type==='map'?`${t.background.lat.toFixed(5)}, ${t.background.lon.toFixed(5)} · zoom ${t.background.zoom}`:t.background?.name||'Start with a satellite location or your own reference image.';$('#scale-source').textContent=t.background?.type==='map'?'Map scale / editable':'Manual scale';$('#map-attribution').hidden=t.background?.type!=='map';$('#clear-reference').disabled=!t.background;
    $('#point-controls').hidden=selected<0||!t.points[selected];$('#point-empty').hidden=selected>=0&&!!t.points[selected];$('#point-heading').textContent=selected>=0?`Control point ${String(selected+1).padStart(2,'0')}`:'Point inspector';
    if(t.points[selected]){$('#point-height').value=t.points[selected].elevation||0;$('#point-bank').value=t.points[selected].bank||0;}
    Object.entries(exportFields).forEach(([id,key])=>{const input=$('#export-'+id);if(input.type==='checkbox')input.checked=options[key];else input.value=options[key];});
    $('#ac-export-btn').disabled=t.points.length<3;
  }
  return {refresh,previewCanvas:preview,measure(distance){measureDistance=distance;$('#measured-pixels').textContent=distance.toFixed(1);$('#calibrate-error').textContent='';calibrate.showModal();}};
}
