'use strict';
const {rest}=require('./supabase');
async function allRows(query){
 const rows=[];for(let offset=0;;){const batch=await rest(query+'&limit=1000&offset='+offset);if(!Array.isArray(batch))throw Error('invalid_rows');rows.push(...batch);if(batch.length<1000)break;offset+=batch.length;}
 return rows;
}
async function publishedArticles(){
 const modern=await allRows('site_articles?select=id,legacy_id,slug,title,excerpt,category,published_at,updated_at,cover_url,cover_alt,status,author,tags&order=id.asc');
 const legacy=await allRows('articles?select=id,slug,title,excerpt,category,category_label,published_at,cover_image,status,author&status=eq.published&order=id.asc');
 const identities=new Set(modern.flatMap(a=>[a.id,a.legacy_id,a.slug]).filter(Boolean));
 return modern.concat(legacy.filter(a=>!identities.has(a.id)&&!identities.has(a.slug))).filter(a=>a.status==='published'&&a.published_at&&Date.parse(a.published_at)<=Date.now()).sort((a,b)=>Date.parse(b.published_at)-Date.parse(a.published_at));
}
module.exports={publishedArticles};
