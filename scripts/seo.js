#!/usr/bin/env node
/**
 * SEO do site CafeWorking.
 *
 * Roda em cima dos .html da raiz e padroniza tudo que o Google usa para ranquear:
 * title/description, canonical, robots, Open Graph, Twitter Card, favicons e
 * dados estruturados (JSON-LD). Tambem corrige links quebrados do menu e
 * regenera o sitemap.xml.
 *
 * O script e idempotente: pode rodar quantas vezes quiser.
 *
 *   node scripts/seo.js
 *   node scripts/seo.js --check   (so relata, nao grava)
 */

const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const SITE = 'https://cafeworking.com.br';
const SOMENTE_CHECAR = process.argv.includes('--check');

/* ------------------------------------------------------------------ *
 * Dados do negocio (NAP). Precisam bater com o Google Business Profile.
 * ------------------------------------------------------------------ */

const NEGOCIO = {
  nome: 'CafeWorking',
  descricao:
    'Coworking, cafeteria e hub empresarial premium em Belo Horizonte, com salas privativas, salas de reuniao, endereco fiscal, abertura de empresa e contabilidade.',
  telefone: '+55-31-3181-0140',
  whatsapp: '+55-31-99712-9789',
  email: 'contato@cafeworking.com.br',
  faixaPreco: '$$',
  sameAs: [
    'https://www.instagram.com/cafeworkingoficial/',
    'https://www.facebook.com/CafeWorkingoficial',
  ],
  // ATENCAO: preencha com o horario real e igual ao do Google Business Profile.
  // Formato schema.org, ex: ['Mo-Fr 08:00-18:00', 'Sa 09:00-13:00'].
  // Deixe null enquanto nao tiver certeza - horario errado e pior que nenhum.
  horario: null,
};

const UNIDADES = {
  luxemburgo: {
    id: `${SITE}/#luxemburgo`,
    nome: 'CafeWorking Luxemburgo',
    rua: 'Rua Guaicuí, 715',
    bairro: 'Luxemburgo',
    cep: '30380-342',
    lat: -19.9473302,
    lon: -43.9544083,
    pagina: 'unidade-luxemburgo.html',
    imagem: '/assets/img/og/og-luxemburgo.jpg',
  },
  estoril: {
    id: `${SITE}/#estoril`,
    nome: 'CafeWorking Estoril',
    rua: 'Av. Raja Gabaglia, 2000',
    bairro: 'Estoril',
    cep: '30494-170',
    lat: -19.9529925,
    lon: -43.9603394,
    pagina: 'unidade-estoril.html',
    imagem: '/assets/img/og/og-estoril.jpg',
  },
};

/* ------------------------------------------------------------------ *
 * Paginas que NAO devem aparecer no Google.
 * Area logada, telas administrativas, materiais internos e landing pages
 * de anuncio (que duplicariam o conteudo das paginas de servico).
 * ------------------------------------------------------------------ */

const NAO_INDEXAR = new Set([
  '404.html', 'offline.html', 'obrigado.html',
  'login.html', 'cadastro.html', 'perfil.html', 'documentos.html',
  'reservas.html', 'solicitacoes.html', 'financeiro.html',
  'area-do-cliente.html', 'area-do-membro.html',
  'analytics-tags.html', 'google-business-profile.html',
  'checklist-publicacao.html', 'guia-fotos-site.html', 'modelos-mensagens.html',
  'lp-abertura-empresa.html', 'lp-endereco-fiscal.html',
  'lp-salas-privativas.html', 'lp-salas-reuniao.html',
]);

const ehAdmin = (arq) => arq.startsWith('admin');

/* Arquivos .html que NAO sao paginas e nao podem ser tocados nem entrar no
 * sitemap - hoje, os arquivos de verificacao de propriedade (Google Search
 * Console, Bing etc). Eles precisam ser servidos exatamente como vieram. */
const NAO_TOCAR = [/^google[0-9a-f]+\.html$/i, /^BingSiteAuth\.xml$/i, /^yandex_/i];
const ehIntocavel = (arq) => NAO_TOCAR.some((re) => re.test(arq));

/* ------------------------------------------------------------------ *
 * Metadados por pagina.
 *   t    = title (alvo: ate ~62 caracteres)
 *   d    = meta description (alvo: 140-160 caracteres)
 *   img  = imagem Open Graph em /assets/img/og/
 *   tipo = home | unidade:x | servico | artigo | pagina
 *   bc   = trilha de navegacao (breadcrumb) sem o "Inicio"
 *   data = data do artigo (ISO), so para tipo artigo
 * ------------------------------------------------------------------ */

const AMB = ['Ambientes', 'ambientes.html'];
const SERV = ['Serviços', 'servicos.html'];
const UNI = ['Unidades', 'unidades.html'];
const BLOG = ['Blog', 'blog.html'];

const PAGINAS = {
  'index.html': {
    t: 'Coworking em Belo Horizonte | Salas e Cafeteria | CafeWorking',
    d: 'Coworking premium em Belo Horizonte com salas privativas, salas de reunião, cafeteria, endereço fiscal e contabilidade. Unidades Luxemburgo e Estoril.',
    img: 'og-default.jpg', tipo: 'home',
  },

  /* ---- ambientes ---- */
  'ambientes.html': {
    t: 'Ambientes do CafeWorking | Salas e Coworking em BH',
    d: 'Conheça os ambientes do CafeWorking em Belo Horizonte: salas privativas, sala compartilhada, salas de reunião, atendimento privativo, auditório e cafeteria.',
    img: 'og-salas-privativas.jpg', tipo: 'pagina', bc: [AMB],
  },
  'coworking.html': {
    t: 'Coworking e Sala Compartilhada em BH | CafeWorking',
    d: 'Estação de trabalho em coworking premium em Belo Horizonte: internet dedicada, café, recepção, salas de reunião e planos flexíveis. Agende uma visita.',
    img: 'og-coworking.jpg', tipo: 'servico', bc: [AMB, ['Sala Compartilhada', 'coworking.html']],
  },
  'salas-privativas.html': {
    t: 'Sala Privativa em BH | Escritório para Equipes | CafeWorking',
    d: 'Escritório privativo mobiliado em Belo Horizonte, com recepção, cafeteria e salas de reunião inclusas. Ideal para equipes de 2 a 12 pessoas.',
    img: 'og-salas-privativas.jpg', tipo: 'servico', bc: [AMB, ['Salas Privativas', 'salas-privativas.html']],
  },
  'salas-de-reuniao.html': {
    t: 'Sala de Reunião em BH por Hora | CafeWorking',
    d: 'Alugue sala de reunião em Belo Horizonte por hora ou período: TV, videoconferência, recepção e café. Unidades no Luxemburgo e no Estoril.',
    img: 'og-salas-reuniao.jpg', tipo: 'servico', bc: [AMB, ['Salas de Reunião', 'salas-de-reuniao.html']],
  },
  'atendimento-privativo.html': {
    t: 'Sala de Atendimento Privativo em BH | CafeWorking',
    d: 'Ambiente reservado para atender clientes e pacientes em Belo Horizonte, com privacidade, recepção profissional e uso por hora ou por período.',
    img: 'og-atendimento.jpg', tipo: 'servico', bc: [AMB, ['Atendimento Privativo', 'atendimento-privativo.html']],
  },
  'auditorio.html': {
    t: 'Auditório para Eventos e Palestras em BH | CafeWorking',
    d: 'Auditório para eventos, palestras e treinamentos em Belo Horizonte, nos formatos auditório, escolar e U, com projeção, som e coffee break.',
    img: 'og-auditorio.jpg', tipo: 'servico', bc: [AMB, ['Auditório', 'auditorio.html']],
  },
  'workshops.html': {
    t: 'Espaço para Workshops e Treinamentos em BH | CafeWorking',
    d: 'Estrutura completa para workshops, cursos e treinamentos empresariais em Belo Horizonte: salas equipadas, cafeteria e apoio na organização.',
    img: 'og-auditorio.jpg', tipo: 'servico', bc: [AMB, ['Workshops', 'workshops.html']],
  },
  'networking-eventos.html': {
    t: 'Networking e Eventos Empresariais em BH | CafeWorking',
    d: 'Eventos de networking, encontros e ações empresariais em Belo Horizonte. Um ambiente feito para gerar conexões entre empresários e profissionais.',
    img: 'og-networking.jpg', tipo: 'servico', bc: [AMB, ['Networking & Eventos', 'networking-eventos.html']],
  },
  'cafeteria.html': {
    t: 'Cafeteria em Belo Horizonte | CafeWorking Luxemburgo',
    d: 'Cafeteria do CafeWorking no Luxemburgo, em Belo Horizonte: café especial, ambiente tranquilo para trabalhar, reuniões informais e wi-fi.',
    img: 'og-cafeteria.jpg', tipo: 'servico', bc: [['Cafeteria', 'cafeteria.html']],
  },
  'cardapio.html': {
    t: 'Cardápio da Cafeteria | CafeWorking BH',
    d: 'Confira o cardápio da cafeteria do CafeWorking em Belo Horizonte: cafés especiais, bebidas, salgados e opções para o dia de trabalho.',
    img: 'og-cafeteria.jpg', tipo: 'pagina', bc: [['Cafeteria', 'cafeteria.html'], ['Cardápio', 'cardapio.html']],
  },
  'galeria.html': {
    t: 'Fotos do CafeWorking | Ambientes Reais em BH',
    d: 'Galeria de fotos reais do CafeWorking em Belo Horizonte: fachada, recepção, cafeteria, jardim, salas privativas, reuniões e auditório.',
    img: 'og-jardim.jpg', tipo: 'pagina', bc: [UNI, ['Galeria', 'galeria.html']],
  },

  /* ---- servicos empresariais ---- */
  'servicos.html': {
    t: 'Serviços Empresariais em BH | CafeWorking + Grupo Ciatos',
    d: 'Endereço fiscal, abertura de empresa, contabilidade e jurídico empresarial em Belo Horizonte, integrados à estrutura física do CafeWorking.',
    img: 'og-contabilidade.jpg', tipo: 'pagina', bc: [SERV],
  },
  'endereco-fiscal.html': {
    t: 'Endereço Fiscal em Belo Horizonte para CNPJ | CafeWorking',
    d: 'Endereço fiscal e comercial em Belo Horizonte para abrir ou transferir seu CNPJ, com recebimento de correspondências, recepção e sala de reunião.',
    img: 'og-endereco-fiscal.jpg', tipo: 'servico', bc: [SERV, ['Endereço Fiscal', 'endereco-fiscal.html']],
  },
  'abertura-de-empresa.html': {
    t: 'Abertura de Empresa em BH | Abrir CNPJ com Contador',
    d: 'Abertura de empresa em Belo Horizonte com contador, endereço fiscal e escolha do regime tributário. CNPJ aberto com segurança pelo Grupo Ciatos.',
    img: 'og-abertura-empresa.jpg', tipo: 'servico', bc: [SERV, ['Abertura de Empresa', 'abertura-de-empresa.html']],
  },
  'contabilidade.html': {
    t: 'Contabilidade em Belo Horizonte para Empresas | CafeWorking',
    d: 'Contabilidade consultiva para empresas em Belo Horizonte: rotina fiscal, folha, obrigações em dia e apoio na tomada de decisão. Grupo Ciatos.',
    img: 'og-contabilidade.jpg', tipo: 'servico', bc: [SERV, ['Contabilidade', 'contabilidade.html']],
  },
  'juridico-empresarial.html': {
    t: 'Jurídico Empresarial em BH | Contratos e Consultoria',
    d: 'Assessoria jurídica empresarial em Belo Horizonte: contratos, societário, consultas e prevenção de conflitos para empresas em crescimento.',
    img: 'og-juridico.jpg', tipo: 'servico', bc: [SERV, ['Jurídico', 'juridico-empresarial.html']],
  },
  'planos.html': {
    t: 'Planos e Preços do Coworking em BH | CafeWorking',
    d: 'Planos do CafeWorking em Belo Horizonte: coworking, sala privativa, endereço fiscal e reuniões. Compare formatos e escolha o ideal para sua empresa.',
    img: 'og-coworking.jpg', tipo: 'pagina', bc: [['Planos', 'planos.html']],
  },
  'franquias.html': {
    t: 'Franquia de Coworking | Seja um Franqueado CafeWorking',
    d: 'Conheça o modelo de franquia do CafeWorking: hub empresarial premium com coworking, cafeteria e serviços do Grupo Ciatos. Peça informações.',
    img: 'og-default.jpg', tipo: 'pagina', bc: [['Franquias', 'franquias.html']],
  },

  /* ---- unidades ---- */
  'unidades.html': {
    t: 'Unidades CafeWorking em BH | Luxemburgo e Estoril',
    d: 'O CafeWorking tem duas unidades em Belo Horizonte: Luxemburgo (Rua Guaicuí, 715) e Estoril (Av. Raja Gabaglia, 2000). Veja estrutura e como chegar.',
    img: 'og-default.jpg', tipo: 'unidades', bc: [UNI],
  },
  'unidade-luxemburgo.html': {
    t: 'CafeWorking Luxemburgo | Coworking na Rua Guaicuí, 715',
    d: 'Unidade Luxemburgo do CafeWorking, na Rua Guaicuí, 715, em Belo Horizonte: recepção, cafeteria, jardim, salas privativas, reuniões e auditório.',
    img: 'og-luxemburgo.jpg', tipo: 'unidade:luxemburgo', bc: [UNI, ['Luxemburgo', 'unidade-luxemburgo.html']],
  },
  'unidade-estoril.html': {
    t: 'CafeWorking Estoril | Coworking na Raja Gabaglia, 2000',
    d: 'Unidade Estoril do CafeWorking, na Av. Raja Gabaglia, 2000, em Belo Horizonte: estrutura corporativa, salas em vidro e vista privilegiada.',
    img: 'og-estoril.jpg', tipo: 'unidade:estoril', bc: [UNI, ['Estoril', 'unidade-estoril.html']],
  },
  'coworking-luxemburgo-bh.html': {
    t: 'Coworking no Luxemburgo, BH | Rua Guaicuí, 715',
    d: 'Coworking no bairro Luxemburgo, em Belo Horizonte: estações de trabalho, salas de reunião, cafeteria e endereço fiscal na Rua Guaicuí, 715.',
    img: 'og-luxemburgo.jpg', tipo: 'unidade:luxemburgo', bc: [UNI, ['Coworking no Luxemburgo', 'coworking-luxemburgo-bh.html']],
  },
  'coworking-estoril-bh.html': {
    t: 'Coworking no Estoril, BH | Av. Raja Gabaglia, 2000',
    d: 'Coworking no bairro Estoril, em Belo Horizonte: ambiente corporativo, salas de reunião, recepção e cafeteria na Av. Raja Gabaglia, 2000.',
    img: 'og-estoril.jpg', tipo: 'unidade:estoril', bc: [UNI, ['Coworking no Estoril', 'coworking-estoril-bh.html']],
  },
  'endereco-fiscal-luxemburgo-bh.html': {
    t: 'Endereço Fiscal no Luxemburgo, BH | CafeWorking',
    d: 'Endereço fiscal no Luxemburgo, em Belo Horizonte, para abrir ou transferir CNPJ: recebimento de correspondências, recepção e sala de reunião.',
    img: 'og-endereco-fiscal.jpg', tipo: 'unidade:luxemburgo', bc: [SERV, ['Endereço Fiscal no Luxemburgo', 'endereco-fiscal-luxemburgo-bh.html']],
  },
  'sala-reuniao-luxemburgo-bh.html': {
    t: 'Sala de Reunião no Luxemburgo, BH | CafeWorking',
    d: 'Sala de reunião para alugar no Luxemburgo, em Belo Horizonte, por hora ou período, com TV, videoconferência, recepção e café.',
    img: 'og-salas-reuniao.jpg', tipo: 'unidade:luxemburgo', bc: [AMB, ['Sala de Reunião no Luxemburgo', 'sala-reuniao-luxemburgo-bh.html']],
  },

  /* ---- paginas nacionais ---- */
  'escritorio-virtual-brasil.html': {
    t: 'Escritório Virtual no Brasil | Endereço Fiscal | CafeWorking',
    d: 'Escritório virtual com endereço fiscal, recebimento de correspondências e apoio contábil para empresas que trabalham de qualquer lugar do Brasil.',
    img: 'og-endereco-fiscal.jpg', tipo: 'servico', bc: [SERV, ['Escritório Virtual', 'escritorio-virtual-brasil.html']],
  },
  'abertura-empresa-online.html': {
    t: 'Abertura de Empresa Online | CNPJ sem Sair de Casa',
    d: 'Abra sua empresa online com contador responsável: definição de CNAE, regime tributário, endereço fiscal e CNPJ registrado com segurança.',
    img: 'og-abertura-empresa.jpg', tipo: 'servico', bc: [SERV, ['Abertura Online', 'abertura-empresa-online.html']],
  },
  'abrir-cnpj-online.html': {
    t: 'Abrir CNPJ Online | MEI, ME e LTDA | CafeWorking',
    d: 'Como abrir CNPJ online como MEI, ME ou LTDA: documentos, prazos, custos e os cuidados que evitam retrabalho e multas no primeiro ano.',
    img: 'og-abertura-empresa.jpg', tipo: 'servico', bc: [SERV, ['Abrir CNPJ Online', 'abrir-cnpj-online.html']],
  },
  'contabilidade-digital.html': {
    t: 'Contabilidade Digital para Empresas | CafeWorking',
    d: 'Contabilidade digital com atendimento humano: obrigações em dia, documentos online e um contador que explica os números do seu negócio.',
    img: 'og-contabilidade.jpg', tipo: 'servico', bc: [SERV, ['Contabilidade Digital', 'contabilidade-digital.html']],
  },
  'trocar-contador.html': {
    t: 'Trocar de Contador | Migração Contábil sem Dor de Cabeça',
    d: 'Trocar de contador com segurança: o que pedir ao escritório atual, quais documentos exigir e como fazer a migração sem perder prazos fiscais.',
    img: 'og-contabilidade.jpg', tipo: 'servico', bc: [SERV, ['Trocar de Contador', 'trocar-contador.html']],
  },

  /* ---- institucional ---- */
  'sobre.html': {
    t: 'Sobre o CafeWorking | Hub Empresarial em BH',
    d: 'O CafeWorking é o hub empresarial do Grupo Ciatos em Belo Horizonte: coworking, cafeteria e serviços contábeis e jurídicos no mesmo lugar.',
    img: 'og-default.jpg', tipo: 'pagina', bc: [['Sobre', 'sobre.html']],
  },
  'contato.html': {
    t: 'Contato | CafeWorking Belo Horizonte',
    d: 'Fale com o CafeWorking: WhatsApp (31) 99712-9789, telefone (31) 3181-0140 e endereços das unidades Luxemburgo e Estoril em Belo Horizonte.',
    img: 'og-default.jpg', tipo: 'contato', bc: [['Contato', 'contato.html']],
  },
  'agendar-visita.html': {
    t: 'Agendar Visita ao CafeWorking | Coworking em BH',
    d: 'Agende uma visita ao CafeWorking em Belo Horizonte e conheça os ambientes, planos e serviços empresariais antes de decidir.',
    img: 'og-default.jpg', tipo: 'pagina', bc: [['Agendar Visita', 'agendar-visita.html']],
  },
  'faq.html': {
    t: 'Perguntas Frequentes | CafeWorking BH',
    d: 'Dúvidas sobre coworking, salas, endereço fiscal, abertura de empresa e contabilidade no CafeWorking em Belo Horizonte, respondidas em um só lugar.',
    img: 'og-default.jpg', tipo: 'pagina', bc: [['FAQ', 'faq.html']],
  },
  'diagnostico.html': {
    t: 'Diagnóstico Empresarial Gratuito | CafeWorking',
    d: 'Responda algumas perguntas e receba um diagnóstico com as soluções de espaço, contabilidade e jurídico mais adequadas ao momento da sua empresa.',
    img: 'og-default.jpg', tipo: 'pagina', bc: [['Diagnóstico', 'diagnostico.html']],
  },
  'sitemap.html': {
    t: 'Mapa do Site | CafeWorking',
    d: 'Todas as páginas do site do CafeWorking organizadas por tema: ambientes, unidades, serviços empresariais, planos, blog e contato.',
    img: 'og-default.jpg', tipo: 'pagina', bc: [['Mapa do Site', 'sitemap.html']],
  },
  'privacidade.html': {
    t: 'Política de Privacidade | CafeWorking',
    d: 'Como o CafeWorking coleta, usa e protege os dados pessoais de visitantes, membros e clientes, conforme a LGPD.',
    img: 'og-default.jpg', tipo: 'pagina', bc: [['Privacidade', 'privacidade.html']],
  },
  'termos.html': {
    t: 'Termos de Uso | CafeWorking',
    d: 'Termos e condições de uso do site, dos ambientes e dos serviços oferecidos pelo CafeWorking em Belo Horizonte.',
    img: 'og-default.jpg', tipo: 'pagina', bc: [['Termos', 'termos.html']],
  },

  /* ---- blog ---- */
  'blog.html': {
    t: 'Blog CafeWorking | Coworking, CNPJ e Gestão em BH',
    d: 'Conteúdos sobre coworking em Belo Horizonte, endereço fiscal, abertura de empresa, salas de reunião, contabilidade e gestão para pequenas empresas.',
    img: 'og-default.jpg', tipo: 'pagina', bc: [BLOG],
  },
};

/* ---- artigos existentes ---- */
const ARTIGOS_EXISTENTES = {
  'artigo-coworking-premium-bh.html': {
    t: 'Como Escolher um Coworking Premium em BH | CafeWorking',
    d: 'Localização, estrutura, credibilidade e networking: os critérios que realmente importam na hora de escolher um coworking em Belo Horizonte.',
    img: 'og-coworking.jpg', data: '2026-06-10',
  },
  'artigo-endereco-fiscal.html': {
    t: 'Endereço Fiscal: Como Funciona e Quando Usar',
    d: 'Entenda o que é endereço fiscal, quando ele é permitido, como ajuda a abrir CNPJ e por que separar o endereço da empresa do endereço residencial.',
    img: 'og-endereco-fiscal.jpg', data: '2026-06-10',
  },
  'artigo-abertura-empresa.html': {
    t: 'Como Abrir Empresa com Mais Segurança | CafeWorking',
    d: 'Atividade, CNAE, regime tributário, endereço e contabilidade: os cuidados básicos antes de abrir o CNPJ e começar a emitir nota fiscal.',
    img: 'og-abertura-empresa.jpg', data: '2026-06-10',
  },
  'artigo-salas-reuniao.html': {
    t: 'Como Escolher uma Sala de Reunião Profissional',
    d: 'O que observar antes de reservar uma sala de reunião para atendimento, apresentação, entrevista ou negociação com clientes.',
    img: 'og-salas-reuniao.jpg', data: '2026-06-10',
  },
  'artigo-home-office-coworking.html': {
    t: 'Home Office, Coworking ou Escritório Próprio?',
    d: 'Compare custo, produtividade, imagem e flexibilidade dos três modelos e entenda quando cada um faz sentido para o seu momento profissional.',
    img: 'og-coworking.jpg', data: '2026-06-10',
  },
  'artigo-networking-empresarial.html': {
    t: 'Networking Empresarial: Por que o Ambiente Importa',
    d: 'Relacionamentos de negócio acontecem com mais naturalidade quando o ambiente estimula encontros. Veja como escolher um espaço que gera conexões.',
    img: 'og-networking.jpg', data: '2026-06-10',
  },
  'artigo-contabilidade-consultiva.html': {
    t: 'Contabilidade Consultiva para Pequenos Negócios',
    d: 'A diferença entre um contador que só entrega guias e um que ajuda a decidir: o que esperar de uma contabilidade consultiva na prática.',
    img: 'og-contabilidade.jpg', data: '2026-06-10',
  },
  'artigo-contratos-seguranca.html': {
    t: 'Contratos e Segurança Jurídica para Empresas',
    d: 'Como contratos bem escritos previnem conflitos, alinham expectativas e protegem o caixa da empresa. Cláusulas que não podem faltar.',
    img: 'og-juridico.jpg', data: '2026-06-10',
  },
};

/* ---- guias comparativos ---- */
const GUIAS = {
  'guia-abrir-empresa-online.html': {
    t: 'Como Abrir uma Empresa Online: Guia Completo',
    d: 'Passo a passo para abrir empresa online no Brasil: escolha do tipo societário, CNAE, regime tributário, endereço fiscal e prazos reais.',
    img: 'og-abertura-empresa.jpg', data: '2026-06-10',
  },
  'coworking-ou-escritorio.html': {
    t: 'Coworking ou Escritório Próprio: Qual Compensa?',
    d: 'Compare custo total, prazo de contrato, flexibilidade e imagem entre alugar uma sala comercial e usar um coworking em Belo Horizonte.',
    img: 'og-coworking.jpg', data: '2026-06-10',
  },
  'endereco-fiscal-ou-comercial.html': {
    t: 'Endereço Fiscal ou Comercial: Qual a Diferença?',
    d: 'Entenda a diferença entre endereço fiscal, comercial e de correspondência, e qual deles a sua empresa precisa informar na Receita Federal.',
    img: 'og-endereco-fiscal.jpg', data: '2026-06-10',
  },
  'sala-reuniao-profissional.html': {
    t: 'Por que a Sala de Reunião Muda a Percepção do Cliente',
    d: 'O ambiente da reunião comunica antes de você falar. Veja como o espaço influencia confiança, preço percebido e fechamento de negócio.',
    img: 'og-salas-reuniao.jpg', data: '2026-06-10',
  },
  'trocar-contador-guia.html': {
    t: 'Quando Trocar de Contador e Como Fazer com Segurança',
    d: 'Sinais de que é hora de trocar de contador, documentos que você deve exigir na migração e como evitar perder prazos fiscais no caminho.',
    img: 'og-contabilidade.jpg', data: '2026-06-10',
  },
};

Object.entries(ARTIGOS_EXISTENTES).forEach(([arq, m]) => {
  PAGINAS[arq] = { ...m, tipo: 'artigo', bc: [BLOG, [m.t.split(' | ')[0], arq]] };
});
Object.entries(GUIAS).forEach(([arq, m]) => {
  PAGINAS[arq] = { ...m, tipo: 'artigo', bc: [BLOG, [m.t.split(' | ')[0], arq]] };
});

/* ---- artigos novos (escritos em scripts/artigos/) ---- */
try {
  const novos = require('./artigos/meta.js');
  Object.entries(novos).forEach(([arq, m]) => {
    PAGINAS[arq] = { ...m, tipo: 'artigo', bc: [BLOG, [m.tCurto || m.t.split(' | ')[0], arq]] };
  });
} catch (e) {
  /* ainda nao existe */
}

/* ------------------------------------------------------------------ *
 * Links do menu que apontavam para paginas inexistentes
 * ------------------------------------------------------------------ */

const LINKS_CORRIGIDOS = {
  'sala-compartilhada.html': 'coworking.html',
  'juridico.html': 'juridico-empresarial.html',
};

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Decodifica entidades HTML antes de reescapar.
 * Sem isso, uma pagina sem metadados definidos aqui teria o title relido do
 * proprio HTML e reescapado a cada execucao: "&nbsp;" viraria "&amp;nbsp;",
 * depois "&amp;amp;nbsp;", e assim por diante. */
const ENTIDADES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  aacute: 'á', agrave: 'à', acirc: 'â', atilde: 'ã',
  eacute: 'é', ecirc: 'ê', iacute: 'í',
  oacute: 'ó', ocirc: 'ô', otilde: 'õ',
  uacute: 'ú', uuml: 'ü', ccedil: 'ç',
  Aacute: 'Á', Atilde: 'Ã', Eacute: 'É', Ecirc: 'Ê', Iacute: 'Í',
  Oacute: 'Ó', Otilde: 'Õ', Uacute: 'Ú', Ccedil: 'Ç',
  middot: '·', copy: '©', hellip: '…', ndash: '–', mdash: '—', rsquo: '’',
};

function desescapar(s) {
  let atual = String(s);
  let anterior;
  do {
    anterior = atual;
    atual = atual
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
      .replace(/&([A-Za-z]+);/g, (m, nome) => (nome in ENTIDADES ? ENTIDADES[nome] : m));
  } while (atual !== anterior);
  return atual;
}

const texto = (s) => esc(desescapar(s));

const urlDe = (arq) => (arq === 'index.html' ? `${SITE}/` : `${SITE}/${arq}`);

function localBusiness(chave) {
  const u = UNIDADES[chave];
  const o = {
    '@type': 'LocalBusiness',
    '@id': u.id,
    name: u.nome,
    alternateName: 'CafeWorking',
    description: NEGOCIO.descricao,
    url: `${SITE}/${u.pagina}`,
    telephone: NEGOCIO.telefone,
    image: SITE + u.imagem,
    logo: `${SITE}/assets/img/logo-cafeworking.png`,
    priceRange: NEGOCIO.faixaPreco,
    currenciesAccepted: 'BRL',
    address: {
      '@type': 'PostalAddress',
      streetAddress: u.rua,
      addressLocality: 'Belo Horizonte',
      addressRegion: 'MG',
      postalCode: u.cep,
      addressCountry: 'BR',
    },
    geo: { '@type': 'GeoCoordinates', latitude: u.lat, longitude: u.lon },
    areaServed: { '@type': 'City', name: 'Belo Horizonte' },
    parentOrganization: { '@id': `${SITE}/#organizacao` },
    sameAs: NEGOCIO.sameAs,
  };
  if (NEGOCIO.horario) o.openingHours = NEGOCIO.horario;
  return o;
}

function organizacao() {
  return {
    '@type': 'Organization',
    '@id': `${SITE}/#organizacao`,
    name: NEGOCIO.nome,
    url: `${SITE}/`,
    logo: { '@type': 'ImageObject', url: `${SITE}/assets/img/logo-cafeworking.png`, width: 834, height: 469 },
    description: NEGOCIO.descricao,
    sameAs: NEGOCIO.sameAs,
    contactPoint: [{
      '@type': 'ContactPoint',
      telephone: NEGOCIO.whatsapp,
      contactType: 'customer service',
      areaServed: 'BR',
      availableLanguage: ['Portuguese'],
    }],
  };
}

function website() {
  return {
    '@type': 'WebSite',
    '@id': `${SITE}/#site`,
    url: `${SITE}/`,
    name: NEGOCIO.nome,
    inLanguage: 'pt-BR',
    publisher: { '@id': `${SITE}/#organizacao` },
  };
}

function breadcrumb(bc, arq) {
  const itens = [{ nome: 'Início', url: `${SITE}/` }];
  (bc || []).forEach(([nome, u]) => itens.push({ nome, url: `${SITE}/${u}` }));
  if (!bc || bc.length === 0) return null;
  return {
    '@type': 'BreadcrumbList',
    '@id': `${urlDe(arq)}#trilha`,
    itemListElement: itens.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.nome,
      item: it.url,
    })),
  };
}

/** Extrai o FAQ da propria pagina (<details><summary>P</summary><p>R</p></details>). */
function faqDaPagina(html, arq) {
  const perguntas = [];
  const re = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>\s*<p>([\s\S]*?)<\/p>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const p = m[1].replace(/<[^>]+>/g, '').trim();
    const r = m[2].replace(/<[^>]+>/g, '').trim();
    if (p && r) perguntas.push({ '@type': 'Question', name: p, acceptedAnswer: { '@type': 'Answer', text: r } });
  }
  if (perguntas.length < 2) return null;
  return { '@type': 'FAQPage', '@id': `${urlDe(arq)}#faq`, mainEntity: perguntas };
}

function jsonLdDaPagina(arq, meta, html) {
  const grafo = [];
  const tipo = meta.tipo || 'pagina';
  const url = urlDe(arq);

  if (tipo === 'home') {
    grafo.push(organizacao(), website(), localBusiness('luxemburgo'), localBusiness('estoril'));
  } else if (tipo === 'unidades' || tipo === 'contato') {
    grafo.push(organizacao(), localBusiness('luxemburgo'), localBusiness('estoril'));
  } else if (tipo.startsWith('unidade:')) {
    grafo.push(organizacao(), localBusiness(tipo.split(':')[1]));
  } else {
    grafo.push(organizacao());
  }

  if (tipo === 'servico') {
    grafo.push({
      '@type': 'Service',
      '@id': `${url}#servico`,
      name: meta.t.split(' | ')[0],
      description: meta.d,
      url,
      serviceType: meta.t.split(' | ')[0],
      provider: { '@id': `${SITE}/#organizacao` },
      areaServed: { '@type': 'City', name: 'Belo Horizonte' },
      audience: { '@type': 'BusinessAudience', name: 'Empresas e profissionais' },
    });
  }

  if (tipo === 'artigo') {
    grafo.push({
      '@type': 'BlogPosting',
      '@id': `${url}#artigo`,
      headline: meta.t.split(' | ')[0],
      description: meta.d,
      url,
      mainEntityOfPage: url,
      image: `${SITE}/assets/img/og/${meta.img || 'og-default.jpg'}`,
      datePublished: meta.data || '2026-06-10',
      dateModified: meta.atualizado || meta.data || '2026-06-10',
      inLanguage: 'pt-BR',
      author: { '@id': `${SITE}/#organizacao` },
      publisher: { '@id': `${SITE}/#organizacao` },
      isPartOf: { '@id': `${SITE}/#site` },
    });
  }

  const trilha = breadcrumb(meta.bc, arq);
  if (trilha) grafo.push(trilha);

  const faq = faqDaPagina(html, arq);
  if (faq) grafo.push(faq);

  return { '@context': 'https://schema.org', '@graph': grafo };
}

/* ------------------------------------------------------------------ *
 * Limpeza e montagem do <head>
 * ------------------------------------------------------------------ */

function limparHead(head) {
  return head
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/<meta[^>]+property=["'](?:og|article|profile|fb):[^"']*["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']twitter:[^"']*["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']robots["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']author["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']geo\.[^"']*["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']ICBM["'][^>]*>/gi, '')
    .replace(/<meta[^>]+name=["']theme-color["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["']manifest["'][^>]*>/gi, '')
    .replace(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi, '')
    .replace(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/\s{2,}/g, ' ');
}

function blocoSeo(arq, meta, html, indexar) {
  const url = urlDe(arq);
  const img = `${SITE}/assets/img/og/${meta.img || 'og-default.jpg'}`;
  const tipoOg = meta.tipo === 'artigo' ? 'article' : 'website';
  const linhas = [];

  linhas.push(`<link rel="canonical" href="${url}">`);
  linhas.push(
    indexar
      ? '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">'
      : '<meta name="robots" content="noindex,follow">'
  );

  linhas.push(`<meta property="og:type" content="${tipoOg}">`);
  linhas.push(`<meta property="og:site_name" content="CafeWorking">`);
  linhas.push(`<meta property="og:locale" content="pt_BR">`);
  linhas.push(`<meta property="og:title" content="${texto(meta.t)}">`);
  linhas.push(`<meta property="og:description" content="${texto(meta.d)}">`);
  linhas.push(`<meta property="og:url" content="${url}">`);
  linhas.push(`<meta property="og:image" content="${img}">`);
  linhas.push(`<meta property="og:image:width" content="1200">`);
  linhas.push(`<meta property="og:image:height" content="630">`);
  linhas.push(`<meta property="og:image:alt" content="${texto(meta.t)}">`);
  if (meta.tipo === 'artigo') {
    linhas.push(`<meta property="article:published_time" content="${meta.data || '2026-06-10'}">`);
    linhas.push(`<meta property="article:modified_time" content="${meta.atualizado || meta.data || '2026-06-10'}">`);
    linhas.push(`<meta property="article:publisher" content="https://www.facebook.com/CafeWorkingoficial">`);
  }

  linhas.push(`<meta name="twitter:card" content="summary_large_image">`);
  linhas.push(`<meta name="twitter:title" content="${texto(meta.t)}">`);
  linhas.push(`<meta name="twitter:description" content="${texto(meta.d)}">`);
  linhas.push(`<meta name="twitter:image" content="${img}">`);

  linhas.push(`<meta name="author" content="CafeWorking · Grupo Ciatos">`);
  linhas.push(`<meta name="geo.region" content="BR-MG">`);
  linhas.push(`<meta name="geo.placename" content="Belo Horizonte">`);

  linhas.push(`<link rel="icon" href="/assets/img/icons/favicon-32.png" sizes="32x32" type="image/png">`);
  linhas.push(`<link rel="icon" href="/assets/img/icons/favicon-48.png" sizes="48x48" type="image/png">`);
  linhas.push(`<link rel="apple-touch-icon" href="/assets/img/icons/apple-touch-icon.png">`);
  linhas.push(`<link rel="manifest" href="/manifest.json">`);
  linhas.push(`<meta name="theme-color" content="#0E4B4F">`);

  if (indexar) {
    const ld = JSON.stringify(jsonLdDaPagina(arq, meta, html));
    linhas.push(`<script type="application/ld+json">${ld}</script>`);
  }

  return linhas.join('');
}

/* ------------------------------------------------------------------ *
 * Processamento
 * ------------------------------------------------------------------ */

const arquivos = fs.readdirSync(RAIZ).filter((f) => f.endsWith('.html'));
const relatorio = { semMeta: [], alterados: 0, indexaveis: [], links: 0, intocaveis: [] };

for (const arq of arquivos) {
  if (ehIntocavel(arq)) {
    relatorio.intocaveis.push(arq);
    continue;
  }

  const caminho = path.join(RAIZ, arq);
  let html = fs.readFileSync(caminho, 'utf8');
  const original = html;

  const naoIndexar = NAO_INDEXAR.has(arq) || ehAdmin(arq);
  let meta = PAGINAS[arq];

  if (!meta) {
    if (!naoIndexar) relatorio.semMeta.push(arq);
    const tAtual = (html.match(/<title>([\s\S]*?)<\/title>/i) || [, 'CafeWorking'])[1];
    const dAtual = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || [, NEGOCIO.descricao])[1];
    meta = { t: tAtual, d: dAtual, tipo: 'pagina' };
  }

  /* 1. links quebrados do menu */
  for (const [de, para] of Object.entries(LINKS_CORRIGIDOS)) {
    if (html.includes(`href="${de}"`)) {
      html = html.split(`href="${de}"`).join(`href="${para}"`);
      relatorio.links++;
    }
  }

  /* 2. head */
  const mHead = html.match(/<head>([\s\S]*?)<\/head>/i);
  if (!mHead) { console.log(`sem <head>: ${arq}`); continue; }

  let head = limparHead(mHead[1]);

  // title e description sao inseridos por funcao de substituicao de proposito:
  // numa string de replace, "$$" viraria "$" e quebraria valores como priceRange.
  if (/<title>[\s\S]*?<\/title>/i.test(head)) {
    head = head.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${texto(meta.t)}</title>`);
  } else {
    head += `<title>${texto(meta.t)}</title>`;
  }

  if (/<meta[^>]+name=["']description["'][^>]*>/i.test(head)) {
    head = head.replace(/<meta[^>]+name=["']description["'][^>]*>/i, () => `<meta name="description" content="${texto(meta.d)}">`);
  } else {
    head += `<meta name="description" content="${texto(meta.d)}">`;
  }

  head += blocoSeo(arq, meta, html, !naoIndexar);
  html = html.replace(/<head>[\s\S]*?<\/head>/i, () => `<head>${head}</head>`);

  /* 3. LCP: a primeira imagem do hero nao pode ser lazy.
   *
   * Antes de decidir, desfaz o que uma execucao anterior marcou como eager.
   * Sem isso, cada rodada promoveria mais uma imagem e a pagina inteira
   * acabaria carregando tudo de uma vez - o oposto do que se quer. */
  html = html.replace(
    /loading="eager" fetchpriority="high" decoding="async"/g,
    'loading="lazy" decoding="async"'
  );

  const iLazy = html.indexOf('loading="lazy"');
  if (iLazy > -1) {
    const contexto = html.slice(Math.max(0, iLazy - 900), iLazy);
    if (/hero|featured-post/i.test(contexto)) {
      const tam = html.startsWith('loading="lazy" decoding="async"', iLazy)
        ? 'loading="lazy" decoding="async"'.length
        : 'loading="lazy"'.length;
      html = html.slice(0, iLazy) + 'loading="eager" fetchpriority="high" decoding="async"' + html.slice(iLazy + tam);
    }
  }

  /* 4. demais imagens ganham decoding assincrono */
  html = html.replace(/loading="lazy"(?! decoding)/g, 'loading="lazy" decoding="async"');

  if (html !== original) {
    relatorio.alterados++;
    if (!SOMENTE_CHECAR) fs.writeFileSync(caminho, html, 'utf8');
  }
  if (!naoIndexar) relatorio.indexaveis.push(arq);
}

/* ------------------------------------------------------------------ *
 * sitemap.xml
 * ------------------------------------------------------------------ */

const PRIORIDADE = {
  'index.html': '1.0',
  'coworking.html': '0.9', 'salas-privativas.html': '0.9', 'salas-de-reuniao.html': '0.9',
  'endereco-fiscal.html': '0.9', 'abertura-de-empresa.html': '0.9', 'planos.html': '0.9',
  'unidade-luxemburgo.html': '0.8', 'unidade-estoril.html': '0.8', 'contabilidade.html': '0.8',
};

const hoje = new Date().toISOString().slice(0, 10);
const urls = relatorio.indexaveis
  .sort()
  .map((arq) => {
    const stat = fs.statSync(path.join(RAIZ, arq));
    const lastmod = SOMENTE_CHECAR ? stat.mtime.toISOString().slice(0, 10) : hoje;
    const prio = PRIORIDADE[arq] || (arq.startsWith('artigo-') ? '0.6' : '0.7');
    return `  <url>\n    <loc>${urlDe(arq)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${prio}</priority>\n  </url>`;
  })
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
if (!SOMENTE_CHECAR) fs.writeFileSync(path.join(RAIZ, 'sitemap.xml'), sitemap, 'utf8');

/* ------------------------------------------------------------------ *
 * Relatorio
 * ------------------------------------------------------------------ */

console.log(`\nSEO CafeWorking${SOMENTE_CHECAR ? ' (modo --check, nada gravado)' : ''}`);
console.log(`  paginas processadas .... ${arquivos.length}`);
console.log(`  paginas alteradas ...... ${relatorio.alterados}`);
console.log(`  links de menu corrigidos ${relatorio.links}`);
console.log(`  paginas indexaveis ..... ${relatorio.indexaveis.length}`);
console.log(`  fora do indice ......... ${arquivos.length - relatorio.indexaveis.length}`);
if (relatorio.intocaveis.length) {
  console.log(`\n  preservados sem alteracao (verificacao de propriedade):`);
  relatorio.intocaveis.forEach((f) => console.log(`    - ${f}`));
}
if (relatorio.semMeta.length) {
  console.log(`\n  sem metadados definidos em scripts/seo.js (usando o title atual):`);
  relatorio.semMeta.forEach((f) => console.log(`    - ${f}`));
}
if (!NEGOCIO.horario) {
  console.log(`\n  ! NEGOCIO.horario esta null - preencha o horario de funcionamento`);
  console.log(`    em scripts/seo.js para o Google exibir "aberto agora" nos resultados.`);
}
console.log('');
