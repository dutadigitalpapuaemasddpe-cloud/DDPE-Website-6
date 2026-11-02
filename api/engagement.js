'use strict';
const crypto=require('node:crypto');
const {config,rest,rpc,send,sameOrigin,readJson,rateFingerprint}=require('./_lib/supabase');
const {getArticle}=require('./_lib/article-store');
async function likeCount(id){
 const c=config();const response=await fetch(c.base+'/rest/v1/cms_likes?article_id=eq.'+id+'&select=article_id',{method:'HEAD',headers:{apikey:c.serviceKey,Authorization:'Bearer '+c.serviceKey,Prefer:'count=exact'}});
 if(!response.ok)throw Error('count_unavailable');const range=response.headers.get('content-range') || '';const count=Number(range.split('/')[1]);if(!Number.isFinite(count))throw Error('count_unavailable');return count;
}
module.exports=async function(req,res){
  if(!['GET','POST'].includes(req.method))return send(res,405,{error:'method_not_allowed'});
  if(!sameOrigin(req))return send(res,403,{error:'origin_not_allowed'});
  try{
    const input=req.method==='GET'?req.query:await readJson(req,5000);
    if(!/^[a-zA-Z0-9_-]{1,128}$/.test(input.id||''))return send(res,400,{error:'invalid_article'});
    const article=await getArticle(input.id);if(!article)return send(res,404,{error:'article_not_found'});
    const id=encodeURIComponent(article.id);
    if(req.method==='GET'){
      const [likes,comments]=await Promise.all([likeCount(id),rest('cms_comments?article_id=eq.'+id+'&status=eq.approved&select=id,name,body,created_at&order=created_at.desc&limit=50')]);
      return send(res,200,{likes,comments});
    }
    const allowed=await rpc('consume_ddpe_rate_limit',{p_fingerprint:rateFingerprint(req,'editorial'),p_limit:20});
    if(allowed!==true)return send(res,429,{error:'too_many_requests'});
    if(input.action==='like'){
      if(!/^[0-9a-f-]{36}$/.test(input.visitor||'')||typeof input.liked!=='boolean')return send(res,400,{error:'invalid_visitor'});
      const visitor=crypto.createHmac('sha256',process.env.DDPE_RATE_LIMIT_SECRET).update(input.visitor).digest('hex');
      if(input.liked)await rest('cms_likes?on_conflict=article_id,visitor',{method:'POST',body:{article_id:article.id,visitor},prefer:'resolution=ignore-duplicates,return=minimal'});
      else await rest('cms_likes?article_id=eq.'+id+'&visitor=eq.'+visitor,{method:'DELETE'});
      return send(res,200,{saved:true});
    }
    if(input.action==='comment'&&typeof input.name==='string'&&input.name.trim().length>=2&&input.name.length<=80&&typeof input.body==='string'&&input.body.trim().length>=5&&input.body.length<=2000){
      await rest('cms_comments',{method:'POST',body:{article_id:article.id,name:input.name.trim(),body:input.body.trim(),status:'pending'},prefer:'return=minimal'});
      return send(res,201,{saved:true,pending:true});
    }
    return send(res,400,{error:'invalid_input'});
  }catch(_){return send(res,503,{error:'engagement_unavailable'});}
};
