#!/usr/bin/env node
// Verifica apenas o artefato público, incluindo destinos de redirects do Pages.
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.resolve(__dirname, '../dist');
if (!fs.existsSync(raiz)) {
  console.error('Gere o site primeiro: npm run build');
  process.exit(1);
}
function arquivos(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => {
    const p = path.join(dir, item.name);
    return item.isDirectory() ? arquivos(p) : [p];
  });
}
const redirects = fs.existsSync(path.join(raiz, '_redirects'))
  ? fs.readFileSync(path.join(raiz, '_redirects'), 'utf8').split(/\r?\n/)
    .filter(l => l.trim() && !l.trim().startsWith('#')).map(l => l.trim().split(/\s+/)) : [];
function existe(url, vistos = new Set()) {
  if (url.origin !== 'https://cafeworking.com.br') return true;
  const rota = decodeURIComponent(url.pathname);
  if (vistos.has(rota)) return false;
  vistos.add(rota);
  const arquivo = path.resolve(raiz, '.' + rota);
  if (!arquivo.startsWith(raiz + path.sep) && arquivo !== raiz) return false;
  if ([arquivo, arquivo + '.html', path.join(arquivo, 'index.html')].some(p => fs.existsSync(p) && fs.statSync(p).isFile())) return true;
  const regra = redirects.find(([de]) => de === rota);
  return !!regra && existe(new URL(regra[1], url), vistos);
}
const falhas = new Set();
let paginas = 0;
for (const arquivo of arquivos(raiz).filter(p => p.endsWith('.html'))) {
  paginas++;
  const relativo = path.relative(raiz, arquivo).replaceAll('\\', '/');
  const texto = fs.readFileSync(arquivo, 'utf8');
  for (const [, valor] of texto.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
    if (/^(?:#|mailto:|tel:|data:|javascript:)/i.test(valor)) continue;
    const url = new URL(valor.replaceAll('&amp;', '&'), 'https://cafeworking.com.br/' + relativo);
    if (!existe(url)) falhas.add(`${relativo} → ${valor}`);
  }
}
for (const falha of falhas) console.error(falha);
console.log(`${paginas} páginas públicas verificadas; ${falhas.size} referências ausentes.`);
process.exitCode = falhas.size ? 1 : 0;
