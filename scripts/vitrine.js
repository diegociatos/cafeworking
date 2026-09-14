#!/usr/bin/env node
/**
 * Grava no HTML os cards dos planos cadastrados no app do CafeWorking.
 *
 * Roda na publicação (build do Netlify, ver netlify.toml). Em cada página da
 * raiz, troca o conteúdo entre os marcadores
 *
 *   <!-- vitrine:endereco_fiscal --> ... <!-- /vitrine -->
 *
 * pelos cards da categoria. É à prova de falha: se o app não responder ou não
 * houver plano publicado na categoria, a página fica como está no repositório
 * e a publicação segue normalmente.
 *
 *   node scripts/vitrine.js
 */

const fs = require('fs');
const path = require('path');
const { renderVitrine } = require('../assets/js/cards-plano.js');
const loja = require('../assets/js/loja-config.js');

const RAIZ = path.join(__dirname, '..');
const MARCADOR = /(<!-- vitrine:([a-z_]+) -->)([\s\S]*?)(<!-- \/vitrine -->)/g;

function aplicarVitrine(html, catalogo) {
  let trocados = 0;
  const novo = html.replace(MARCADOR, (bloco, abre, categoria, miolo, fecha) => {
    const cards = renderVitrine(catalogo, categoria);
    if (!cards) return bloco;
    trocados++;
    return `${abre}\n${cards}\n${fecha}`;
  });
  return { html: novo, trocados };
}

async function buscarCatalogo() {
  const url = `${loja.supabaseUrl}/functions/v1/planos-publicos?site=1`;
  try {
    const res = await fetch(url, {
      headers: { apikey: loja.anonKey, authorization: `Bearer ${loja.anonKey}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const dados = await res.json();
    if (!Array.isArray(dados.planos)) throw new Error('resposta sem planos');
    return dados;
  } catch (e) {
    console.log(`vitrine: catálogo indisponível (${e.message}); páginas mantidas como estão`);
    return null;
  }
}

async function main() {
  const catalogo = await buscarCatalogo();
  if (!catalogo) return;
  console.log(`vitrine: ${catalogo.planos.length} plano(s) publicado(s) no site`);

  const arquivos = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html'));
  for (const arq of arquivos) {
    const caminho = path.join(RAIZ, arq);
    const html = fs.readFileSync(caminho, 'utf8');
    if (!html.includes('<!-- vitrine:')) continue;
    const r = aplicarVitrine(html, catalogo);
    if (r.html !== html) fs.writeFileSync(caminho, r.html, 'utf8');
    console.log(`vitrine: ${arq} → ${r.trocados} bloco(s) com cards do app`);
  }
}

module.exports = { aplicarVitrine, buscarCatalogo };

if (require.main === module) {
  main().catch((e) => {
    // nunca derruba a publicação por causa da vitrine
    console.log(`vitrine: erro inesperado (${e.message}); páginas mantidas como estão`);
  });
}
