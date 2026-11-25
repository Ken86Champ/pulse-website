'use strict';
(() => {
 const toggle=document.getElementById('af-menu-toggle'),menu=document.getElementById('af-menu');
 function closeMenu(){menu.classList.remove('is-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Menü öffnen');}
 toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')!=='true';menu.classList.toggle('is-open',open);toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'Menü schliessen':'Menü öffnen');});
 menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeMenu();}});
 const tabs=[...document.querySelectorAll('[role=tab]')];
 function activate(tab,focus=false){tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!active;});if(focus)tab.focus();}
 tabs.forEach((tab,i)=>{tab.addEventListener('click',()=>activate(tab));tab.addEventListener('keydown',e=>{let target;if(e.key==='ArrowRight'||e.key==='ArrowDown')target=(i+1)%tabs.length;if(e.key==='ArrowLeft'||e.key==='ArrowUp')target=(i+tabs.length-1)%tabs.length;if(e.key==='Home')target=0;if(e.key==='End')target=tabs.length-1;if(target!==undefined){e.preventDefault();activate(tabs[target],true);}});});
 const form=document.getElementById('affiliate-form'),ready=document.getElementById('af-email-ready'),link=document.getElementById('af-email-link'),copy=document.getElementById('af-copy'),status=document.getElementById('af-copy-status');let emailText='';
 document.querySelectorAll('[data-profile]').forEach(a=>a.addEventListener('click',()=>{document.getElementById('af-profile').value=a.dataset.profile;ready.hidden=true;}));
 form.addEventListener('input',()=>{ready.hidden=true;document.getElementById('af-name').setCustomValidity('');document.getElementById('af-idea').setCustomValidity('');});
 form.addEventListener('submit',e=>{e.preventDefault();const name=document.getElementById('af-name'),idea=document.getElementById('af-idea');name.setCustomValidity(name.value.trim().length?'':'Bitte gib deinen Namen ein.');idea.setCustomValidity(idea.value.trim().length>=10?'':'Bitte beschreibe deine Idee mit mindestens 10 Zeichen.');if(!form.reportValidity())return;const values=Object.fromEntries(new FormData(form));
 emailText=['PULSE Partneranfrage','','Name: '+values.name.trim(),'E-Mail: '+values.email.trim(),'Partnerprofil: '+values.profile,'Website / Social Media: '+(values.channel.trim()||'Nicht angegeben'),'','Meine Idee:',values.idea.trim()].join('\n');
 link.href='mailto:hello.pulse.coach@gmail.com?subject='+encodeURIComponent('PULSE Partneranfrage – '+values.profile)+'&body='+encodeURIComponent(emailText);ready.hidden=false;status.textContent='';link.focus({preventScroll:true});ready.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});
 });
 copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(emailText);status.textContent='Anfrage kopiert. Du kannst sie in deine E-Mail einfügen.';}catch{status.textContent='Bitte öffne die vorbereitete E-Mail über „E-Mail öffnen“.';}});
})();
