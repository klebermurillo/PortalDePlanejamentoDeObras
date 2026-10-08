import type { NextFunction, Request, Response } from "express";
import { buscarUsuarioDaSessao, type UsuarioSessao } from "../services/sessoesService";

declare global {
  namespace Express {
    interface Request {
      usuarioAutenticado?: UsuarioSessao;
    }
  }
}

export function lerTokenSessao(req: Request): string | null {
  const cookies = req.headers.cookie?.split(";") ?? [];
  const cookie = cookies.find((item) => item.trim().startsWith("sigpo_session="));
  return cookie ? cookie.trim().slice("sigpo_session=".length) || null : null;
}

export async function exigirSessao(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = lerTokenSessao(req);
  if (!token) {
    res.status(401).json({ error: "Autenticação necessária." });
    return;
  }

  try {
    const usuario = await buscarUsuarioDaSessao(token);
    if (!usuario) {
      res.status(401).json({ error: "Sessão inválida ou expirada." });
      return;
    }

    req.usuarioAutenticado = usuario;
    next();
  } catch {
    res.status(500).json({ error: "Não foi possível validar a sessão." });
  }
}

export function exigirAdministrador(req: Request, res: Response, next: NextFunction): void {
  const usuario = req.usuarioAutenticado;
  if (usuario?.perfil !== "adm") {
    res.status(403).json({ error: "Acesso restrito ao perfil administrador." });
    return;
  }

  next();
}