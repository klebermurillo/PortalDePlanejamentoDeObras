import ExcelJS from "exceljs";

export type ProjetoImportadoPlanilha = {
  diretoria: string;
  programa: string;
  idProjeto: string;
  nome: string;
  escopo?: string;
  capexRegulatorio?: number;
  capexEstimado?: number;
  anoContratual?: string;
  anoReal?: string;
  status?: string;
};

export class ErroPlanilhaProjetos extends Error {}

type CampoProjeto = keyof ProjetoImportadoPlanilha;

const ALIAS_CABECALHOS: Record<string, CampoProjeto> = {
  DIRETORIA: "diretoria",
  PROGRAMA: "programa",
  "ID PROJETO": "idProjeto",
  "CODIGO DO PROJETO": "idProjeto",
  "NOME DO PROJETO": "nome",
  "NOME PROJETO": "nome",
  NOME: "nome",
  ESCOPO: "escopo",
  "CAPEX REGULATORIO": "capexRegulatorio",
  "CAPEX ESTIMADO": "capexEstimado",
  "ANO CONTRATUAL": "anoContratual",
  "ANO REAL": "anoReal",
  "ANO REAL TENDENCIA": "anoReal",
  STATUS: "status"
};

const CAMPOS_OBRIGATORIOS: CampoProjeto[] = ["diretoria", "programa", "idProjeto", "nome"];

function normalizarTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "object") {
    const objeto = valor as { text?: unknown; result?: unknown; richText?: Array<{ text?: string }> };
    if (objeto.result !== undefined) return normalizarTexto(objeto.result);
    if (typeof objeto.text === "string") return objeto.text.trim();
    if (Array.isArray(objeto.richText)) return objeto.richText.map((parte) => parte.text ?? "").join("").trim();
  }
  return String(valor).trim();
}

function normalizarCabecalho(valor: unknown): string {
  return normalizarTexto(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function lerNumero(valor: unknown, linha: number, campo: string): number | undefined {
  if (valor === null || valor === undefined || normalizarTexto(valor) === "") return undefined;
  if (typeof valor === "number" && Number.isFinite(valor)) return valor;

  let texto = normalizarTexto(valor).replace(/R\$|\s/g, "");
  if (texto.includes(",")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  }
  const numero = Number(texto);
  if (!Number.isFinite(numero)) {
    throw new ErroPlanilhaProjetos(`Linha ${linha}: ${campo} deve ser um número válido.`);
  }
  return numero;
}

export async function lerProjetosDaPlanilha(buffer: Uint8Array): Promise<ProjetoImportadoPlanilha[]> {
  const workbook = new ExcelJS.Workbook();
  await (workbook.xlsx.load as unknown as (input: unknown) => Promise<void>)(Buffer.from(buffer));
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new ErroPlanilhaProjetos("A planilha não possui uma aba para leitura.");

  const colunaPorCampo = new Map<CampoProjeto, number>();
  worksheet.getRow(1).eachCell((cell, coluna) => {
    const campo = ALIAS_CABECALHOS[normalizarCabecalho(cell.value)];
    if (campo) colunaPorCampo.set(campo, coluna);
  });

  const camposAusentes = CAMPOS_OBRIGATORIOS.filter((campo) => !colunaPorCampo.has(campo));
  if (camposAusentes.length > 0) {
    throw new ErroPlanilhaProjetos(
      `Cabeçalhos obrigatórios ausentes: ${camposAusentes.join(", ")}. Baixe o modelo padrão e mantenha a primeira linha.`
    );
  }

  const projetos: ProjetoImportadoPlanilha[] = [];
  const codigosNaPlanilha = new Set<string>();
  const erros: string[] = [];

  worksheet.eachRow((row, numeroLinha) => {
    if (numeroLinha === 1) return;

    const valor = (campo: CampoProjeto) => {
      const coluna = colunaPorCampo.get(campo);
      return coluna ? row.getCell(coluna).value : undefined;
    };
    const dados = Object.fromEntries(
      Array.from(colunaPorCampo.keys()).map((campo) => [campo, normalizarTexto(valor(campo))])
    );
    if (Object.values(dados).every((item) => item === "")) return;

    try {
      const diretoria = normalizarTexto(valor("diretoria"));
      const programa = normalizarTexto(valor("programa"));
      const idProjeto = normalizarTexto(valor("idProjeto"));
      const nome = normalizarTexto(valor("nome"));
      const obrigatorios = [
        ["Diretoria", diretoria],
        ["Programa", programa],
        ["ID Projeto", idProjeto],
        ["Nome do Projeto", nome]
      ] as const;
      const ausentes = obrigatorios.filter(([, conteudo]) => !conteudo).map(([campo]) => campo);
      if (ausentes.length > 0) {
        throw new ErroPlanilhaProjetos(`campos obrigatórios vazios: ${ausentes.join(", ")}.`);
      }

      const chaveCodigo = idProjeto.toLocaleLowerCase("pt-BR");
      if (codigosNaPlanilha.has(chaveCodigo)) {
        throw new ErroPlanilhaProjetos(`código de projeto duplicado na planilha: ${idProjeto}.`);
      }
      codigosNaPlanilha.add(chaveCodigo);

      projetos.push({
        diretoria,
        programa,
        idProjeto,
        nome,
        escopo: normalizarTexto(valor("escopo")) || undefined,
        capexRegulatorio: lerNumero(valor("capexRegulatorio"), numeroLinha, "CAPEX Regulatório"),
        capexEstimado: lerNumero(valor("capexEstimado"), numeroLinha, "CAPEX Estimado"),
        anoContratual: normalizarTexto(valor("anoContratual")) || undefined,
        anoReal: normalizarTexto(valor("anoReal")) || undefined,
        status: normalizarTexto(valor("status")) || undefined
      });
    } catch (erro) {
      const detalhe = erro instanceof Error ? erro.message : "dados inválidos.";
      erros.push(`Linha ${numeroLinha}: ${detalhe.replace(/^Linha \d+: /, "")}`);
    }
  });

  if (erros.length > 0) {
    throw new ErroPlanilhaProjetos(erros.slice(0, 20).join(" "));
  }
  if (projetos.length === 0) {
    throw new ErroPlanilhaProjetos("A planilha não contém projetos para importar.");
  }

  return projetos;
}

export async function gerarModeloImportacaoProjetos(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SIGPO";

  const projetos = workbook.addWorksheet("Projetos");
  projetos.columns = [
    { header: "DIRETORIA", key: "diretoria", width: 28 },
    { header: "PROGRAMA", key: "programa", width: 30 },
    { header: "ID PROJETO", key: "idProjeto", width: 18 },
    { header: "NOME DO PROJETO", key: "nome", width: 36 },
    { header: "ESCOPO", key: "escopo", width: 42 },
    { header: "CAPEX REGULATÓRIO", key: "capexRegulatorio", width: 22 },
    { header: "CAPEX ESTIMADO", key: "capexEstimado", width: 20 },
    { header: "ANO CONTRATUAL", key: "anoContratual", width: 18 },
    { header: "ANO REAL/TENDÊNCIA", key: "anoReal", width: 22 },
    { header: "STATUS", key: "status", width: 22 }
  ];
  projetos.views = [{ state: "frozen", ySplit: 1 }];
  projetos.autoFilter = "A1:J1";
  projetos.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  projetos.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F4C81" } };

  const instrucoes = workbook.addWorksheet("Instruções");
  instrucoes.columns = [{ width: 28 }, { width: 100 }];
  instrucoes.addRows([
    ["Campo", "Como preencher"],
    ["Uma linha por projeto", "Não altere os nomes dos cabeçalhos da aba Projetos."],
    ["Obrigatórios", "DIRETORIA, PROGRAMA, ID PROJETO e NOME DO PROJETO."],
    ["Diretoria e Programa", "Se não existirem, serão criados. Projetos com o mesmo nome serão associados à mesma hierarquia."],
    ["ID PROJETO", "Deve ser único na planilha e na base atual."],
    ["CAPEX", "Use números ou valores em reais, por exemplo 1250000,50."],
    ["Campos opcionais", "ESCOPO, CAPEX REGULATÓRIO, CAPEX ESTIMADO, anos e STATUS."],
    ["Importação", "Todos os registros são validados antes da gravação. Se houver erros, nenhum projeto da planilha será importado."]
  ]);
  instrucoes.getRow(1).font = { bold: true };

  return Buffer.from(await workbook.xlsx.writeBuffer());
}