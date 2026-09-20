#!/usr/bin/env node
// Cloudflare: monta dist/ e atualiza a vitrine no artefato público.
// Inclui as páginas por cidade (subpastas), que o Google lê com os preços.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { buscarCatalogo, aplicarVitrine } = require('./vitrine.js');

/** Todos os .html da pasta, inclusive os de subpastas como endereco-fiscal/. */
function paginas(pasta) {
  return fs.readdirSync(pasta, { withFileTypes: true }).flatMap((item) => {
    const caminho = path.join(pasta, item.name);
    if (item.isDirectory()) return paginas(caminho);
    return item.name.endsWith('.html') ? [caminho] : [];
  });
}

function atualizarVitrines(pasta, catalogo) {
  if (!catalogo) return 0;
  let atualizadas = 0;
  for (const arquivo of paginas(pasta)) {
    const html = fs.readFileSync(arquivo, 'utf8');
    const resultado = aplicarVitrine(html, catalogo);
    if (resultado.html !== html) { fs.writeFileSync(arquivo, resultado.html); atualizadas++; }
  }
  return atualizadas;
}

async function main() {
  // Páginas por cidade da vitrine nacional: precisam existir antes do dist/.
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'paginas-cidade.js')], { stdio: 'inherit' });
  } catch {
    console.warn('build-site: páginas por cidade não foram regeradas; segue com as publicadas');
  }
  require('./build-dist.js');
  const dist = path.join(__dirname, '..', 'dist');
  const atualizadas = atualizarVitrines(dist, await buscarCatalogo());
  const hashes = new Map();
  for (const arquivo of paginas(dist)) {
    const html = fs.readFileSync(arquivo, 'utf8').replace(/(src|href)="(\/assets\/(?:js|css)\/[^"?#]+)(?:\?v=[^"]*)?"/g, (tag, attr, url) => {
      const asset = path.join(dist, url.replace(/^\//, ''));
      if (!fs.existsSync(asset)) return tag;
      if (!hashes.has(asset)) hashes.set(asset, createHash('sha256').update(fs.readFileSync(asset)).digest('hex').slice(0, 10));
      return `${attr}="${url}?v=${hashes.get(asset)}"`;
    });
    fs.writeFileSync(arquivo, html);
  }
  console.log(`build-site: ${atualizadas} página(s) com catálogo atualizado; fontes preservadas`);
}
module.exports = { atualizarVitrines, paginas };
if (require.main === module) main().catch(() => { console.error('build-site: não foi possível montar a vitrine'); process.exitCode = 1; });
