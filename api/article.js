'use strict';
const {send}=require('./_lib/supabase');
const {getArticle}=require('./_lib/article-store');
module.exports=async function(req,res){
  if(req.method!=='GET')return send(res,405,{error:'method_not_allowed'},{Allow:'GET'});
  const id=req.query && (req.query.id || req.query.slug);
  if(typeof id!=='string'|| !/^[a-zA-Z0-9_-]{1,128}$/.test(id))return send(res,400,{error:'invalid_article_id'});
  try{const article=await getArticle(id);return send(res,article?200:404,article?{article}:{error:'article_not_found'});}
  catch(_){return send(res,503,{error:'article_service_unavailable'});}
};
