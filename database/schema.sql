-- ============================================================
-- Portal de Planejamento de Obras
-- Schema principal do banco de dados
-- Banco: portal_obras | Charset: utf8mb4
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
-- Registros do Simulador de Cenarios
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS simulador_registros (
  id                    INT AUTO_INCREMENT PRIMARY KEY,
  id_primavera          VARCHAR(30)     NOT NULL,
  usuario               VARCHAR(120)    NOT NULL,
  data_simulacao        DATE            NULL,
  entregavel            VARCHAR(255)    NULL,
  capex_estimado_atual  DECIMAL(18, 2)  NULL,
  capex_estimado_sim    DECIMAL(18, 2)  NULL,
  ano_contratual_sim    VARCHAR(10)     NULL,
  ano_real_sim          VARCHAR(10)     NULL,
  ponto_atencao         TEXT            NULL,
  contexto              TEXT            NULL,
  created_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_simulador_id_primavera (id_primavera),
  INDEX idx_simulador_usuario      (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Historico de simulacoes (rastreabilidade por usuario)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS simulador_historico (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT           NOT NULL,
  registro_id     INT           NULL,
  acao            ENUM('criacao', 'edicao', 'exclusao', 'importacao') NOT NULL,
  snapshot        JSON          NULL COMMENT 'estado do registro no momento da acao',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_historico_usuario (usuario_id),
  INDEX idx_historico_registro (registro_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Registros do Tarifador (estrutura base para proxima fase)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tarifador_registros (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario         VARCHAR(120)    NOT NULL,
  custo_base      DECIMAL(18, 2)  NOT NULL,
  margem          DECIMAL(8, 4)   NOT NULL COMMENT 'percentual ex: 0.15 = 15%',
  fator_risco     DECIMAL(8, 4)   NOT NULL DEFAULT 1.0,
  tarifa_simulada DECIMAL(18, 2)  NULL,
  observacao      TEXT            NULL,
  created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_tarifador_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Usuario de aplicacao (executar manualmente ou via setup)
-- ============================================================
-- CREATE USER IF NOT EXISTS 'portal_user'@'localhost' IDENTIFIED BY 'TROQUE_ESTA_SENHA';
-- GRANT ALL PRIVILEGES ON portal_obras.* TO 'portal_user'@'localhost';
-- FLUSH PRIVILEGES;
