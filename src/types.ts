export type RegistroSimulador = {
  idPrimavera: string;
  usuario: string;
  dataSimulacao?: string;
  entregavel?: string;
  capexEstimadoAtual?: number;
  capexEstimadoSim?: number;
  anoAnttSim?: string;
  anoRealSim?: string;
  pontoAtencao?: string;
  contexto?: string;
};

export type GerarRelatorioInput = {
  html: string;
  fileName?: string;
};

export type AtualizarHistoricoInput = {
  referencia: string;
  payload?: Record<string, unknown>;
};
