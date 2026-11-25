'use strict';
(() => {
 const root=document.getElementById('erfahrung');if(!root)return;
 const track=root.querySelector('.pulse-results-track');if(!track)return;
 const cards=[...track.children],dots=root.querySelector('.pulse-results-dots'),prev=root.querySelector('.pulse-results-prev'),next=root.querySelector('.pulse-results-next'),count=root.querySelector('.pulse-results-count');
 const dialog=root.querySelector('dialog'),photo=dialog.querySelector('.pulse-results-dialog-photo'),caption=dialog.querySelector('.pulse-results-dialog-caption');
 let stops=[],page=0,opener=null,frame=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function paint(){page=stops.reduce((best,x,i)=>Math.abs(x-track.scrollLeft)<Math.abs(stops[best]-track.scrollLeft)?i:best,0);[...dots.children].forEach((b,i)=>b.setAttribute('aria-current',String(i===page)));prev.disabled=page===0;next.disabled=page===stops.length-1;count.textContent=String(page+1).padStart(2,'0')+' / '+String(stops.length).padStart(2,'0');}
 function go(i){track.scrollTo({left:stops[Math.max(0,Math.min(stops.length-1,i))],behavior:reduced.matches?'instant':'smooth'});}
 function layout(){const step=cards[1].offsetLeft-cards[0].offsetLeft;const visible=Math.max(1,Math.floor((track.clientWidth+24)/step));const max=track.scrollWidth-track.clientWidth;stops=[0];for(let x=step*visible;x<max-2;x+=step*visible)stops.push(x);if(max>2)stops.push(max);dots.replaceChildren(...stops.map((_,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Galerieseite '+(i+1));b.addEventListener('click',()=>go(i));return b}));paint();}
 prev.addEventListener('click',()=>go(page-1));next.addEventListener('click',()=>go(page+1));
 track.addEventListener('scroll',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(paint)},{passive:true});
 track.addEventListener('keydown',e=>{if(e.target!==track)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(page+(e.key==='ArrowRight'?1:-1));}});
 cards.forEach((card,i)=>card.querySelector('button').addEventListener('click',e=>{opener=e.currentTarget;const pair=card.querySelector('.pulse-results-pair').cloneNode(true);pair.querySelector('img').loading='eager';photo.replaceChildren(pair);caption.textContent=(i+1)+' / '+cards.length+' · '+card.querySelector('.pulse-results-caption>span').textContent;dialog.showModal();document.body.classList.add('pulse-results-modal-open');}));
 dialog.querySelector('.pulse-results-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()});
 dialog.addEventListener('close',()=>{document.body.classList.remove('pulse-results-modal-open');opener?.focus({preventScroll:true});});
 new ResizeObserver(layout).observe(track);layout();
})();
