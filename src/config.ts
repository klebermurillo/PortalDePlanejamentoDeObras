import path from "path";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 3000);
const reportTtlSeconds = Number(process.env.REPORT_TTL_SECONDS ?? 60);
const reportOutputDir = path.resolve(process.env.REPORT_OUTPUT_DIR ?? "tmp/relatorios");

export const config = {
  port,
  reportTtlSeconds,
  reportOutputDir,
  db: {
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 3306),
    name: process.env.DB_NAME ?? "portal_obras",
    user: process.env.DB_USER ?? "portal_user",
    password: process.env.DB_PASSWORD ?? ""
  },
  azure: {
    tenantId: process.env.AZURE_TENANT_ID ?? "",
    clientId: process.env.AZURE_CLIENT_ID ?? "",
    clientSecret: process.env.AZURE_CLIENT_SECRET ?? ""
  },
  sharepoint: {
    siteId: process.env.SP_SITE_ID ?? "",
    driveId: process.env.SP_DRIVE_ID ?? "",
    listIdSimulador: process.env.SP_LIST_ID_SIMULADOR ?? "",
    fileIdPlanilhaBase: process.env.SP_FILE_ID_PLANILHA_BASE ?? ""
  }
};
