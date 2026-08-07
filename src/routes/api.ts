import express, { Request, Response } from "express";
import multer from "multer";
import { z } from "zod";
import { importarDadosDeArquivoExcel } from "../services/excelImportService";
import { gerarGraficoBase64 } from "../services/chartService";
import { gerarRelatorioPdfTemporario, getRelatorioPdf } from "../services/reportService";

const upload = multer({ storage: multer.memoryStorage() });
export const apiRouter = express.Router();

apiRouter.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

apiRouter.post("/importar-dados", upload.single("arquivo"), async (req: Request, res: Response) => {
  try {
    const usuario = String(req.body.usuario ?? "").trim();
    if (!usuario) {
      return res.status(400).json({ error: "Campo usuario e obrigatorio." });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Arquivo Excel e obrigatorio no campo arquivo." });
    }

    const registros = await importarDadosDeArquivoExcel(req.file.buffer, usuario);
    return res.status(200).json({
      total: registros.length,
      amostra: registros.slice(0, 20)
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
      message: "Integracao pronta para substituir o flow Atualizar Historico com Graph/Office Script."
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return res.status(400).json({ error: message });
  }
});
