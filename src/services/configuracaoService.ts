import { execute, queryOne } from "../db/mysql";

export type ConfiguracaoEmpresa = {
  taxaJuros: number;
  multaAtiva: boolean;
  multaPercentual: number;
  metaDesempenho: number;
  updatedAt: string;
};

type DbConfiguracao = {
  taxa_juros: number;
  multa_ativa: number;
  multa_percentual: number;
  meta_desempenho: number;
  updated_at: string;
};

function mapConfiguracao(r: DbConfiguracao): ConfiguracaoEmpresa {
  return {
    taxaJuros: Number(r.taxa_juros),
    multaAtiva: Boolean(r.multa_ativa),
    multaPercentual: Number(r.multa_percentual),
    metaDesempenho: Number(r.meta_desempenho),
    updatedAt: r.updated_at
  };
}

export async function getConfiguracao(): Promise<ConfiguracaoEmpresa> {
  const row = await queryOne<DbConfiguracao>(
    "SELECT taxa_juros, multa_ativa, multa_percentual, meta_desempenho, updated_at FROM configuracoes_empresa WHERE id = 1"
  );
  if (!row) {
    await execute("INSERT IGNORE INTO configuracoes_empresa (id) VALUES (1)");
    return getConfiguracao();
  }
  return mapConfiguracao(row);
}

export type ConfiguracaoInput = {
  taxaJuros?: number;
  multaAtiva?: boolean;
  multaPercentual?: number;
  metaDesempenho?: number;
};

export async function atualizarConfiguracao(input: ConfiguracaoInput): Promise<ConfiguracaoEmpresa> {
  const campos: string[] = [];
  const params: unknown[] = [];

  if (input.taxaJuros !== undefined)       { campos.push("taxa_juros = ?");       params.push(input.taxaJuros); }
  if (input.multaAtiva !== undefined)      { campos.push("multa_ativa = ?");      params.push(input.multaAtiva ? 1 : 0); }
  if (input.multaPercentual !== undefined) { campos.push("multa_percentual = ?"); params.push(input.multaPercentual); }
  if (input.metaDesempenho !== undefined)  { campos.push("meta_desempenho = ?");  params.push(input.metaDesempenho); }

  if (campos.length > 0) {
    await execute(`UPDATE configuracoes_empresa SET ${campos.join(", ")} WHERE id = 1`, params);
  }

  return getConfiguracao();
}
