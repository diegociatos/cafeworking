#!/usr/bin/env node
// Cloudflare: atualiza a vitrine no artefato público, sem regravar fontes.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { buscarCatalogo, aplicarVitrine } = require('./vitrine.js');

function atualizarVitrines(pasta, catalogo) {
  if (!catalogo) return 0;
  let atualizadas = 0;
  for (const nome of fs.readdirSync(pasta).filter(f => f.endsWith('.html'))) {
    const arquivo = path.join(pasta, nome);
    const html = fs.readFileSync(arquivo, 'utf8');
    const resultado = aplicarVitrine(html, catalogo);
    if (resultado.html !== html) { fs.writeFileSync(arquivo, resultado.html); atualizadas++; }
  }
  return atualizadas;
}

async function main() {
  require('./build-dist.js');
  const dist = path.join(__dirname, '..', 'dist');
  const atualizadas = atualizarVitrines(dist, await buscarCatalogo());
  const hashes = new Map();
  for (const nome of fs.readdirSync(dist).filter(f => f.endsWith('.html'))) {
    const arquivo = path.join(dist, nome);
    const html = fs.readFileSync(arquivo, 'utf8').replace(/(src|href)="(\/?assets\/(?:js|css)\/[^"?#]+)(?:\?v=[^"]*)?"/g, (tag, attr, url) => {
      const asset = path.join(dist, url.replace(/^\//, ''));
      if (!fs.existsSync(asset)) return tag;
      if (!hashes.has(asset)) hashes.set(asset, createHash('sha256').update(fs.readFileSync(asset)).digest('hex').slice(0, 10));
      return `${attr}="${url}?v=${hashes.get(asset)}"`;
    });
    fs.writeFileSync(arquivo, html);
  }
  console.log(`build-site: ${atualizadas} página(s) com catálogo atualizado; fontes preservadas`);
}
module.exports = { atualizarVitrines };
if (require.main === module) main().catch(() => { console.error('build-site: não foi possível montar a vitrine'); process.exitCode = 1; });
