# BiblioComunidade

Sistema web low-code para controle de empréstimos de uma biblioteca comunitária (PIT II – Engenharia de Software).
Front-end estático (HTML/CSS/JS, padrão MVC) + banco PostgreSQL no Supabase. Sem servidor próprio e sem etapa de build.

## Rodar localmente
```bash
npx serve src      # ou: cd src && python3 -m http.server 8000
```
Abra o endereço mostrado. Não abra `index.html` com duplo clique (módulos JS exigem http).
Sem configuração, o app roda em **modo demo** (dados salvos no navegador). Use o botão "Carregar dados de exemplo" no Painel.

## Ligar ao banco real (Supabase)
1. Crie um projeto gratuito em supabase.com.
2. No SQL Editor, rode `db/schema.sql` (e, opcionalmente, `db/seed.sql`).
3. Em Settings > API, copie a Project URL e a chave `anon public` para `src/js/config.js`.

## Publicar (GitHub Pages)
Em **Settings > Pages > Source**, escolha **GitHub Actions**. O workflow `.github/workflows/pages.yml`
roda os testes e publica a pasta `src/` a cada push na `main`.

> O Pages, quando publica "de uma branch", só aceita a raiz do repositório ou `/docs` — por isso o workflow.

## Testes
```bash
npm test   # 29 testes (Node 18+; sem dependências)
```

## Estrutura
```
docs/   documentação (escopo, UML, IHC, banco, testes, roteiro do vídeo)
db/     schema.sql e seed.sql
src/    index.html, css/, js/{model,view,controller}
tests/  testes automatizados
```

## Limitações
Sem login: qualquer pessoa com o link altera os dados (ver `docs/01-escopo-e-requisitos.md`, RNF06).

## Uso de IA
Este projeto foi desenvolvido com apoio do assistente **Claude Code** (Anthropic), que ajudou a escrever o
código, os testes, a documentação e a configuração de publicação. Os commits feitos com esse apoio estão
marcados com `Co-Authored-By: Claude`, e os arquivos `CLAUDE.md` e `PROMPTS.md` registram as instruções
usadas.

O autor criou e configurou o projeto no Supabase (execução do `schema.sql` e do `seed.sql`, ligação com o app),
testou o sistema publicado com dados reais — cadastros, empréstimos e devoluções — e conferiu os resultados no
banco antes da entrega.
