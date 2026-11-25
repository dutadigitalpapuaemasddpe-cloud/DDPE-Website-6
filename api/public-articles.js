'use strict';
const {send}=require('./_lib/supabase');
const {publishedArticles}=require('./_lib/article-list');
// Portal induk KAMI boleh membaca daftar berita publik DDPE (hanya GET, data yang memang sudah terbit).
const KAMI_ORIGINS=new Set(['https://karsamuda.my.id','https://www.karsamuda.my.id']);
module.exports=async function(req,res){
 const origin=req.headers && req.headers.origin;
 if(origin && KAMI_ORIGINS.has(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
 if(req.method!=='GET')return send(res,405,{error:'method_not_allowed'},{Allow:'GET'});
 try{
  const page=Math.max(0,Math.min(1000,parseInt(req.query && req.query.page,10)||0)),limit=Math.max(1,Math.min(50,parseInt(req.query && req.query.limit,10)||20));
  const category=req.query && req.query.category;
  const rows=(await publishedArticles()).filter(a=>!category||category==='semua'||a.category===category);
  const articles=rows.slice(page*limit,(page+1)*limit).map(a=>{
   let cover=a.cover_url || a.cover_image || '';if(/^data:image\//i.test(cover))cover='/api/article-image?id='+encodeURIComponent(a.id);
   return {id:a.id,legacy_id:a.legacy_id,slug:a.slug,tags:a.tags || [],title:a.title,excerpt:a.excerpt || '',category:a.category,category_label:a.category_label || a.category || 'Berita',published_at:a.published_at,cover_image:cover,cover_alt:a.cover_alt || '',author:a.author || 'Tim Redaksi DDPE',publishedAt:a.published_at,coverImage:cover,categoryLabel:a.category_label || a.category || 'Berita'};
  });
  return send(res,200,{articles,total:rows.length});
 }catch(_){return send(res,503,{error:'public_content_unavailable'});}
};
