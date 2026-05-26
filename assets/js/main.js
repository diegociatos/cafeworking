document.addEventListener('DOMContentLoaded',()=>{
  const t=document.querySelector('.mobile-toggle'),m=document.querySelector('.menu');
  if(t&&m)t.onclick=()=>m.classList.toggle('open');
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{
    const id=a.getAttribute('href'); const el=document.querySelector(id);
    if(el){e.preventDefault();el.scrollIntoView({behavior:'smooth'});m?.classList.remove('open')}
  }));

  const saveLead=(form)=>{
    const data=Object.fromEntries(new FormData(form).entries());
    if(data['bot-field']) return null;
    const lead={
      id:Date.now(),
      origem:form.dataset.formTitle || form.getAttribute('name') || 'Site',
      page:location.pathname,
      data:new Date().toLocaleString('pt-BR'),
      ...data
    };
    const leads=JSON.parse(localStorage.getItem('cw_leads')||'[]');
    leads.unshift(lead);
    localStorage.setItem('cw_leads',JSON.stringify(leads.slice(0,120)));
    return lead;
  };

  const sendLeadWebhook=async(lead,kind='lead')=>{
    if(!lead) return;
    const url=kind==='reserva'?'/.netlify/functions/reserva-webhook':'/.netlify/functions/lead-webhook';
    try{
      await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(lead)});
    }catch(e){
      // Em prévia local sem Netlify Functions, o lead continua salvo no localStorage.
      console.info('Webhook CafeWorking indisponível nesta prévia:', e.message);
    }
  };

  document.querySelectorAll('.lead-form').forEach(form=>{
    form.addEventListener('submit',()=>{
      const lead=saveLead(form);
      const kind=(form.dataset.formTitle||'').toLowerCase().includes('reserva')?'reserva':'lead';
      sendLeadWebhook(lead,kind);
    });
  });

  const list=document.querySelector('[data-leads-list]');
  if(list){
    const leads=JSON.parse(localStorage.getItem('cw_leads')||'[]');
    if(!leads.length){
      list.innerHTML='<div class="task"><div><b>Nenhum lead local ainda</b><br><small>Os formulários enviados nesta prévia aparecerão aqui. No Netlify, eles também serão capturados pelo Forms.</small></div><span class="status">Vazio</span></div>';
    }else{
      list.innerHTML=leads.map(l=>`<div class="task"><div><b>${l.nome||l.empresa||'Lead sem nome'}</b><br><small>${l.origem} · ${l.interesse||'Sem interesse'} · ${l.whatsapp||''} · ${l.data}</small></div><span class="status ok">Novo</span></div>`).join('');
    }
  }

  const count=document.querySelector('[data-leads-count]');
  if(count){count.textContent=JSON.parse(localStorage.getItem('cw_leads')||'[]').length;}
});


// V33 — PWA install prompt, service worker and simple event tracking
(function(){
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
  }
  let deferredPrompt;
  const banner=document.createElement('div');
  banner.className='install-banner';
  banner.innerHTML='<strong>Instale o CafeWorking</strong><p>Acesse reservas, área do cliente e informações rapidamente.</p><div class="actions"><button class="btn btn-primary" id="installAppBtn">Instalar</button><button class="btn btn-outline" id="dismissInstallBtn">Agora não</button></div>';
  document.addEventListener('DOMContentLoaded',()=>{
    document.body.appendChild(banner);
    document.querySelectorAll('a[href*="wa.me"], .btn, form').forEach(el=>{
      el.addEventListener('click',()=>{
        try{ localStorage.setItem('cw_last_event', JSON.stringify({type:el.tagName, text:(el.innerText||el.getAttribute('href')||'').slice(0,80), at:new Date().toISOString()})); }catch(e){}
      });
    });
  });
  window.addEventListener('beforeinstallprompt',(e)=>{
    e.preventDefault(); deferredPrompt=e;
    if(!localStorage.getItem('cw_install_dismissed')) banner.classList.add('show');
  });
  document.addEventListener('click',async(e)=>{
    if(e.target && e.target.id==='dismissInstallBtn'){ banner.classList.remove('show'); localStorage.setItem('cw_install_dismissed','1'); }
    if(e.target && e.target.id==='installAppBtn' && deferredPrompt){ deferredPrompt.prompt(); deferredPrompt=null; banner.classList.remove('show'); }
  });
})();


// V35 — copiar modelos de mensagem comercial
(function(){
  document.addEventListener('click', async (e)=>{
    const btn=e.target.closest('[data-copy-template]');
    if(!btn) return;
    const card=btn.closest('.template-card');
    const p=card?.querySelector('p');
    if(!p) return;
    const text=p.innerText.trim();
    try{ await navigator.clipboard.writeText(text); btn.textContent='Copiado!'; setTimeout(()=>btn.textContent='Copiar mensagem',1600); }
    catch(err){ prompt('Copie a mensagem:', text); }
  });
})();


// V36 mobile menu hardening
(function(){
  const btn=document.querySelector('.mobile-toggle');
  const menu=document.querySelector('.menu');
  if(btn && menu){
    btn.addEventListener('click',()=>{
      menu.classList.toggle('open');
      btn.textContent=menu.classList.contains('open')?'×':'☰';
    });
  }
})();
