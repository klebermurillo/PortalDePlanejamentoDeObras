-- ============================================================
-- Dados de demonstracao para o Portal de Planejamento de Obras
-- Hierarquia: Diretoria → Programa → Projeto (com Escopo)
-- ============================================================

USE portal_obras;

-- ------------------------------------------------------------
-- Diretorias
-- ------------------------------------------------------------
INSERT INTO diretorias (nome) VALUES
  ('Diretoria de Engenharia'),
  ('Diretoria de Implantação'),
  ('Diretoria de Expansão'),
  ('Diretoria de Operações'),
  ('Diretoria de Infraestrutura'),
  ('Diretoria de Via Permanente'),
  ('Diretoria de Projetos'),
  ('Diretoria de Obras'),
  ('Diretoria de Investimentos'),
  ('Diretoria de Manutenção'),
  ('Diretoria de Segurança Operacional');

-- ------------------------------------------------------------
-- Programas (vinculados a diretorias)
-- ------------------------------------------------------------
INSERT INTO programas (nome, diretoria_id) VALUES
  ('Programa de Duplicação',                (SELECT id FROM diretorias WHERE nome = 'Diretoria de Implantação')),
  ('Programa de Segurança Ferroviária',     (SELECT id FROM diretorias WHERE nome = 'Diretoria de Segurança Operacional')),
  ('Programa de Investimentos Contratuais', (SELECT id FROM diretorias WHERE nome = 'Diretoria de Investimentos')),
  ('Programa de Modernização de Oficinas',  (SELECT id FROM diretorias WHERE nome = 'Diretoria de Engenharia')),
  ('Programa de Expansão de Pátios',        (SELECT id FROM diretorias WHERE nome = 'Diretoria de Expansão')),
  ('Programa de Renovação de Via',          (SELECT id FROM diretorias WHERE nome = 'Diretoria de Via Permanente')),
  ('Programa de Sinalização',               (SELECT id FROM diretorias WHERE nome = 'Diretoria de Operações'));

-- ------------------------------------------------------------
-- Projetos (base oficial, somente leitura nas simulacoes)
-- ------------------------------------------------------------
INSERT INTO projetos (id_projeto, nome, programa_id, escopo, capex_regulatorio, capex_estimado, ano_contratual, ano_real, status) VALUES
  ('PRJ-001', 'Duplicação de Via - Trecho SP-01',       (SELECT id FROM programas WHERE nome = 'Programa de Duplicação'), 'Construção de segunda linha ferroviária', 44000000.00, 48500000.00, '2027', '2028', 'Em execução'),
  ('PRJ-002', 'Duplicação de Via - Trecho SP-02',       (SELECT id FROM programas WHERE nome = 'Programa de Duplicação'), 'Construção de segunda linha ferroviária', 38000000.00, 41200000.00, '2027', '2027', 'Planejado'),
  ('PRJ-003', 'Eliminação de Passagens em Nível - Lote 1', (SELECT id FROM programas WHERE nome = 'Programa de Segurança Ferroviária'), 'Construção de viadutos e trincheiras', 15000000.00, 18400000.00, '2027', '2027', 'Licitação'),
  ('PRJ-004', 'Eliminação de Passagens em Nível - Lote 2', (SELECT id FROM programas WHERE nome = 'Programa de Segurança Ferroviária'), 'Construção de viadutos e trincheiras', 14500000.00, 16800000.00, '2028', '2028', 'Planejado'),
  ('PRJ-005', 'Ponte sobre Rio das Pedras',              (SELECT id FROM programas WHERE nome = 'Programa de Investimentos Contratuais'), 'Construção de ponte ferroviária', 60000000.00, 67200000.00, '2028', '2029', 'Projeto Executivo'),
  ('PRJ-006', 'Viaduto de Cruzamento Urbano - Campinas', (SELECT id FROM programas WHERE nome = 'Programa de Investimentos Contratuais'), 'Construção de viaduto', 32000000.00, 35900000.00, '2028', '2029', 'Projeto Básico'),
  ('PRJ-007', 'Reforma de Oficina - Unidade Sul',        (SELECT id FROM programas WHERE nome = 'Programa de Modernização de Oficinas'), 'Reforma e ampliação de oficina ferroviária', 9000000.00, 9750000.00, '2027', '2028', 'Em execução'),
  ('PRJ-008', 'Modernização de Oficina - Unidade Norte', (SELECT id FROM programas WHERE nome = 'Programa de Modernização de Oficinas'), 'Modernização de equipamentos e layout', 11000000.00, 12300000.00, '2027', '2027', 'Planejado'),
  ('PRJ-009', 'Ampliação de Pátio - Terminal Norte',     (SELECT id FROM programas WHERE nome = 'Programa de Expansão de Pátios'), 'Ampliação de pátio de triagem',  20000000.00, 22300000.00, '2027', '2027', 'Projeto Aprovado'),
  ('PRJ-010', 'Pátio de Triagem - Expansão Fase 2',      (SELECT id FROM programas WHERE nome = 'Programa de Expansão de Pátios'), 'Expansão de capacidade operacional', 55000000.00, 61000000.00, '2028', '2028', 'Planejado'),
  ('PRJ-011', 'Revitalização de Dormentes - KM 120',     (SELECT id FROM programas WHERE nome = 'Programa de Renovação de Via'), 'Substituição de dormentes de concreto', 11000000.00, 12100000.00, '2026', '2026', 'Em execução'),
  ('PRJ-012', 'Sistema de Drenagem - Lote SP Norte',     (SELECT id FROM programas WHERE nome = 'Programa de Renovação de Via'), 'Implantação de sistema de drenagem', 7000000.00, 7300000.00, '2026', '2026', 'Em execução'),
  ('PRJ-013', 'Reforço Estrutural - Viadutos Km 55',     (SELECT id FROM programas WHERE nome = 'Programa de Renovação de Via'), 'Reforço estrutural de viadutos existentes', 18000000.00, 19500000.00, '2027', '2028', 'Inspeção'),
  ('PRJ-014', 'Modernização de Sinalização - Lote 3',    (SELECT id FROM programas WHERE nome = 'Programa de Sinalização'), 'Instalação de sinalização digital', 14000000.00, 15800000.00, '2026', '2026', 'Em execução'),
  ('PRJ-015', 'Controle de Tráfego Centralizado',        (SELECT id FROM programas WHERE nome = 'Programa de Sinalização'), 'Implantação de sistema CTC regional', 26000000.00, 28700000.00, '2027', '2027', 'Projeto Executivo');

-- ------------------------------------------------------------
-- Simulacoes demo (cenarios hipoteticos sobre os projetos base)
-- ------------------------------------------------------------
INSERT INTO simulacoes (projeto_id, usuario, data_simulacao, capex_estimado_sim, ano_contratual_sim, ano_real_sim, ponto_atencao, contexto) VALUES
  ((SELECT id FROM projetos WHERE id_projeto = 'PRJ-001'), 'kleber.murillo', '2026-03-10', 51200000.00, '2027', '2028', 'Licença ambiental pendente',     'Área rural com desapropriação em andamento'),
  ((SELECT id FROM projetos WHERE id_projeto = 'PRJ-003'), 'kleber.murillo', '2026-03-15', 17900000.00, '2027', '2028', 'Conflito com concessionária',    'Interferência com rede elétrica da CPFL'),
  ((SELECT id FROM projetos WHERE id_projeto = 'PRJ-005'), 'ana.costa',      '2026-04-02', 72800000.00, '2028', '2029', 'Estudo hidrológico',             'Projeto em revisão pelo DNIT'),
  ((SELECT id FROM projetos WHERE id_projeto = 'PRJ-007'), 'ana.costa',      '2026-04-08', 10400000.00, '2027', '2028', 'Conflito com operação existente', 'Necessário plano de desvio operacional'),
  ((SELECT id FROM projetos WHERE id_projeto = 'PRJ-009'), 'joao.silva',     '2026-04-20', 22300000.00, '2027', '2027', NULL,                             'Licitação prevista para Q3 2026'),
  ((SELECT id FROM projetos WHERE id_projeto = 'PRJ-014'), 'joao.silva',     '2026-05-05', 14900000.00, '2026', '2026', NULL,                             'Contrato firmado, fornecedor mobilizado');
