/**
 * Metadados dos artigos novos do blog.
 * Lido por scripts/seo.js para gerar title, description, Open Graph e JSON-LD.
 *
 * Ao criar um artigo novo:
 *   1. escreva o miolo em scripts/conteudo/<arquivo>.html
 *   2. adicione o registro aqui
 *   3. rode: node scripts/gerar-paginas.js && node scripts/seo.js
 *   4. adicione o card em blog.html
 */

module.exports = {
  'quanto-custa-coworking-bh.html': {
    t: 'Quanto Custa um Coworking em Belo Horizonte? | CafeWorking',
    tCurto: 'Quanto custa um coworking em BH',
    d: 'Como o preço de um coworking em BH é formado: formatos de contratação, o que está incluso, o que vira extra e a comparação real com alugar uma sala comercial.',
    img: 'og-coworking.jpg',
    data: '2026-08-17',
  },
  'coworking-zona-sul-bh.html': {
    t: 'Coworking na Zona Sul de BH: Guia por Bairro | CafeWorking',
    tCurto: 'Coworking na Zona Sul de BH',
    d: 'Luxemburgo, Belvedere, Gutierrez, Savassi, Estoril e Buritis: o perfil de cada bairro e como escolher onde trabalhar e receber clientes em Belo Horizonte.',
    img: 'og-luxemburgo.jpg',
    data: '2026-08-17',
  },
  'empresa-endereco-residencial.html': {
    t: 'Posso Abrir Empresa no Endereço da Minha Casa?',
    tCurto: 'Abrir empresa no endereço residencial',
    d: 'Quando é permitido registrar a empresa no endereço residencial, o que trava o registro, as consequências de expor sua casa no CNPJ e como usar endereço fiscal.',
    img: 'og-endereco-fiscal.jpg',
    data: '2026-08-17',
  },
  'alugar-sala-reuniao-bh.html': {
    t: 'Alugar Sala de Reunião em BH: Guia Completo | CafeWorking',
    tCurto: 'Alugar sala de reunião em BH',
    d: 'Qual tamanho escolher, o que conferir antes de reservar, como o preço é cobrado e o checklist técnico para a reunião começar no horário em Belo Horizonte.',
    img: 'og-salas-reuniao.jpg',
    data: '2026-08-17',
  },
  'melhores-bairros-escritorio-bh.html': {
    t: 'Melhores Bairros para Escritório em Belo Horizonte',
    tCurto: 'Melhores bairros para escritório em BH',
    d: 'Savassi, Lourdes, Belvedere, Luxemburgo, Estoril, Gutierrez, Buritis e Centro comparados: perfil, pontos fortes e um método para escolher a região certa.',
    img: 'og-estoril.jpg',
    data: '2026-08-17',
  },
  'espaco-eventos-corporativos-bh.html': {
    t: 'Espaço para Eventos Corporativos em BH | CafeWorking',
    tCurto: 'Espaço para eventos corporativos em BH',
    d: 'Formato de sala, capacidade real, checklist técnico, coffee break e custos extras: o que avaliar antes de fechar um espaço para eventos em Belo Horizonte.',
    img: 'og-auditorio.jpg',
    data: '2026-08-17',
  },
  'abrir-empresa-belo-horizonte.html': {
    t: 'Como Abrir uma Empresa em Belo Horizonte: Passo a Passo',
    tCurto: 'Abrir empresa em Belo Horizonte',
    d: 'Passo a passo para abrir empresa em BH: viabilidade do endereço, CNAE, contrato social, CNPJ, alvará municipal, prazos, custos e os erros do primeiro ano.',
    img: 'og-abertura-empresa.jpg',
    data: '2026-08-17',
  },
};
