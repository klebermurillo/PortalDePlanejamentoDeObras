import ExcelJS from "exceljs";
import { randomUUID } from "node:crypto";
import { RegistroSimulador } from "../types";

function toDateStringFromExcelValue(value: unknown): string | undefined {
  if (typeof value === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(epoch.getTime() + value * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  return undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/\./g, "").replace(/,/g, ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

export async function importarDadosDeArquivoExcel(fileBuffer: Uint8Array, usuario: string): Promise<RegistroSimulador[]> {
  const workbook = new ExcelJS.Workbook();
  // ExcelJS usa tipagem de Buffer incompatível com @types/node recentes.
  await (workbook.xlsx.load as unknown as (input: unknown) => Promise<void>)(Buffer.from(fileBuffer));

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return [];
  }

  const headerRow = worksheet.getRow(1);
  const indexByHeader = new Map<string, number>();

  headerRow.eachCell((cell, colNumber) => {
    const key = String(cell.value ?? "").trim().toUpperCase();
    if (key) {
      indexByHeader.set(key, colNumber);
    }
  });

  const getCell = (row: ExcelJS.Row, headerName: string): unknown => {
    const col = indexByHeader.get(headerName.toUpperCase());
    return col ? row.getCell(col).value : undefined;
  };

  const result: RegistroSimulador[] = [];

  const hasMeaningfulValue = (value: unknown): boolean => {
    if (value === null || value === undefined) {
      return false;
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    if (typeof value === "number") {
      return Number.isFinite(value);
    }
    return true;
  };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const idPrimaveraRaw = String(getCell(row, "ID PRIMAVERA") ?? "").trim();
    const idPrimavera = idPrimaveraRaw || `SIM-${randomUUID().slice(0, 8).toUpperCase()}`;

    const rowHasData = [
      getCell(row, "DATA SIMULACAO"),
      getCell(row, "ENTREGAVEL"),
      getCell(row, "CAPEX ESTIMADO ATUAL"),
      getCell(row, "CAPEX ESTIMADO SIM"),
      getCell(row, "ANO ANTT SIM"),
      getCell(row, "ANO REAL SIM"),
      getCell(row, "PONTO DE ATENCAO"),
      getCell(row, "CONTEXTO")
    ].some(hasMeaningfulValue);

    if (!rowHasData && !idPrimaveraRaw) {
      return;
    }

    result.push({
      idPrimavera,
      usuario,
      dataSimulacao: toDateStringFromExcelValue(getCell(row, "DATA SIMULACAO")),
      entregavel: String(getCell(row, "ENTREGAVEL") ?? "").trim() || undefined,
      capexEstimadoAtual: toNumber(getCell(row, "CAPEX ESTIMADO ATUAL")),
      capexEstimadoSim: toNumber(getCell(row, "CAPEX ESTIMADO SIM")),
      anoAnttSim: String(getCell(row, "ANO ANTT SIM") ?? "").trim() || undefined,
      anoRealSim: String(getCell(row, "ANO REAL SIM") ?? "").trim() || undefined,
      pontoAtencao: String(getCell(row, "PONTO DE ATENCAO") ?? "").trim() || undefined,
      contexto: String(getCell(row, "CONTEXTO") ?? "").trim() || undefined
    });
  });

  return result;
}
