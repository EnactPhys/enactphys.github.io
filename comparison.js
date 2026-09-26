(() => {
'use strict';
const items=[
{id:'mu',label:'Friction μ',frame:48,note:'Compare motion along the ramp across five friction settings.'},
{id:'g',label:'Gravity g',frame:48,note:'Compare motion responses as gravity varies.'},
{id:'e',label:'Restitution e',frame:27,note:'Watch the complete descent, ground contact, and rebound.'},
{id:'F',label:'Force F',frame:48,note:'All five force settings are shown; some neighboring responses remain close.'},
{id:'m',label:'Mass m',frame:24,note:'Vary the left driver’s mass and observe the right receiver’s response. Mass values are normalized.'}];
const section=document.querySelector('#comparison'),v=document.querySelector('#comparison-player'),tabs=section.querySelector('.comparison-tabs');
window.enactphysPoster(v);
const base='assets/comparison/',reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let active=items[0],visible=false,near=false,userPaused=reduced,switching=false,pendingFrame=null;
function prepare(){if(v.getAttribute('src'))return;switching=true;v.preload='auto';v.src=base+active.id+'_original_speed_comparison.mp4';v.load();}
function play(){if(visible&&!document.hidden&&!userPaused){prepare();v.play().catch(()=>{});}}
function choose(c){switching=true;v.pause();active=c;pendingFrame=null;userPaused=reduced;v.removeAttribute('src');v.dataset.poster=base+c.id+'_poster.jpg';v.poster=v.dataset.poster;v.load();section.querySelector('#comparison-title').textContent=c.label;section.querySelector('#comparison-note').textContent=c.note;section.querySelector('#comparison-download').href=base+c.id+'_original_speed_comparison.mp4';for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.dataset.id===c.id));if(near||visible)prepare();play();}
for(const c of items){const b=document.createElement('button');b.type='button';b.textContent=c.label;b.dataset.id=c.id;b.setAttribute('aria-pressed',String(c===active));b.onclick=()=>choose(c);tabs.append(b);}
v.addEventListener('loadeddata',()=>{switching=false;if(pendingFrame!==null){v.currentTime=pendingFrame;pendingFrame=null;}else play();});
v.addEventListener('pause',()=>{if(visible&&!switching&&!document.hidden&&!v.ended)userPaused=true;});
v.addEventListener('play',()=>{userPaused=false;});
new IntersectionObserver(es=>{near=es[0].isIntersecting;if(near)prepare();},{rootMargin:'180px'}).observe(v);
new IntersectionObserver(es=>{visible=es[0].isIntersecting;if(visible)play();else v.pause();},{threshold:0}).observe(v);
document.addEventListener('visibilitychange',()=>{if(document.hidden)v.pause();else play();});
section.querySelector('#comparison-replay').onclick=()=>{userPaused=false;pendingFrame=null;prepare();v.currentTime=0;v.play().catch(()=>{});};
section.querySelector('#comparison-still').onclick=()=>{userPaused=true;v.pause();prepare();if(v.readyState>=1)v.currentTime=active.frame/16;else pendingFrame=active.frame/16;};
})();
