const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const files=fs.readdirSync('.').filter(x=>/^blue-.*\.html$/.test(x)||/^(blue-partner-preview|blue-partner-bedingungen-preview)\.html$/.test(x));
const errors=[];let links=0;const docs=new Map(files.map(f=>[f,fs.readFileSync(f,'utf8')]));
for(const [file,html] of docs){
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);if(new Set(ids).size!==ids.length)errors.push(`${file}: duplicate ID`);
 for(const m of html.matchAll(/<(?:a|link|script|img|source)\b[^>]*\b(?:href|src)="([^"]+)"/g)){
  let url=m[1].replaceAll('&amp;','&');if(/^(?:https?:|mailto:|tel:|data:)/.test(url))continue;
  const [raw,fragment]=url.split('#');const target=(raw.split('?')[0]||file).replace(/^\//,'');links++;
  if(!fs.existsSync(target)){errors.push(`${file}: missing ${url}`);continue;}
  if(fragment&&target.endsWith('.html')&&!fs.readFileSync(target,'utf8').includes(`id="${fragment}"`))errors.push(`${file}: missing fragment ${url}`);
  if(target.endsWith('.html')&&!docs.has(target))errors.push(`${file}: escapes preview ${url}`);
 }
 for(const [i,m] of [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].entries()){try{new vm.Script(m[1])}catch(e){errors.push(`${file} script${i}: ${e.message}`)}}
 if(/<script[^>]+src="(?:\/)?(?:checkout-availability|support-form)\.js/.test(html))errors.push(`${file}: production action script loaded`);
 if(!html.includes('noindex'))errors.push(`${file}: indexable`);
}
for(const file of ['blue-kontakt.html','blue-abo-kuendigen.html','blue-widerruf.html']){const s=docs.get(file);if(/fetch\(|src="\/support-form\.js"/.test(s))errors.push(`${file}: production action loaded`);if(!s.includes('id="send" disabled'))errors.push(`${file}: no-JS form guard absent`);}
for(const f of ['blue-preview.js','blue-partner-preview.js']){new vm.Script(fs.readFileSync(f,'utf8'));if(!fs.existsSync(path.join('public',f)))errors.push(`${f}: not built`);}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(`${files.length} preview pages, ${links} internal assets/links and inline scripts verified; support actions guarded.`);
