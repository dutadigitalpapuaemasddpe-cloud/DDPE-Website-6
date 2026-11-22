'use strict';
const {rest}=require('./supabase');
const fields='id,legacy_id,slug,title,excerpt,body,category,cover_url,cover_alt,cover_caption,author,author_bio,tags,meta_description,published_at,updated_at,status';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function getArticle(id) {
  const key=encodeURIComponent(id);
  // site_articles.id is uuid on the live database; comparing it with a slug makes PostgREST fail (22P02).
  const match=(UUID.test(String(id))?'id.eq.'+key+',':'')+'legacy_id.eq.'+key+',slug.eq.'+key;
  const rows=await rest('site_articles?select='+fields+'&or=('+match+')&limit=1');
  let row=rows[0];
  if (!row) {
    const legacy=await rest('articles?select=id,slug,title,excerpt,body,category,category_label,author,published_at,status,cover_image,source_url,source_name&or=(id.eq.'+key+',slug.eq.'+key+')&limit=1');
    row=legacy[0];
  }
  if (!row || row.status!=='published' || !row.published_at || Date.parse(row.published_at)>Date.now()) return null;
  if (/^data:image\//i.test(row.cover_image || '')) row.cover_image='/api/article-image?id='+encodeURIComponent(row.id);
  return row;
}
module.exports={getArticle,fields};
