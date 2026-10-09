import {buildGeometry} from './engine.js?v=20261009-ai-crash-fix';
import {readImage,saveImage} from './tracing.js?v=20261009-ai-crash-fix';
const SERVICE='https://apex-circuit-sharing.art-zomorodian.chatgpt.site';
const $=s=>document.querySelector(s);
const format=code=>code.slice(0,4)+' '+code.slice(4,9)+' '+code.slice(9);
const fingerprint=t=>JSON.stringify({...t,id:null,updatedAt:null});
async function request(path,options={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch(SERVICE+path,{...options,signal:controller.signal,credentials:'omit',cache:'no-store'});
    const data=await response.json().catch(()=>{throw new Error('Sharing service is unavailable. Please try again shortly.');});
    if(!response.ok)throw new Error(data.error||'Sharing could not finish.');return data;
  }catch(error){throw new Error(error.name==='AbortError'?'Sharing timed out. Check your connection and try again.':error instanceof TypeError?'Cannot reach sharing. Check your internet connection.':error.message);}
  finally{clearTimeout(timer);}
}
export function mountSharing(api){
  const panel=document.createElement('section');panel.className='panel-section sharing-panel';
  panel.innerHTML=`<div class="section-heading"><span class="section-num">LINK</span><h2>Share a circuit</h2><span class="scene-tag">14 DIGITS</span></div><p class="field-hint">Send your circuit to another person or open it on another device. No account needed.</p><div class="share-card"><h3>Create a code</h3><p>Upload a snapshot of your road, corners, pits, scenery, and mod settings.</p><label class="share-reference" hidden><input type="checkbox" id="share-image" checked> Include uploaded reference image</label><button id="create-share-code" class="complete-button">Create sharing code</button><div id="share-result" hidden><label class="studio-field">Your 14-digit code<input id="share-code-output" readonly spellcheck="false" aria-label="Your sharing code"></label><div class="share-copy-actions"><button id="copy-share-code" class="outline-button">Copy code</button><button id="copy-share-link" class="outline-button">Copy link</button></div><p id="share-snapshot-note" class="field-hint"></p></div><p class="share-public-note">Anyone with this code can open the snapshot. Create a new code after editing.</p></div><form id="load-share-form" class="share-card"><h3>Open someone’s circuit</h3><label class="studio-field">Paste a 14-digit code<input id="load-share-code" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="40" placeholder="0000 00000 00000" aria-describedby="share-input-note"></label><p id="share-input-note" class="field-hint">Spaces and dashes are accepted. Leading zeros are part of the code.</p><button id="find-share-code" class="outline-button" type="submit">Find circuit</button><div id="shared-preview" hidden><div id="shared-track-shape" class="shared-track-shape"></div><strong id="shared-track-name"></strong><p id="shared-track-info"></p><p id="shared-track-date" class="field-hint"></p><button id="open-shared-track" class="complete-button" type="button">Open & edit circuit</button></div></form><p id="share-status" class="share-status" role="status" aria-live="polite"></p>`;
  $('.settings-panel').append(panel);
  const top=document.createElement('button');top.id='share-circuit-btn';top.className='subtle-button';top.textContent='↗ Share';top.onclick=()=>api.showPanel('.sharing-panel');$('.studio-actions').insertBefore(top,$('#ac-export-btn'));
  let busy=false,shared=null,created=null,createdFingerprint='';
  function status(message,error=false){$('#share-status').textContent=message;$('#share-status').classList.toggle('error',error);}
  function setBusy(value){busy=value;panel.setAttribute('aria-busy',String(value));$('#find-share-code').disabled=value;$('#load-share-code').disabled=value;$('#open-shared-track').disabled=value;refresh();}
  async function copy(value,label){try{await navigator.clipboard.writeText(value);status(label+' copied.');api.toast(label+' copied.');}catch{const input=$('#share-code-output');input.value=value;input.focus();input.select();status('Clipboard unavailable. Copy the selected text with Ctrl+C or your browser’s Copy command.');}}
  $('#create-share-code').onclick=async()=>{
    if(busy)return;const track=api.validateTrack(structuredClone(api.getTrack()));
    if(!track||track.points.length<2){status('Draw at least two road points before sharing.',true);return;}
    setBusy(true);status('Uploading your circuit snapshot…');
    try{
      let image=null;if(track.background?.type==='image'){
        if($('#share-image').checked){image=await readImage(track.background.key);if(!image)throw new Error('Your reference image is missing. Uncheck Include uploaded reference image, or upload it again.');}
        else track.background=null;
      }
      const body=JSON.stringify({track,image});if(new TextEncoder().encode(body).length>3*1024*1024)throw new Error('Snapshot is over 3 MB. Share without the reference image.');
      const result=await request('/api/circuits',{method:'POST',headers:{'Content-Type':'application/json'},body});
      if(!/^\d{14}$/.test(result.code))throw new Error('The service returned an invalid code. Try again.');
      created=result;createdFingerprint=fingerprint(api.getTrack());$('#share-result').hidden=false;$('#share-code-output').value=format(result.code);status('Snapshot uploaded. Copy the code and send it to someone.');
      try{localStorage.setItem('apex-last-share',JSON.stringify({code:result.code,fingerprint:createdFingerprint}));}catch{}
    }catch(error){status(error.message,true);}finally{setBusy(false);}
  };
  $('#copy-share-code').onclick=()=>created&&copy(created.code,'Sharing code');
  $('#copy-share-link').onclick=()=>{if(created){const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('track',created.code);copy(url.href,'Circuit link');}};
  $('#load-share-code').oninput=()=>{$('#shared-preview').hidden=true;shared=null;status('');};
  $('#load-share-form').onsubmit=async e=>{
    e.preventDefault();if(busy)return;const code=$('#load-share-code').value.replace(/[\s-]/g,'');shared=null;$('#shared-preview').hidden=true;
    if(!/^\d{14}$/.test(code)){status('Enter exactly 14 digits. Check the code with its sender.',true);$('#load-share-code').focus();return;}
    $('#load-share-code').value=format(code);setBusy(true);status('Finding the circuit…');
    try{
      const data=await request('/api/circuits/'+code),track=api.validateTrack(data.track);
      if(data.schema!==1||data.code!==code||!track||track.points.length<2)throw new Error('This code contains an unsupported circuit.');
      if(data.image!=null&&(typeof data.image!=='string'||data.image.length>2800000||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data.image)))throw new Error('This circuit contains an invalid reference image.');
      shared={track,image:data.image};const g=buildGeometry(track.points,track.smooth,track.complete!==false,track);
      const shape=$('#shared-track-shape');shape.replaceChildren();const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),path=document.createElementNS(ns,'path');svg.setAttribute('viewBox','0 0 1000 740');svg.setAttribute('aria-label','Shared circuit preview');svg.setAttribute('role','img');path.setAttribute('d','M'+g.samples.map(p=>`${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('L')+(track.complete?'Z':''));path.setAttribute('fill','none');path.setAttribute('stroke','#364d44');path.setAttribute('stroke-width','18');path.setAttribute('stroke-linejoin','round');svg.append(path);shape.append(svg);
      $('#shared-track-name').textContent=track.name;$('#shared-track-info').textContent=`${Math.round(g.length*track.scale).toLocaleString()} m · ${track.points.length} points · ${track.complete?'Closed circuit':'Open road'} · ${(track.buildings||[]).length} buildings`;
      const date=new Date(data.createdAt);$('#shared-track-date').textContent=Number.isFinite(date.getTime())?'Shared '+date.toLocaleDateString():'';$('#shared-preview').hidden=false;status('Circuit found. Open it to start editing your own copy.');
    }catch(error){status(error.message,true);}finally{setBusy(false);}
  };
  $('#open-shared-track').onclick=async()=>{
    if(!shared||busy)return;const snapshot=shared;setBusy(true);
    try{
      const t=structuredClone(snapshot.track);if(t.background?.type==='image'){
        if(snapshot.image){const key=crypto.randomUUID();await saveImage(key,snapshot.image);t.background.key=key;}else t.background=null;
      }
      status('Choose whether to keep your current circuit if prompted.');api.openShared(t,()=>status('Shared circuit opened. Changes stay in your own copy.'));
    }catch(error){status('Could not open the circuit: '+error.message,true);}finally{setBusy(false);}
  };
  function refresh(){const t=api.getTrack();$('#create-share-code').disabled=busy||t.points.length<2;$('#create-share-code').textContent=busy?'Please wait…':'Create sharing code';$('.share-reference').hidden=t.background?.type!=='image';if(created)$('#share-snapshot-note').textContent=fingerprint(t)===createdFingerprint?'This code contains your current snapshot.':'Your circuit has changed. Create a new code to share these edits.';}
  try{const last=JSON.parse(localStorage.getItem('apex-last-share'));if(/^\d{14}$/.test(last?.code)){created={code:last.code};createdFingerprint=last.fingerprint;$('#share-result').hidden=false;$('#share-code-output').value=format(last.code);}}catch{}
  const inbound=new URL(location.href).searchParams.get('track');if(inbound){$('#load-share-code').value=inbound;setTimeout(()=>{api.showPanel('.sharing-panel');$('#load-share-form').requestSubmit();},0);}
  return {refresh};
}
