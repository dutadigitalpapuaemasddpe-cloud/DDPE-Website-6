'use strict';
const {rest,rpc}=require('./supabase');
const {url}=require('../../js/editorial');
const str=(v,n)=>typeof v==='string' && v.length<=n ? v.trim():null;
const key=v=>typeof v==='string' && /^[a-zA-Z0-9_-]{1,128}$/.test(v);
function articleMeta(i){
  const tags=Array.isArray(i.tags)?i.tags:typeof i.tags==='string'?i.tags.split(',').map(s=>s.trim()).filter(Boolean):[];
  const a={author:str(i.author || 'Tim Redaksi DDPE',120),author_bio:str(i.author_bio || '',500),cover_caption:str(i.cover_caption || '',500),meta_description:str(i.meta_description || '',320),tags:[...new Set(tags)]};
  return Object.values(a).includes(null)||tags.length>15||tags.some(t=>typeof t!=='string'||t.length>60)?null:a;
}
function card(c){
  if(!c||typeof c!=='object')return null;
  const result={id:c.id,title:str(c.title,180),text:str(c.text || '',5000),image:str(c.image || '',1200),alt:str(c.alt || '',220),button:str(c.button || '',80),href:str(c.href || '',1200)};
  if(!key(result.id)||Object.values(result).includes(null)||!result.title || result.image&&!url(result.image,true)||result.href&&!url(result.href))return null;
  return result;
}
function page(i){
  const title=str(i.title,120),intro=str(i.intro,700);
  if(!title||!intro||!Array.isArray(i.sections)||i.sections.length>30)return null;
  const sections=i.sections.map(s=>{const c=card(s);if(!c||!Array.isArray(s.cards)||s.cards.length>20)return null;const cards=s.cards.map(card);return cards.includes(null)?null:{...c,cards};});
  if(sections.includes(null)||new Set(sections.map(s=>s.id)).size!==sections.length)return null;
  return {title,intro,sections};
}
function event(i){
  const c=card(i);if(!c)return null;
  const date=str(i.date,40),location=str(i.location || '',200),status=i.status;
  if(!date||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?\+09:00$/.test(date)||!Number.isFinite(Date.parse(date))||location===null||!['upcoming','completed'].includes(status))return null;
  return {...c,date,location,status};
}
async function write(k,value,user,version){return rpc('save_ddpe_cms_setting',{p_key:k,p_value:value,p_actor:user,p_version:version || null});}
async function readPages(publicOnly){
  const rows=await rest('site_settings?or=(setting_key.like.cms_page:*,setting_key.eq.public_site_copy_v1)&select=setting_key,value,updated_at'+(publicOnly?'&is_public=eq.true':''));
  const pages={};
  rows.forEach(r=>{if(r.setting_key==='public_site_copy_v1')Object.assign(pages,r.value);});
  rows.forEach(r=>{if(r.setting_key.startsWith('cms_page:'))pages[r.setting_key.slice(9)]={...r.value,version:r.updated_at};});
  return pages;
}
async function readEvents(publicOnly){return (await rest('site_settings?setting_key=like.cms_event:*&select=value,updated_at'+(publicOnly?'&is_public=eq.true':''))).filter(r=>!r.value.deleted).map(r=>({...r.value,version:r.updated_at})).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));}
module.exports={articleMeta,page,event,readPages,readEvents,write};
