import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import puppeteer from "puppeteer";
import { config } from "../config";

const reportRegistry = new Map<string, string>();

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_\.]/g, "_");
}

export async function gerarRelatorioPdfTemporario(html: string, fileName?: string): Promise<{ id: string; fileName: string }> {
  await fs.mkdir(config.reportOutputDir, { recursive: true });

  const id = randomUUID();
  const safeName = sanitizeFileName(fileName ?? `relatorio_${id}.pdf`).replace(/\.html$/i, ".pdf");
  const outputPath = path.join(config.reportOutputDir, safeName);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({ path: outputPath, format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }

  reportRegistry.set(id, outputPath);

  setTimeout(async () => {
    const pathFromRegistry = reportRegistry.get(id);
    if (!pathFromRegistry) {
      return;
    }

    reportRegistry.delete(id);
    try {
      await fs.unlink(pathFromRegistry);
    } catch {
      // File may have already been removed.
    }
  }, config.reportTtlSeconds * 1000);

  return { id, fileName: safeName };
}

export async function getRelatorioPdf(id: string): Promise<{ filePath: string; fileName: string } | null> {
  const filePath = reportRegistry.get(id);
  if (!filePath) {
    return null;
  }

  try {
    await fs.access(filePath);
    return { filePath, fileName: path.basename(filePath) };
  } catch {
    reportRegistry.delete(id);
    return null;
  }
}
