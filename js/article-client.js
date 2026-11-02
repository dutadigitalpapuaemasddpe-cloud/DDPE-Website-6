(async function(){
  'use strict';
  const state=document.getElementById('article-state'), root=document.getElementById('article-root'), e=window.DDPEEditorial;
  const params=new URLSearchParams(location.search), id=params.get('id') || params.get('slug');
  try{
    if(!id || !/^[a-zA-Z0-9_-]{1,128}$/.test(id))throw new Error('Artikel tidak ditemukan. Kembali ke halaman berita.');
    const response=await fetch('/api/article?id='+encodeURIComponent(id),{cache:'no-store'});
    if(!response.ok)throw new Error(response.status===404?'Artikel tidak ditemukan atau belum terbit.':'Artikel belum dapat dimuat. Coba lagi.');
    const {article:a}=await response.json();
    if(!a || !a.id || !a.title)throw new Error('Data artikel tidak lengkap.');
    // Remove old article metadata, then install the same escaped metadata used by SSR.
    document.head.querySelectorAll('title,meta[name="description"],link[rel="canonical"],meta[property^="og:"],meta[property^="article:"],meta[name^="twitter:"],#article-jsonld').forEach(n=>n.remove());
    const head=new DOMParser().parseFromString('<!doctype html><html><head>'+e.meta(a)+'</head><body></body></html>','text/html').head;
    Array.from(head.children).forEach(n=>document.head.appendChild(document.importNode(n,true)));
    root.innerHTML=e.render(a); root.dataset.articleId=a.id;root.dataset.articleSlug=a.slug || '';root.dataset.articleCategory=a.category || '';root.hidden=false;state.hidden=true;
    document.dispatchEvent(new CustomEvent('ddpe:article-ready'));
  }catch(error){state.hidden=false;state.textContent=error.message;const meta=document.createElement('meta');meta.name='robots';meta.content='noindex';document.head.appendChild(meta);}
})();
