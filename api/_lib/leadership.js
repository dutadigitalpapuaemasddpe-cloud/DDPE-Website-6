'use strict';
const {rest,rpc}=require('./supabase');
const defaults=require('../../data/leadership.json');
function validate(input){
 if(!input||!Array.isArray(input.members)||input.members.length>200)return null;
 const ids=new Set(),members=[];
 for(const row of input.members){
  if(!row||typeof row!=='object'||!/^[a-zA-Z0-9_-]{1,128}$/.test(row.id||'')||ids.has(row.id))return null;ids.add(row.id);
  if(!['induk','dldpe','didpe'].includes(row.unit)||![1,2].includes(row.level)||!['active','selection','open'].includes(row.status))return null;
  if(!Number.isInteger(row.period_start)||!Number.isInteger(row.period_end)||row.period_start<2000||row.period_end>2200||row.period_end<row.period_start||!Number.isInteger(row.order)||row.order<0||row.order>10000)return null;
  const m={id:row.id,unit:row.unit,level:row.level,status:row.status,period_start:row.period_start,period_end:row.period_end,order:row.order};
  for(const [key,max] of Object.entries({name:120,role:160,summary:700,photo:1200,alt:220})){if(typeof row[key]!=='string'||row[key].length>max)return null;m[key]=row[key].trim();}
  if(!m.role||m.status==='active'&&!m.name)return null;
  if(m.photo){try{const u=new URL(m.photo,'https://www.ddpe.my.id/');if(u.protocol!=='https:'||u.username||u.password)return null;}catch(_){return null;}}
  members.push(m);
 }
 return {members};
}
async function read(){const rows=await rest('site_settings?setting_key=eq.leadership&is_public=eq.true&select=value,updated_at&limit=1');if(!rows.length)return {leadership:defaults,version:null};const value=validate(rows[0].value);if(!value)throw Error('invalid_leadership');return {leadership:value,version:rows[0].updated_at};}
async function save(input,user){const value=validate(input.leadership);if(!value)return {status:400,body:{error:'check_leadership_fields'}};await rpc('save_ddpe_leadership',{p_value:value,p_actor:user.id,p_version:input.version||null});return {status:200,body:{saved:true}};}
module.exports={validate,read,save};
