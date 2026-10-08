const authContext = {
  userId: "",
  role: "",
  nome: ""
};

let requisicaoSessao;

function authHeaders(json) {
  const headers = {};
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function estaLogado() {
  return Boolean(authContext.userId && authContext.role);
}

function atualizarUsuario(usuario) {
  authContext.userId = String(usuario.id);
  authContext.role = usuario.perfil;
  authContext.nome = usuario.nome;
}

function limparUsuario() {
  authContext.userId = "";
  authContext.role = "";
  authContext.nome = "";
}

function carregarSessao() {
  if (!requisicaoSessao) {
    requisicaoSessao = fetch("/api/auth/session")
      .then(async (res) => {
        if (!res.ok) throw new Error("Sessão ausente");
        atualizarUsuario(await res.json());
        return true;
      })
      .catch(() => {
        limparUsuario();
        return false;
      });
  }
  return requisicaoSessao;
}

async function salvarSessao(usuario) {
  atualizarUsuario(usuario);
  requisicaoSessao = Promise.resolve(true);
}

async function logout() {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    limparUsuario();
    requisicaoSessao = Promise.resolve(false);
    window.location.href = "/login.html";
  }
}

async function exigirLogin() {
  if (!(await carregarSessao())) {
    window.location.href = "/login.html";
    return false;
  }
  return true;
}

async function montarUsuarioLogado(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const logado = await carregarSessao();
  el.replaceChildren();

  if (!logado || !estaLogado()) {
    const entrar = document.createElement("a");
    entrar.href = "/login.html";
    entrar.className = "btn btn-secondary";
    entrar.textContent = "Entrar";
    el.append(entrar);
    return;
  }

  const perfilLabel = authContext.role === "adm" ? "Administrador" : "Usuário";
  const info = document.createElement("span");
  info.className = "usuario-logado-info";
  info.textContent = `${authContext.nome} (${perfilLabel})`;

  const sair = document.createElement("button");
  sair.className = "btn btn-secondary";
  sair.type = "button";
  sair.textContent = "Sair";
  sair.addEventListener("click", logout);
  el.append(info, sair);
}

// Preenchimento automatico do bloco de usuario logado, se presente na pagina.
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("usuario-logado")) {
    montarUsuarioLogado("usuario-logado");
  }
});
