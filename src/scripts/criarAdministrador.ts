import { closePool } from "../db/mysql";
import { criarUsuario, listarUsuarios } from "../services/usuariosService";

function perguntarSenha(prompt: string): Promise<string> {
  const input = process.stdin;
  if (!input.isTTY) return Promise.reject(new Error("Execute este comando em um terminal interativo."));

  return new Promise((resolve, reject) => {
    let senha = "";
    process.stdout.write(prompt);
    input.setRawMode(true);
    input.setEncoding("utf8");
    input.resume();

    const finalizar = (erro?: Error) => {
      input.off("data", aoDigitar);
      input.setRawMode(false);
      input.pause();
      process.stdout.write("\n");
      if (erro) reject(erro);
      else resolve(senha);
    };

    const aoDigitar = (caractere: string) => {
      if (caractere === "\u0003" || caractere === "\u0004") {
        finalizar(new Error("Operação cancelada."));
        return;
      }
      if (caractere === "\r" || caractere === "\n") {
        finalizar();
        return;
      }
      if (caractere === "\u007f" || caractere === "\b") {
        senha = senha.slice(0, -1);
        return;
      }
      senha += caractere;
    };

    input.on("data", aoDigitar);
  });
}

async function main(): Promise<void> {
  try {
    const [nome, email] = process.argv.slice(2);
    if (!nome || !email) {
      throw new Error('Uso: npm run admin:create -- "Nome do administrador" admin@empresa.com');
    }

    if ((await listarUsuarios()).length > 0) {
      throw new Error("O bootstrap só é permitido quando ainda não existem usuários cadastrados.");
    }

    const senha = await perguntarSenha("Senha (mínimo de 12 caracteres): ");
    if (senha.length < 12) throw new Error("A senha deve ter pelo menos 12 caracteres.");
    const confirmacao = await perguntarSenha("Confirme a senha: ");
    if (senha !== confirmacao) throw new Error("As senhas não coincidem.");

    const usuario = await criarUsuario({ nome, email, senha, perfil: "adm" });
    console.log(`Administrador ${usuario.email} criado com sucesso.`);
  } finally {
    await closePool();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha ao criar administrador.");
  process.exitCode = 1;
});