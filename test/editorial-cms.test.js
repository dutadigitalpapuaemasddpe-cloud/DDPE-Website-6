'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const e=require('../js/editorial'),cms=require('../api/_lib/cms');
const article={id:'news-1',slug:'kegiatan-ddpe',title:'Kegiatan DDPE',excerpt:'Ringkasan kegiatan',body:'<h2>Belajar</h2><p>Isi berita <strong>tebal</strong> dan <em>miring</em>.</p><blockquote>Kutipan</blockquote><ul><li>Literasi</li></ul><figure><img src="assets/tim-ddpe-banner.jpg" alt="Tim"><figcaption>Foto tim</figcaption></figure>',category:'berita',published_at:'2026-10-01T01:00:00Z',updated_at:'2026-10-02T02:00:00Z',status:'published',author:'Tim Redaksi DDPE',tags:['Literasi']};
function res(){return {statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;},end(v){this.body=v;}};}
function env(){process.env.SUPABASE_URL='https://db.test';process.env.SUPABASE_ANON_KEY='anon';process.env.SUPABASE_SERVICE_ROLE_KEY='service';}
test('editorial preserves journalistic markup and strips executable HTML/URLs',()=>{
 const clean=e.clean(article.body+'<script>alert(1)</script><iframe src=x></iframe><svg onload=bad()></svg><img src="javascript:bad()" onerror="bad()"><a href="&#x6a;avascript:bad()">klik</a>');
 assert.match(clean,/<h2>Belajar<\/h2>/);assert.match(clean,/<strong>tebal<\/strong>/);assert.match(clean,/<figure>/);assert.match(clean,/https:\/\/www.ddpe.my.id\/assets/);assert.doesNotMatch(clean,/script|iframe|svg|onerror|javascript:|bad\(/);
 assert.equal(e.clean('Paragraf satu\n\nParagraf dua'),'<p>Paragraf satu</p><p>Paragraf dua</p>');
});
test('SEO JSON-LD and canonical are consistent and safe for script embedding',()=>{
 const a={...article,title:'Judul </script><script>bad()</script>'};const schema=JSON.parse(e.json(a));assert.equal(schema['@type'],'NewsArticle');assert.equal(schema.headline,a.title);assert.equal(schema.datePublished,article.published_at.replace('Z','.000Z'));assert.doesNotMatch(e.json(a),/<\/script/i);assert.match(e.meta(a),/summary_large_image/);assert.match(e.canonical(a),/id=kegiatan-ddpe$/);assert.match(e.render(a),/WIT/);assert.match(e.render(a),/menit baca/);assert.equal((e.render(a).match(/class="article-reading-layout"/g)||[]).length,1);
});
test('CMS rejects unsafe links, duplicate section IDs and invalid event status',()=>{
 const card={id:'s-1',title:'Program',text:'Deskripsi',image:'assets/a.png',alt:'Kegiatan',href:'program.html',button:'Baca',cards:[]};const page={title:'Halaman DDPE',intro:'Pengantar lengkap organisasi DDPE',sections:[card]};assert.ok(cms.page(page));assert.equal(cms.page({...page,sections:[card,card]}),null);assert.equal(cms.page({...page,sections:[{...card,href:'javascript:alert(1)'}]}),null);assert.equal(cms.event({...card,date:'2026-11-14T09:00+09:00',location:'Mimika',status:'unknown'}),null);assert.ok(cms.event({...card,date:'2026-11-14T09:00+09:00',location:'Mimika',status:'upcoming'}));
 assert.equal(cms.articleMeta({tags:Array(16).fill('tag')}),null);
});
test('SSR and JSON endpoints reject archived articles without resurrecting legacy copies',async()=>{
 env();const original=global.fetch;let legacyCalled=false;global.fetch=async u=>{if(u.includes('site_articles'))return new Response(JSON.stringify([{...article,status:'archived'}]));legacyCalled=true;return new Response(JSON.stringify([article]));};
 try{for(const file of ['../api/article','../api/article-page']){const response=res();await require(file)({method:'GET',query:{id:'news-1'}},response);assert.equal(response.statusCode,404);}assert.equal(legacyCalled,false);}finally{global.fetch=original;}
});
test('draft content and future publication are not exposed; service outages fail closed',async()=>{
 env();const original=global.fetch;try{for(const row of [{...article,status:'draft'},{...article,published_at:'2999-01-01T00:00:00Z'}]){global.fetch=async()=>new Response(JSON.stringify([row]));const response=res();await require('../api/article')({method:'GET',query:{id:row.id}},response);assert.equal(response.statusCode,404);}global.fetch=async()=>new Response('{}',{status:503});const response=res();await require('../api/article-page')({method:'GET',query:{id:'news-1'}},response);assert.equal(response.statusCode,503);}finally{global.fetch=original;}
});
test('public listing suppresses duplicate and archived legacy identities',async()=>{
 env();const original=global.fetch;global.fetch=async u=>new Response(JSON.stringify(u.includes('site_articles')?[article,{...article,id:'archived',legacy_id:'old-2',slug:'archived',status:'archived'}]:[{...article,id:'old-copy'},{...article,id:'old-2',slug:'old-two'}]));
 try{const response=res();await require('../api/public-articles')({method:'GET',query:{}},response);assert.equal(response.statusCode,200);assert.deepEqual(JSON.parse(response.body).articles.map(a=>a.id),['news-1']);}finally{global.fetch=original;}
});
test('admin rejects unauthenticated writes and publishing by editors',async()=>{
 env();const original=global.fetch;const handler=require('../api/admin');try{const unauth=res();await handler({method:'POST',headers:{host:'ddpe.test'},body:{action:'save_event'}},unauth);assert.equal(unauth.statusCode,401);
 global.fetch=async u=>new Response(JSON.stringify(u.includes('/auth/')?{id:'editor'}:[{permission:'content_editor',scope_type:'organization',scope_id:null}]));for(const action of ['publish_article','archive_article','moderate_comment']){const response=res();await handler({method:'POST',headers:{host:'ddpe.test',authorization:'Bearer x'},body:{action,id:'news-1'}},response);assert.equal(response.statusCode,403);}}finally{global.fetch=original;}
});
test('CMS save detects concurrent edits and reports a conflict',async()=>{
 env();const original=global.fetch;global.fetch=async u=>u.includes('/auth/')?new Response('{"id":"editor"}'):u.includes('ddpe_permissions')?new Response('[{"permission":"content_editor","scope_type":"organization","scope_id":null}]'):new Response('{"message":"cms_conflict"}',{status:400});
 try{const response=res();await require('../api/admin')({method:'POST',headers:{host:'ddpe.test',authorization:'Bearer x'},body:{action:'save_site_content',page_key:'tentang.html',title:'Tentang DDPE',intro:'Pengantar organisasi lengkap',sections:[],version:'2026-01-01'}},response);assert.equal(response.statusCode,409);assert.equal(JSON.parse(response.body).error,'cms_conflict');}finally{global.fetch=original;}
});
test('body size limits apply to framework-parsed objects',async()=>{await assert.rejects(require('../api/_lib/supabase').readJson({headers:{},body:{body:'x'.repeat(30000)}},20000),/payload_too_large/);});
test('engagement comments are moderated and rate limits cannot be skipped',async()=>{
 env();process.env.DDPE_RATE_LIMIT_SECRET='test-secret';const original=global.fetch;let stored=null,allowed=true;
 global.fetch=async(u,o={})=>{if(u.includes('site_articles'))return new Response(JSON.stringify([article]));if(u.includes('consume_ddpe_rate_limit'))return new Response(JSON.stringify(allowed));if(u.includes('cms_comments')){stored=JSON.parse(o.body);return new Response('[]');}throw Error('unexpected request');};
 try{const req={method:'POST',headers:{host:'ddpe.test',origin:'https://ddpe.test','x-forwarded-for':'127.0.0.1'},body:{id:'news-1',action:'comment',name:'Pembaca',body:'Komentar yang cukup panjang',status:'approved'}};const response=res();await require('../api/engagement')(req,response);assert.equal(response.statusCode,201);assert.equal(stored.status,'pending');allowed=false;stored=null;const blocked=res();await require('../api/engagement')(req,blocked);assert.equal(blocked.statusCode,429);assert.equal(stored,null);}finally{global.fetch=original;}
});
test('uploaded cover alt text can be edited independently of asset metadata',async()=>{
 env();const original=global.fetch;let saved;
 global.fetch=async(u,o={})=>{if(u.includes('/auth/'))return new Response('{"id":"editor"}');if(u.includes('ddpe_permissions'))return new Response('[{"permission":"content_editor","scope_type":"organization","scope_id":null}]');if(u.includes('media_assets'))return new Response('[{"id":"12345678-1234-4123-8123-123456789abc","public_url":"https://db.test/photo.webp","alt_text":"Alt awal"}]');if(u.endsWith('/site_articles')){saved=JSON.parse(o.body);return new Response(JSON.stringify([{...saved,id:'created'}]));}if(u.includes('ddpe_audit_log'))return new Response('[]');throw Error(u);};
 try{const response=res();await require('../api/admin')({method:'POST',headers:{host:'ddpe.test',authorization:'Bearer x'},body:{action:'save_article',title:'Judul artikel',slug:'judul-artikel',body:'<h2>Subjudul</h2><p>Konten artikel yang cukup panjang.</p><script>bad()</script>',cover_url:'https://db.test/photo.webp',cover_media_id:'12345678-1234-4123-8123-123456789abc',cover_alt:'Alt yang diperbarui',author:'Penulis',tags:'Literasi, Digital',meta_description:'Ringkasan SEO'}},response);assert.equal(response.statusCode,201);assert.equal(saved.cover_alt,'Alt yang diperbarui');assert.deepEqual(saved.tags,['Literasi','Digital']);assert.doesNotMatch(saved.body,/<script/);}finally{global.fetch=original;}
});
