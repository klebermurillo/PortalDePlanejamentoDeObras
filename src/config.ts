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
  importacaoExcel: {
    templateFileName: process.env.EXCEL_TEMPLATE_FILE_NAME ?? "template_simulador.xlsx"
  }
};
