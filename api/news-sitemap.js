'use strict';
const {publishedArticles}=require('./_lib/article-list');
const {esc,canonical}=require('../js/editorial');
module.exports=async function(req,res){
 if(req.method!=='GET'){res.statusCode=405;res.setHeader('Allow','GET');return res.end();}
 try{const rows=await publishedArticles();res.setHeader('Content-Type','application/xml; charset=utf-8');res.setHeader('Cache-Control','public, s-maxage=60');res.statusCode=200;res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+rows.slice(0,50000).map(a=>'<url><loc>'+esc(canonical(a))+'</loc><lastmod>'+esc(new Date(a.updated_at || a.published_at).toISOString())+'</lastmod></url>').join('')+'</urlset>');}
 catch(_){res.statusCode=503;res.setHeader('Cache-Control','no-store');res.end('Sitemap temporarily unavailable');}
};
