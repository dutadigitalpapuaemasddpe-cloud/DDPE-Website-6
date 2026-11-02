(function(g,f){if(typeof module==='object'&&module.exports)module.exports=f();else g.DDPELeadership=f();})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const units={induk:'Pengurus Induk',dldpe:'DLDPE · Pilar Literasi Digital',didpe:'DIDPE · Pilar Inovasi Digital'};
 const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function photo(v){if(typeof v!=='string'||!v)return '';try{const u=new URL(v,'https://www.ddpe.my.id/');return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch(_){return '';}}
 function card(m){
  const vacant=m.status!=='active',image=photo(m.photo),initials=(m.name||'DDPE').split(/\s+/).slice(0,2).map(x=>x[0]).join('');
  return '<article class="leadership-card '+(m.level===1?'leadership-executive':'leadership-team')+'">'+(!vacant&&image?'<img class="leadership-photo" src="'+esc(image)+'" alt="'+esc(m.alt||m.name)+'" width="400" height="500" loading="lazy">':'<div class="leadership-monogram" aria-hidden="true">'+(vacant?'DDPE':esc(initials))+'</div>')+'<div class="leadership-copy"><span class="leadership-period">Periode '+esc(m.period_start)+'–'+esc(m.period_end)+'</span><h3>'+esc(vacant?m.role:m.name)+'</h3>'+(!vacant?'<p class="leadership-role">'+esc(m.role)+'</p>':'')+(vacant?'<span class="leadership-status">'+(m.status==='selection'?'Dalam Tahap Pemilihan':'Terbuka')+'</span>':'')+(m.summary?'<p class="leadership-summary">'+esc(m.summary)+'</p>':'')+'</div></article>';
 }
 function render(data,unit){
  const members=Array.isArray(data&&data.members)?data.members:[];
  return Object.keys(units).filter(u=>unit==='all'||u===unit).map(u=>{
   const rows=members.filter(m=>m.unit===u).sort((a,b)=>a.order-b.order),executives=rows.filter(m=>m.level===1),team=rows.filter(m=>m.level===2);
   return '<section class="leadership-unit" aria-labelledby="unit-'+u+'"><header class="leadership-section-heading"><p class="eyebrow">'+(u==='induk'?'Core Management':u==='dldpe'?'Pilar 1':'Pilar 2')+'</p><h2 id="unit-'+u+'">'+units[u]+'</h2><span>'+rows.filter(m=>m.status==='active').length+' pengurus</span></header>'+(executives.length?'<div class="leadership-executives">'+executives.map(card).join('')+'</div>':'')+(team.length?'<div class="leadership-team-grid">'+team.map(card).join('')+'</div>':'')+(!rows.length?'<p class="leadership-empty">Susunan unit ini sedang diperbarui. <a href="kontak.html">Hubungi DDPE</a></p>':'')+'</section>';
  }).join('');
 }
 function apply(data){const host=document.getElementById('leadership-directory');if(!host)return;host.innerHTML=render(data,host.dataset.leadershipUnit);const periods=[...new Set((data.members||[]).filter(m=>host.dataset.leadershipUnit==='all'||m.unit===host.dataset.leadershipUnit).map(m=>m.period_start+'–'+m.period_end))];const badge=document.querySelector('.leadership-hero .leadership-period');if(badge){badge.textContent=periods.length?'Masa Bakti '+periods.join(' / '):'Kepengurusan DDPE';}const state=document.getElementById('leadership-state');if(state)state.textContent='';}
 return {render,apply};
});
