import { execute, query, queryOne } from "../db/mysql";

export type SimulacaoInput = {
  projetoId: number;
  usuario: string;
  dataSimulacao?: string;
  capexEstimadoSim?: number;
  anoContratualSim?: string;
  anoRealSim?: string;
  pontoAtencao?: string;
  contexto?: string;
};

export type SimulacaoFull = {
  id: number;
  projetoId: number;
  nomeProjeto: string;
  diretoria: string;
  programa: string;
  escopo?: string;
  capexEstimadoAtual?: number;
  anoContratualAtual?: string;
  anoRealAtual?: string;
  usuario: string;
  dataSimulacao?: string;
  capexEstimadoSim?: number;
  anoContratualSim?: string;
  anoRealSim?: string;
  pontoAtencao?: string;
  contexto?: string;
  createdAt: string;
};

type DbSimulacaoFull = {
  id: number;
  projeto_id: number;
  nome_projeto: string;
  diretoria: string;
  programa: string;
  escopo: string | null;
  capex_estimado: number | null;
  ano_contratual: string | null;
  ano_real: string | null;
  usuario: string;
  data_simulacao: string | null;
  capex_estimado_sim: number | null;
  ano_contratual_sim: string | null;
  ano_real_sim: string | null;
  ponto_atencao: string | null;
  contexto: string | null;
  created_at: string;
};

function mapSimulacao(r: DbSimulacaoFull): SimulacaoFull {
  return {
    id: r.id,
    projetoId: r.projeto_id,
    nomeProjeto: r.nome_projeto,
    diretoria: r.diretoria,
    programa: r.programa,
    escopo: r.escopo ?? undefined,
    capexEstimadoAtual: r.capex_estimado ?? undefined,
    anoContratualAtual: r.ano_contratual ?? undefined,
    anoRealAtual: r.ano_real ?? undefined,
    usuario: r.usuario,
    dataSimulacao: r.data_simulacao ?? undefined,
    capexEstimadoSim: r.capex_estimado_sim ?? undefined,
    anoContratualSim: r.ano_contratual_sim ?? undefined,
    anoRealSim: r.ano_real_sim ?? undefined,
    pontoAtencao: r.ponto_atencao ?? undefined,
    contexto: r.contexto ?? undefined,
    createdAt: r.created_at
  };
}

const SIMULACOES_SELECT = `
  SELECT s.id, s.projeto_id,
         pr.nome AS nome_projeto, d.nome AS diretoria,
         pg.nome AS programa, pr.escopo,
         pr.capex_estimado, pr.ano_contratual, pr.ano_real,
         s.usuario, s.data_simulacao,
         s.capex_estimado_sim, s.ano_contratual_sim, s.ano_real_sim,
         s.ponto_atencao, s.contexto, s.created_at
  FROM simulacoes s
  JOIN projetos  pr ON pr.id = s.projeto_id
  JOIN programas pg ON pg.id = pr.programa_id
  JOIN diretorias d  ON d.id = pg.diretoria_id
`;

export async function listarSimulacoes(filtros?: { usuario?: string; projetoId?: number }): Promise<SimulacaoFull[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filtros?.usuario)   { conditions.push("s.usuario = ?");    params.push(filtros.usuario); }
  if (filtros?.projetoId) { conditions.push("s.projeto_id = ?"); params.push(filtros.projetoId); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await query<DbSimulacaoFull>(`${SIMULACOES_SELECT} ${where} ORDER BY s.created_at DESC`, params);
  return rows.map(mapSimulacao);
}

export async function criarSimulacao(input: SimulacaoInput): Promise<SimulacaoFull> {
  const { insertId } = await execute(
    `INSERT INTO simulacoes
       (projeto_id, usuario, data_simulacao, capex_estimado_sim,
        ano_contratual_sim, ano_real_sim, ponto_atencao, contexto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.projetoId, input.usuario,
      input.dataSimulacao ?? null, input.capexEstimadoSim ?? null,
      input.anoContratualSim ?? null, input.anoRealSim ?? null,
      input.pontoAtencao ?? null, input.contexto ?? null
    ]
  );

  const created = await queryOne<DbSimulacaoFull>(`${SIMULACOES_SELECT} WHERE s.id = ?`, [insertId]);
  if (!created) throw new Error("Nao foi possivel criar simulacao.");
  return mapSimulacao(created);
}

export async function atualizarSimulacao(id: number, input: Partial<SimulacaoInput>): Promise<SimulacaoFull | null> {
  const existing = await queryOne<DbSimulacaoFull>(`${SIMULACOES_SELECT} WHERE s.id = ?`, [id]);
  if (!existing) return null;

  await execute(
    `UPDATE simulacoes
     SET data_simulacao = ?, capex_estimado_sim = ?,
         ano_contratual_sim = ?, ano_real_sim = ?,
         ponto_atencao = ?, contexto = ?
     WHERE id = ?`,
    [
      input.dataSimulacao ?? existing.data_simulacao,
      input.capexEstimadoSim ?? existing.capex_estimado_sim,
      input.anoContratualSim ?? existing.ano_contratual_sim,
      input.anoRealSim ?? existing.ano_real_sim,
      input.pontoAtencao ?? existing.ponto_atencao,
      input.contexto ?? existing.contexto,
      id
    ]
  );

  const updated = await queryOne<DbSimulacaoFull>(`${SIMULACOES_SELECT} WHERE s.id = ?`, [id]);
  return updated ? mapSimulacao(updated) : null;
}

export async function excluirSimulacao(id: number): Promise<boolean> {
  const { affectedRows } = await execute("DELETE FROM simulacoes WHERE id = ?", [id]);
  return affectedRows > 0;
}
