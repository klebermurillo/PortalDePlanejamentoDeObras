import ExcelJS from "exceljs";
import { randomUUID } from "node:crypto";
import { getDb } from "../db/sqlite";
import { importarDadosDeArquivoExcel } from "./excelImportService";

export type SimuladorRegistro = {
  id: number;
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
  createdAt: string;
  updatedAt: string;
};

export type NovoRegistroInput = {
  idPrimavera?: string;
  usuario?: string;
  dataSimulacao?: string;
  entregavel?: string;
  capexEstimadoAtual?: number;
  capexEstimadoSim?: number;
  anoAnttSim?: string;
  anoRealSim?: string;
  pontoAtencao?: string;
  contexto?: string;
};

type ListarRegistrosFiltro = {
  usuario?: string;
};

type DbRegistro = {
  id: number;
  id_primavera: string;
  usuario: string;
  data_simulacao: string | null;
  entregavel: string | null;
  capex_estimado_atual: number | null;
  capex_estimado_sim: number | null;
  ano_antt_sim: string | null;
  ano_real_sim: string | null;
  ponto_atencao: string | null;
  contexto: string | null;
  created_at: string;
  updated_at: string;
};

function mapDbRegistro(registro: DbRegistro): SimuladorRegistro {
  return {
    id: registro.id,
    idPrimavera: registro.id_primavera,
    usuario: registro.usuario,
    dataSimulacao: registro.data_simulacao ?? undefined,
    entregavel: registro.entregavel ?? undefined,
    capexEstimadoAtual: registro.capex_estimado_atual ?? undefined,
    capexEstimadoSim: registro.capex_estimado_sim ?? undefined,
    anoAnttSim: registro.ano_antt_sim ?? undefined,
    anoRealSim: registro.ano_real_sim ?? undefined,
    pontoAtencao: registro.ponto_atencao ?? undefined,
    contexto: registro.contexto ?? undefined,
    createdAt: registro.created_at,
    updatedAt: registro.updated_at
  };
}

export async function listarRegistrosSimulador(filtro?: ListarRegistrosFiltro): Promise<SimuladorRegistro[]> {
  const db = await getDb();
  const rows = filtro?.usuario
    ? await db.all<DbRegistro[]>("SELECT * FROM simulador_registros WHERE usuario = ? ORDER BY id DESC", filtro.usuario)
    : await db.all<DbRegistro[]>("SELECT * FROM simulador_registros ORDER BY id DESC");

  return rows.map(mapDbRegistro);
}

export async function buscarRegistroSimuladorPorId(id: number): Promise<SimuladorRegistro | null> {
  const db = await getDb();
  const row = await db.get<DbRegistro>("SELECT * FROM simulador_registros WHERE id = ?", id);
  return row ? mapDbRegistro(row) : null;
}

export async function criarRegistroSimulador(input: NovoRegistroInput): Promise<SimuladorRegistro> {
  const db = await getDb();
  const idPrimaveraInterno = (input.idPrimavera ?? "").trim() || `SIM-${randomUUID().slice(0, 8).toUpperCase()}`;
  const usuarioInterno = (input.usuario ?? "").trim() || "usuario_demo";
  const result = await db.run(
    `
    INSERT INTO simulador_registros (
      id_primavera,
      usuario,
      data_simulacao,
      entregavel,
      capex_estimado_atual,
      capex_estimado_sim,
      ano_antt_sim,
      ano_real_sim,
      ponto_atencao,
      contexto,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `,
    idPrimaveraInterno,
    usuarioInterno,
    input.dataSimulacao ?? null,
    input.entregavel ?? null,
    input.capexEstimadoAtual ?? null,
    input.capexEstimadoSim ?? null,
    input.anoAnttSim ?? null,
    input.anoRealSim ?? null,
    input.pontoAtencao ?? null,
    input.contexto ?? null
  );

  const created = await db.get<DbRegistro>("SELECT * FROM simulador_registros WHERE id = ?", result.lastID);
  if (!created) {
    throw new Error("Nao foi possivel criar registro.");
  }

  return mapDbRegistro(created);
}

export async function atualizarRegistroSimulador(id: number, input: NovoRegistroInput): Promise<SimuladorRegistro | null> {
  const db = await getDb();
  const existing = await db.get<DbRegistro>("SELECT * FROM simulador_registros WHERE id = ?", id);
  if (!existing) {
    return null;
  }

  const idPrimaveraInterno = (input.idPrimavera ?? "").trim() || existing.id_primavera || `SIM-${randomUUID().slice(0, 8).toUpperCase()}`;
  const usuarioInterno = (input.usuario ?? "").trim() || existing.usuario || "usuario_demo";

  await db.run(
    `
    UPDATE simulador_registros
    SET id_primavera = ?,
        usuario = ?,
        data_simulacao = ?,
        entregavel = ?,
        capex_estimado_atual = ?,
        capex_estimado_sim = ?,
        ano_antt_sim = ?,
        ano_real_sim = ?,
        ponto_atencao = ?,
        contexto = ?,
        updated_at = datetime('now')
    WHERE id = ?
    `,
    idPrimaveraInterno,
    usuarioInterno,
    input.dataSimulacao ?? null,
    input.entregavel ?? null,
    input.capexEstimadoAtual ?? null,
    input.capexEstimadoSim ?? null,
    input.anoAnttSim ?? null,
    input.anoRealSim ?? null,
    input.pontoAtencao ?? null,
    input.contexto ?? null,
    id
  );

  const updated = await db.get<DbRegistro>("SELECT * FROM simulador_registros WHERE id = ?", id);
  return updated ? mapDbRegistro(updated) : null;
}

export async function excluirRegistroSimulador(id: number): Promise<boolean> {
  const db = await getDb();
  const result = await db.run("DELETE FROM simulador_registros WHERE id = ?", id);
  return (result.changes ?? 0) > 0;
}

export async function importarExcelParaSimulador(fileBuffer: Uint8Array, usuario: string): Promise<{ total: number }> {
  const registros = await importarDadosDeArquivoExcel(fileBuffer, usuario);
  if (registros.length === 0) {
    return { total: 0 };
  }

  const db = await getDb();
  await db.exec("BEGIN TRANSACTION");

  try {
    for (const registro of registros) {
      await db.run(
        `
        INSERT INTO simulador_registros (
          id_primavera,
          usuario,
          data_simulacao,
          entregavel,
          capex_estimado_atual,
          capex_estimado_sim,
          ano_antt_sim,
          ano_real_sim,
          ponto_atencao,
          contexto,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
        registro.idPrimavera,
        registro.usuario,
        registro.dataSimulacao ?? null,
        registro.entregavel ?? null,
        registro.capexEstimadoAtual ?? null,
        registro.capexEstimadoSim ?? null,
        registro.anoAnttSim ?? null,
        registro.anoRealSim ?? null,
        registro.pontoAtencao ?? null,
        registro.contexto ?? null
      );
    }

    await db.exec("COMMIT");
    return { total: registros.length };
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

export async function gerarTemplateSimuladorExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Simulador");

  worksheet.columns = [
    { header: "DATA SIMULACAO", key: "dataSimulacao", width: 18 },
    { header: "ENTREGAVEL", key: "entregavel", width: 30 },
    { header: "CAPEX ESTIMADO ATUAL", key: "capexAtual", width: 22 },
    { header: "CAPEX ESTIMADO SIM", key: "capexSim", width: 22 },
    { header: "ANO ANTT SIM", key: "anoAnttSim", width: 14 },
    { header: "ANO REAL SIM", key: "anoRealSim", width: 14 },
    { header: "PONTO DE ATENCAO", key: "pontoAtencao", width: 30 },
    { header: "CONTEXTO", key: "contexto", width: 40 }
  ];

  worksheet.addRow({
    dataSimulacao: new Date(2026, 7, 7),
    entregavel: "Ampliação de patio",
    capexAtual: 15000000,
    capexSim: 16200000,
    anoAnttSim: "2028",
    anoRealSim: "2029",
    pontoAtencao: "Licenciamento ambiental",
    contexto: "Dependencia de desapropriacao"
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  worksheet.getColumn("dataSimulacao").numFmt = "dd/mm/yyyy";

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
