// Keep caches bounded; keys are based on values so mutable editor data is safe.
export function boundedCache(limit=6){
 const entries=new Map();
 return {get(key){if(!entries.has(key))return undefined;const value=entries.get(key);entries.delete(key);entries.set(key,value);return value;},set(key,value){entries.delete(key);entries.set(key,value);while(entries.size>limit)entries.delete(entries.keys().next().value);return value;}};
}

// The latest update wins, but flush preserves the final pointer/slider value.
export function frameTask(run){
 let frame=0,pending=false,value;
 const flush=()=>{if(frame)cancelAnimationFrame(frame);frame=0;if(!pending)return;pending=false;const next=value;value=undefined;run(next);};
 return {schedule(next){value=next;pending=true;if(!frame)frame=requestAnimationFrame(flush);},flush,cancel(){if(frame)cancelAnimationFrame(frame);frame=0;pending=false;value=undefined;}};
}
