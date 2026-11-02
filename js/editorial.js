/* Shared editorial rendering: identical HTML and SEO for server, browser and preview. */
(function (global, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('parse5'));
  else global.DDPEEditorial = factory(null);
})(typeof window !== 'undefined' ? window : globalThis, function (parser) {
  'use strict';
  const origin = 'https://www.ddpe.my.id';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function url(value, image) {
    if (typeof value !== 'string' || !value.trim() || /[\u0000-\u0020\\]/.test(value)) return '';
    try { const u = new URL(value, origin + '/'); return (u.protocol === 'https:' || (!image && u.protocol === 'mailto:')) && !u.username && !u.password ? u.href : ''; } catch (_) { return ''; }
  }
  function tree(source) {
    if (parser) return parser.parseFragment(source);
    const doc = new DOMParser().parseFromString(source, 'text/html');
    function convert(n) { return { nodeName: n.nodeType === 3 ? '#text' : n.nodeName.toLowerCase(), value:n.nodeValue, tagName:n.tagName && n.tagName.toLowerCase(), namespaceURI:n.namespaceURI, attrs:Array.from(n.attributes || []).map(a=>({name:a.name,value:a.value})), childNodes:Array.from(n.childNodes).map(convert) }; }
    return convert(doc.body);
  }
  function clean(source) {
    source = String(source || '').slice(0,100000);
    if (!/<[a-z!/]/i.test(source)) return source.split(/\n\s*\n/).filter(Boolean).map(p=>'<p>'+esc(p).replace(/\n/g,'<br>')+'</p>').join('');
    const allowed = new Set(['p','br','strong','b','em','i','ul','ol','li','h2','h3','blockquote','a','img','figure','figcaption']);
    const blocked = new Set(['script','style','iframe','object','embed','svg','math','template','noscript','form','input','button','textarea','select']);
    function walk(n) {
      if (n.nodeName === '#text') return esc(n.value);
      const tag = n.tagName;
      if (blocked.has(tag) || n.namespaceURI && n.namespaceURI !== 'http://www.w3.org/1999/xhtml') return '';
      const children = (n.childNodes || []).map(walk).join('');
      if (!allowed.has(tag)) return children;
      const attrs = Object.fromEntries((n.attrs || []).map(a=>[a.name,a.value]));
      if (tag === 'a') { const href = url(attrs.href); return href ? '<a href="'+esc(href)+'" rel="noopener noreferrer">'+children+'</a>' : children; }
      if (tag === 'img') { const src=url(attrs.src,true); return src ? '<img src="'+esc(src)+'" alt="'+esc(attrs.alt || '')+'" loading="lazy" decoding="async">' : ''; }
      return '<'+tag+'>'+children+(tag === 'br' ? '' : '</'+tag+'>');
    }
    return (tree(source).childNodes || []).map(walk).join('');
  }
  function text(source) { return clean(source).replace(/<[^>]+>/g,' ').replace(/&(?:amp|lt|gt|quot|#39);/g,' ').replace(/\s+/g,' ').trim(); }
  function canonical(a) { return origin + '/artikel.html?id=' + encodeURIComponent(a.slug || a.id); }
  function iso(v) { const d=new Date(v); return v && Number.isFinite(d.getTime()) ? d.toISOString() : ''; }
  function schema(a) {
    const image=url(a.cover_url || a.cover_image,true);
    return {'@context':'https://schema.org','@type':'NewsArticle',headline:a.title,description:a.meta_description || a.excerpt || text(a.body).slice(0,160),image:image ? [image] : [],datePublished:iso(a.published_at),dateModified:iso(a.updated_at || a.published_at),author:{'@type': /Tim|Redaksi|DDPE/i.test(a.author || '') || !a.author ? 'Organization':'Person',name:a.author || 'Tim Redaksi DDPE'},publisher:{'@type':'Organization',name:'Duta Digital Papua Emas',url:origin,logo:{'@type':'ImageObject',url:origin+'/assets/ddpe_logo_web.png'}},mainEntityOfPage:{'@type':'WebPage','@id':canonical(a)}};
  }
  function json(a) { return JSON.stringify(schema(a)).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026'); }
  function meta(a) {
    const s=schema(a), u=canonical(a), image=s.image[0] || origin+'/assets/tim-ddpe-banner.jpg';
    return '<title>'+esc(a.title)+' | Duta Digital Papua Emas</title><meta name="description" content="'+esc(s.description)+'"><link rel="canonical" href="'+esc(u)+'">'+Object.entries({'og:type':'article','og:title':a.title,'og:description':s.description,'og:url':u,'og:image':image,'article:published_time':s.datePublished,'article:modified_time':s.dateModified}).map(([k,v])=>'<meta property="'+k+'" content="'+esc(v)+'">').join('')+Object.entries({'twitter:card':'summary_large_image','twitter:title':a.title,'twitter:description':s.description,'twitter:image':image}).map(([k,v])=>'<meta name="'+k+'" content="'+esc(v)+'">').join('')+'<script id="article-jsonld" type="application/ld+json">'+json(a)+'</script>';
  }
  function render(a) {
    const u=canonical(a), share=encodeURIComponent(u), title=encodeURIComponent(a.title), category=a.category_label || a.category || 'Berita';
    const image=url(a.cover_url || a.cover_image,true), author=a.author || 'Tim Redaksi DDPE';
    const date=iso(a.published_at), dateLabel=date ? new Intl.DateTimeFormat('id-ID',{dateStyle:'long',timeStyle:'short',timeZone:'Asia/Jayapura'}).format(new Date(date))+' WIT' : 'Draf — belum terbit';
    const minutes=Math.max(1,Math.ceil(text(a.body).split(/\s+/).filter(Boolean).length/200));
    return '<nav class="editorial-breadcrumb" aria-label="Breadcrumb"><a href="/index.html">Beranda</a><span>›</span><a href="/berita.html">Berita</a><span>›</span><a href="/berita.html?category='+encodeURIComponent(a.category || 'berita')+'">'+esc(category)+'</a></nav><header class="site-article-heading"><span class="editorial-category">'+esc(category)+'</span><h1>'+esc(a.title)+'</h1><p class="editorial-lead">'+esc(a.excerpt || '')+'</p><div class="site-article-byline"><strong>'+esc(author)+'</strong><time datetime="'+esc(date)+'">'+esc(dateLabel)+'</time><span>'+minutes+' menit baca</span></div></header><nav class="site-article-share" aria-label="Bagikan artikel"><a target="_blank" rel="noopener noreferrer" href="https://wa.me/?text='+title+'%20'+share+'">WhatsApp</a><button type="button" data-copy-article>Salin tautan</button><a target="_blank" rel="noopener noreferrer" href="https://twitter.com/intent/tweet?text='+title+'&amp;url='+share+'">X / Twitter</a><a target="_blank" rel="noopener noreferrer" href="https://www.linkedin.com/sharing/share-offsite/?url='+share+'">LinkedIn</a><a href="mailto:?subject='+title+'&amp;body='+share+'">Email</a><span data-share-status role="status"></span></nav>'+(image ? '<figure class="site-article-cover"><img src="'+esc(image)+'" alt="'+esc(a.cover_alt || a.title)+'" width="1200" height="675" fetchpriority="high"><figcaption>'+esc(a.cover_caption || a.cover_alt || '')+'</figcaption></figure>':'')+'<div class="article-reading-layout"><div class="article-reading-column"><div class="site-copy site-article-body">'+clean(a.body)+'</div>'+(url(a.source_url) ? '<p>Sumber: <a href="'+esc(url(a.source_url))+'">'+esc(a.source_name || a.source_url)+'</a></p>':'')+'<nav class="editorial-tags" aria-label="Topik">'+(Array.isArray(a.tags)?a.tags:[]).map(t=>'<a href="/berita.html?q='+encodeURIComponent(t)+'">'+esc(t)+'</a>').join('')+'</nav><section class="editorial-author"><p class="eyebrow">Tentang penulis</p><h2>'+esc(author)+'</h2><p>'+esc(a.author_bio || 'Kontributor berita Duta Digital Papua Emas.')+'</p></section><section class="editorial-discussion" aria-labelledby="discussion-title"><h2 id="discussion-title">Suka &amp; komentar</h2><button type="button" data-like-article aria-pressed="false">Suka <span data-like-count></span></button><form data-comment-form><label>Nama<input name="name" maxlength="80" minlength="2" required></label><label>Komentar<textarea name="body" rows="3" minlength="5" maxlength="2000" required></textarea></label><button type="submit">Kirim komentar</button></form><p data-discussion-status role="status"></p><div data-comments></div></section></div><aside class="article-related"><h2>Berita terbaru / terkait</h2><p data-related-status role="status">Memuat berita…</p><div class="related-list"></div><a href="/berita.html">Semua berita →</a></aside></div>';
  }
  return {esc,url,clean,text,canonical,schema,json,meta,render};
});
