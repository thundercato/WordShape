import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import {createRequire} from 'node:module';
import * as engine from '../engine.mjs';import * as daily from '../daily.mjs';import * as feedback from '../feedback.mjs';import {RoundClock} from '../clock.mjs';
const require=createRequire(process.env.LETTERAMBLE_TEST_PACKAGE||import.meta.url);let parseHTML;try{({parseHTML}=require('linkedom'));}catch{}
test('daily interface completes three boards, reloads a partial board and does not replay completed days',{skip:!parseHTML},async()=>{
 const {window,document}=parseHTML(fs.readFileSync(new URL('../index.html',import.meta.url),'utf8'));window.matchMedia=()=>({matches:true});document.getElementById('help-dialog').open=false;
 const memory=new Map();const localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 const context=vm.createContext({...engine,...daily,...feedback,RoundClock,window,document,localStorage,navigator:{},getComputedStyle:()=>({getPropertyValue:()=>''}),performance,console,URL,AbortController,requestAnimationFrame:fn=>fn(),setTimeout:fn=>{queueMicrotask(fn);return 0;},clearTimeout:()=>{},setInterval:()=>{},fetch:async()=>({ok:true,text:async()=>fs.readFileSync(new URL('../words.txt',import.meta.url),'utf8')})});
 let source=fs.readFileSync(new URL('../app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replaceAll('import.meta.url',"'https://example.test/app.mjs'").replace('soundButton();buildRack();load();','soundButton();buildRack();');
 source+='\nglobalThis.api={load,start:()=>startPreparedRound(generation),handle,next:()=>transitionRound(generation),get state(){return state},get session(){return session},get dictionary(){return dictionary},get clock(){return clock}};';vm.runInContext(source,context);const a=context.api;
 await a.load();assert.equal(a.session.results.length,0);await a.start();
 for(let board=0;board<3;board++){
  for(let n=0;n<15;n++){
   const assignment=engine.assignRack(a.state.board,a.state.rack,a.state.rackUsed,a.dictionary,a.state.options);await a.handle({type:'letter',slot:assignment.get(a.state.active)});
   if(board===0&&n===3){const before=JSON.stringify(a.state.board);await a.load();assert.equal(JSON.stringify(a.state.board),before);await a.start();}
  }
  assert.equal(a.session.results.length,board+1);
  if(board<2){await a.next();assert.equal(a.clock.elapsedMs,0);await a.start();}
 }
 assert.ok(JSON.parse(memory.get(daily.PROGRESS_KEY)).days[a.session.day].quickfire.completed);
 await a.load();assert.match(document.getElementById('overlay-title').textContent,/Daily assignment complete/);assert.equal(a.session.results.length,3);
});
