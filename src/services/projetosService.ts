import { query, queryOne } from "../db/mysql";

export type Diretoria = { id: number; nome: string };
export type Programa  = { id: number; nome: string; diretoriaId: number };

export type ProjetoFull = {
  id: number;
  idProjeto: string;
  nome: string;
  programaId: number;
  programa: string;
  diretoriaId: number;
  diretoria: string;
  escopo?: string;
  capexRegulatorio?: number;
  capexEstimado?: number;
  anoContratual?: string;
  anoReal?: string;
  status?: string;
};

type DbProjetoFull = {
  id: number;
  id_projeto: string;
  nome: string;
  programa_id: number;
  programa: string;
  diretoria_id: number;
  diretoria: string;
  escopo: string | null;
  capex_regulatorio: number | null;
  capex_estimado: number | null;
  ano_contratual: string | null;
  ano_real: string | null;
  status: string | null;
};

function mapProjeto(r: DbProjetoFull): ProjetoFull {
  return {
    id: r.id,
    idProjeto: r.id_projeto,
    nome: r.nome,
    programaId: r.programa_id,
    programa: r.programa,
    diretoriaId: r.diretoria_id,
    diretoria: r.diretoria,
    escopo: r.escopo ?? undefined,
    capexRegulatorio: r.capex_regulatorio ?? undefined,
    capexEstimado: r.capex_estimado ?? undefined,
    anoContratual: r.ano_contratual ?? undefined,
    anoReal: r.ano_real ?? undefined,
    status: r.status ?? undefined
  };
}

const PROJETOS_SELECT = `
  SELECT pr.id, pr.id_projeto, pr.nome, pr.programa_id,
         pg.nome AS programa, pg.diretoria_id,
         d.nome  AS diretoria,
         pr.escopo, pr.capex_regulatorio, pr.capex_estimado,
         pr.ano_contratual, pr.ano_real, pr.status
  FROM projetos pr
  JOIN programas pg ON pg.id = pr.programa_id
  JOIN diretorias d  ON d.id  = pg.diretoria_id
`;

export type FiltrosProjetos = {
  diretoriaId?: number;
  programaId?: number;
  escopo?: string;
  busca?: string;
};

export async function listarProjetos(filtros?: FiltrosProjetos): Promise<ProjetoFull[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filtros?.diretoriaId) { conditions.push("pg.diretoria_id = ?"); params.push(filtros.diretoriaId); }
  if (filtros?.programaId)  { conditions.push("pr.programa_id = ?");   params.push(filtros.programaId); }
  if (filtros?.escopo)      { conditions.push("pr.escopo LIKE ?");      params.push(`%${filtros.escopo}%`); }
  if (filtros?.busca)       { conditions.push("pr.nome LIKE ?");        params.push(`%${filtros.busca}%`); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await query<DbProjetoFull>(`${PROJETOS_SELECT} ${where} ORDER BY d.nome, pg.nome, pr.nome`, params);
  return rows.map(mapProjeto);
}

export async function buscarProjetoPorId(id: number): Promise<ProjetoFull | null> {
  const row = await queryOne<DbProjetoFull>(`${PROJETOS_SELECT} WHERE pr.id = ?`, [id]);
  return row ? mapProjeto(row) : null;
}

export async function listarDiretorias(): Promise<Diretoria[]> {
  return query<Diretoria>("SELECT id, nome FROM diretorias ORDER BY nome");
}

export async function listarProgramas(diretoriaId?: number): Promise<Programa[]> {
  if (diretoriaId) {
    return query<{ id: number; nome: string; diretoria_id: number }>(
      "SELECT id, nome, diretoria_id FROM programas WHERE diretoria_id = ? ORDER BY nome",
      [diretoriaId]
    ).then(rows => rows.map(r => ({ id: r.id, nome: r.nome, diretoriaId: r.diretoria_id })));
  }
  return query<{ id: number; nome: string; diretoria_id: number }>(
    "SELECT id, nome, diretoria_id FROM programas ORDER BY nome"
  ).then(rows => rows.map(r => ({ id: r.id, nome: r.nome, diretoriaId: r.diretoria_id })));
}
