import {createRound,act,finishRound,SIZE,RACK_SIZE} from './engine.mjs?v=3';
import {RoundClock} from './clock.mjs?v=3';
import {CountdownCues,sparkDuration,vibrate} from './feedback.mjs?v=3';
const cues=new CountdownCues();
const $=id=>document.getElementById(id);
const board=$('board'),rack=$('rack'),pass=$('pass-button'),hint=$('hint-button'),help=$('help-dialog'),feedback=$('feedback');
const overlay=$('board-overlay'),overlayTitle=$('overlay-title'),overlayCopy=$('overlay-copy'),overlayButton=$('overlay-button');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let dictionary,state,locked=true,started=false,generation=0,transitioning=false;
let tiles=[],rackButtons=[],audioContext,muted=false,clock=new RoundClock(),pendingTimeout=false;
try{muted=localStorage.getItem('letteramble-quickfire-muted')==='true';}catch{}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const fmt=ms=>{const s=Math.floor(ms/1000);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
const icons={sound:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>',mute:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4 6 8H3v8h3l5 4V4Z"/><path d="m16 9 5 6m0-6-5 6"/></svg>'};
function soundButton(){const b=$('sound-button');b.innerHTML=muted?icons.mute:icons.sound;b.setAttribute('aria-pressed',String(muted));b.setAttribute('aria-label',muted?'Turn sound on':'Mute sound');b.title=muted?'Turn sound on':'Mute sound';}
function unlockAudio(){
  if(muted)return;
  try{audioContext??=new(window.AudioContext||window.webkitAudioContext)();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});}catch{}
}
function sound(kind,step=0,automatic=false){
  if(muted||!audioContext||audioContext.state!=='running')return;
  const ctx=audioContext,t=ctx.currentTime;
  function note(frequency,start,duration,type='sine',volume=.13){
    const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=type;osc.frequency.setValueAtTime(frequency,t+start);gain.gain.setValueAtTime(.0001,t+start);gain.gain.exponentialRampToValueAtTime(volume,t+start+.012);gain.gain.exponentialRampToValueAtTime(.0001,t+start+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start(t+start);osc.stop(t+start+duration+.02);osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  if(kind==='correct'){const base=(automatic?392:659)*Math.pow(2,Math.min(step,8)*2/12);note(base,0,.25,'sine',.10);note(base*1.5,.085,.4,'sine',.09);note(base*2,.13,.5,'sine',.035);}
  if(kind==='gold'){[659,831,988,1318].forEach((f,i)=>note(f,i*.07,.32,'sine',.10));}
  if(kind==='warning')note(880,0,.07,'sine',.025);
  if(kind==='wrong'){note(247,0,.15,'triangle',.13);note(165,.14,.22,'triangle',.13);}
  if(kind==='new'){[392,523,659].forEach((f,i)=>note(f,i*.055,.2,'sine',.06));}
  if(kind==='pass'){
    const duration=.18,buffer=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*duration),ctx.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1);
    const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();source.buffer=buffer;filter.type='bandpass';filter.Q.value=.65;filter.frequency.setValueAtTime(2400,t);filter.frequency.exponentialRampToValueAtTime(450,t+duration);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.12,t+.035);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start(t);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
}
function say(text,kind=''){feedback.textContent=text;feedback.className=`feedback ${kind}`;}
function setLocked(value){
  locked=value;const disabled=value||help.open||!state||state.ended||!started;
  pass.disabled=disabled||state.passesLeft<=0;
  hint.disabled=disabled||state.hintsLeft<=0||state.hintGap===state.active;
  rackButtons.forEach((b,slot)=>b.disabled=disabled||!!state?.rackUsed[slot]);
}
function updateTimer(){
  const seconds=Math.ceil(clock.remainingMs/1000),allowance=state?.gaps[state.active]?.allowance||30;
  $('timer').innerHTML=`${seconds}<span class="seconds-unit">s</span>`;$('timer').setAttribute('aria-label',`${seconds} seconds remaining`);
  const duration=sparkDuration(clock.remainingMs,allowance);
  $('game').style.setProperty('--spark-speed',`${duration}s`);
  // Change playback rate without jumping the orbit's current position.
  for(const element of [tiles[state?.active],...rackButtons.filter((_,i)=>state?.hintSlots.includes(i))]){
    if(!element?.getAnimations)continue;
    for(const animation of element.getAnimations())if(animation.animationName==='sparkle-orbit'&&animation.updatePlaybackRate){
      element.style.setProperty('--spark-speed','1.7s');animation.updatePlaybackRate(1.7/duration);
    }
  }
  $('timer-fill').style.transform=`scaleX(${Math.max(0,clock.remainingMs/(allowance*1000))})`;
  $('countdown-stat').classList.toggle('urgent',started&&!state?.ended&&seconds<=5);
  const paused=started&&!state?.ended&&(help.open||document.hidden);
  $('countdown-label').textContent=paused?'PAUSED':'TIME LEFT';
}
function resumeTurn(fresh=true){
  setLocked(false);
  if(fresh){cues.reset();clock.begin(state.gaps[state.active].allowance,performance.now());}
  else clock.resume(performance.now());
  if(help.open||document.hidden)clock.pause(performance.now());
  updateTimer();
}
function buildBoard(){
  board.replaceChildren();tiles=[];board.className='board';
  board.style.setProperty('--grid-size',SIZE);
  board.setAttribute('aria-rowcount',SIZE);board.setAttribute('aria-colcount',SIZE);
  board.setAttribute('aria-label',`${state.shape} word board, ${SIZE} rows and columns`);
  document.body.dataset.theme=state.theme;
  document.querySelector('meta[name="theme-color"]').content=getComputedStyle(document.body).getPropertyValue('--surface').trim();
  $('shape-name').textContent=`${state.shape.length===1?'LETTER ':''}${state.shape.toUpperCase()} · BOARD ${state.round}`;
  $('word-outlines').setAttribute('viewBox',`0 0 ${SIZE} ${SIZE}`);
  for(let r=0;r<SIZE;r++){
    const row=document.createElement('div');row.className='board-row';row.setAttribute('role','row');row.setAttribute('aria-rowindex',r+1);
    for(let c=0;c<SIZE;c++){
      const index=r*SIZE+c,tile=document.createElement('div');tile.className='tile';tile.setAttribute('role','gridcell');tile.setAttribute('aria-colindex',c+1);
      tile.style.setProperty('--delay',`${r*24+Math.random()*95}ms`);tile.style.setProperty('--tx',`${(c-(SIZE-1)/2)*30}px`);tile.style.setProperty('--ty',`${(r-(SIZE-1)/2)*30-45}px`);tile.style.setProperty('--rot',`${(Math.random()-.5)*140}deg`);tile.style.setProperty('--explode-delay',`${Math.random()*80}ms`);
      row.append(tile);tiles.push(tile);
    }
    board.append(row);
  }
}
function buildRack(){
  rack.replaceChildren();rackButtons=[];
  for(let slot=0;slot<RACK_SIZE;slot++){
    const b=document.createElement('button');b.className='rack-tile';b.disabled=true;b.addEventListener('click',()=>handle({type:'letter',slot}));rack.append(b);rackButtons.push(b);
  }
}
function render({drop=false}={}){
  const found=new Set(state.found.flatMap(w=>w.cells)),lost=new Set(state.found.filter(w=>w.automatic).flatMap(w=>w.cells));
  for(let i=0;i<tiles.length;i++){
    const tile=tiles[i],letter=state.board[i],gap=state.gaps[i],active=i===state.active&&!state.ended;
    if(!state.mask[i]){tile.className='tile void';tile.textContent='';tile.setAttribute('aria-label','Outside the board');continue;}
    let className='tile';
    if(letter===null)className+=' gap';if(found.has(i))className+=' found';if(lost.has(i))className+=' lost';
    if(gap?.reward)className+=` reward ${gap.reward}`;
    else if(letter===null&&gap?.shownMisses)className+=gap.shownMisses===1?' amber':' red';
    if(active)className+=' active';if(drop)className+=' bounce';
    tile.className=className;tile.textContent=letter??'?';
    if(active)tile.setAttribute('aria-current','true');else tile.removeAttribute('aria-current');
    const status=gap?.reward?`, solved ${gap.reward}`:letter===null&&gap?.shownMisses?`, ${gap.shownMisses===1?1:0} points available`:'';
    tile.setAttribute('aria-label',`${letter??'Gap'}, row ${Math.floor(i/SIZE)+1}, column ${i%SIZE+1}${active?', active':''}${status}`);
  }
  rackButtons.forEach((b,i)=>{
    const used=state.rackUsed[i];b.textContent=state.rack[i];b.className=`rack-tile${used?' consumed':''}${used==='automatic'?' automatic':''}${state.hintSlots.includes(i)?' hinted':''}`;
    b.setAttribute('aria-label',`${state.rack[i]}${used==='automatic'?', used automatically, no points':used?', already used':', place letter'}`);
  });
  drawOutlines();
  $('pass-label').textContent=`PASS (${state.passesLeft})`;hint.textContent=`Hint (${state.hintsLeft})`;
  $('score').textContent=state.score;$('filled-count').textContent=state.filled;
  $('gap-count').textContent=`${RACK_SIZE-state.filled} available`;
  setLocked(locked);
}
function drawOutlines(){
  const layer=$('word-outlines');layer.replaceChildren();
  for(const word of state.found){
    const rect=document.createElementNS('http://www.w3.org/2000/svg','rect'),first=word.cells[0],across=word.direction==='across';
    rect.setAttribute('x',first%SIZE+.02);rect.setAttribute('y',Math.floor(first/SIZE)+.02);
    rect.setAttribute('width',across?word.cells.length-.04:.96);rect.setAttribute('height',across?.96:word.cells.length-.04);rect.setAttribute('rx','.17');
    rect.setAttribute('class',word.automatic?'outline lost-outline':'outline');layer.append(rect);
  }
}
function overlayMessage(title,copy,buttonText=null,callback=null){overlay.hidden=false;overlay.classList.remove('results-view');overlayTitle.textContent=title;overlayCopy.textContent=copy;overlayButton.hidden=!buttonText;overlayButton.textContent=buttonText||'';overlayButton.onclick=callback;}
async function revealWords(event,token){
  const automatic=event.kind==='automatic',multiple=event.words.length>1;
  board.classList.add('revealing');$('word-outlines').classList.add('hidden-outlines');if(state.active!==null)tiles[state.active].classList.remove('active');
  for(let step=0;step<event.words.length;step++){
    if(token!==generation)return;
    const word=event.words[step];
    tiles.forEach(t=>t.classList.remove('word-focus','word-pop','focus-gold','focus-red'));
    word.cells.forEach(id=>tiles[id].classList.add('word-focus',automatic?'focus-red':multiple?'focus-gold':'focus-green'));
    // Restart the animation even for tiles shared by consecutive words.
    if(!reduced){void board.offsetWidth;word.cells.forEach(id=>tiles[id].classList.add('word-pop'));}
    feedback.replaceChildren();feedback.className=`feedback word-reveal ${automatic?'error':multiple?'double':'success'}`;
    const name=document.createElement('strong'),caption=document.createElement('span');name.textContent=word.word;
    caption.textContent=`${word.direction==='across'?'Across':'Down'}${multiple?` · Word ${step+1} of ${event.words.length}`:''}${automatic?' · Shown for you':''}`;
    feedback.append(name,caption);sound('correct',step,automatic);
    await wait(multiple?800:620);
  }
  board.classList.remove('revealing');$('word-outlines').classList.remove('hidden-outlines');tiles.forEach(t=>t.classList.remove('word-focus','word-pop','focus-gold','focus-red','focus-green'));
  render();
  const names=[...new Set(event.words.map(w=>w.word))];
  say(automatic?`${names.join(' + ')} · Shown for you · 0 points`:`${names.join(' + ')} · ${multiple?'Multi-word! ':''}+${event.points}`,automatic?'error':multiple?'double':'success');
  if(multiple||automatic)await wait(450);
}
async function startPreparedRound(token){
  if(token!==generation||transitioning)return;transitioning=true;unlockAudio();overlay.hidden=true;render({drop:true});sound('new');
  await wait(reduced?100:850);if(token!==generation)return;
  tiles.forEach(t=>t.classList.remove('bounce'));started=true;transitioning=false;resumeTurn();
}
async function newRound({first=false}={}){
  const token=++generation;setLocked(true);started=false;clock=new RoundClock();transitioning=false;pendingTimeout=false;
  overlayMessage('Shuffling the letters…','Every gap has an answer in your rack.');
  try{
    await new Promise(resolve=>requestAnimationFrame(resolve));
    state=createRound({dictionary,score:state?.score||0,totalWords:state?.totalWords||0,round:first?1:(state?.round||0)+1,previousShape:state?.shape,previousTheme:state?.theme});
    if(token!==generation)return;
    buildBoard();render();clock.remainingMs=30000;updateTimer();say('Find a word through the sparkling ?');
    if(first)overlayMessage('Ready for Quickfire?','15 gaps. 16 letters. Three hints. Three passes.','Start board',()=>startPreparedRound(token));
    else await startPreparedRound(token);
  }catch(error){console.error(error);overlayMessage('Those letters got tangled.','Let’s shuffle another board.','Try again',()=>newRound({first}));}
}
function completeRound(token){
  setLocked(true);const summary=finishRound(state,clock.elapsedMs);render();
  overlayMessage('Board complete!',`${summary.manualSolved} solved by you · ${summary.automaticSolved} shown`,'Next board',()=>transitionRound(token));
  overlay.classList.add('results-view');
  const results=document.createElement('div');results.className='round-results';
  for(const [label,value] of [['Word points',summary.wordPoints],['Your time',fmt(summary.elapsedMs)],['Speed bonus',`+${summary.bonus}`],['Board score',summary.total]]){
    const row=document.createElement('div'),name=document.createElement('span'),amount=document.createElement('strong');name.textContent=label;amount.textContent=value;row.append(name,amount);results.append(row);
  }
  // Replacing the previous summary keeps results stable across repeated calls.
  overlay.querySelector('.round-results')?.remove();overlayCopy.after(results);
  say(`${summary.words} words found · ${summary.total} points this board`,'success');
}
async function transitionRound(token){
  if(token!==generation||transitioning)return;transitioning=true;overlay.hidden=true;overlay.querySelector('.round-results')?.remove();
  $('board-wrap').classList.add('is-exploding');board.classList.add('exploding');sound('pass');
  await wait(reduced?100:650);
  $('board-wrap').classList.remove('is-exploding');if(token===generation)await newRound();
}
async function handle(action){
  if(locked||help.open||document.hidden||!started||!state||state.ended)return;
  const expired=clock.pause(performance.now());if(expired)action={type:'timeout'};
  unlockAudio();setLocked(true);const token=generation;
  let event;
  try{event=act(state,action,dictionary);}catch(error){console.error(error);overlayMessage('Something interrupted this board.','Try a fresh set of letters.','New board',()=>newRound());return;}
  if(event.kind==='ignored'){resumeTurn(false);return;}
  if(event.kind==='hint'){render();say(`${event.slots.length} sparkling choices. One will fit.`);resumeTurn(false);return;}
  if(event.kind==='reserved'){
    say(`${event.words[0].word} fits, but ${event.letter} is needed elsewhere. No penalty.`);
    sound('pass');await wait(350);if(token===generation)resumeTurn(false);return;
  }
  if(event.kind==='wrong'){
    vibrate(navigator,130);sound('wrong');tiles[event.index].classList.add('wobble');rackButtons[event.slot].classList.add('wobble');say('Not a complete word. Your letter stays; the gap will return.','error');
    await wait(reduced?100:300);if(token!==generation)return;render();
  }else if(event.kind==='pass'){
    vibrate(navigator,160);sound('pass');render();say(`Passed. The gap will return. ${state.passesLeft} passes left.`);await wait(100);
  }else{
    if(event.kind==='automatic'){vibrate(navigator,220);sound('wrong');}else vibrate(navigator,[35,45,70]);render();await revealWords(event,token);
  }
  if(token!==generation)return;
  if(state.ended)completeRound(token);else resumeTurn();
}
async function load(){
  overlayMessage('Getting the letters ready…','15 solvable gaps. No red herrings.');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch(new URL('./words.txt',import.meta.url),{signal:controller.signal});if(!response.ok)throw new Error('Dictionary could not be loaded.');
    const text=await response.text();dictionary=new Set(text.split(/\s+/).filter(w=>/^[A-Z]{3,12}$/.test(w)));
    if(dictionary.size<50000||!dictionary.has('HAPPY'))throw new Error('Incomplete dictionary.');
    await newRound({first:true});
  }catch(error){console.error(error);overlayMessage('The dictionary hasn’t arrived.','Check your connection, then try again.','Retry',load);}finally{clearTimeout(timeout);}
}
pass.addEventListener('click',()=>handle({type:'pass'}));
hint.addEventListener('click',()=>handle({type:'hint'}));
$('sound-button').addEventListener('click',()=>{muted=!muted;try{localStorage.setItem('letteramble-quickfire-muted',String(muted));}catch{}soundButton();if(!muted){unlockAudio();setTimeout(()=>sound('correct'),70);}});
$('help-button').addEventListener('click',()=>{pendingTimeout=clock.pause(performance.now())||pendingTimeout;vibrate(navigator,0);help.showModal();$('game').classList.add('paused');setLocked(locked);updateTimer();});
const closeHelp=()=>help.close();$('close-help').addEventListener('click',closeHelp);$('play-button').addEventListener('click',closeHelp);
function resumeVisible(){
  updateTimer();setLocked(locked);
  if(!locked&&started&&!state?.ended&&!help.open&&!document.hidden){
    if(pendingTimeout){pendingTimeout=false;handle({type:'timeout'});}else clock.resume(performance.now());
  }
}
help.addEventListener('close',()=>{$('game').classList.remove('paused');unlockAudio();resumeVisible();});
help.addEventListener('click',e=>{if(e.target===help){const r=help.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeHelp();}});
document.addEventListener('keydown',e=>{
  if(help.open||e.ctrlKey||e.metaKey||e.altKey||e.repeat)return;
  if(e.code==='Space'){
    if(document.activeElement?.matches('button:not(.rack-tile):not(.pass-button)'))return;
    e.preventDefault();handle({type:'pass'});
  }else if(/^[a-z]$/i.test(e.key)&&state){const slot=state.rack.findIndex((letter,i)=>letter===e.key.toUpperCase()&&!state.rackUsed[i]);if(slot!==-1){e.preventDefault();handle({type:'letter',slot});}}
});
document.addEventListener('pointerdown',unlockAudio,{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden){vibrate(navigator,0);pendingTimeout=clock.pause(performance.now())||pendingTimeout;}else resumeVisible();updateTimer();});
setInterval(()=>{
  if(!clock.running||help.open||document.hidden)return;
  const expired=clock.tick(performance.now());updateTimer();
  if(!expired&&cues.sample(clock.remainingMs)){vibrate(navigator,30);sound('warning');}
  if(expired)handle({type:'timeout'});
},50);
soundButton();buildRack();load();
