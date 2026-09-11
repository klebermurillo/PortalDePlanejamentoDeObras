// ── Sessão do usuário (prototipo: localStorage, sem token real) ─────────────
const AUTH_KEYS = {
  id: "portal-user-id",
  role: "portal-user-role",
  nome: "portal-user-nome"
};

const authContext = {
  userId: localStorage.getItem(AUTH_KEYS.id) || "",
  role:   localStorage.getItem(AUTH_KEYS.role) || "",
  nome:   localStorage.getItem(AUTH_KEYS.nome) || ""
};

function authHeaders(json) {
  const headers = { "x-user-id": authContext.userId, "x-user-role": authContext.role };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function estaLogado() {
  return Boolean(authContext.userId && authContext.role);
}

function salvarSessao(usuario) {
  localStorage.setItem(AUTH_KEYS.id, String(usuario.id));
  localStorage.setItem(AUTH_KEYS.role, usuario.perfil);
  localStorage.setItem(AUTH_KEYS.nome, usuario.nome);
}

function logout() {
  localStorage.removeItem(AUTH_KEYS.id);
  localStorage.removeItem(AUTH_KEYS.role);
  localStorage.removeItem(AUTH_KEYS.nome);
  window.location.href = "/login.html";
}

// Redireciona para o login quando a pagina exige sessao ativa.
function exigirLogin() {
  if (!estaLogado()) {
    window.location.href = "/login.html";
  }
}

// Preenche um container com nome do usuario, perfil e botao de sair.
function montarUsuarioLogado(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  if (!estaLogado()) {
    el.innerHTML = `<a href="/login.html" class="btn btn-secondary">Entrar</a>`;
    return;
  }

  const perfilLabel = authContext.role === "adm" ? "Administrador" : "Usuário";
  el.innerHTML = `
    <span class="usuario-logado-info">${authContext.nome} <small>(${perfilLabel})</small></span>
    <button id="btn-logout" class="btn btn-secondary" type="button">Sair</button>
  `;
  document.getElementById("btn-logout").addEventListener("click", logout);
}

// Preenchimento automatico do bloco de usuario logado, se presente na pagina.
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("usuario-logado")) {
    montarUsuarioLogado("usuario-logado");
  }
});
