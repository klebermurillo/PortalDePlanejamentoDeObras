-- ============================================================
-- Dados de demonstracao para o Simulador de Cenarios
-- Contexto: planejamento de obras ferroviarias
-- ============================================================

USE portal_obras;

INSERT INTO simulador_registros
  (id_primavera, usuario, data_simulacao, entregavel, capex_estimado_atual, capex_estimado_sim,
   ano_contratual_sim, ano_real_sim, ponto_atencao, contexto)
VALUES
  ('SIM-A001', 'kleber.murillo', '2026-01-10', 'Duplicação de Via - Trecho SP-01',   48500000.00, 51200000.00, '2027', '2028', 'Licença ambiental pendente',          'Dependência de desapropriação de área rural na faixa de domínio'),
  ('SIM-A002', 'kleber.murillo', '2026-01-10', 'Ampliação de Pátio - Terminal Norte', 22300000.00, 22300000.00, '2027', '2027', NULL,                                  'Projeto básico aprovado, aguarda licitação de obra civil'),
  ('SIM-A003', 'kleber.murillo', '2026-01-15', 'Modernização de Sinalização Lote 3',  15800000.00, 14900000.00, '2026', '2026', NULL,                                  'Contrato firmado, fornecedor mobilizado'),
  ('SIM-A004', 'kleber.murillo', '2026-02-03', 'Reforma de Oficina - Unidade Sul',    9750000.00,  10400000.00, '2027', '2028', 'Conflito com operação existente',      'Necessário plano de desvio operacional durante execução'),
  ('SIM-A005', 'kleber.murillo', '2026-02-03', 'Ponte sobre Rio das Pedras',          67200000.00, 72800000.00, '2028', '2029', 'Estudo de impacto hidrológico',        'Projeto executivo em revisão pelo DNIT'),
  ('SIM-A006', 'ana.costa',      '2026-02-18', 'Eletrificação Trecho Central',        88000000.00, 88000000.00, '2029', '2029', NULL,                                  'Depende de aprovação tarifária pela ANTT'),
  ('SIM-A007', 'ana.costa',      '2026-02-18', 'Aquisição de Locomotivas - Lote 2',   54600000.00, 51000000.00, '2026', '2026', NULL,                                  'Contrato assinado, entrega prevista para Q4 2026'),
  ('SIM-A008', 'ana.costa',      '2026-03-05', 'Revitalização de Dormentes - KM 120', 12100000.00, 12100000.00, '2026', '2026', NULL,                                  'Em execução, avanço de 38%'),
  ('SIM-A009', 'ana.costa',      '2026-03-05', 'Túnel Contorno Norte',               142000000.00,155000000.00, '2030', '2032', 'Risco geológico elevado',             'Laudo geotécnico indica necessidade de suporte especial'),
  ('SIM-A010', 'joao.silva',     '2026-03-20', 'Passagem em Nível - Eliminação PNs',  18400000.00, 16200000.00, '2027', '2027', NULL,                                  '8 passagens em nível prioritárias mapeadas no corredor'),
  ('SIM-A011', 'joao.silva',     '2026-03-20', 'Sistema de Drenagem - Lote SP Norte', 7300000.00,  7300000.00,  '2026', '2026', NULL,                                  'Contrato emergencial em andamento'),
  ('SIM-A012', 'joao.silva',     '2026-04-02', 'Viaduto de Cruzamento Urbano',        35900000.00, 38500000.00, '2028', '2029', 'Interferência com SABESP e CPFL',     'Relocação de redes prevista para 6 meses antes das obras'),
  ('SIM-A013', 'joao.silva',     '2026-04-02', 'Controle de Tráfego Centralizado',    28700000.00, 28700000.00, '2027', '2027', NULL,                                  'Sistema integrado com CCO regional'),
  ('SIM-A014', 'kleber.murillo', '2026-04-14', 'Reforço Estrutural - Viadutos Km 55', 19500000.00, 21800000.00, '2027', '2028', 'Inspeção especial em andamento',      'Relatório de inspeção indica necessidade de reforço adicional'),
  ('SIM-A015', 'kleber.murillo', '2026-04-14', 'Cercamento de Faixa de Domínio',      5200000.00,  5200000.00,  '2026', '2026', NULL,                                  '420 km de faixa a serem cercados até dezembro'),
  ('SIM-A016', 'ana.costa',      '2026-05-08', 'Pátio de Triagem - Expansão Fase 2',  61000000.00, 58500000.00, '2028', '2028', NULL,                                  'Projeto aprovado, licitação prevista para Q3 2026'),
  ('SIM-A017', 'ana.costa',      '2026-05-08', 'Manutenção Pesada de Trilhos - Lote 4',3800000.00,  3800000.00, '2026', '2026', NULL,                                  'Contrato plurianual, parcela anual em execução'),
  ('SIM-A018', 'joao.silva',     '2026-06-01', 'Aquisição de Vagões - Frota Geral',   93000000.00, 93000000.00, '2027', '2027', NULL,                                  'Processo licitatório encerrado, contrato em assinatura'),
  ('SIM-A019', 'joao.silva',     '2026-06-01', 'Requalificação de Estação - Terminal Leste', 11400000.00, 12700000.00, '2027', '2028', 'Tombamento histórico do prédio', 'Projeto de restauro necessita aprovação do IPHAN'),
  ('SIM-A020', 'kleber.murillo', '2026-07-22', 'Automação de Cancelas - 320 Pontos',  24300000.00, 22900000.00, '2027', '2027', NULL,                                  'Contrato global com fornecedor único, cronograma agressivo');
