export function crossingAction(api,text,{className='',after=()=>{}}={}){
 const button=document.createElement('button');button.type='button';button.className='crossing-repair-action '+className;
 const label=document.createElement('span'),hint=document.createElement('strong'),status=document.createElement('span');label.className='crossing-repair-label';label.textContent=text;hint.className='crossing-repair-hint';hint.textContent='Resolve crossing automatically';status.className='crossing-repair-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');button.append(label,hint,status);
 button.onclick=async()=>{
  button.disabled=true;button.setAttribute('aria-busy','true');hint.textContent='Fitting a smooth crossing…';status.textContent='Comparing bridge and tunnel approaches.';
  try{
   const result=await api.fixCrossings(({remaining})=>status.textContent=`Fitting road levels · ${remaining} crossing${remaining===1?'':'s'} remaining.`);
   if(!result.ok){status.textContent=result.reason;hint.textContent='Try automatic fitting again';api.toast(result.reason);return;}
   const bridges=result.changes.filter(c=>c.type==='bridge').length,tunnels=result.changes.filter(c=>c.type==='tunnel').length,clearance=Math.min(...result.crossings.map(c=>c.gap)),message=result.changes.length?`Crossings resolved · ${bridges} bridge${bridges===1?'':'s'}${tunnels?` · ${tunnels} tunnel${tunnels===1?'':'s'}`:''} · ${clearance.toFixed(1)} m minimum road clearance · ${result.grade.toFixed(1)}% peak structural grade. Undo restores the previous layout.`:'Crossings already have sufficient clearance.';
   status.textContent=message;hint.textContent='Crossings resolved';api.toast(message);after(result,message);
  }catch(error){status.textContent='Automatic fitting could not finish: '+error.message;hint.textContent='Try automatic fitting again';api.toast(status.textContent);}
  finally{button.disabled=false;button.removeAttribute('aria-busy');}
 };
 return button;
}
