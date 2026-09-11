import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { execute, query, queryOne } from "../db/mysql";

export type PerfilAcesso = "adm" | "usuario";

export type Usuario = {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilAcesso;
  ativo: boolean;
  createdAt: string;
};

type DbUsuario = {
  id: number;
  nome: string;
  email: string;
  perfil: PerfilAcesso;
  ativo: number;
  created_at: string;
};

export type UsuarioInput = {
  nome: string;
  email: string;
  senha?: string;
  perfil: PerfilAcesso;
  ativo?: boolean;
};

function mapUsuario(r: DbUsuario): Usuario {
  return {
    id: r.id,
    nome: r.nome,
    email: r.email,
    perfil: r.perfil,
    ativo: Boolean(r.ativo),
    createdAt: r.created_at
  };
}

function hashSenha(senha: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(senha, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verificarSenha(senha: string, senhaHash: string): boolean {
  const [salt, hash] = senhaHash.split(":");
  if (!salt || !hash) return false;
  const hashCalculado = scryptSync(senha, salt, 64);
  const hashArmazenado = Buffer.from(hash, "hex");
  return hashCalculado.length === hashArmazenado.length && timingSafeEqual(hashCalculado, hashArmazenado);
}

const USUARIOS_SELECT = "SELECT id, nome, email, perfil, ativo, created_at FROM usuarios";

export async function listarUsuarios(): Promise<Usuario[]> {
  const rows = await query<DbUsuario>(`${USUARIOS_SELECT} ORDER BY nome`);
  return rows.map(mapUsuario);
}

export async function buscarUsuarioPorId(id: number): Promise<Usuario | null> {
  const row = await queryOne<DbUsuario>(`${USUARIOS_SELECT} WHERE id = ?`, [id]);
  return row ? mapUsuario(row) : null;
}

export async function criarUsuario(input: UsuarioInput): Promise<Usuario> {
  if (!input.senha) throw new Error("Senha e obrigatoria para criar usuario.");

  const { insertId } = await execute(
    `INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo) VALUES (?, ?, ?, ?, ?)`,
    [input.nome, input.email, hashSenha(input.senha), input.perfil, input.ativo ?? true ? 1 : 0]
  );

  const created = await buscarUsuarioPorId(insertId);
  if (!created) throw new Error("Nao foi possivel criar usuario.");
  return created;
}

export async function atualizarUsuario(id: number, input: Partial<UsuarioInput>): Promise<Usuario | null> {
  const existing = await buscarUsuarioPorId(id);
  if (!existing) return null;

  const campos: string[] = [];
  const params: unknown[] = [];

  if (input.nome !== undefined)   { campos.push("nome = ?");   params.push(input.nome); }
  if (input.email !== undefined)  { campos.push("email = ?");  params.push(input.email); }
  if (input.perfil !== undefined) { campos.push("perfil = ?"); params.push(input.perfil); }
  if (input.ativo !== undefined)  { campos.push("ativo = ?");  params.push(input.ativo ? 1 : 0); }
  if (input.senha) { campos.push("senha_hash = ?"); params.push(hashSenha(input.senha)); }

  if (campos.length === 0) return existing;

  params.push(id);
  await execute(`UPDATE usuarios SET ${campos.join(", ")} WHERE id = ?`, params);
  return buscarUsuarioPorId(id);
}

export async function excluirUsuario(id: number): Promise<boolean> {
  const { affectedRows } = await execute("DELETE FROM usuarios WHERE id = ?", [id]);
  return affectedRows > 0;
}

export async function autenticar(email: string, senha: string): Promise<Usuario | null> {
  const row = await queryOne<DbUsuario & { senha_hash: string }>(
    "SELECT id, nome, email, senha_hash, perfil, ativo, created_at FROM usuarios WHERE email = ?",
    [email]
  );
  if (!row || !row.ativo) return null;
  if (!verificarSenha(senha, row.senha_hash)) return null;
  return mapUsuario(row);
}
