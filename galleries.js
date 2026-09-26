'use strict';
// Show one matched scene at a time; every accepted example remains selectable.
for (const id of ['featured-groups','fine-groups','joint-groups','additional-groups']) {
  const container=document.getElementById(id);
  if(!container)continue;
  const items=[...container.children].filter(el=>el.matches('.group'));
  if(items.length<2)continue;
  let index=0,filter='all';
  const bar=document.createElement('div');bar.className='scene-selector';
  const previous=document.createElement('button');previous.textContent='←';previous.setAttribute('aria-label','Previous scene');
  const next=document.createElement('button');next.textContent='→';next.setAttribute('aria-label','Next scene');
  const select=document.createElement('select');select.setAttribute('aria-label','Choose a scene');
  const count=document.createElement('span');count.className='scene-count';count.setAttribute('aria-live','polite');
  function visibleItems(){return items.filter(el=>filter==='all'||el.id.startsWith(filter+'_'));}
  function render(){
    const available=visibleItems();index=Math.max(0,Math.min(index,available.length-1));
    items.forEach(el=>{el.hidden=el!==available[index];});
    select.replaceChildren(...available.map((el,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=el.querySelector('h3').textContent;return o;}));
    select.value=String(index);count.textContent=`${available.length?index+1:0} / ${available.length}`;
    previous.disabled=next.disabled=available.length<2;
    window.dispatchEvent(new Event('resize'));
  }
  previous.addEventListener('click',()=>{index=(index-1+visibleItems().length)%visibleItems().length;render();});
  next.addEventListener('click',()=>{index=(index+1)%visibleItems().length;render();});
  select.addEventListener('change',()=>{index=Number(select.value);render();});
  if(id==='appendix-groups')document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;index=0;render();}));
  bar.append(previous,select,count,next);container.before(bar);render();
}
