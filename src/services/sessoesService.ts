import { createHash, randomBytes } from "node:crypto";
import { config } from "../config";
import { execute, queryOne } from "../db/mysql";

export type UsuarioSessao = {
  id: number;
  nome: string;
  email: string;
  perfil: "adm" | "usuario";
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function criarSessao(usuarioId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + config.sessionTtlSeconds * 1000);

  await execute("DELETE FROM sessoes WHERE expira_em <= UTC_TIMESTAMP()");
  await execute(
    "INSERT INTO sessoes (token_hash, usuario_id, expira_em) VALUES (?, ?, ?)",
    [hashToken(token), usuarioId, expiraEm]
  );

  return token;
}

export async function buscarUsuarioDaSessao(token: string): Promise<UsuarioSessao | null> {
  return queryOne<UsuarioSessao>(
    `SELECT u.id, u.nome, u.email, u.perfil
     FROM sessoes s
     INNER JOIN usuarios u ON u.id = s.usuario_id
     WHERE s.token_hash = ? AND s.expira_em > UTC_TIMESTAMP() AND u.ativo = 1`,
    [hashToken(token)]
  );
}

export async function excluirSessao(token: string): Promise<void> {
  await execute("DELETE FROM sessoes WHERE token_hash = ?", [hashToken(token)]);
}