# Rede de Unidades Parceiras — versão em revisão

Branch `codex/rede-unidades-parceiras`, baseada em main `ed41f33`. Não alterados produção, workflows de publicação, contratos nem PR #1 (`codex/auditoria-jornada-site`).

## Entrega

- Página existente `seja-parceiro.html` aprimorada, preservando formulário, Turnstile e candidatura do app. Proposta de aproveitar escritório já pago, evolução Endereço Fiscal → Espaço → Unidade completa, onboarding guiado, benefícios/requisitos, FAQ e CTA. Sem percentual fixo ou promessa de renda.
- Metadados de `scripts/seo.js` alinhados; parser FAQ não atravessa o fechamento de um `<details>` para misturar formulário e pergunta.
- `scripts/unidades-aprovadas.js`: renderizador puro de uma página por unidade em `/unidades/<cidade-uf>/<bairro>-<id>`, com canonical, serviços locais, dados do imóvel e fotos escapadas. Exige allowlist aprovada de `unidades-publicas`, bairro e descrição específica de ao menos 80 caracteres. Sem páginas em massa por combinação de serviço/cidade.
- Renderizador **não** integrado ao build ou sitemap nesta fase; preparar reconciliação/remoção de páginas revogadas antes de ligar publicação automática.
- `scripts/check-links.js` reutilizado idêntico ao arquivo já proposto pelo PR #1; main tinha o comando mas não o arquivo. Não duplicamos as alterações da home/service worker daquele PR.

## Verificação

`npm test`: 43 testes aprovados. `node scripts/build-dist.js` e `npm run check`: 74 páginas verificadas, zero referências locais ausentes. Não rodados `vitrine`, `cidades` ou SEO global contra produção. Preview mobile em 390×844 sem overflow horizontal; nenhuma candidatura enviada.

## Próximos passos

Homologar com o PR correspondente do app e Supabase isolado. Integrar renderizador com cache/reconciliação de dados aprovados, sitemap e revalidação. Preservar páginas Luxemburgo/Estoril existentes. Não usar a retenção de HTML antigo da geração por cidade como estratégia de revogação.

Calculadora adiada: ainda não há fonte comercial aprovada para capacidade, demanda, preços, divisão e custos. Quando implementada, os parâmetros devem ser configuráveis e o resultado apresentado como simulação, não promessa.

Diagnóstico funcional completo desta inspeção e roteiro de staging estão no repositório app, em `docs/REDE-UNIDADES-DIAGNOSTICO.md` e `docs/REDE-UNIDADES-HOMOLOGACAO.md`.
