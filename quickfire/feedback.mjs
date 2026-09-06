// Small feature-detected adapter; native builds can replace this implementation.
export function vibrate(device,pattern){
  try{return typeof device?.vibrate==='function'?device.vibrate(pattern):false;}catch{return false;}
}
export function sparkDuration(remainingMs,allowance){
  const fraction=Math.max(0,Math.min(1,remainingMs/(allowance*1000)));
  return .23+1.47*fraction;
}
export class CountdownCues {
  seen=new Set();
  reset(){this.seen.clear();}
  sample(remainingMs){
    const second=Math.ceil(remainingMs/1000);
    if(second<1||second>5||this.seen.has(second))return false;
    this.seen.add(second);return true;
  }
}
