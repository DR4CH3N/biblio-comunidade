-- Dados de exemplo (opcional). Rode depois do schema.sql.
insert into livros (titulo, autor, isbn, categoria, ano) values
  ('Dom Casmurro', 'Machado de Assis', '9788535911664', 'Romance', 1899),
  ('O Cortiço', 'Aluísio Azevedo', null, 'Romance', 1890),
  ('Capitães da Areia', 'Jorge Amado', '9788535914061', 'Romance', 1937),
  ('Código Limpo', 'Robert C. Martin', '9788576082675', 'Tecnologia', 2008),
  ('O Pequeno Príncipe', 'Antoine de Saint-Exupéry', null, 'Infantil', 1943);
insert into membros (nome, email, telefone) values
  ('Ana Souza', 'ana@exemplo.com', '11988887777'),
  ('Bruno Lima', 'bruno@exemplo.com', null);
