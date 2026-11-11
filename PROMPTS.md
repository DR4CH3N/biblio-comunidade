# Prompts prontos para o Claude Code

Abra o terminal **dentro da pasta do projeto** e rode `claude`. Depois cole um prompt de cada vez,
na ordem, esperando cada um terminar.

> Antes do prompt 2, rode você mesmo `gh auth login` no terminal e faça o login no GitHub pelo navegador.
> O Claude Code não consegue digitar sua senha nem o código de verificação.

---

## 1. Conferir o projeto
```
Leia o CLAUDE.md e o README.md para entender o projeto. Depois rode `npm test` e me diga
se os 29 testes passam. Suba o servidor local, abra a aplicação e confirme que o Painel carrega.
Não altere nada ainda, só me relate o estado atual.
```

## 2. Criar o repositório e enviar para o GitHub
```
Transforme esta pasta em um repositório git e publique no GitHub:

1. Crie um .gitignore adequado (node_modules, .DS_Store, arquivos de editor).
2. `git init`, commit inicial com mensagem em português descrevendo o projeto.
3. Crie o repositório público `biblio-comunidade` na minha conta com o gh CLI e faça o push da main.
4. Ative o GitHub Pages com origem "GitHub Actions" (o workflow já existe em
   .github/workflows/pages.yml). Se a API do gh não permitir, me diga exatamente onde clicar.
5. Me devolva o link do repositório e o link onde o site vai ficar publicado.

Se `gh auth status` falhar, pare e me avise em vez de tentar contornar.
```

## 3. Ligar o banco de dados real
Antes deste prompt, faça você mesmo no site do Supabase:
- crie um projeto;
- abra **SQL Editor > New query**, cole todo o conteúdo de `db/schema.sql` e clique em **Run**;
- repita com `db/seed.sql` se quiser dados de exemplo;
- em **Settings > API**, copie a *Project URL* e a chave *anon public*.

```
Coloque estas credenciais do Supabase em src/js/config.js:

URL: <cole a Project URL aqui>
Chave anon: <cole a chave anon public aqui>

Depois:
1. Confirme que o selo no topo da aplicação mudou de "Modo demo" para "PostgreSQL (Supabase)".
2. Teste no navegador: cadastre um livro, um membro e faça um empréstimo. Confirme que os
   registros aparecem no Supabase.
3. Teste os erros: ISBN repetido, e-mail repetido, 4º empréstimo para o mesmo membro, e excluir
   um livro que já foi emprestado. Me diga se cada bloqueio funcionou.
4. Se algo falhar, corrija e rode `npm test` antes de commitar.
5. Commit e push.
```

## 4. Conferir a qualidade antes de mostrar aos colegas
```
Faça uma revisão crítica do projeto antes de eu enviar para 5 colegas testarem:

1. Teste a aplicação no navegador em desktop (1100px) e celular (390px), passando por todas as
   telas e por todos os fluxos de erro. Procure problemas de usabilidade e acessibilidade.
2. Verifique se o console do navegador fica sem erros.
3. Confira se as regras RN01 a RN05 valem tanto no código quanto no db/schema.sql.
4. Liste o que encontrou em ordem de gravidade, com evidência. Corrija só o que for claramente
   um defeito; o que for opinião, me pergunte antes.
5. Rode `npm test`, commit e push.
```

## 5. Depois dos testes com os colegas
```
Meus colegas testaram e relataram o seguinte:

- <colega 1>: <o que não funcionou>
- <colega 2>: <o que não funcionou>
- ...

Para cada item: reproduza o problema, me diga a causa, corrija, e escreva um teste que falhe
sem a correção e passe com ela. Faça um commit separado por correção, com mensagem em português
que explique o problema. No fim, atualize a tabela do laudo em docs/05-plano-de-testes.md com
o que foi corrigido e rode `npm test`.
```

## 6. Antes de gravar o vídeo
```
Leia docs/roteiro-video.md e me ajude a preparar a gravação:

1. Deixe o banco com dados de demonstração que mostrem bem o sistema, incluindo um empréstimo
   já em atraso (para a tela de atrasos não ficar vazia).
2. Me diga, na ordem do roteiro, exatamente quais telas abrir e quais cliques dar.
3. Me dê o `git log` resumido das correções, que eu preciso mostrar no vídeo.
```

---

## O que o Claude Code **não** faz por você
| Tarefa | Por quê |
|---|---|
| Login no GitHub (`gh auth login`) e no Supabase | Exigem sua senha e autenticação de dois fatores |
| Criar o projeto no Supabase e rodar o SQL | É um painel web; leva 2 minutos e é mais seguro você fazer |
| Conseguir 5 colegas para testar | A atividade exige pessoas reais; dados inventados são fraude acadêmica |
| Gravar o vídeo narrado | Precisa da sua voz e do seu rosto no trabalho |
| Adaptar a documentação ao seu PIT I | Só você tem o PIT I que entregou |
