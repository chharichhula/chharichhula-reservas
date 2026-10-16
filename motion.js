(() => {
'use strict';
const $=s=>document.querySelector(s),journey=$('.journey'),canvas=$('#journey-canvas');
const ctx=canvas.getContext('2d',{alpha:false}),start=$('#start-still'),open=$('#open-still'),outside=$('#exterior-still'),end=$('#end-still');
const welcome=$('.welcome'),arrival=$('.arrival'),range=$('#position');
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),constrained=navigator.connection?.saveData===true;
// One viewport background persists behind both the journey and booking content.
document.body.prepend($('.scene-media'));
let lite=reduced.matches||constrained||!window.gsap||!window.ScrollTrigger||!ctx;
let progress=0,driver=null,raf=0,inFlight=0,failed=false;
const cache=new Map(),pending=new Set(),lastGood=new Map();
const clips={door:{path:'recorrido',total:129},outside:{path:'salon-exterior',total:96},inside:{path:'salon-interior',total:96}};
const posters={doorEnd:image('assets/recorrido-fin.webp'),outsideStart:image('assets/salon-exterior-inicio.webp'),outsideEnd:image('assets/salon-exterior-final.webp'),insideStart:image('assets/salon-interior-inicio.webp')};
const clamp=v=>Math.max(0,Math.min(1,v)),ramp=(p,a,b)=>clamp((p-a)/(b-a)),smooth=t=>t*t*(3-2*t);
function image(src){const im=new Image();im.decoding='async';im.onload=()=>paint();im.src=src;return im;}
function valid(im){return im&&im.complete&&im.naturalWidth>0;}
function key(name,n){return name+':'+n;}
function index(name,t){return 1+Math.round(clamp(t)*(clips[name].total-1));}
function frame(name,n,fallback){
 const im=cache.get(key(name,n));
 if(valid(im)){lastGood.set(name,im);return im;}
 return valid(lastGood.get(name))?lastGood.get(name):fallback;
}
function geometry(im){
 const scale=Math.max(canvas.width/im.naturalWidth,canvas.height/im.naturalHeight);
 return {x:(canvas.width-im.naturalWidth*scale)/2,y:(canvas.height-im.naturalHeight*scale)/2,w:im.naturalWidth*scale,h:im.naturalHeight*scale};
}
function fit(im){if(valid(im)){const g=geometry(im);ctx.drawImage(im,g.x,g.y,g.w,g.h);}}
function arch(x,y,w,h){
 const r=w/2;ctx.beginPath();ctx.moveTo(x,y+h);ctx.lineTo(x,y+r);ctx.bezierCurveTo(x,y+r*.35,x+w*.2,y,x+r,y);
 ctx.bezierCurveTo(x+w*.8,y,x+w,y+r*.35,x+w,y+r);ctx.lineTo(x+w,y+h);ctx.closePath();
}
function portal(from,to,t,rect){
 if(!valid(from)){fit(to);return;}if(!valid(to)){fit(from);return;}
 const s=smooth(t),zoom=1+6*s,g=geometry(from);
 const px=g.x+(rect.x+rect.w/2)*g.w,py=g.y+(rect.y+rect.h/2)*g.h;
 const dx=(canvas.width/2-px)*s,dy=(canvas.height/2-py)*s;
 const tx=x=>px+(x-px)*zoom+dx,ty=y=>py+(y-py)*zoom+dy;
 ctx.drawImage(from,tx(g.x),ty(g.y),g.w*zoom,g.h*zoom);
 ctx.save();arch(tx(g.x+rect.x*g.w),ty(g.y+rect.y*g.h),rect.w*g.w*zoom,rect.h*g.h*zoom);ctx.clip();
 ctx.globalAlpha=smooth(ramp(t,0,.2));fit(to);ctx.restore();
}
function paint(){
 if(lite||!ctx)return;
 ctx.globalAlpha=1;
 let available=false;
 if(progress<.32){
 const n=index('door',ramp(progress,.015,.32)),im=frame('door',n,n===129?posters.doorEnd:start);fit(im);available=valid(im);
 }else if(progress<.49){
 portal(posters.doorEnd,posters.outsideStart,ramp(progress,.32,.49),{x:.38,y:.02,w:.25,h:.7});available=valid(posters.doorEnd);
 }else if(progress<.68){
 const im=frame('outside',index('outside',ramp(progress,.49,.68)),posters.outsideStart);fit(im);available=valid(im);
 }else if(progress<.83){
 portal(posters.outsideEnd,posters.insideStart,ramp(progress,.68,.83),{x:.54,y:.17,w:.17,h:.48});available=valid(posters.outsideEnd);
 }else{
 const n=index('inside',ramp(progress,.83,.97)),im=n===96?end:frame('inside',n,posters.insideStart);fit(im);available=valid(im);
 }
 if(available){canvas.style.opacity='1';$('#media-status').textContent='';}
}
function desired(){
 if(progress<.32)return ['door',index('door',ramp(progress,.015,.32))];
 if(progress<.49)return ['outside',1];
 if(progress<.68)return ['outside',index('outside',ramp(progress,.49,.68))];
 if(progress<.83)return ['inside',1];
 return ['inside',index('inside',ramp(progress,.83,.97))];
}
function pump(){
 if(lite||failed)return;
 const [name,n]=desired(),targets=[0,1,2,3,4,5,6,7,8,-1,-2,-3,-4];
 for(const delta of targets){
 if(inFlight>=4)break;const num=n+delta,k=key(name,num);
 if(num<1||num>clips[name].total||cache.has(k)||pending.has(k))continue;
 pending.add(k);inFlight++;
 const im=new Image();im.decoding='async';
 im.onload=()=>{
 pending.delete(k);inFlight--;cache.set(k,im);
 const [active,at]=desired();
 for(const ck of cache.keys()){const [cn,ci]=ck.split(':');if(cn!==active||Math.abs(Number(ci)-at)>18)cache.delete(ck);}
 paint();pump();
 };
 im.onerror=()=>{pending.delete(k);inFlight--;failed=true;lite=true;updateMode();$('#media-status').textContent='Seguís con la versión liviana del recorrido.';};
 im.src='assets/'+clips[name].path+'/frame-'+String(num).padStart(3,'0')+'.webp';
 }
}
function sizeCanvas(){
 const d=Math.min(devicePixelRatio||1,1.5);
 canvas.width=Math.round(innerWidth*d);canvas.height=Math.round(innerHeight*d);paint();
}
function currentProgress(){return clamp((scrollY-journey.offsetTop)/Math.max(1,journey.offsetHeight-innerHeight));}
function render(p){
 progress=clamp(p);range.value=Math.round(progress*100);
 document.dispatchEvent(new CustomEvent('chari:journey',{detail:{progress,lite}}));
 const intro=progress<.11,arrived=progress>.95;
 welcome.style.opacity=String(1-smooth(ramp(progress,.015,.11)));welcome.style.visibility=intro?'visible':'hidden';
 welcome.setAttribute('aria-hidden',String(!intro));welcome.querySelector('button').tabIndex=intro?0:-1;
 arrival.style.opacity=String(smooth(ramp(progress,.95,1)));arrival.style.visibility=arrived?'visible':'hidden';
 arrival.setAttribute('aria-hidden',String(!arrived));arrival.querySelector('a').tabIndex=arrived?0:-1;
 $('#scene-caption').textContent=progress<.49?'Seguí el sendero':progress<.83?'Entrá al corazón del bosque':'Tu lugar en el bosque';
 if(lite){
 canvas.style.opacity='0';
 const blend=(a,b)=>reduced.matches?(progress>b?1:0):smooth(ramp(progress,a,b));
 start.style.opacity=String(1-blend(.12,.28));open.style.opacity=String(1-blend(.4,.55));outside.style.opacity=String(1-blend(.72,.85));
 }else{start.style.opacity='1';open.style.opacity='1';outside.style.opacity='1';paint();pump();}
 const reservation=scrollY>=journey.offsetTop+journey.offsetHeight-innerHeight;
 document.body.classList.toggle('reservation-mode',reservation);
 document.body.classList.toggle('booking-in-view',scrollY>=journey.offsetTop+journey.offsetHeight-innerHeight*.35);
}
function schedule(){if(!raf)raf=requestAnimationFrame(()=>{raf=0;if(!driver)render(currentProgress());else{
 document.body.classList.toggle('booking-in-view',scrollY>=journey.offsetTop+journey.offsetHeight-innerHeight*.35);
 }});}
function go(p){scrollTo({top:journey.offsetTop+clamp(p)*(journey.offsetHeight-innerHeight),behavior:reduced.matches?'instant':'smooth'});}
function updateMode(){
 const available=!!(window.gsap&&window.ScrollTrigger&&ctx)&&!failed;
 if(!available||reduced.matches)lite=true;
 document.body.classList.toggle('lite',lite);
 $('#depth-mode').setAttribute('aria-pressed',String(!lite));$('#lite-mode').setAttribute('aria-pressed',String(lite));
 $('#depth-mode').disabled=!available||reduced.matches;
 $('#mode-note').textContent=reduced.matches?'Se respeta tu preferencia de movimiento reducido.':lite?'Recorrido con imágenes y transiciones suaves.':'Puerta, sendero e interior del salón en un mismo recorrido.';
 driver?.kill();driver=null;
 if(!lite&&available){
 gsap.registerPlugin(ScrollTrigger);const state={p:currentProgress()};
 const tween=gsap.fromTo(state,{p:0},{p:1,ease:'none',onUpdate:()=>render(state.p),scrollTrigger:{trigger:journey,start:'top top',end:'bottom bottom',scrub:.6}});
 driver={kill(){tween.scrollTrigger?.kill();tween.kill();},refresh(){tween.scrollTrigger?.refresh();}};
 }
 render(currentProgress());
}
$('#depth-mode').addEventListener('click',()=>{lite=false;updateMode();});
$('#lite-mode').addEventListener('click',()=>{lite=true;updateMode();});
$('#restart').addEventListener('click',()=>go(0));$('.enter').addEventListener('click',()=>go(.18));
$('.back-to-garden').addEventListener('click',()=>go(.52));
range.addEventListener('input',()=>scrollTo({top:journey.offsetTop+Number(range.value)/100*(journey.offsetHeight-innerHeight),behavior:'instant'}));
reduced.addEventListener('change',()=>{lite=reduced.matches||constrained;updateMode();});
addEventListener('scroll',schedule,{passive:true});
addEventListener('resize',()=>{sizeCanvas();driver?.refresh();render(currentProgress());});
document.querySelectorAll('a[href="#reserva"]').forEach(a=>a.addEventListener('click',e=>{
 e.preventDefault();$('#reserva').scrollIntoView({behavior:reduced.matches?'instant':'smooth'});$('#reserva').focus({preventScroll:true});
}));
new IntersectionObserver(entries=>{for(const e of entries)e.target.classList.toggle('is-visible',e.isIntersecting);},{threshold:.05}).observe($('#reserva'));
for(const im of [start,open,outside,end])im.addEventListener('load',paint);
sizeCanvas();updateMode();
})();
