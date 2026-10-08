const $=s=>document.querySelector(s);
export function mountWorkspaceNavigation(api){
  const aside=$('.settings-panel'),nav=document.createElement('nav');nav.className='workspace-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Circuit settings');
  $('.circuit-settings').append($('#new-btn'));
  const groups=[['design','Design',['.circuit-settings','.reference-section']],['corners','Corners',['.corner-panel','.structure-panel']],['scenery','Scenery',['.pit-design-panel','.environment-panel','.scenery-panel','.scenery-section']],['export','Export',['.export-settings','.analysis-summary']],['share','Share',['.sharing-panel']]];
  const pages=new Map();
  for(const [key,label,selectors] of groups){
    const page=document.createElement('div');page.className='settings-page';page.id='settings-'+key;page.setAttribute('role','tabpanel');page.setAttribute('aria-labelledby','tab-'+key);pages.set(key,page);
    for(const selector of selectors){const section=$(selector);if(section)page.append(section);}
    const button=document.createElement('button');button.type='button';button.id='tab-'+key;button.setAttribute('role','tab');button.setAttribute('aria-controls',page.id);button.textContent=label;button.dataset.page=key;button.onclick=()=>activate(key);nav.append(button);aside.append(page);
  }
  // Preserve any existing section that is not covered by a known group.
  for(const section of [...aside.querySelectorAll('.panel-section')])if(!section.closest('.settings-page')&&!section.classList.contains('point-section'))pages.get('design').append(section);
  const oldInspector=$('.point-section');if(oldInspector)oldInspector.hidden=true;
  aside.prepend(nav);let current='design';
  function activate(key){current=key;for(const [name,page] of pages){page.hidden=name!==key;}nav.querySelectorAll('button').forEach(b=>{const selected=b.dataset.page===key;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});aside.scrollTop=0;}
  nav.onkeydown=e=>{const keys=[...pages.keys()];let index=keys.indexOf(current);if(e.key==='ArrowRight')index=(index+1)%keys.length;else if(e.key==='ArrowLeft')index=(index+keys.length-1)%keys.length;else if(e.key==='Home')index=0;else if(e.key==='End')index=keys.length-1;else return;e.preventDefault();activate(keys[index]);$('#tab-'+keys[index]).focus();};
  const guide=document.createElement('div');guide.className='empty-canvas-guide';guide.innerHTML='<span class="eyebrow">YOUR NEXT CIRCUIT STARTS HERE</span><h2>Make your first line.</h2><p>Draw it yourself, trace a place, or open a shared circuit.</p><div><button data-start="draw">Draw road points</button><button data-start="trace">Trace a place</button><button data-start="share">Paste a code</button></div><small>Click at least three road points, then Complete circuit.<br>You can keep editing after closing the loop.</small>';
  $('#canvas-wrap').append(guide);let guideDismissed=false;
  guide.querySelectorAll('button').forEach(b=>b.onclick=()=>{if(b.dataset.start==='draw'){guideDismissed=true;api.setTool('draw');guide.hidden=true;$('#track-canvas').focus();api.toast('Click the canvas to place your first road point.');}else api.showPanel(b.dataset.start==='share'?'.sharing-panel':'.reference-section');});
  const local=$('.local-label');if(local)local.innerHTML='<span class="status-dot"></span> AUTO-SAVED ON THIS DEVICE';
  const details=document.createElement('button');details.className='outline-button circuit-profile-shortcut';details.textContent='Edit circuit name & details';details.onclick=()=>$('#circuit-details-btn').click();$('.circuit-settings').prepend(details);$('#track-name').maxLength=60;
  activate('design');
  return {activateSection(selector){const page=$(selector)?.closest('.settings-page');if(page){activate(page.id.replace('settings-',''));const details=$(selector);if(details.tagName==='DETAILS')details.open=true;}},refresh(){guide.hidden=guideDismissed||api.getTrack().points.length>0||$('.studio').classList.contains('preview-active');}};
}
