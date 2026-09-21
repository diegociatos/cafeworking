#!/usr/bin/env node
/**
 * Layout global do site: menu, botões do topo, rodapé, botão flutuante do
 * WhatsApp, barra fixa do celular e scripts comuns (analytics).
 *
 * O cabeçalho e o rodapé estão copiados em cada .html da raiz. Este script é a
 * fonte deles: troca os blocos inteiros pelo modelo daqui, em todas as páginas
 * públicas. É idempotente (rodar de novo não muda nada).
 *
 *   node scripts/layout.js
 *
 * Depois rode "node scripts/versionar-loja.js" para carimbar ?v= nos scripts.
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const APP = 'https://app.cafeworking.com.br';
const WA = '5531997129789';
const wa = (texto) => `https://wa.me/${WA}?text=${encodeURIComponent(texto)}`;

/* Páginas que não recebem o layout: verificação do Google e telas internas
 * (que não vão para o ar, ver scripts/internos.json). */
const INTERNOS = JSON.parse(fs.readFileSync(path.join(__dirname, 'internos.json'), 'utf8'));
const globParaRegex = (g) => new RegExp('^' + g.split('*').map((t) => t.replace(/[.+?^${}()|[\]\\]/g, (c) => '\\' + c)).join('[^/]*') + '$', 'i');
const PADROES = (INTERNOS.padroes || []).map(globParaRegex);
const ehInterno = (arq) => (INTERNOS.arquivos || []).includes(arq) || PADROES.some((re) => re.test(arq)) || /^google[0-9a-f]+\.html$/i.test(arq) ||
  arq === 'offline.html'; // página do service worker, sem cabeçalho nem rodapé

/* Nas telas de formulário da loja a barra fixa atrapalha o preenchimento. */
const SEM_BARRA = new Set(['contratar.html', 'pagamento.html', 'reservar-sala.html', 'offline.html']);

const ICONE_WA = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 12.04 2zm0 18.15h-.01a8.23 8.23 0 0 1-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.26-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.55-3.7 8.23-8.24 8.23zm4.52-6.17c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.67.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29z"/></svg>';

const MENU = `<nav class="menu cw-menu">
  <a class="cw-menu-link" href="/">Home</a>
  <a class="cw-menu-link" href="/planos">Planos</a>

  <div class="cw-dropdown">
    <a class="cw-menu-link" href="/ambientes">Salas <span>▾</span></a>
    <div class="cw-dropdown-panel">
      <a href="/salas-privativas"><b>Salas Privativas</b><small>Escritórios exclusivos para equipes.</small></a>
      <a href="/atendimento-privativo"><b>Atendimento Privativo</b><small>Ambiente reservado para receber clientes.</small></a>
      <a href="/coworking"><b>Sala Compartilhada</b><small>Coworking, day pass e hora avulsa.</small></a>
      <a href="/salas-de-reuniao"><b>Salas de Reunião</b><small>Reserva por hora, com pagamento online.</small></a>
    </div>
  </div>

  <div class="cw-dropdown">
    <a class="cw-menu-link" href="/servicos">Serviços <span>▾</span></a>
    <div class="cw-dropdown-panel">
      <a href="/endereco-fiscal"><b>Endereço Fiscal</b><small>Endereço profissional para sua empresa.</small></a>
      <a href="/abertura-de-empresa"><b>Abertura de Empresa</b><small>Constituição com apoio da Ciatos Contabilidade.</small></a>
    </div>
  </div>

  <div class="cw-dropdown">
    <a class="cw-menu-link" href="/cafeteria">Cafeteria <span>▾</span></a>
    <div class="cw-dropdown-panel">
      <a href="/cafeteria"><b>Cafeteria</b><small>Café especial para trabalhar e receber clientes.</small></a>
      <a href="/galeria"><b>Galeria</b><small>Fotos dos ambientes CafeWorking.</small></a>
    </div>
  </div>

  <div class="cw-dropdown">
    <a class="cw-menu-link" href="/networking-eventos">Eventos <span>▾</span></a>
    <div class="cw-dropdown-panel">
      <a href="/auditorio"><b>Auditório e Eventos</b><small>Formatos auditório, escolar e U.</small></a>
      <a href="/workshops"><b>Workshops e Treinamentos</b><small>Estrutura completa para capacitações.</small></a>
      <a href="/networking-eventos"><b>Networking & Eventos</b><small>Conexões empresariais e comunidade.</small></a>
    </div>
  </div>

  <div class="cw-dropdown">
    <a class="cw-menu-link" href="/unidades">Unidades <span>▾</span></a>
    <div class="cw-dropdown-panel">
      <a href="/unidade-luxemburgo"><b>Unidade Luxemburgo</b><small>Rua Guaicuí, 715.</small></a>
      <a href="/unidade-estoril"><b>Estoril</b><small>Endereço fiscal na Av. Raja Gabaglia.</small></a>
      <a href="/seja-parceiro"><b>Seja parceiro</b><small>Traga seu escritório para a rede CafeWorking.</small></a>
    </div>
  </div>

  <a class="cw-menu-link" href="/blog">Blog</a>
  <a class="cw-menu-link" href="/contato">Contato</a>
  <a class="cw-menu-link cw-menu-mobile" href="${APP}">Área do Cliente</a>
</nav>`;

const ACOES = `<div class="nav-actions"><a class="cw-nav-cliente" href="${APP}">Área do Cliente</a><a class="btn btn-outline" href="${wa('Olá! Quero falar com o CafeWorking.')}" target="_blank" rel="noopener">WhatsApp</a><a class="btn btn-primary" href="/planos">Ver planos</a></div>`;

const FLUTUANTE = `<a class="wa-float" href="${wa('Olá! Quero falar com o CafeWorking.')}" target="_blank" rel="noopener" aria-label="Falar com o CafeWorking no WhatsApp">${ICONE_WA}</a>`;

const RODAPE = `<footer class="footer"><div class="wrap"><div class="footer-grid"><div><img loading="lazy" width="260" height="146" decoding="async" src="assets/img/logo-cafeworking.webp" alt="CafeWorking"><p>Coworking, cafeteria e hub empresarial em Belo Horizonte.</p><p>@cafeworkingoficial</p><div class="social-links" aria-label="Redes sociais"><a href="https://www.instagram.com/cafeworkingoficial/" target="_blank" rel="noopener" aria-label="Instagram CafeWorking"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17" cy="7" r="1.2"></circle></svg></a><a href="https://www.facebook.com/CafeWorkingoficial?locale=pt_BR" target="_blank" rel="noopener" aria-label="Facebook CafeWorking"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h2V4h-3c-3 0-5 2-5 5v2H6v4h2v5h4v-5h3l1-4h-4V9c0-.6.4-1 1-1h1z"></path></svg></a></div></div><div><h4>Salas</h4><a href="/salas-privativas">Salas Privativas</a><a href="/atendimento-privativo">Atendimento Privativo</a><a href="/coworking">Sala Compartilhada</a><a href="/salas-de-reuniao">Salas de Reunião</a></div><div><h4>Eventos</h4><a href="/auditorio">Auditório</a><a href="/workshops">Workshops</a><a href="/networking-eventos">Networking &amp; Eventos</a><a href="/cafeteria">Cafeteria</a><a href="/cardapio">Cardápio</a><a href="/galeria">Galeria</a></div><div><h4>Unidades</h4><a href="/unidade-luxemburgo">Luxemburgo</a><a href="/unidade-estoril">Estoril (endereço fiscal)</a><a href="/planos">Planos e preços</a></div><div><h4>Soluções</h4><a href="/endereco-fiscal">Endereço Fiscal</a><a href="/abertura-de-empresa">Abertura de Empresa</a><a href="/reservar-sala">Reservar sala por hora</a><a href="/seja-parceiro">Seja parceiro</a></div><div class="footer-contato"><h4>Contato</h4><p>Rua Guaicuí, 715, sala 03<br>Luxemburgo, Belo Horizonte/MG<br>CEP 30380-342</p><p>Seg a sex, 8h às 18h</p><p>WhatsApp <a href="tel:+5531997129789">(31) 99712-9789</a></p><p>Telefone <a href="tel:+553131810140">(31) 3181-0140</a></p><p><a href="mailto:atendimento@cafeworking.com.br">atendimento@cafeworking.com.br</a></p></div></div><div class="copyright"><span>&copy; 2026 CAFEWORKING LTDA &middot; CNPJ 20.351.761/0001-03 &middot; Grupo Ciatos</span><span class="footer-legal"><a href="/privacidade">Privacidade</a><a href="/termos">Termos</a><a href="/privacidade#cookies" data-cw-cookies>Cookies</a></span></div></div></footer>`;

const BARRA = `<nav class="cw-barra" aria-label="Atalhos"><a class="cw-barra-precos" href="/planos">Ver planos e preços</a><a class="cw-barra-wa" href="${wa('Olá! Quero falar com o CafeWorking.')}" target="_blank" rel="noopener">${ICONE_WA.replace('width="26" height="26"', 'width="20" height="20"')}<span>WhatsApp</span></a></nav>`;

function blocoGlobal(arq, html) {
  const fora = html.replace(/<!-- cw:global -->[\s\S]*?<!-- \/cw:global -->/, '');
  const semLoja = !/src="assets\/js\/loja-config\.js/.test(fora);
  const semMenu = /mobile-toggle/.test(fora) && !/src="assets\/js\/mobile-menu\.js/.test(fora);
  return '<!-- cw:global -->' +
    (SEM_BARRA.has(arq) ? '' : BARRA) +
    (semMenu ? '<script src="assets/js/mobile-menu.js"></script>' : '') +
    (semLoja ? '<script defer src="assets/js/loja-config.js"></script>' : '') +
    '<script defer src="assets/js/analytics.js"></script>' +
    '<!-- /cw:global -->';
}

/* Troca por função: o texto do modelo tem "$" e não pode virar padrão de replace. */
const trocar = (html, re, novo) => html.replace(re, () => novo);

let alteradas = 0;
const arquivos = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html') && !ehInterno(f));
for (const arq of arquivos) {
  const caminho = path.join(RAIZ, arq);
  const original = fs.readFileSync(caminho, 'utf8');
  let html = original.replace(/\r\n/g, '\n');

  html = trocar(html, /<nav class="menu cw-menu">[\s\S]*?<\/nav>/, MENU);
  html = trocar(html, /<div class="nav-actions">[\s\S]*?<\/div>/, ACOES);
  html = trocar(html, /<a class="wa-float"[^>]*>[\s\S]*?<\/a>/, FLUTUANTE);
  html = trocar(html, /<footer class="footer">[\s\S]*?<\/footer>/, RODAPE);

  if (/<\/body>/i.test(html)) {
    // preserva o ?v= que o versionar-loja.js já carimbou nos scripts do bloco
    const antigo = (html.match(/<!-- cw:global -->[\s\S]*?<!-- \/cw:global -->/) || [''])[0];
    const versoes = {};
    antigo.replace(/src="(assets\/js\/[a-z-]+\.js)\?v=([0-9a-f]+)"/g, (m, src, v) => { versoes[src] = v; return m; });
    html = html.replace(/<!-- cw:global -->[\s\S]*?<!-- \/cw:global -->/, '');
    const bloco = blocoGlobal(arq, html).replace(/src="(assets\/js\/[a-z-]+\.js)"/g, (m, src) => (versoes[src] ? `src="${src}?v=${versoes[src]}"` : m));
    html = trocar(html, /<\/body>/i, bloco + '</body>');
  }

  if (html !== original.replace(/\r\n/g, '\n') || html !== original) {
    fs.writeFileSync(caminho, html, 'utf8');
    alteradas++;
  }
}
console.log(`layout: ${arquivos.length} páginas públicas, ${alteradas} gravada(s)`);
