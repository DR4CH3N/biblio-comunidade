// Erro padronizado da camada de dados. `codigo` é independente do SGBD:
//   UNICO  -> violação de unicidade (ISBN, e-mail, livro já emprestado)
//   VINCULO -> violação de chave estrangeira (excluir registro com empréstimos)
//   NAO_ENCONTRADO, REDE, DESCONHECIDO
export class RepoError extends Error {
  constructor(codigo, mensagem, detalhe) {
    super(mensagem);
    this.name = 'RepoError';
    this.codigo = codigo;
    this.detalhe = detalhe;
  }
}
