const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { atualizarVitrines } = require('./build-site.js');

test('artefato usa a foto de cada sala; catálogo ausente conserva conteúdo publicado', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'cafeworking-vitrine-'));
  try {
    const arq = path.join(pasta, 'salas.html');
    const antigo = '<!-- vitrine:sala_privativa -->antigo<!-- /vitrine -->';
    fs.writeFileSync(arq, antigo);
    assert.equal(atualizarVitrines(pasta, null), 0);
    assert.equal(fs.readFileSync(arq, 'utf8'), antigo);
    const plano = { id: 'p4', unidade_id: 'lux', categoria: 'sala_privativa', capacidade: 4, preco: 2200,
      salas: [{ id: 'a', nome: 'Savassi', fotos: ['https://example.com/savassi.webp'] }, { id: 'b', nome: 'Sion', fotos: ['https://example.com/sion.webp'] }, { id: 'c', nome: 'Lourdes', fotos: [] }] };
    assert.equal(atualizarVitrines(pasta, { planos: [plano], unidades: [{ id: 'lux', nome: 'Luxemburgo' }] }), 1);
    const html = fs.readFileSync(arq, 'utf8');
    assert.match(html, /savassi\.webp/); assert.match(html, /sion\.webp/);
    const lourdes = html.split('<article').find(c => c.includes('<h3>Lourdes</h3>'));
    assert.match(lourdes, /Fotos em breve/); assert.doesNotMatch(lourdes, /<img|data-galeria/);
  } finally {
    if (!path.resolve(pasta).startsWith(path.resolve(os.tmpdir()) + path.sep)) throw new Error('Diretório de teste inválido');
    fs.rmSync(pasta, { recursive: true });
  }
});
