'use strict';
const {send}=require('./_lib/supabase');
const leadership=require("./_lib/leadership");
const cms=require('./_lib/cms');
const partners=require('./_lib/partners');
module.exports=async function(req,res){
  if(req.method!=='GET')return send(res,405,{error:'method_not_allowed'},{Allow:'GET'});
  try {
    const [stored,events,partnerData]=await Promise.all([cms.readPages(true),cms.readEvents(true),partners.readPublic().catch(()=>null)]);
    const pages={};
    Object.entries(stored).forEach(([key,value])=>{
      if(!Object.hasOwn(require('../data/cms-defaults.json'),key))return;
      const parsed=cms.page(value);
      if(parsed)pages[key]=parsed;
      else if(typeof value.title==='string'&&typeof value.intro==='string')pages[key]={title:value.title.slice(0,120),intro:value.intro.slice(0,700)};
    });
    return send(res,200,{pages,events:events.map(cms.event).filter(Boolean),leadership:(await leadership.read()).leadership,partners:partnerData?partnerData.partners:null,partners_managed:partnerData?partnerData.managed:false});
  }catch(_){return send(res,503,{error:'public_content_unavailable'});}
};
