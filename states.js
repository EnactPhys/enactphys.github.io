'use strict';
for (const item of window.ENACTPHYS_STATES) {
  const panel=document.createElement('article');panel.className='state-panel';
  const h=document.createElement('h3');h.textContent=item.kind==='embedding'?'Additional state analysis · t-SNE':item.title;
  const layout=document.createElement('div');layout.className='state-layout';
  const v=document.createElement('video');v.dataset.src=item.src;v.poster=item.poster;v.muted=true;v.defaultMuted=true;v.playsInline=true;v.controls=true;v.preload='none';v.setAttribute('aria-label',item.title);
  const graph=document.createElement('div');graph.className='state-graph';const canvas=document.createElement('canvas');canvas.width=850;canvas.height=290;canvas.setAttribute('role','img');canvas.setAttribute('aria-label',item.kind==='embedding'?'Twelve saved t-SNE coordinates, with the state nearest the current video frame highlighted.':'All 512 saved object-state components across video time.');
  const label=document.createElement('p');label.className='state-time';graph.append(canvas,label);layout.append(v,graph);
  const detail=document.createElement('details');detail.className='settings';const summary=document.createElement('summary');summary.textContent='Visualization details';const p=document.createElement('p');
  p.textContent=item.kind==='embedding'?'A selected historical example. All 12 saved coordinates are shown; the embedding is fixed during playback. Full 512D states; t-SNE perplexity 3, random seed 0. Coordinates are reused without refitting. Distances in this plot are not physical distances.':'All 512 components from one object are shown at the saved temporal slots. The display uses the paper’s fixed reference centering, scaling, feature orientation/order, and tanh(x/2). Lines join saved samples. The vertical line indicates the current video time.';
  detail.append(summary,p);panel.append(h,layout,detail);document.getElementById('state-panels').append(panel);
  const ctx=canvas.getContext('2d');let last=-1;
  function draw(){
    const frame=Math.min(item.frames-1,Math.round(v.currentTime*item.fps));if(last===frame)return;last=frame;
    const ix=item.sample_frames.reduce((best,f,i)=>Math.abs(f-frame)<Math.abs(item.sample_frames[best]-frame)?i:best,0);
    const W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);ctx.fillStyle='#f7fafc';ctx.fillRect(0,0,W,H);
    if(item.kind==='embedding'){
      const a=item.values;const xs=a.map(x=>x[0]),ys=a.map(x=>x[1]);const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);const scale=Math.min((W-90)/(x1-x0||1),(H-80)/(y1-y0||1));
      a.forEach((q,i)=>{const x=W/2+(q[0]-(x0+x1)/2)*scale,y=H/2-(q[1]-(y0+y1)/2)*scale;ctx.fillStyle=i===ix?'#b24998':'#c5d2de';ctx.beginPath();ctx.arc(x,y,i===ix?10:6,0,2*Math.PI);ctx.fill();ctx.fillStyle='#61748a';ctx.font='13px Arial';ctx.fillText(String(i+1),x+11,y+4);});
    }else{
      for(let d=0;d<512;d++){
        ctx.strokeStyle='rgba(40,119,153,.10)';ctx.lineWidth=.75;ctx.beginPath();item.values.forEach((row,i)=>{const x=20+item.sample_frames[i]/(item.frames-1)*(W-40),y=20+(1-row[d])/2*(H-60);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});ctx.stroke();
      }
      const x=20+frame/(item.frames-1)*(W-40);ctx.strokeStyle='#c48443';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,15);ctx.lineTo(x,H-32);ctx.stroke();ctx.font='13px Arial';ctx.fillStyle='#61748a';ctx.fillText('0 s',20,H-10);ctx.fillText(((item.frames-1)/item.fps).toFixed(2)+' s',W-60,H-10);
    }
    label.textContent=`Frame ${frame} · ${v.currentTime.toFixed(2)} s${item.kind==='embedding'?' · state '+(ix+1):' · 512 components'}`;
  }
  v.addEventListener('timeupdate',draw);v.addEventListener('seeked',draw);v.addEventListener('loadeddata',draw);draw();
  const observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting&&!v.getAttribute('src')){v.src=v.dataset.src;v.load();}if(!e.isIntersecting)v.pause();}},{rootMargin:'150px'});observer.observe(panel);
}
