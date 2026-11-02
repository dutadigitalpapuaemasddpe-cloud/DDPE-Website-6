'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const read = n => fs.readFileSync(path.join(root,n),'utf8');
const pages = fs.readdirSync(root).filter(n=>n.endsWith('.html'));
test('all local HTML asset, page, and anchor destinations exist',()=>{
 for(const name of pages){
  const html=read(name);
  for(const m of html.matchAll(/(?:href|src)="([^"]+)"/g)){
   const href=m[1].replaceAll('&amp;','&');
   if(/^(?:[a-z]+:|\/\/|\/api\/)/i.test(href))continue;
   const url=new URL(href,'https://www.ddpe.my.id/'+name);
   const local=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
   assert.ok(fs.existsSync(path.join(root,local)),`${name}: ${href}`);
   if(url.hash && local.endsWith('.html') && !url.search){
    assert.ok(read(local).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`),`${name}: missing fragment ${href}`);
   }
  }
 }
});
test('dedicated topic pages have one H1, unique title, canonical and no other full program section',()=>{
 const titles=new Set();
 for(const name of pages){
  if(['artikel.html','dashboard.html','media.html','gabung.html','tulis-berita.html','404.html'].includes(name))continue;
  const html=read(name);assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,name);
  const title=html.match(/<title>(.*?)<\/title>/s)[1];assert.ok(!titles.has(title),name);titles.add(title);
  assert.ok(html.includes(`href="https://www.ddpe.my.id/${name==='index.html'?'':name}"`),name+' canonical');
 }
 for(const name of ['program-dldpe.html','program-didpe.html','program-amex.html']){
  const main=read(name).match(/<main[\s\S]*?<\/main>/)[0];
  assert.ok(!main.includes('id="dldpe"')&&!main.includes('id="didpe"')&&!main.includes('id="amex"'),name);
 }
});
test('legacy detail redirects preserve query parameters and leave same-page anchors alone',()=>{
 const code=read('js/legacy-routes.js');
 for(const [pathname,hash,expected] of [['/program.html','#amex','program-amex.html?lang=en'],['/struktur.html','#pengurus-didpe','pengurus-didpe.html?lang=en'],['/terlibat.html','#volunteer','pendaftaran-volunteer.html?lang=en'],['/program-amex.html','#faq',null]]){
  let destination=null;vm.runInNewContext(code,{location:{pathname,hash,search:'?lang=en',replace:v=>destination=v}});assert.equal(destination,expected);
 }
});
test('recruitment refresh removes old links and never leaves a stale apply action after failure',async()=>{
 const handlers={};let fail=false;
 const list={children:[],replaceChildren(){this.children=[];},appendChild(n){this.children.push(n);}};
 const result={textContent:''};
 const section={getAttribute:()=> 'dldpe',querySelector:s=>s==='[data-opportunity-links]'?list:result};
 const context={Date,Array,encodeURIComponent,document:{visibilityState:'visible',querySelectorAll:()=>[section],createElement:()=>({}),addEventListener:(n,f)=>handlers[n]=f},fetch:async()=>({ok:!fail,json:async()=>({recruitments:[{kind:'ambassador',pillar_id:'dldpe',id:'test',title:'Test'}]})})};
 vm.runInNewContext(read('js/opportunities.js'),context);
 await new Promise(r=>setImmediate(r));assert.equal(list.children.length,1);
 handlers.visibilitychange();await new Promise(r=>setImmediate(r));assert.equal(list.children.length,1);
 fail=true;handlers.visibilitychange();await new Promise(r=>setImmediate(r));assert.equal(list.children.length,0);assert.match(result.textContent,/belum dapat diverifikasi/);
});
