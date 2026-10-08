import path from "path";
import dotenv from "dotenv";

dotenv.config();

const port = Number(process.env.PORT ?? 3000);
const reportTtlSeconds = Number(process.env.REPORT_TTL_SECONDS ?? 60);
const reportOutputDir = path.resolve(process.env.REPORT_OUTPUT_DIR ?? "tmp/relatorios");
const sessionTtlSeconds = Number(process.env.SESSION_TTL_SECONDS ?? 28800);
const nodeEnv = process.env.NODE_ENV ?? "development";
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS ?? 0);

if (!Number.isFinite(sessionTtlSeconds) || sessionTtlSeconds < 300) {
  throw new Error("SESSION_TTL_SECONDS deve ser um número igual ou superior a 300.");
}
if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
  throw new Error("TRUST_PROXY_HOPS deve ser um inteiro igual ou superior a zero.");
}
if (
  nodeEnv === "production" &&
  (!process.env.DB_PASSWORD || process.env.DB_PASSWORD === "configure-uma-senha-forte")
) {
  throw new Error("DB_PASSWORD é obrigatório em produção.");
}

export const config = {
  port,
  reportTtlSeconds,
  reportOutputDir,
  sessionTtlSeconds,
  nodeEnv,
  trustProxyHops,
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
