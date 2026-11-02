'use strict';
const header=require('./_lib/public-header');
const editorial=require('../js/editorial');
const {getArticle}=require('./_lib/article-store');
module.exports=async function(req,res){
  res.setHeader('Content-Type','text/html; charset=utf-8');
  if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end('Method not allowed');}
  const id=req.query && (req.query.id || req.query.slug);
  if(typeof id!=='string'|| !/^[a-zA-Z0-9_-]{1,128}$/.test(id)){res.statusCode=302;res.setHeader('Location','/berita.html');return res.end();}
  try{
    const a=await getArticle(id);
    if(!a){res.statusCode=404;return res.end('<!doctype html><html lang="id"><meta name="robots" content="noindex"><meta charset="utf-8"><title>Artikel tidak ditemukan | DDPE</title><h1>Artikel tidak ditemukan</h1><a href="/berita.html">Kembali ke berita</a></html>');}
    res.statusCode=200;
    res.setHeader('Cache-Control','public, s-maxage=60, stale-while-revalidate=60');
    res.end(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${editorial.meta(a)}<link rel="icon" href="/assets/ddpe_logo_web.png"><link rel="stylesheet" href="/css/site.css"><link rel="stylesheet" href="/css/institutional.css"><link rel="stylesheet" href="/css/interior.css"><link rel="stylesheet" href="/css/editorial.css"></head><body class="site-home ddpe-interior ddpe-reader"><a class="skip-link" href="#article-root">Lewati ke artikel</a>${header}<main class="site-container site-article-main"><article id="article-root" data-article-id="${editorial.esc(a.id)}" data-article-slug="${editorial.esc(a.slug)}" data-article-category="${editorial.esc(a.category)}">${editorial.render(a)}</article></main><footer class="site-footer"><div class="site-container"><p>© Duta Digital Papua Emas · Mimika, Papua Tengah</p><a href="/kontak.html">Kontak redaksi</a> · <a href="/privasi.html">Kebijakan privasi</a></div></footer><script defer src="/js/site.js"></script><script defer src="/js/editorial.js"></script><script defer src="/js/article-enhancements.js"></script></body></html>`);
  }catch(_){res.statusCode=503;res.setHeader('Cache-Control','no-store');res.end('<!doctype html><html lang="id"><meta charset="utf-8"><meta name="robots" content="noindex"><title>Artikel belum tersedia | DDPE</title><h1>Layanan artikel belum tersedia</h1><p>Coba lagi beberapa saat kemudian.</p><a href="/berita.html">Kembali ke berita</a></html>');}
};
