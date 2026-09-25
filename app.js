'use strict';
const groups = window.ENACTPHYS_EXAMPLES.groups;
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
window.enactphysPoster=v=>posterObserver.observe(v);
let activeGroup=null,selectionTimer;
function pause(s,release=false){
  s.token++;s.controller?.abort();s.videos.forEach(v=>{
    v.pause();
    if(release&&v.getAttribute('src')&&v.readyState<4){v.removeAttribute('src');v.load();}
  });
  s.status.textContent='';
}
function activate(s){
  const previous=activeGroup;
  if(previous&&previous!==s)pause(previous,true);
  activeGroup=s;previous?.update();s.update();
}
function visibleFraction(s){
  if(s.el.hidden)return 0;
  const r=s.grid.getBoundingClientRect(),top=88;
  return Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,top))/Math.min(r.height,innerHeight-top);
}
function selectVisible(){
  if(document.hidden)return;
  for(const s of states.values())s.visible=visibleFraction(s)>=.45;
  const next=activeGroup?.visible?activeGroup:[...states.values()].filter(s=>s.visible).sort((a,b)=>visibleFraction(b)-visibleFraction(a))[0];
  if(next!==activeGroup){
    const previous=activeGroup;if(previous)pause(previous,true);
    activeGroup=next||null;previous?.update();next?.update();
    if(next&&!next.paused)play(next);
  }
}
function scheduleSelection(){clearTimeout(selectionTimer);selectionTimer=setTimeout(selectVisible,100);}

function loaded(v,signal){
  if(v.readyState>=3)return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const finish=(err)=>{clearTimeout(timer);v.removeEventListener('canplay',ready);v.removeEventListener('error',fail);signal.removeEventListener('abort',cancel);err?reject(err):resolve();};
    const ready=()=>finish();const fail=()=>finish(new Error('Video unavailable'));const cancel=()=>finish(new DOMException('Playback cancelled','AbortError'));
    const timer=setTimeout(()=>finish(new Error('Loading timed out')),20000);
    v.addEventListener('canplay',ready,{once:true});v.addEventListener('error',fail,{once:true});signal.addEventListener('abort',cancel,{once:true});
    if(!v.getAttribute('src')){v.src=v.dataset.src;v.load();}
  });
}
async function play(s,restart=false){
  activate(s);s.controller?.abort();s.controller=new AbortController();
  const token=++s.token;s.status.textContent='Loading…';
  try{
    await Promise.all(s.videos.map(v=>loaded(v,s.controller.signal)));
    if(token!==s.token||s.el.hidden||document.hidden)return;
    if(restart)await Promise.all(s.videos.map(v=>new Promise(resolve=>{if(v.currentTime<.01){resolve();return;}v.addEventListener('seeked',()=>resolve(),{once:true});v.currentTime=0;})));
    if(token!==s.token||s.el.hidden||document.hidden)return;
    await Promise.all(s.videos.map(v=>v.play()));
    if(token!==s.token||activeGroup!==s||document.hidden){s.videos.forEach(v=>v.pause());return;}
    s.status.textContent='';
  }catch(e){if(token===s.token)s.status.textContent='Press Replay to load and play this group.';}
}
function mount(g){
  const el=document.createElement('article');el.className='group';el.id=g.id;
  const head=document.createElement('div');head.className='group-head';
  const title=document.createElement('h3');title.textContent=g.title;
  const controls=document.createElement('div');controls.className='group-controls';
  const replay=document.createElement('button');replay.textContent='↻ Replay';replay.setAttribute('aria-label',`Replay ${g.title}`);
  const toggle=document.createElement('button');toggle.textContent=reduceMotion?'Play':'Pause';toggle.setAttribute('aria-label',`Play or pause ${g.title}`);
  controls.append(replay,toggle);head.append(title,controls);
  const grid=document.createElement('div');grid.className='clips'+((g.clips.length===2||g.clips.length===4)?' two':g.clips.length===5?' five':'');
  const videos=g.clips.map(c=>{
    const fig=document.createElement('figure');fig.className='clip';
    const v=document.createElement('video');v.dataset.src=c.src;v.dataset.poster=c.poster;v.muted=true;v.defaultMuted=true;v.playsInline=true;v.preload='none';v.controls=true;v.setAttribute('aria-label',`${g.title}, ${c.label}`);
    const cap=document.createElement('figcaption');const level=document.createElement('span');level.textContent=c.label;const value=document.createElement('span');value.textContent=parameterLabel(c);cap.append(level,value);
    fig.append(v,cap);grid.append(fig);return v;
  });
  const status=document.createElement('p');status.className='status';status.setAttribute('role','status');
  const details=document.createElement('details');details.className='settings';const summary=document.createElement('summary');summary.textContent='Prompt & settings';const info=document.createElement('pre');
  info.textContent=g.clips.map(c=>`${c.label}\n${c.prompt||'Prompt not recorded in the available receipt.'}\nSeed ${c.seed??'not recorded'} · ${c.frames} frames · ${c.fps} fps · guidance ${c.cfg_scale??'not recorded'}\n${JSON.stringify(c.parameters,null,2)}`).join('\n\n');details.append(summary,info);
  el.append(head,grid,status,details);document.getElementById(containers[g.section]).append(el);
  videos.forEach(v=>window.enactphysPoster(v));
  const s={el,grid,videos,status,toggle,token:0,paused:reduceMotion,visible:false};states.set(el,s);
  const update=()=>{const playing=activeGroup===s&&!s.paused;toggle.textContent=playing?'Pause':'Play';toggle.setAttribute('aria-pressed',String(playing));};s.update=update;update();
  replay.addEventListener('click',()=>{s.paused=false;update();play(s,true);});
  toggle.addEventListener('click',()=>{s.paused=activeGroup===s&&!s.paused;s.paused?pause(s):play(s);update();});
  videos.forEach(v=>v.addEventListener('play',()=>{activate(s);s.paused=false;update();}));
  videos[0].addEventListener('ended',()=>{if(activeGroup===s&&s.visible&&!s.paused&&!document.hidden)play(s,true);});
  return el;
}
groups.forEach(mount);
addEventListener('scroll',scheduleSelection,{passive:true});
addEventListener('resize',scheduleSelection);
scheduleSelection();
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){if(activeGroup)pause(activeGroup,true);activeGroup=null;}
  else scheduleSelection();
});
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  groups.filter(g=>g.section==='appendix').forEach(g=>{
    const el=document.getElementById(g.id);el.hidden=button.dataset.filter!=='all'&&!g.id.startsWith(button.dataset.filter+'_');if(el.hidden)pause(states.get(el),true);
  });
  scheduleSelection();
}));
