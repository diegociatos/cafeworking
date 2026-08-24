# SEO do site CafeWorking

Documento de referência do trabalho de SEO: o que foi feito, como manter e o que
depende de ação fora do código.

---

## 1. Como o site é construído agora

Continua sendo HTML estático servido pela Netlify — nada de build pesado. O que
mudou é que três coisas passaram a ser **geradas por script**, para não voltarem a
divergir entre as 90+ páginas:

| Script | O que faz |
|---|---|
| `node scripts/seo.js` | Padroniza `<head>` de todas as páginas: title, description, canonical, robots, Open Graph, Twitter Card, favicons e JSON-LD. Regenera o `sitemap.xml`. **Idempotente** — pode rodar quantas vezes quiser. |
| `node scripts/gerar-paginas.js` | Monta páginas novas a partir dos fragmentos em `scripts/conteudo/`, reaproveitando o header e o footer do `index.html`. |
| `powershell -File scripts/gerar-og.ps1` | Gera as imagens Open Graph 1200×630 em `assets/img/og/` a partir das fotos reais. Só precisa rodar se trocar as fotos de origem. |
| `powershell -File scripts/gerar-icones.ps1` | Gera os favicons e ícones do PWA em `assets/img/icons/`. |
| `node scripts/imagens.js` | Dono dos atributos das tags `<img>`: `width`/`height` lidos do arquivo (zera o CLS), `loading`/`fetchpriority` conforme o papel da imagem na página, `decoding`, `alt` do logo e o `<link rel="preload">` da imagem do hero. **Idempotente e autoritativo** — reescreve o que estiver errado, inclusive depois de trocar uma foto. |
| `node scripts/formularios.js` | Padroniza os formulários `lead-form`: `action="obrigado.html"`, campo-isca anti-robô e `type`/`inputmode`/`autocomplete` nos campos (teclado numérico no WhatsApp e preenchimento automático no celular). Idempotente. |
| `python scripts/otimizar-imagens.py --aplicar` | Converte fotos PNG/JPEG de `assets/img/real/` para WebP e reduz o logo ao tamanho em que ele realmente aparece. Precisa de `pip install pillow`. Roda só quando entram imagens novas. |

**Fluxo para publicar qualquer alteração de conteúdo:**

```bash
node scripts/gerar-paginas.js && node scripts/seo.js && node scripts/imagens.js
```

⚠️ **A ordem importa.** O `imagens.js` roda por último: o `seo.js` reescreve o
`<head>` inteiro e reposiciona o `preload` do hero, então quem passa depois é
quem deixa o resultado estável. O `formularios.js` só precisa rodar quando entra
um formulário novo.

Depois é só commitar e dar push — a Netlify publica sozinha (projeto
`cafeworking`, conectado ao repositório pelo GitHub App, branch `main`).

⚠️ **A publicação automática não é imediata.** Em 17/08/2026, um push levou
cerca de 13 minutos até a Netlify iniciar o deploy — o projeto está no plano
`nf_team_dev`, cuja fila de build é mais lenta que a do `appcafeworking`
(`nf_team_pro`). Se precisar do site atualizado na hora, publique pela CLI:

```bash
netlify deploy --prod --site 811a2f31-00ce-452a-acb5-2d5682ee715e --dir . --functions netlify/functions
```

Sempre passe `--functions`: sem essa flag, um deploy por `--dir` derruba as
Netlify Functions `lead-webhook` e `reserva-webhook`, que recebem os leads.
Vale rodar antes sem `--prod` para conferir o resultado numa URL de rascunho.

---

## 2. O que foi corrigido

### Problemas críticos que impediam indexação

1. **Canonical apontando para a home em 12 páginas** — todos os artigos do blog,
   mais `blog.html`, `contabilidade.html`, `contato.html`, `endereco-fiscal.html`
   e `planos.html` declaravam `<link rel="canonical" href="https://cafeworking.com.br/">`.
   Na prática isso diz ao Google: *"esta página é uma cópia da home, ignore"*. O
   blog inteiro estava invisível na busca. Agora cada página aponta para si mesma.

2. **`/* /index.html 200` no `_redirects`** — qualquer URL inexistente devolvia a
   home com status 200. Isso gera páginas duplicadas infinitas e soft 404s, e o
   `404.html` nunca era usado. Trocado por `/* /404.html 404`.

3. **4 links quebrados no menu de todas as páginas** (`ambientes.html`,
   `servicos.html`, `sala-compartilhada.html`, `juridico.html`) — 186 ocorrências.
   `sala-compartilhada` e `juridico` foram apontados para as páginas certas;
   `ambientes.html` e `servicos.html` foram **criadas** como páginas de categoria.

4. **Redirects de conteúdo duplicado com status 200** — `/ambientes/salas-privativas`
   servia o mesmo conteúdo de `/salas-privativas.html` em duas URLs. Virou 301.

5. **7 artigos com o mesmo title** ("Blog | CafeWorking") — títulos duplicados
   competem entre si. Cada um recebeu title e description próprios.

6. **34 páginas internas indexáveis** — telas de admin, área logada, materiais
   internos e landing pages de anúncio. Todas com `noindex,follow` e fora do
   sitemap.

### Melhorias estruturais

- **Canonical em 100% das páginas** (antes: 52 de 85, sendo 12 erradas).
- **Open Graph e Twitter Card em 100%** (antes: 1 página). Como o WhatsApp é o
  principal canal do CafeWorking, isso muda como cada link é exibido: agora
  aparece foto da fachada, título e descrição em vez de link cru.
- **15 imagens OG 1200×630** geradas a partir das fotos reais do espaço.
- **Favicon próprio** — o Google exibe favicon nos resultados no celular; antes
  era o globo cinza genérico.
- **JSON-LD em 60 páginas, 100% válido**:
  - `Organization` + `WebSite` em todas;
  - `LocalBusiness` das duas unidades com **endereço completo, CEP e coordenadas
    reais** (Luxemburgo 30380-342 / −19.9473, −43.9544; Estoril 30494-170 /
    −19.9530, −43.9603);
  - `BreadcrumbList` (aparece como trilha no resultado do Google);
  - `Service` nas páginas de serviço;
  - `BlogPosting` com data nos 20 artigos e guias;
  - `FAQPage` em 15 páginas — extraído automaticamente dos blocos
    `<details><summary>` que já existiam. É o dado estruturado com maior chance de
    render espaço extra no resultado de busca.
- **Corrigido JSON-LD inválido** em `coworking-luxemburgo-bh.html`, que usava
  aspas simples (JSON inválido, o Google descartava).
- **`sitemap.xml` regenerado**: 60 URLs, todas com `.html` (antes misturava com e
  sem extensão, criando duplicidade), com `lastmod` e `priority`, sem páginas de
  admin.
- **`robots.txt`**: rastreamento liberado de propósito, com `Sitemap:` declarado.
  As páginas que não devem ser indexadas usam `noindex` no HTML — bloquear no
  robots impediria o Google de ler o `noindex`.
- **LCP**: a imagem principal de cada página saiu de `loading="lazy"` para
  `eager` + `fetchpriority="high"`. As demais ganharam `decoding="async"`.

### Conteúdo novo

Duas páginas de categoria e sete artigos, com cerca de **9.900 palavras**:

| Página | Alvo de busca |
|---|---|
| `ambientes.html` | hub de ambientes (categoria) |
| `servicos.html` | hub de serviços (categoria) |
| `quanto-custa-coworking-bh.html` | "quanto custa coworking bh", "preço coworking belo horizonte" |
| `coworking-zona-sul-bh.html` | "coworking zona sul bh", "coworking perto de mim", bairros |
| `abrir-empresa-belo-horizonte.html` | "abrir empresa em bh", "abrir cnpj belo horizonte" |
| `empresa-endereco-residencial.html` | "abrir empresa no endereço residencial", "posso abrir empresa em casa" |
| `alugar-sala-reuniao-bh.html` | "alugar sala de reunião bh", "sala de reunião por hora" |
| `espaco-eventos-corporativos-bh.html` | "espaço para eventos corporativos bh", "auditório para treinamento" |
| `melhores-bairros-escritorio-bh.html` | "melhor bairro para escritório bh" |

Todos com sumário, FAQ marcada em `FAQPage`, links internos para as páginas
comerciais e CTA de WhatsApp. `blog.html` e `sitemap.html` foram atualizados.

---

## 3. O que ainda depende de você

Estes itens valem mais para ranquear em BH do que qualquer ajuste adicional de
código. Nenhum deles pode ser feito pelo repositório.

### Prioridade alta

1. **Google Business Profile** — para busca local ("coworking em BH", pacote de
   mapas), o GBP pesa mais que o site. Ter **duas fichas separadas**, uma por
   unidade, com categoria "Espaço de coworking", fotos reais, horário correto,
   telefone e link para a página da unidade correspondente
   (`unidade-luxemburgo.html` / `unidade-estoril.html`). Postagens semanais e
   respostas a avaliações movimentam o perfil.

2. **Avaliações no Google** — é o fator mais forte do ranking local e o mais
   ignorado. Peça avaliação a cada membro satisfeito, de forma sistemática.

3. **Horário de funcionamento no schema** — já preenchido: segunda a sexta, das
   8h às 18h, publicado como `openingHoursSpecification` no `LocalBusiness` das
   duas unidades. **Confirme que o Google Business Profile mostra exatamente o
   mesmo horário** — divergência entre site e GBP enfraquece o sinal local. Se
   mudar (abrir aos sábados, por exemplo), edite `NEGOCIO.horario` em
   `scripts/seo.js` e rode `node scripts/seo.js`.

4. **Google Search Console** — a propriedade `https://cafeworking.com.br/` já está
   com o arquivo de verificação no repositório
   (`google1eb6a123c2faeae9.html`). **Não apague esse arquivo**, mesmo depois de
   verificado — o Google revalida periodicamente e a propriedade cai se ele
   sumir. O `scripts/seo.js` reconhece esse padrão de nome e não toca no arquivo.

   Depois do deploy, clique em VERIFICAR no Search Console, envie o
   `sitemap.xml` e peça indexação das páginas novas. É onde você vai ver, em 2 a
   4 semanas, o efeito das correções de canonical.

### Prioridade média

5. **Publicar faixas de preço** — hoje `planos.html` diz "sem preços no site".
   Isso custa posição em consultas como "quanto custa coworking bh", que têm
   intenção comercial alta. Mesmo um "a partir de R$ X" resolveria, sem abrir a
   tabela inteira.

6. **NAP consistente** — nome, endereço e telefone precisam estar escritos
   exatamente iguais no site, no GBP, no Instagram, no Facebook e em qualquer
   diretório. Divergência enfraquece o sinal local.

7. **Citações locais** — cadastro em ACMinas, associações comerciais, portais de
   coworking e listas de espaços em BH. Cada menção com NAP correto ajuda.

8. **`app.cafeworking.com.br`** — verificar se o app tem `noindex`. Ele não deve
   competir com o site institucional na busca.

### Melhoria técnica — resolvido em 24/08/2026

9. ~~**Overflow horizontal no header**~~ — **corrigido** no bloco `V38` do
   `style.css`. Eram dois defeitos no mesmo lugar: (a) de 1081px a 1400px, logo +
   menu + dois botões somavam mais que a largura útil e empurravam a página
   inteira para o lado; (b) de 981px a 1080px o CSS já escondia o menu e mostrava
   o hambúrguer, mas a gaveta do menu mobile só existe em `max-width:980px` — o
   botão não abria nada nessa faixa de 100px. Agora o menu de desktop vai até
   981px, encolhendo tipografia e botões, e a gaveta assume exatamente em 980px.
   Conferido em 375, 980, 990, 1100, 1280 e 1366px.

10. ~~**`width`/`height` nas imagens**~~ — **corrigido** pelo `scripts/imagens.js`
    nas 392 tags `<img>` das 95 páginas, com a dimensão lida do próprio arquivo.
    Junto foram embora 21 imagens sem `alt`, 246 sem `loading` e 20 tags com
    `decoding="async"` duplicado (o `seo.js` e o `imagens.js` se atropelavam;
    o trecho de imagens saiu do `seo.js`).

### Melhoria técnica pendente

11. **Imagens originais órfãs** — `assets/img/real/auditorio/auditorio.png`,
    `escolar.png` e `estoril/estoril-05.jpg` foram convertidos para WebP e não
    são mais referenciados por nenhuma página. Continuam no repositório (e vão
    para a Netlify) até alguém confirmar que podem ser apagados.

12. **Imagens Open Graph** — `assets/img/og/` tem 1,4 MB em JPEG. Não afeta
    visitante (só robô de rede social lê), mas dá para reduzir com o
    `otimizar-imagens.py` se um dia incomodar.

---

## 4. Como adicionar um artigo novo

1. Escreva o miolo em `scripts/conteudo/<slug>.html` (só o que vai dentro de
   `<main>`; copie a estrutura de um artigo existente).
2. Registre o title, description, imagem OG e data em `scripts/artigos/meta.js`.
3. Rode:
   ```bash
   node scripts/gerar-paginas.js && node scripts/seo.js
   ```
4. Adicione o card em `blog.html` e o link em `sitemap.html`.

O `sitemap.xml`, o canonical, o Open Graph e o schema `BlogPosting` saem
automaticamente.

---

## 5. Checagens rápidas

```bash
node scripts/seo.js --check
```

Relata o que seria alterado sem gravar nada, e lista páginas sem metadados
definidos.

Para validar os dados estruturados depois de publicar, use o Teste de Resultados
Ricos do Google e o Search Console (aba "Aprimoramentos").
