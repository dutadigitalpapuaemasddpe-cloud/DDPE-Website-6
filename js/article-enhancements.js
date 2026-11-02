(function(){
 'use strict';
 function start(){
  const root=document.getElementById('article-root');if(!root||root.hidden||root.dataset.readerReady)return;
  root.dataset.readerReady='true';const id=root.dataset.articleId,e=window.DDPEEditorial;
  const copy=root.querySelector('[data-copy-article]');
  if(copy)copy.addEventListener('click',async()=>{const status=root.querySelector('[data-share-status]');try{await navigator.clipboard.writeText(document.querySelector('link[rel=canonical]').href);status.textContent='Tautan disalin.';}catch(_){status.textContent='Salin URL dari bilah alamat browser.';}});
  fetch('/api/public-articles?limit=50').then(r=>{if(!r.ok)throw Error();return r.json();}).then(p=>{
   const rows=(p.articles||[]).filter(a=>a.id!==id&&a.slug!==root.dataset.articleSlug).sort((a,b)=>Number(b.category===root.dataset.articleCategory)-Number(a.category===root.dataset.articleCategory)).slice(0,5);
   const list=root.querySelector('.related-list');rows.forEach(a=>{const link=document.createElement('a');link.href='/artikel.html?id='+encodeURIComponent(a.slug||a.id);const title=document.createElement('h3');title.textContent=a.title;const small=document.createElement('small');small.textContent=a.category_label||a.category||'Berita';link.append(small,title);list.append(link);});root.querySelector('[data-related-status]').textContent=rows.length?'':'Belum ada artikel terkait.';
  }).catch(()=>root.querySelector('[data-related-status]').textContent='Berita terkait belum dapat dimuat.');
  const status=root.querySelector('[data-discussion-status]'),like=root.querySelector('[data-like-article]'),form=root.querySelector('[data-comment-form]');
  const store={get(k){try{return localStorage.getItem(k);}catch(_){return null;}},set(k,v){try{localStorage.setItem(k,v);}catch(_){}}};
  let visitor=store.get('ddpe_reader_id');if(!visitor){visitor=crypto.randomUUID();store.set('ddpe_reader_id',visitor);}
  let liked=store.get('ddpe_liked_'+id)==='1';like.setAttribute('aria-pressed',String(liked));
  async function load(){const r=await fetch('/api/engagement?id='+encodeURIComponent(id));if(!r.ok)throw Error();const p=await r.json();root.querySelector('[data-like-count]').textContent='('+p.likes+')';const list=root.querySelector('[data-comments]');list.replaceChildren();p.comments.forEach(c=>{const item=document.createElement('article'),name=document.createElement('strong'),body=document.createElement('p');name.textContent=c.name;body.textContent=c.body;item.append(name,body);list.append(item);});}
  async function send(body){const r=await fetch('/api/engagement',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,...body})});if(!r.ok)throw Error(r.status===429?'Terlalu banyak permintaan. Coba beberapa saat lagi.':'Belum tersimpan. Coba lagi.');}
  load().catch(()=>status.textContent='Suka dan komentar belum dapat dimuat.');
  like.addEventListener('click',async()=>{like.disabled=true;try{await send({action:'like',visitor,liked:!liked});liked=!liked;store.set('ddpe_liked_'+id,liked?'1':'0');like.setAttribute('aria-pressed',String(liked));await load();status.textContent='Tersimpan.';}catch(err){status.textContent=err.message;}finally{like.disabled=false;}});
  form.addEventListener('submit',async ev=>{ev.preventDefault();if(!form.reportValidity())return;const button=form.querySelector('button');button.disabled=true;try{await send({action:'comment',name:form.elements.name.value,body:form.elements.body.value});form.reset();status.textContent='Komentar terkirim dan menunggu moderasi redaksi.';}catch(err){status.textContent=err.message;}finally{button.disabled=false;}});
 }
 document.addEventListener('ddpe:article-ready',start);start();
})();
