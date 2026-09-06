// Monotonic active-play clock. Reveals, instructions and background time pause it.
export class RoundClock {
  elapsedMs=0;remainingMs=0;running=false;last=0;
  begin(seconds,now){this.remainingMs=seconds*1000;this.last=now;this.running=true;}
  tick(now){
    if(!this.running)return false;
    const delta=Math.max(0,now-this.last),spent=Math.min(delta,this.remainingMs);
    this.elapsedMs+=spent;this.remainingMs=Math.max(0,this.remainingMs-spent);this.last=now;
    if(this.remainingMs===0){this.running=false;return true;}
    return false;
  }
  pause(now){const expired=this.tick(now);this.running=false;return expired;}
  resume(now){this.last=now;this.running=this.remainingMs>0;}
}
