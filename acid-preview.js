// Supporting-page preview: validation works; no support, cancellation or contract request is sent.
document.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();const form=event.target;if(!form.reportValidity())return;let status=form.querySelector('[data-preview-status]');if(!status){status=document.createElement('p');status.dataset.previewStatus='';status.className='preview-local-note';status.setAttribute('role','status');form.append(status)}status.textContent='Vorschau geprüft – nichts übermittelt. Diese Ansicht löst keine Anfrage, Kündigung oder Zahlung aus.'},true);
if(document.querySelector('form')){const n=document.createElement('p');n.className='preview-local-note';n.textContent='Ansichtsvorschau: Formulare werden hier nicht übermittelt.';document.querySelector('form').before(n)}

document.querySelectorAll("form button[type=submit]").forEach(button=>button.disabled=false);
