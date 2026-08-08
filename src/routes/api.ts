import express, { Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { importarDadosDeArquivoExcel } from "../services/excelImportService";
import { gerarGraficoBase64 } from "../services/chartService";
import { gerarRelatorioPdfTemporario, getRelatorioPdf } from "../services/reportService";
import {
  buscarRegistroSimuladorPorId,
  atualizarRegistroSimulador,
  criarRegistroSimulador,
  excluirRegistroSimulador,
  gerarTemplateSimuladorExcel,
  importarExcelParaSimulador,
  listarRegistrosSimulador
} from "../services/simuladorService";
import {
  listarProjetos,
  buscarProjetoPorId,
  listarDiretorias,
  listarProgramas
} from "../services/projetosService";
import {
  listarSimulacoes,
  criarSimulacao,
  atualizarSimulacao,
  excluirSimulacao
} from "../services/simulacoesService";

const upload = multer({ storage: multer.memoryStorage() });
export const apiRouter = express.Router();

type PerfilAcesso = "adm" | "usuario";

function getAuthContext(req: Request): { usuario: string; perfil: PerfilAcesso } {
  const usuarioHeader = String(req.headers["x-user-id"] ?? "").trim();
  const perfilHeader = String(req.headers["x-user-role"] ?? "").trim().toLowerCase();

  return {
    usuario: usuarioHeader || "usuario_demo",
    perfil: perfilHeader === "adm" ? "adm" : "usuario"
  };
}

apiRouter.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

const registroSchema = z.object({
  idProjeto: z.string().optional(),
  usuario: z.string().optional(),
  dataSimulacao: z.string().optional(),
  entregavel: z.string().optional(),
  capexEstimadoAtual: z.number().optional(),
  capexEstimadoSim: z.number().optional(),
  anoContratualSim: z.string().optional(),
  anoRealSim: z.string().optional(),
  pontoAtencao: z.string().optional(),
  contexto: z.string().optional()
});

apiRouter.get("/simulador/registros", async (req: Request, res: Response) => {
  try {
    const auth = getAuthContext(req);
    const registros = await listarRegistrosSimulador(auth.perfil === "adm" ? undefined : { usuario: auth.usuario });
    return res.status(200).json({ total: registros.length, registros });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(500).json({ error: message });
  }
});

apiRouter.post("/simulador/registros", async (req: Request, res: Response) => {
  try {
    const auth = getAuthContext(req);
    const payload = registroSchema.parse(req.body ?? {});
    const created = await criarRegistroSimulador({
      ...payload,
      usuario: auth.perfil === "adm" ? (payload.usuario ?? auth.usuario) : auth.usuario
    });

    return res.status(201).json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
});

apiRouter.put("/simulador/registros/:id", async (req: Request, res: Response) => {
  try {
    const auth = getAuthContext(req);
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID invalido." });
    }

    const existing = await buscarRegistroSimuladorPorId(id);
    if (!existing) {
      return res.status(404).json({ error: "Registro nao encontrado." });
    }

    if (auth.perfil !== "adm" && existing.usuario !== auth.usuario) {
      return res.status(403).json({ error: "Acesso negado para alterar registro de outro usuario." });
    }

    const payload = registroSchema.parse(req.body ?? {});
    const updated = await atualizarRegistroSimulador(id, {
      ...payload,
      usuario: auth.perfil === "adm" ? (payload.usuario ?? existing.usuario) : auth.usuario
    });

    if (!updated) {
      return res.status(404).json({ error: "Registro nao encontrado." });
    }

    return res.status(200).json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
});

apiRouter.delete("/simulador/registros/:id", async (req: Request, res: Response) => {
  const auth = getAuthContext(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID invalido." });
  }

  const existing = await buscarRegistroSimuladorPorId(id);
  if (!existing) {
    return res.status(404).json({ error: "Registro nao encontrado." });
  }

  if (auth.perfil !== "adm" && existing.usuario !== auth.usuario) {
    return res.status(403).json({ error: "Acesso negado para excluir registro de outro usuario." });
  }

  const deleted = await excluirRegistroSimulador(id);
  if (!deleted) {
    return res.status(404).json({ error: "Registro nao encontrado." });
  }

  return res.status(204).send();
});

apiRouter.get("/simulador/template", async (_req: Request, res: Response) => {
  try {
    const fileBuffer = await gerarTemplateSimuladorExcel();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="template_simulador.xlsx"');
    return res.status(200).send(fileBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(500).json({ error: message });
  }
});

apiRouter.post("/importar-dados", upload.single("arquivo"), async (req: Request, res: Response) => {
  try {
    const auth = getAuthContext(req);

    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Arquivo Excel e obrigatorio no campo arquivo." });
    }

    const registros = await importarDadosDeArquivoExcel(req.file.buffer, auth.usuario);
    return res.status(200).json({
      total: registros.length,
      amostra: registros.slice(0, 20)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(500).json({ error: message });
  }
});

apiRouter.post("/simulador/upload", upload.single("arquivo"), async (req: Request, res: Response) => {
  try {
    const auth = getAuthContext(req);

    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Arquivo Excel e obrigatorio no campo arquivo." });
    }

    const resultado = await importarExcelParaSimulador(req.file.buffer, auth.usuario);
    return res.status(200).json({
      totalImportado: resultado.total
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(500).json({ error: message });
  }
});

const graficoSchema = z.object({
  titulo: z.string().optional(),
  valores: z.array(z.number()).optional()
});

apiRouter.post("/graficos/:tipo", async (req: Request, res: Response) => {
  try {
    const payload = graficoSchema.parse(req.body ?? {});
    const imagem = gerarGraficoBase64(payload);

    return res.status(200).json({
      tipo: req.params.tipo,
      imageBase64: imagem
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
});

const relatorioSchema = z.object({
  html: z.string().min(1),
  fileName: z.string().optional()
});

apiRouter.post("/relatorios/gerar", async (req: Request, res: Response) => {
  try {
    const input = relatorioSchema.parse(req.body ?? {});
    const created = await gerarRelatorioPdfTemporario(input.html, input.fileName);

    return res.status(200).json({
      id: created.id,
      fileName: created.fileName,
      downloadPath: `/api/relatorios/${created.id}`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
});

apiRouter.get("/relatorios/:id", async (req: Request, res: Response) => {
  const report = await getRelatorioPdf(req.params.id);
  if (!report) {
    return res.status(404).json({ error: "Relatorio expirado ou inexistente." });
  }

  return res.download(report.filePath, report.fileName);
});

const historicoSchema = z.object({
  referencia: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional()
});

apiRouter.post("/atualizar-historico", async (req: Request, res: Response) => {
  try {
    const body = historicoSchema.parse(req.body ?? {});

    // Stub aligned with the old Run Script flow.
    // Replace this block with Microsoft Graph workbook script call.
    return res.status(200).json({
      status: "queued",
      referencia: body.referencia,
      message: "Integração futura pode ser ativada sem depender de SharePoint."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
});

// ── Projetos (base oficial) ───────────────────────────────────────────────────

apiRouter.get("/projetos", async (req: Request, res: Response) => {
  try {
    const projetos = await listarProjetos({
      diretoriaId: req.query.diretoriaId ? Number(req.query.diretoriaId) : undefined,
      programaId:  req.query.programaId  ? Number(req.query.programaId)  : undefined,
      escopo: req.query.escopo  ? String(req.query.escopo)  : undefined,
      busca:  req.query.busca   ? String(req.query.busca)   : undefined
    });
    return res.status(200).json({ total: projetos.length, projetos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(500).json({ error: message });
  }
});

apiRouter.get("/projetos/:id", async (req: Request, res: Response) => {
  const projeto = await buscarProjetoPorId(Number(req.params.id));
  if (!projeto) return res.status(404).json({ error: "Projeto nao encontrado." });
  return res.status(200).json(projeto);
});

apiRouter.get("/diretorias", async (_req: Request, res: Response) => {
  const diretorias = await listarDiretorias();
  return res.status(200).json(diretorias);
});

apiRouter.get("/programas", async (req: Request, res: Response) => {
  const programas = await listarProgramas(
    req.query.diretoriaId ? Number(req.query.diretoriaId) : undefined
  );
  return res.status(200).json(programas);
});

// ── Simulacoes (cenarios do usuario) ─────────────────────────────────────────

const simulacaoSchema = z.object({
  projetoId:         z.number().int().positive(),
  dataSimulacao:     z.string().optional(),
  capexEstimadoSim:  z.number().optional(),
  anoContratualSim:  z.string().optional(),
  anoRealSim:        z.string().optional(),
  pontoAtencao:      z.string().optional(),
  contexto:          z.string().optional()
});

apiRouter.get("/simulacoes", async (req: Request, res: Response) => {
  try {
    const auth = getAuthContext(req);
    const simulacoes = await listarSimulacoes(
      auth.perfil === "adm"
        ? { projetoId: req.query.projetoId ? Number(req.query.projetoId) : undefined }
        : { usuario: auth.usuario }
    );
    return res.status(200).json({ total: simulacoes.length, simulacoes });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(500).json({ error: message });
  }
});

apiRouter.post("/simulacoes", async (req: Request, res: Response) => {
  try {
    const auth = getAuthContext(req);
    const body = simulacaoSchema.parse(req.body ?? {});
    const created = await criarSimulacao({ ...body, usuario: auth.usuario });
    return res.status(201).json(created);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
});

apiRouter.put("/simulacoes/:id", async (req: Request, res: Response) => {
  try {
    const auth = getAuthContext(req);
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "ID invalido." });

    const body = simulacaoSchema.partial().parse(req.body ?? {});
    const updated = await atualizarSimulacao(id, { ...body, usuario: auth.usuario });
    if (!updated) return res.status(404).json({ error: "Simulacao nao encontrada." });
    return res.status(200).json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
});

apiRouter.delete("/simulacoes/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "ID invalido." });
  const deleted = await excluirSimulacao(id);
  if (!deleted) return res.status(404).json({ error: "Simulacao nao encontrada." });
  return res.status(204).send();
});
