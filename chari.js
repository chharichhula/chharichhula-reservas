(() => {
'use strict';
const flight=document.querySelector('.chari-flight'),host=document.querySelector('#chari-host-image');
const message=document.querySelector('#chari-message'),journey=document.querySelector('.journey');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
document.body.append(flight);
let current={progress:0,lite:reduced.matches},raf=0,station=-1,tween=null,landing=false,landed=false,entered=false;
const clamp=n=>Math.max(0,Math.min(1,n)),smooth=n=>n*n*(3-2*n);
const pose={x:0,y:0,scale:.85,angle:0};
// Time-based flights lead the visitor; scroll selects a destination, never the wing phase.
const stops=[
 {p:0,x:.76,y:.43,scale:.88},
 {p:.13,x:.83,y:.32,scale:.72},
 {p:.32,x:.7,y:.35,scale:.6},
 {p:.49,x:.81,y:.4,scale:.72},
 {p:.67,x:.74,y:.3,scale:.58},
 {p:.83,x:.82,y:.38,scale:.75},
 {p:.95,x:.8,y:.5,scale:.83}
];
function rigReady(){
 const body=flight.querySelector('.chari-body'),wing=flight.querySelector('.chari-wing');
 flight.classList.toggle('rig-ready',body.complete&&body.naturalWidth>0&&wing.complete&&wing.naturalWidth>0);
}
flight.querySelectorAll('img').forEach(im=>im.addEventListener('load',rigReady));rigReady();
function paint(){
 flight.style.transform='translate3d('+pose.x+'px,'+pose.y+'px,0) rotate('+pose.angle+'deg) scale('+pose.scale+')';
}
function stopPoint(stop){
 const w=flight.offsetWidth,h=flight.offsetHeight;
 return {x:Math.max(10,Math.min(innerWidth-w*stop.scale-10,innerWidth*stop.x-w*stop.scale/2)),y:Math.max(105,Math.min(innerHeight-h*stop.scale-88,innerHeight*stop.y-h*stop.scale/2)),scale:stop.scale,angle:0};
}
function flyTo(goal,duration){
 tween?.kill();
 const from={...pose},dx=goal.x-from.x;
 const bend=Math.min(45,innerHeight*.06);
 const clock={t:0};
 if(!window.gsap){Object.assign(pose,goal);paint();return;}
 tween=gsap.to(clock,{t:1,duration,ease:'sine.inOut',onUpdate:()=>{
 const t=clock.t;
 pose.x=from.x+(goal.x-from.x)*t;
 pose.y=from.y+(goal.y-from.y)*t-Math.sin(Math.PI*t)*bend;
 pose.scale=from.scale+(goal.scale-from.scale)*t;
 pose.angle=from.angle*(1-t)+Math.sin(Math.PI*t)*Math.max(-6,Math.min(6,dx/20));
 paint();
 },onComplete:()=>{pose.angle=0;paint();}});
}
function dockImmediately(){
 tween?.kill();landing=false;landed=true;
 flight.style.opacity='0';host.style.opacity='1';flight.classList.remove('is-flying');
}
function beginLanding(){
 if(landing||landed)return;
 tween?.kill();landing=true;station=-1;
 const box=host.getBoundingClientRect(),oldWidth=flight.offsetWidth;
 const local={x:pose.x-box.left,y:pose.y-box.top,scale:pose.scale*oldWidth/box.width,angle:pose.angle};
 // Once landing begins the sprite belongs to the form, never to the viewport.
 host.parentElement.append(flight);
 Object.assign(flight.style,{position:'absolute',left:'0',top:'0',width:'100%'});
 const paintLocal=()=>{flight.style.transform='translate3d('+local.x+'px,'+local.y+'px,0) rotate('+local.angle+'deg) scale('+local.scale+')';};
 paintLocal();
 if(!window.gsap){dockImmediately();return;}
 tween=gsap.to(local,{x:0,y:0,scale:1,angle:0,duration:.8,ease:'sine.inOut',onUpdate:paintLocal,onComplete:dockImmediately});
}
function returnToForest(){
 tween?.kill();landing=false;landed=false;station=-1;entered=false;
 document.body.append(flight);
 Object.assign(flight.style,{position:'fixed',left:'0',top:'0',width:''});
 host.style.opacity='0';
}
function render(){
 raf=0;
 const end=journey.offsetTop+journey.offsetHeight-innerHeight;
 if(current.lite||reduced.matches){
 dockImmediately();entered=false;return;
 }
 if(landing||landed){
 // No scroll-driven retargeting after touching down. Reset only on a return to the forest.
 if(scrollY<end-innerHeight*.3)returnToForest();else return;
 }
 if(scrollY>end){
 if(!entered){dockImmediately();return;}
 const box=host.getBoundingClientRect();
 if(box.top<innerHeight*.74)beginLanding();
 return;
 }
 host.style.opacity='0';flight.style.opacity='1';
 flight.classList.toggle('is-flying',!document.hidden);
 const next=stops.reduce((active,stop,i)=>current.progress>=stop.p?i:active,0);
 if(next!==station){
 const goal=stopPoint(stops[next]);
 if(!entered){pose.x=innerWidth+30;pose.y=goal.y+35;pose.scale=goal.scale;entered=true;paint();}
 station=next;flyTo(goal,1.4);
 }
}
function schedule(){if(!raf&&!document.hidden)raf=requestAnimationFrame(render);}
document.addEventListener('chari:journey',e=>{current=e.detail;schedule();});
addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',()=>{station=-1;schedule();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){tween?.pause();flight.classList.remove('is-flying');}else{tween?.resume();schedule();}});
reduced.addEventListener('change',schedule);
document.addEventListener('chhari:celebrar',()=>{
 host.src='assets/chari-celebra.webp';message.textContent='Tu cita ya está en el bosque. Te espero.';
});
document.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>{
 host.src='assets/chari-guia.webp';message.textContent=button.dataset.step==='2'?'Elegí el día de tu próxima visita.':'Te acompaño hasta tu próxima cita.';schedule();
}));
host.addEventListener('load',schedule);schedule();
})();