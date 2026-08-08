-- ============================================================
-- Portal de Planejamento de Obras
-- Schema principal do banco de dados
-- Banco: portal_obras | Charset: utf8mb4
-- ============================================================
-- Hierarquia:
--   Diretoria → Programa → Projeto → Escopo (atributo do projeto)
-- ============================================================

CREATE DATABASE IF NOT EXISTS portal_obras
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE portal_obras;

-- ------------------------------------------------------------
-- Usuarios e perfis de acesso
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(120)  NOT NULL,
  email         VARCHAR(180)  NOT NULL UNIQUE,
  senha_hash    VARCHAR(255)  NOT NULL,
  perfil        ENUM('adm', 'usuario') NOT NULL DEFAULT 'usuario',
  ativo         TINYINT(1)    NOT NULL DEFAULT 1,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_usuarios_email (email),
  INDEX idx_usuarios_perfil (perfil)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Diretorias — nivel 1 da hierarquia
-- Ex.: Malha Paulista, Engenharia, Operacoes, Expansao, Via Permanente
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diretorias (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL UNIQUE,
  descricao   TEXT         NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Programas — nivel 2, agrupador de projetos com mesmo objetivo
-- Ex.: Programa de Duplicacao, Programa de Seguranca Ferroviaria
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS programas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nome          VARCHAR(180)  NOT NULL,
  diretoria_id  INT           NOT NULL,
  descricao     TEXT          NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_programa_diretoria FOREIGN KEY (diretoria_id) REFERENCES diretorias(id),
  INDEX idx_programas_diretoria (diretoria_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Projetos — nivel 3, empreendimento especifico dentro de um programa
-- Ex.: Duplicacao do Trecho X, Construcao do Patio Y
-- Contem os dados oficiais (base de planejamento, somente leitura)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projetos (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  id_projeto            VARCHAR(30)    NOT NULL UNIQUE,
  nome                  VARCHAR(255)   NOT NULL,
  programa_id           INT            NOT NULL,
  escopo                VARCHAR(255)   NULL,   -- nivel 4: o que sera executado
  capex_regulatorio     DECIMAL(18,2)  NULL,
  capex_estimado        DECIMAL(18,2)  NULL,
  ano_contratual        VARCHAR(10)    NULL,   -- BL_Contratual oficial
  ano_real              VARCHAR(10)    NULL,   -- Real/Tendencia oficial
  status                VARCHAR(60)    NULL,
  created_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_projeto_programa FOREIGN KEY (programa_id) REFERENCES programas(id),
  INDEX idx_projetos_programa (programa_id),
  INDEX idx_projetos_id_projeto (id_projeto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Simulacoes — cenarios hipoteticos criados pelo usuario
-- Referencia um projeto da base e armazena apenas os deltas simulados
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS simulacoes (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  projeto_id            INT            NOT NULL,
  usuario               VARCHAR(120)   NOT NULL,
  data_simulacao        DATE           NULL,
  capex_estimado_sim    DECIMAL(18,2)  NULL,   -- CAPEX simulado
  ano_contratual_sim    VARCHAR(10)    NULL,   -- BL_Contratual simulado
  ano_real_sim          VARCHAR(10)    NULL,   -- Real/Tendencia simulado
  ponto_atencao         TEXT           NULL,
  contexto              TEXT           NULL,
  created_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_simulacao_projeto FOREIGN KEY (projeto_id) REFERENCES projetos(id),
  INDEX idx_simulacoes_projeto (projeto_id),
  INDEX idx_simulacoes_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Simulador (registros operacionais importados/manuais)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS simulador_registros (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  id_projeto            VARCHAR(40)    NOT NULL,
  usuario               VARCHAR(120)   NOT NULL,
  data_simulacao        DATE           NULL,
  entregavel            VARCHAR(255)   NULL,
  capex_estimado_atual  DECIMAL(18,2)  NULL,
  capex_estimado_sim    DECIMAL(18,2)  NULL,
  ano_contratual_sim    VARCHAR(10)    NULL,
  ano_real_sim          VARCHAR(10)    NULL,
  ponto_atencao         TEXT           NULL,
  contexto              TEXT           NULL,
  created_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_simulador_registros_usuario (usuario),
  INDEX idx_simulador_registros_projeto (id_projeto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Historico — rastreabilidade de acoes por usuario
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS simulacoes_historico (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  simulacao_id  INT           NOT NULL,
  usuario       VARCHAR(120)  NOT NULL,
  acao          ENUM('criacao', 'edicao', 'exclusao') NOT NULL,
  snapshot      JSON          NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_historico_simulacao (simulacao_id),
  INDEX idx_historico_usuario   (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tarifador — estrutura base para proxima fase
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tarifador_registros (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario         VARCHAR(120)    NOT NULL,
  custo_base      DECIMAL(18, 2)  NOT NULL,
  margem          DECIMAL(8, 4)   NOT NULL,
  fator_risco     DECIMAL(8, 4)   NOT NULL DEFAULT 1.0,
  tarifa_simulada DECIMAL(18, 2)  NULL,
  observacao      TEXT            NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tarifador_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Usuario de aplicacao
-- ============================================================
-- CREATE USER IF NOT EXISTS 'portal_user'@'localhost' IDENTIFIED BY 'TROQUE_ESTA_SENHA';
-- GRANT ALL PRIVILEGES ON portal_obras.* TO 'portal_user'@'localhost';
-- FLUSH PRIVILEGES;
