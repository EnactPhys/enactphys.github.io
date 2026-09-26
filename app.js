'use strict';
window.enactphysMedia = src => src.replace(/^assets\/(paper|states)\//, 'assets/stream/$1/');
const groups = window.ENACTPHYS_EXAMPLES.groups.filter(g => !['extra-basketball', 'joint-collision', 'joint-drop'].includes(g.id));
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const states = new Map();
const containers = {fine:'fine-groups',joint:'joint-groups',featured:'featured-groups',compositional:'composition-groups',appendix:'appendix-groups',additional:'additional-groups'};
const symbols = {g:'g',mu:'μ',e:'e',F_N:'F',effective_support_mu:'μ (support)',effective_receiver_mu:'μ (receiver)',effective_pair_e:'e (pair)'};
function parameterLabel(c) {
  const p=c.parameters;
  if (p.axis) return `${symbols[p.axis]||p.axis} = ${Number((p.value??p.normalized_value).toPrecision(4))}${p.normalized_value!==undefined?' (norm.)':''}`;
  if (p.g_ms2!==undefined) return `g = ${p.g_ms2}${p.e!==undefined?' · e = '+p.e:p.mu!==undefined?' · μ = '+p.mu:''}`;
  return '';
}
const posterObserver=new IntersectionObserver(entries=>{
  for(const e of entries)if(e.isIntersecting){const v=e.target;v.poster=v.dataset.poster;posterObserver.unobserve(v);}
},{rootMargin:'180px'});
window.enactphysPoster=v=>{if(v.dataset.poster)posterObserver.observe(v);};
let selectionTimer;
function pause(s){
  s.token++;s.controller?.abort();s.mode='idle';
  s.videos.forEach(v=>{
    v.pause();
  });
  s.status.textContent='';s.update();
}
function visibleFraction(s){
  if(s.el.hidden)return 0;
  const r=s.grid.getBoundingClientRect(),top=64;
  return Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,top))/Math.min(r.height,innerHeight-top);
}
function selectVisible(){
  for(const s of states.values()){
    const visible=!document.hidden&&visibleFraction(s)>.1;
    const entered=visible&&!s.visible;s.visible=visible;
    if(!visible){if(s.mode==='loading'||s.mode==='playing')pause(s);}
    else if(!s.paused&&(entered||s.mode==='idle'))play(s);
  }
  warmNext();
}
function scheduleSelection(){clearTimeout(selectionTimer);selectionTimer=setTimeout(selectVisible,60);}
function prepare(s){
  if(s.el.hidden||document.hidden)return;
  s.videos.forEach(v=>{if(!v.getAttribute('src')){v.preload='auto';v.src=v.dataset.src;v.load();}});
}
// Give visible comparisons the bandwidth first; warm one upcoming row once
// they have buffered, and keep completed/in-flight downloads when scrolling.
function warmNext(){
  if(document.hidden)return;
  const visible=[...states.values()].filter(s=>s.visible);
  if(visible.some(s=>s.videos.some(v=>!v.buffered.length||v.buffered.end(v.buffered.length-1)<v.duration-.03)))return;
  const next=[...states.values()].filter(s=>!s.el.hidden&&!s.visible&&s.grid.getBoundingClientRect().top>=innerHeight)
    .sort((a,b)=>a.grid.getBoundingClientRect().top-b.grid.getBoundingClientRect().top)[0];
  if(next&&next.grid.getBoundingClientRect().top<innerHeight+800)prepare(next);
}
function hasPlaybackBuffer(v){
  if(v.readyState<3)return false;
  for(let i=0;i<v.buffered.length;i++){
    if(v.buffered.start(i)<=v.currentTime+.03&&v.buffered.end(i)-v.currentTime>=Math.min(1,v.duration-v.currentTime)-.02)return true;
  }
  return false;
}
function mediaReady(v,signal){
  if(signal.aborted)return Promise.reject(new DOMException('Cancelled','AbortError'));
  if(hasPlaybackBuffer(v))return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const events=['canplay','canplaythrough','progress','loadeddata'];
    const finish=err=>{clearTimeout(timer);events.forEach(e=>v.removeEventListener(e,check));v.removeEventListener('error',fail);signal.removeEventListener('abort',cancel);err?reject(err):resolve();};
    const check=()=>{if(hasPlaybackBuffer(v))finish();};
    const fail=()=>finish(new Error('Video unavailable'));
    const cancel=()=>finish(new DOMException('Cancelled','AbortError'));
    const timer=setTimeout(()=>finish(new Error('Loading timed out')),60000);
    events.forEach(e=>v.addEventListener(e,check));v.addEventListener('error',fail,{once:true});signal.addEventListener('abort',cancel,{once:true});
    check();
  });
}
function seek(v,time,signal){
  if(signal.aborted)return Promise.reject(new DOMException('Cancelled','AbortError'));
  if(Math.abs(v.currentTime-time)<.005&&!v.seeking)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const finish=err=>{clearTimeout(timer);v.removeEventListener('seeked',done);signal.removeEventListener('abort',cancel);err?reject(err):resolve();};
    const done=()=>finish();const cancel=()=>finish(new DOMException('Cancelled','AbortError'));
    const timer=setTimeout(()=>finish(new Error('Seek timed out')),10000);
    v.addEventListener('seeked',done,{once:true});signal.addEventListener('abort',cancel,{once:true});v.currentTime=time;
  });
}
async function play(s,restart=false){
  if(s.mode==='loading'&&!restart)return;
  pause(s);s.mode='loading';s.controller=new AbortController();
  const token=s.token,signal=s.controller.signal;s.status.textContent='Loading comparison…';s.update();
  prepare(s);
  try{
    await Promise.all(s.videos.map(v=>mediaReady(v,signal)));
    if(token!==s.token||s.el.hidden||document.hidden)return;
    const time=restart||s.videos.some(v=>v.ended)?0:Math.min(...s.videos.map(v=>v.currentTime));
    await Promise.all(s.videos.map(v=>seek(v,time,signal)));
    if(token!==s.token||s.el.hidden||document.hidden)return;
    await Promise.all(s.videos.map(v=>v.play()));
    if(token!==s.token)return;
    s.mode='playing';s.status.textContent='';s.update();warmNext();
  }catch(e){
    if(token!==s.token)return;
    pause(s);s.mode='error';
    s.status.textContent=e.name==='NotAllowedError'?'Tap Play to start this comparison.':'This comparison is still loading. Press Replay to retry.';s.update();
  }
}
function mount(g){
  const el=document.createElement('article');el.className='group';el.id=g.id;
  const head=document.createElement('div');head.className='group-head';
  const title=document.createElement('h3');title.textContent=g.title;
  const controls=document.createElement('div');controls.className='group-controls';
  const replay=document.createElement('button');replay.textContent='↻ Replay';replay.setAttribute('aria-label',`Replay ${g.title}`);
  const toggle=document.createElement('button');toggle.textContent=reduceMotion?'Play':'Pause';toggle.setAttribute('aria-label',`Play or pause ${g.title}`);
  controls.append(replay,toggle);head.append(title,controls);
  const grid=document.createElement('div');grid.className='clips'+(g.clips.length===1?' one':'')+((g.clips.length===2||g.clips.length===4)?' two':g.clips.length===5?' five':'');
  const videos=g.clips.map(c=>{
    const fig=document.createElement('figure');fig.className='clip';
    const v=document.createElement('video');v.dataset.src=c.preview||window.enactphysMedia(c.src);if(c.poster)v.dataset.poster=c.poster;v.muted=true;v.defaultMuted=true;v.playsInline=true;v.setAttribute('muted','');v.setAttribute('playsinline','');v.preload='none';v.controls=true;v.setAttribute('aria-label',`${g.title}, ${c.label}`);
    const cap=document.createElement('figcaption');const level=document.createElement('span');level.textContent=c.label;const value=document.createElement('span');value.textContent=parameterLabel(c);cap.append(level,value);
    fig.append(v,cap);grid.append(fig);return v;
  });
  const status=document.createElement('p');status.className='status';status.setAttribute('role','status');
  const details=document.createElement('details');details.className='settings';const summary=document.createElement('summary');summary.textContent='Prompt & settings';const info=document.createElement('pre');
  const originals=document.createElement('p');originals.className='original-links';
  let settingsLoaded=false,settingsLoading=false;
  details.addEventListener('toggle',async()=>{
    if(!details.open||settingsLoaded||settingsLoading)return;
    settingsLoading=true;info.textContent='Loading settings…';
    try{
      const response=await fetch(g.settings);
      if(!response.ok)throw new Error('Settings unavailable');
      const full=await response.json();
      const clips=full.originals||full.clips;
      info.textContent=clips.map(c=>`${c.label}\n${c.prompt||'Prompt not recorded in the available receipt.'}\nSeed ${c.seed??'not recorded'} · ${c.frames} frames · ${c.fps} fps · guidance ${c.cfg_scale??'not recorded'}\n${JSON.stringify(c.parameters,null,2)}`).join('\n\n');
      originals.replaceChildren('Original videos: ');
      clips.forEach((c,i)=>{if(i)originals.append(' · ');const a=document.createElement('a');a.href=c.src;a.textContent=c.label;a.target='_blank';a.rel='noopener';originals.append(a);});
      settingsLoaded=true;
    }catch(error){info.textContent='Settings could not load. Close and reopen to retry, or download Example settings at the bottom of this page.';}
    finally{settingsLoading=false;}
  });
  details.append(summary,info,originals);
  el.append(head,grid);if(g.caption){const caption=document.createElement('p');caption.className='matrix-caption';caption.textContent=g.caption;el.append(caption);}el.append(status,details);document.getElementById(containers[g.section]).append(el);
  videos.forEach(v=>window.enactphysPoster(v));
  const s={el,grid,videos,status,toggle,token:0,paused:reduceMotion,visible:false,mode:'idle'};states.set(el,s);
  const update=()=>{const playing=(s.mode==='playing'||s.mode==='loading')&&!s.paused;toggle.textContent=playing?'Pause':'Play';toggle.setAttribute('aria-pressed',String(playing));};s.update=update;update();
  replay.addEventListener('click',()=>{s.paused=false;update();play(s,true);});
  toggle.addEventListener('click',()=>{s.paused=s.mode==='playing'||s.mode==='loading';s.paused?pause(s):play(s);update();});
  videos.forEach(v=>{
    v.addEventListener('canplaythrough',warmNext);
    v.addEventListener('progress',warmNext);
    v.addEventListener('play',()=>{
      if(s.mode==='idle'||s.mode==='error'){s.paused=false;play(s);}
    });
    v.addEventListener('ended',()=>{
      if(s.visible&&!s.paused&&!document.hidden&&s.videos.every(x=>x.ended))play(s,true);
    });
    v.addEventListener('waiting',()=>{if(s.mode==='playing'&&s.visible&&!s.paused)play(s);});
  });
  return el;
}
groups.forEach(mount);
addEventListener('scroll',scheduleSelection,{passive:true});
addEventListener('resize',scheduleSelection);
scheduleSelection();
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){states.forEach(s=>{s.visible=false;pause(s);});}
  else scheduleSelection();
});
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  groups.filter(g=>g.section==='appendix').forEach(g=>{
    const el=document.getElementById(g.id);el.hidden=button.dataset.filter!=='all'&&!g.id.startsWith(button.dataset.filter+'_');if(el.hidden)pause(states.get(el));
  });
  scheduleSelection();
}));

// Keep below-the-fold figures and analysis data off the first-video request path.
const figureObserver=new IntersectionObserver(entries=>{
  for(const e of entries)if(e.isIntersecting){const img=e.target;img.loading='eager';img.src=img.dataset.src;figureObserver.unobserve(img);}
},{rootMargin:'400px'});
document.querySelectorAll('img[data-src]').forEach(img=>figureObserver.observe(img));
const analysisObserver=new IntersectionObserver(entries=>{
  if(!entries.some(e=>e.isIntersecting))return;
  analysisObserver.disconnect();
  const data=document.createElement('script');data.src='state_data.js';
  data.onload=()=>{const view=document.createElement('script');view.src='states.js?v=5';document.head.append(view);};
  document.head.append(data);
},{rootMargin:'600px'});
const stateSection=document.getElementById('states');
if(stateSection)analysisObserver.observe(stateSection);

// Keep the section navigation aligned with the content currently in view.
const sectionLinks=[...document.querySelectorAll('.site-nav nav a')];
let navigationFrame=0;
function updateSectionNavigation(){
  navigationFrame=0;
  const sections=[...document.querySelectorAll('main > section[id]')];
  const current=sections.filter(section=>section.getBoundingClientRect().top<180).at(-1);
  for(const link of sectionLinks){
    if(current&&link.hash===`#${current.id}`)link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  }
}
addEventListener('scroll',()=>{if(!navigationFrame)navigationFrame=requestAnimationFrame(updateSectionNavigation);},{passive:true});
updateSectionNavigation();
