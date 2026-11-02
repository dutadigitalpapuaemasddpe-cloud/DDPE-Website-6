// Run from any directory: node scripts/sync-layout.cjs
// Shared markup remains embedded in HTML for static hosting and visual editors.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const header = fs.readFileSync(path.join(root, 'components/header.html'), 'utf8').trim();
const footer = fs.readFileSync(path.join(root, 'components/footer.html'), 'utf8').trim();
let changed = 0;
const headerPattern = /<header\b[^>]*\bclass="[^"]*\bsite-header\b[^"]*"[^>]*>[\s\S]*?<\/header>/;
for (const name of fs.readdirSync(root).filter(n => n.endsWith('.html') && n !== 'dashboard.html')) {
  const file = path.join(root,name); const input = fs.readFileSync(file,'utf8');
  if (!headerPattern.test(input)) continue;
  const output = input.replace(headerPattern,header).replace(/<footer class="site-footer">[\s\S]*?<\/footer>/,footer);
  if (output !== input) { fs.writeFileSync(file,output); changed++; }
}
// Keep the server-rendered article navbar in sync, with root-relative URLs.
const publicHeader = header.replace(/\b(href|src)="(?![a-z]+:|\/|#)([^"]+)"/gi, '$1="/$2"');
fs.writeFileSync(path.join(root, 'api/_lib/public-header.js'),
  '// Generated from components/header.html by scripts/sync-layout.cjs.\nmodule.exports = ' + JSON.stringify(publicHeader) + ';\n');
console.log(`${changed} public pages updated.`);
