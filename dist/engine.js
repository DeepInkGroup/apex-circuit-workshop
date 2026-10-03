export const METERS_PER_UNIT = 0.2;
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const wrap = n => ((n % 1) + 1) % 1;

function spline(a, b, c, d, t) {
  const t2 = t * t, t3 = t2 * t;
  return Object.fromEntries(['x', 'y'].map(k => [k, .5 * (2*b[k] + (-a[k]+c[k])*t + (2*a[k]-5*b[k]+4*c[k]-d[k])*t2 + (-a[k]+3*b[k]-3*c[k]+d[k])*t3)]));
}

export function buildGeometry(points, smooth = true) {
  const samples = [], segments = [], cumulative = [];
  let length = 0;
  if (points.length < 3) return { samples: points.map(p => ({...p})), segments, cumulative, length };
  points.forEach((b, i) => {
    const n = points.length, a = points[(i+n-1)%n], c = points[(i+1)%n], d = points[(i+2)%n];
    const steps = Math.max(10, Math.ceil(distance(b, c)/5));
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      samples.push(smooth ? spline(a,b,c,d,t) : {x:b.x+(c.x-b.x)*t, y:b.y+(c.y-b.y)*t});
      segments.push(i);
    }
  });
  samples.forEach((p,i) => { cumulative.push(length); length += distance(p, samples[(i+1)%samples.length]); });
  return {samples, segments, cumulative, length};
}

export function pointOnTrack(g, fraction) {
  if (!g.length) return {x:g.samples[0]?.x ?? 500, y:g.samples[0]?.y ?? 370, angle:0, index:0};
  const l = wrap(fraction) * g.length;
  let lo = 0, hi = g.cumulative.length-1;
  while (lo < hi) { const mid = Math.ceil((lo+hi)/2); if(g.cumulative[mid] <= l) lo = mid; else hi = mid-1; }
  const a = g.samples[lo], b = g.samples[(lo+1)%g.samples.length], segmentLength = distance(a,b);
  const t = segmentLength ? (l-g.cumulative[lo])/segmentLength : 0;
  return {x:a.x+(b.x-a.x)*t, y:a.y+(b.y-a.y)*t, angle:Math.atan2(b.y-a.y,b.x-a.x), index:lo};
}

export function closestOnTrack(g, p) {
  let best = Infinity, result = {distance:Infinity, progress:0, index:0};
  if (!g.length) return result;
  g.samples.forEach((a,i) => {
    const b = g.samples[(i+1)%g.samples.length], dx = b.x-a.x, dy = b.y-a.y, l2 = dx*dx+dy*dy;
    const t = l2 ? clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l2,0,1) : 0;
    const x = a.x+t*dx, y = a.y+t*dy, d2 = (p.x-x)**2+(p.y-y)**2;
    if(d2 < best) { best=d2; result={distance:Math.sqrt(d2), progress:(g.cumulative[i]+Math.sqrt(l2)*t)/g.length, index:i, x,y}; }
  });
  return result;
}

export class LapTracker {
  constructor(progress = .009) { this.reset(progress); }
  reset(progress = .009) { this.previous=progress; this.checkpoint=1; this.travel=0; this.offTrack=0; this.invalidReason=''; }
  update(progress, onTrack, dt) {
    const previous=this.previous;
    let delta=progress-previous;
    if(delta<-.5)delta+=1; else if(delta>.5)delta-=1;
    this.offTrack=onTrack?0:this.offTrack+dt;
    if(this.offTrack>.4) this.invalidReason ||= 'Off track';
    if(Math.abs(delta)>.08) this.invalidReason ||= 'Missed checkpoint';
    else this.travel+=delta;
    if(this.travel<-.04) this.invalidReason ||= 'Wrong direction';
    if(delta>0 && delta<.5) {
      const end=progress<previous?progress+1:progress;
      while(this.checkpoint<8 && previous<this.checkpoint/8 && end>=this.checkpoint/8) this.checkpoint++;
      if(previous>.9 && progress<.1 && this.checkpoint===8 && this.travel>.85) {
        const result={valid:!this.invalidReason && onTrack,reason:this.invalidReason || (onTrack?'':'Off track')};
        this.reset(progress); return result;
      }
    }
    this.previous=progress;
    return null;
  }
}

export function stepVehicle(car, vehicle, controls, onRoad, dt) {
  const throttle=controls.throttle?1:0, brake=controls.brake?1:0, handbrake=controls.handbrake;
  const drive=throttle-brake;
  if(drive>0)car.speed+=(car.speed<0?vehicle.brake:vehicle.accel)*dt;
  else if(drive<0)car.speed-=(car.speed>0?vehicle.brake:vehicle.accel*.55)*dt;
  else car.speed*=Math.exp(-dt*(onRoad?.5:1.8));
  if(handbrake)car.speed*=Math.exp(-dt*.8);
  car.speed*=Math.exp(-dt*(onRoad?.08:2.05));
  car.speed=clamp(car.speed,-vehicle.max*.25,onRoad?vehicle.max:vehicle.max*.31);
  car.steering ??= 0;
  car.steering+=(controls.steer-car.steering)*(1-Math.exp(-dt*9));
  const turning=clamp(Math.abs(car.speed)/50,0,1)/(1+Math.abs(car.speed)/vehicle.max*.65);
  car.angle+=car.steering*vehicle.steer*turning*dt*Math.sign(car.speed||1)*(handbrake?1.3:1);
  const grip=onRoad?vehicle.grip:.5, response=1-Math.exp(-(handbrake?3:3+grip*12)*dt);
  car.vx+=(Math.cos(car.angle)*car.speed-car.vx)*response;
  car.vy+=(Math.sin(car.angle)*car.speed-car.vy)*response;
  car.x+=car.vx*dt; car.y+=car.vy*dt;
  if(car.x<20||car.x>980||car.y<35||car.y>705) {
    car.x=clamp(car.x,20,980);car.y=clamp(car.y,35,705);car.speed*=.6;car.vx*=.5;car.vy*=.5;
  }
  return car;
}
